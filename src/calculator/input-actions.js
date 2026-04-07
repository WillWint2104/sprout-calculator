/**
 * input-actions.js
 * Pure state transformers for all calculator input operations.
 * Each function takes the full store state and returns new state.
 * No DOM access. No side effects.
 */

import { SLOT_TYPES, FN_MAP } from '../shared/constants.js';
import {
  appendToFocus,
  grabBase,
  insertStructuredToken,
  ensureTextAt,
  applyBackspace,
  moveCursor,
  getCurrentTextToken,
  getActiveSegment
} from './token-model.js';
import { formatResult, makeResultTokens } from './formatter.js';

// ── HELPERS ─────────────────────────────────────────────────────────────────

function resetCalcState(calc) {
  return {
    ...calc,
    tokens: [{ type: 'text', val: '' }],
    cursor: 0,
    fracFocus: null,
    justCalc: false
  };
}

function getAnsStr(calc) {
  if (calc.rawResult === null) return null;
  const n = calc.rawResult;
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  return parseFloat(n.toPrecision(12)).toString();
}

/**
 * When an operator is pressed after a calculation, prepend ANS automatically.
 */
function prependAnsIfNeeded(calc) {
  if (!calc.justCalc || calc.rawResult === null) return calc;
  const ans = getAnsStr(calc);
  return {
    ...calc,
    tokens: [{ type: 'text', val: ans }],
    cursor: 0,
    fracFocus: null,
    justCalc: false
  };
}

// ── NUMBER & DOT ─────────────────────────────────────────────────────────────

export function inputNum(state, digit) {
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  return { ...state, calculator: appendToFocus(calc, digit) };
}

export function inputDot(state) {
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  const seg = getActiveSegment(calc.tokens, calc.cursor, calc.fracFocus);
  if (seg.includes('.')) return state;
  return { ...state, calculator: appendToFocus(calc, '.') };
}

// ── ANS ──────────────────────────────────────────────────────────────────────

export function inputAns(state) {
  const ans = getAnsStr(state.calculator);
  if (ans === null) return state;
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  return { ...state, calculator: appendToFocus(calc, ans) };
}

// ── OPERATORS (auto-prepend ANS) ─────────────────────────────────────────────

export function insertText(state, str) {
  const isOp = /^[+\-×÷%()]$/.test(str);
  let calc = isOp ? prependAnsIfNeeded(state.calculator) : state.calculator;
  if (!isOp && calc.justCalc) calc = { ...calc, justCalc: false };
  return { ...state, calculator: appendToFocus(calc, str) };
}

export function insertMul(state) {
  const calc = prependAnsIfNeeded(state.calculator);
  return { ...state, calculator: appendToFocus(calc, '×') };
}

export function insertDiv(state) {
  const calc = prependAnsIfNeeded(state.calculator);
  return { ...state, calculator: appendToFocus(calc, '÷') };
}

export function toggleSign(state) {
  const calc = state.calculator;
  const t = getCurrentTextToken(calc.tokens, calc.cursor);
  if (!t) return state;
  const updated = t.val.endsWith('-')
    ? { ...t, val: t.val.slice(0, -1) }
    : { ...t, val: t.val + '-' };
  const tokens = calc.tokens.map((tok, i) => i === calc.cursor ? updated : tok);
  return { ...state, calculator: { ...calc, tokens } };
}

// ── STRUCTURED TOKENS ────────────────────────────────────────────────────────

export function insertFraction(state) {
  // FIX: only reset when justCalc — mid-expression fraction must not destroy input
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  if (state.calculator.shiftOn) {
    const clearedCalc = clearShiftInCalc(calc);
    const node = { type: 'mixed', whole: '', num: '', den: '' };
    return { ...state, calculator: insertStructuredToken(clearedCalc, node, 'whole') };
  }
  const node = { type: 'frac', num: '', den: '' };
  return { ...state, calculator: insertStructuredToken(calc, node, 'num') };
}

export function insertSqrt(state) {
  // Only reset when justCalc — mid-expression sqrt inserts at cursor
  let calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  if (state.calculator.shiftOn) {
    calc = clearShiftInCalc(calc);
    const node = { type: 'nthroot', deg: '', arg: '' };
    return { ...state, calculator: insertStructuredToken(calc, node, 'deg') };
  }
  const node = { type: 'sqrt', arg: '' };
  return { ...state, calculator: insertStructuredToken(calc, node, 'arg') };
}

