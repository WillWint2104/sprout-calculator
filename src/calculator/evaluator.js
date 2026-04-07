/**
 * evaluator.js
 * Builds a JS-evaluable string from the token array, then evaluates it.
 * Engine only — no DOM, no state mutations.
 *
 * normaliseExpression and runExpression are imported from shared/math-utils.js
 * so both this evaluator and function-evaluator.js use identical pipelines.
 */

import { normaliseExpression, runExpression } from '../shared/math-utils.js';

// ── TOKEN → EXPRESSION ───────────────────────────────────────────────────────

function cleanSlot(s) {
  if (!s) return '';
  return s
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/\^(.+)/g, '**($1)');
}

/** Build the human-readable expression string shown above the display. */
export function buildDisplayExpr(tokens) {
  return tokens.map(t => {
    if (t.type === 'text')    return t.val;
    if (t.type === 'frac')    return `(${t.num || '0'})/(${t.den || '1'})`;
    if (t.type === 'sqrt')    return `√(${t.arg || '0'})`;
    if (t.type === 'nthroot') return `${t.deg || 'n'}√(${t.arg || '0'})`;
    if (t.type === 'pow')     return `(${t.base || '0'})^(${t.exp || '1'})`;
    if (t.type === 'log')     return `log_${t.base || '10'}(${t.arg || '0'})`;
    if (t.type === 'mixed')   return `${t.whole || '0'} ${t.num || '0'}/${t.den || '1'}`;
    return '';
  }).join('');
}

/** Build the intermediate expression string from the token array. */
export function buildEvalExpr(tokens) {
  return tokens.map(t => {
    if (t.type === 'text')    return t.val.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    if (t.type === 'frac')    return `((${cleanSlot(t.num) || '0'})/(${cleanSlot(t.den) || '1'}))`;
    if (t.type === 'sqrt')    return `sqrt(${cleanSlot(t.arg) || '0'})`;
    if (t.type === 'nthroot') {
      const d = cleanSlot(t.deg) || '2', a = cleanSlot(t.arg) || '0';
      return `Math.pow(${a},1/(${d}))`;
    }
    if (t.type === 'pow')     return `((${cleanSlot(t.base) || '0'})**(${cleanSlot(t.exp) || '1'}))`;
    if (t.type === 'log') {
      const b = cleanSlot(t.base) || '10', a = cleanSlot(t.arg) || '0';
      if (!a || a === '0') return '0';
      return `(Math.log(Number(${a}))/Math.log(Number(${b})))`;
    }
    if (t.type === 'mixed') {
      const w = cleanSlot(t.whole) || '0', n = cleanSlot(t.num) || '0', d = cleanSlot(t.den) || '1';
      return `((${w})+(${n})/(${d}))`;
    }
    return '';
  }).join('');
}

// ── EVALUATE ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a raw expression string.
 * @param {string} raw   - output of buildEvalExpr()
 * @param {string} mode  - 'deg' | 'rad'
 * @returns {{ value: number } | { error: string }}
 */
export function evaluate(raw, mode) {
  if (!raw.trim()) return { error: 'empty' };

  // D°M′S″ → decimal degrees before general normalisation
  let js = raw.replace(
    /(-?\d+(?:\.\d+)?)°(\d+(?:\.\d+)?)′(\d+(?:\.\d+)?)″/g,
    (_, d, m, s) => {
      const dec = (parseFloat(d) < 0 ? -1 : 1) *
        (Math.abs(parseFloat(d)) + parseFloat(m) / 60 + parseFloat(s) / 3600);
      return String(dec);
    }
  ).replace(/°/g, '').replace(/′/g, '').replace(/″/g, '');

  js = normaliseExpression(js, mode);
  return runExpression(js);
}
