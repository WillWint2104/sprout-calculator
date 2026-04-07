/**
 * function-evaluator.js
 * Evaluates f(x), g(x), f(g(x)), g(f(x)) for a given x value.
 * Pure. No DOM. No state.
 *
 * Uses normaliseExpression from shared/math-utils.js — the same pipeline
 * as the main calculator evaluator, so trig, log, and other functions
 * behave identically in both contexts.
 */

import { normaliseExpression, runExpression } from '../shared/math-utils.js';

/**
 * Evaluate a single function expression at a given x value.
 * @param {string} expr - the function body, e.g. "x^2 + sin(x)"
 * @param {number} x    - the value to substitute
 * @param {string} mode - 'deg' | 'rad'
 * @returns {number}
 */
function evalFnExpr(expr, x, mode = 'deg') {
  const js = normaliseExpression(expr, mode, x);
  const outcome = runExpression(js);
  if (outcome.error) throw new Error(outcome.error);
  return outcome.value;
}

/**
 * @param {'f'|'g'|'fg'|'gf'} type
 * @param {{ f: string, g: string }} defs
 * @param {number} xVal
 * @param {string} [mode='deg']
 * @returns {{ result: number, label: string } | { error: string }}
 */
export function evaluateFn(type, defs, xVal, mode = 'deg') {
  try {
    const labels = {
      f:  `f(${xVal})`,
      g:  `g(${xVal})`,
      fg: `f(g(${xVal}))`,
      gf: `g(f(${xVal}))`
    };

    let result;
    if      (type === 'f')  result = evalFnExpr(defs.f, xVal, mode);
    else if (type === 'g')  result = evalFnExpr(defs.g, xVal, mode);
    else if (type === 'fg') result = evalFnExpr(defs.f, evalFnExpr(defs.g, xVal, mode), mode);
    else if (type === 'gf') result = evalFnExpr(defs.g, evalFnExpr(defs.f, xVal, mode), mode);
    else return { error: 'Unknown type' };

    return { result, label: labels[type] };
  } catch (e) {
    return { error: e.message };
  }
}