export function insertPow(state) {
  let calc = state.calculator.justCalc
    ? prependAnsIfNeeded(state.calculator)
    : state.calculator;
  if (calc.shiftOn) calc = clearShiftInCalc(calc);

  const tok = calc.tokens[calc.cursor];
  if (tok && SLOT_TYPES.includes(tok.type) && calc.fracFocus) {
    const tokens = calc.tokens.map((t, i) =>
      i === calc.cursor ? { ...t, [calc.fracFocus]: (t[calc.fracFocus] ?? '') + '^' } : t
    );
    return { ...state, calculator: { ...calc, tokens } };
  }

  const { calc: nextCalc, base } = grabBase(calc);
  const node = { type: 'pow', base, exp: '' };
  return { ...state, calculator: insertStructuredToken(nextCalc, node, 'exp') };
}

export function insertSq(state) {
  let calc = state.calculator.justCalc
    ? prependAnsIfNeeded(state.calculator)
    : state.calculator;
  const expVal = calc.shiftOn ? '3' : '2';
  if (calc.shiftOn) calc = clearShiftInCalc(calc);

  const tok = calc.tokens[calc.cursor];
  if (tok && SLOT_TYPES.includes(tok.type) && calc.fracFocus) {
    const tokens = calc.tokens.map((t, i) =>
      i === calc.cursor ? { ...t, [calc.fracFocus]: (t[calc.fracFocus] ?? '') + '^' + expVal } : t
    );
    return { ...state, calculator: { ...calc, tokens, fracFocus: null } };
  }

  const { calc: nextCalc, base } = grabBase(calc);
  const node = { type: 'pow', base, exp: expVal };
  return { ...state, calculator: insertStructuredToken(nextCalc, node, null) };
}

export function insertLog(state) {
  // FIX: only reset when justCalc — mid-expression log must not destroy input
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  if (state.calculator.shiftOn) {
    const clearedCalc = clearShiftInCalc(calc);
    return { ...state, calculator: appendToFocus(clearedCalc, '10^(') };
  }
  const node = { type: 'log', base: '', arg: '' };
  return { ...state, calculator: insertStructuredToken(calc, node, 'base') };
}

export function insertSciNotation(state) {
  // FIX: only reset when justCalc — mid-expression sci notation must not destroy input
  const calc = state.calculator.justCalc
    ? resetCalcState(state.calculator)
    : state.calculator;
  const withMul = ensureTextAt(calc, calc.cursor);
  const tokens = withMul.tokens.map((tok, i) =>
    i === withMul.cursor && tok.type === 'text' ? { ...tok, val: tok.val + '×' } : tok
  );
  const node = { type: 'pow', base: '10', exp: '' };
  return { ...state, calculator: insertStructuredToken({ ...withMul, tokens }, node, 'exp') };
}

export function doFn(state, name) {
  const calc = state.calculator;
  const output = (FN_MAP[name] ?? [name + '(', name + '('])[calc.shiftOn ? 1 : 0];
  let nextCalc = calc.justCalc ? { ...calc, justCalc: false } : calc;
  nextCalc = appendToFocus(nextCalc, output);
  if (calc.shiftOn) nextCalc = clearShiftInCalc(nextCalc);
  return { ...state, calculator: nextCalc };
}

// ── DMS CONVERSION ───────────────────────────────────────────────────────────

