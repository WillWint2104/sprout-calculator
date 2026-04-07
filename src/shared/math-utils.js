/**
 * math-utils.js
 * Shared mathematical utilities used by both the main evaluator and the
 * function editor evaluator. Keeping normalisation here ensures both
 * pipelines stay in sync — a bug fix in one applies to both.
 *
 * Pure. No DOM. No state.
 */

/**
 * Normalise a human-readable maths expression string into a JS-evaluable one.
 *
 * Handles:
 * - Display symbols (×, ÷, −) → JS operators
 * - Greek/special constants (π, φ, e) → JS equivalents
 * - Trig functions with optional degree conversion
 * - log, ln, sqrt, abs, sgn, fact, nCr, cbrt
 * - D°M′S″ → decimal degrees (main evaluator path)
 *
 * @param {string} expr   - expression string from buildEvalExpr() or fn editor
 * @param {string} mode   - 'deg' | 'rad' — controls trig conversion
 * @param {string} [xSub] - if provided, replaces \bx\b with this value (fn editor path)
 * @returns {string}      - JS-evaluable string (still needs Function() to run)
 */
export function normaliseExpression(expr, mode, xSub) {
  let s = expr
    // Display operator symbols → JS
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    // Exponent
    .replace(/\^/g, '**')
    // Constants
    .replace(/π/g, 'Math.PI')
    .replace(/φ/g, '1.6180339887')
    .replace(/\be\b/g, 'Math.E')
    // Trig — with degree wrapper if needed
    .replace(/\bsin\(/g,  mode === 'deg' ? '_sinD(' : 'Math.sin(')
    .replace(/\bcos\(/g,  mode === 'deg' ? '_cosD(' : 'Math.cos(')
    .replace(/\btan\(/g,  mode === 'deg' ? '_tanD(' : 'Math.tan(')
    .replace(/\basin\(/g, mode === 'deg' ? '_asinD(' : 'Math.asin(')
    .replace(/\bacos\(/g, mode === 'deg' ? '_acosD(' : 'Math.acos(')
    .replace(/\batan\(/g, mode === 'deg' ? '_atanD(' : 'Math.atan(')
    // Logarithms
    .replace(/(?<!Math\.)(?<!\.)log\(/g, 'Math.log10(')
    .replace(/\bln\(/g,   'Math.log(')
    .replace(/\bexp\(/g,  'Math.exp(')
    .replace(/10\*\*\(/g, '_pow10(')
    // Other maths
    .replace(/\bsqrt\(/g, 'Math.sqrt(')
    .replace(/\bcbrt\(/g, 'Math.cbrt(')
    .replace(/\babs\(/g,  'Math.abs(')
    .replace(/\bsgn\(/g,  'Math.sign(')
    .replace(/\bfact\(/g, '_fact(')
    .replace(/\bnCr\(/g,  '_nCr(')
    // Implicit multiplication: 2x → 2*x
    .replace(/(\d)([a-zA-Z])/g, '$1*$2');

  // Substitute x variable (function editor path)
  if (xSub !== undefined) {
    s = s.replace(/\bx\b/g, String(xSub));
  }

  return s;
}

/**
 * The set of helper functions injected into the Function() evaluator scope.
 * Both evaluators use these — defined once here.
 */
export const MATH_HELPERS = {
  _sinD:  x => Math.sin(x * Math.PI / 180),
  _cosD:  x => Math.cos(x * Math.PI / 180),
  _tanD:  x => Math.tan(x * Math.PI / 180),
  _asinD: x => Math.asin(x) * 180 / Math.PI,
  _acosD: x => Math.acos(x) * 180 / Math.PI,
  _atanD: x => Math.atan(x) * 180 / Math.PI,
  _pow10: x => Math.pow(10, x),
  _fact:  n => {
    n = Math.round(n);
    if (n < 0 || n > 170) return n < 0 ? NaN : Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },
  _nCr: (n, r) => {
    const fact = k => { let v = 1; for (let i = 2; i <= k; i++) v *= i; return v; };
    return fact(n) / (fact(r) * fact(n - r));
  }
};

/**
 * Run a normalised expression string through Function() with all helpers injected.
 * @param {string} js - output of normaliseExpression()
 * @returns {{ value: number } | { error: string }}
 */
export function runExpression(js) {
  const h = MATH_HELPERS;
  try {
    const result = Function(
      '_sinD','_cosD','_tanD','_asinD','_acosD','_atanD','_fact','_nCr','_pow10',
      '"use strict"; return (' + js + ');'
    )(h._sinD, h._cosD, h._tanD, h._asinD, h._acosD, h._atanD, h._fact, h._nCr, h._pow10);

    if (result === undefined || result === null || typeof result !== 'number') {
      return { error: 'invalid result' };
    }
    return { value: result };
  } catch (e) {
    return { error: e.message };
  }
}