export function insertDMS(state) {
  const calc = state.calculator;
  if (calc.shiftOn) {
    let nextCalc = clearShiftInCalc(calc);
    const t = getCurrentTextToken(nextCalc.tokens, nextCalc.cursor);
    let val = t ? t.val.trim() : '';
    if (!val && nextCalc.rawResult !== null) val = nextCalc.rawResult.toString();

    const dmsMatch = val.match(/^(-?\d+(?:\.\d+)?)°(\d+(?:\.\d+)?)′(\d+(?:\.\d+)?)″$/);
    if (dmsMatch) {
      const d = parseFloat(dmsMatch[1]), m = parseFloat(dmsMatch[2]), s = parseFloat(dmsMatch[3]);
      const dec = (d < 0 ? -1 : 1) * (Math.abs(d) + m / 60 + s / 3600);
      const str = parseFloat(dec.toPrecision(10)).toString();
      const tokens = nextCalc.tokens.map((tok, i) =>
        i === nextCalc.cursor && tok.type === 'text' ? { ...tok, val: str } : tok
      );
      return { ...state, calculator: { ...nextCalc, tokens } };
    }

    const num = parseFloat(val);
    if (!isNaN(num)) {
      const neg = num < 0;
      const abs = Math.abs(num);
      const d = Math.floor(abs);
      const mTotal = (abs - d) * 60;
      const m = Math.floor(mTotal);
      const s = parseFloat(((mTotal - m) * 60).toPrecision(6));
      const str = (neg ? '-' : '') + d + '°' + m + '′' + s + '″';
      const tokens = nextCalc.tokens.map((tok, i) =>
        i === nextCalc.cursor && tok.type === 'text' ? { ...tok, val: str } : tok
      );
      return { ...state, calculator: { ...nextCalc, tokens } };
    }
    return { ...state, calculator: nextCalc };
  }
  return { ...state, calculator: appendToFocus(calc, '°') };
}

// ── EDIT ─────────────────────────────────────────────────────────────────────

export function doBackspace(state) {
  const calc = state.calculator;
  if (calc.justCalc) return { ...state, calculator: resetCalcState(calc) };
  return { ...state, calculator: applyBackspace(calc) };
}

export function clearEntry(state) {
  const calc = state.calculator;
  const tok = calc.tokens[calc.cursor];
  if (tok && SLOT_TYPES.includes(tok.type) && calc.fracFocus) {
    const tokens = calc.tokens.map((t, i) =>
      i === calc.cursor ? { ...t, [calc.fracFocus]: '' } : t
    );
    return { ...state, calculator: { ...calc, tokens } };
  }
  const tokens = calc.tokens.map((t, i) =>
    i === calc.cursor && t.type === 'text' ? { ...t, val: '' } : t
  );
  return { ...state, calculator: { ...calc, tokens } };
}

export function clearAll(state) {
  return {
    ...state,
    calculator: {
      ...state.calculator,
      tokens: [{ type: 'text', val: '' }],
      cursor: 0,
      fracFocus: null,
      justCalc: false,
      rawResult: null
    }
  };
}

export function doMoveCursor(state, dir) {
  const calc = state.calculator;
  return { ...state, calculator: moveCursor(calc, dir) };
}

// ── MODE / FORMAT ─────────────────────────────────────────────────────────────

export function setMode(state, mode) {
  return { ...state, calculator: { ...state.calculator, mode } };
}

export function setFormat(state, format) {
  return {
    ...state,
    calculator: {
      ...state.calculator,
      ansFormat: format,
      roundDp: null
    }
  };
}

export function setRoundDp(state, dp) {
  return {
    ...state,
    calculator: { ...state.calculator, roundDp: dp, ansFormat: 'round' }
  };
}

// ── SHIFT ─────────────────────────────────────────────────────────────────────

export function toggleShift(state) {
  return {
    ...state,
    calculator: { ...state.calculator, shiftOn: !state.calculator.shiftOn }
  };
}

// Internal helper — clear shift without touching DOM
function clearShiftInCalc(calc) {
  return { ...calc, shiftOn: false };
}

// ── EXTERNAL RESULT ───────────────────────────────────────────────────────────

/**
 * receiveExternalResult
 *
 * Called when an external source (e.g. the f(x) function menu) produces a
 * numeric result that should be placed on the calculator display.
 *
 * The calling module passes only the numeric value and a display label.
 * This action owns all decisions about formatting and token construction.
 * The function menu must not import formatter internals or write calculator
 * state fields directly.
 *
 * @param {object} state         - full store state
 * @param {number} value         - numeric result to display
 * @param {string} displayLabel  - label shown in dispExpr, e.g. "f(3) ="
 */
export function receiveExternalResult(state, value, displayLabel) {
  const calc      = state.calculator;
  const formatted = formatResult(value, calc.ansFormat, calc.roundDp);
  return {
    ...state,
    calculator: {
      ...calc,
      rawResult:           value,
      tokens:              makeResultTokens(formatted),
      cursor:              0,
      fracFocus:           null,
      justCalc:            true,
      pendingDisplayLabel: displayLabel   // render() picks this up to update dispExpr
    }
  };
}
