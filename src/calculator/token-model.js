/**
 * token-model.js
 * Pure functions for reading and mutating the token array.
 * No DOM access. No side effects.
 * All functions take a calculator state slice and return a new one.
 */

import { SLOT_TYPES, MAX_TEXT_LENGTH } from '../shared/constants.js';

// ── READERS ────────────────────────────────────────────────────────────────

function getCurrentToken(tokens, cursor) {
  return tokens[cursor] ?? null;
}

export function getCurrentTextToken(tokens, cursor) {
  const t = tokens[cursor];
  return t && t.type === 'text' ? t : null;
}

function isInSlot(tokens, cursor, fracFocus) {
  const t = tokens[cursor];
  return t && SLOT_TYPES.includes(t.type) && fracFocus != null;
}

/** Returns the active string segment (for decimal-point duplicate prevention) */
export function getActiveSegment(tokens, cursor, fracFocus) {
  const tok = tokens[cursor];
  if (tok && SLOT_TYPES.includes(tok.type) && fracFocus) {
    return tok[fracFocus] ?? '';
  }
  const t = getCurrentTextToken(tokens, cursor);
  if (!t) return '';
  const m = t.val.match(/[\d.]*$/);
  return m ? m[0] : '';
}

// ── MUTATIONS (return new state slices) ────────────────────────────────────

/**
 * Append a string to the focused slot or current text token.
 * Returns updated { tokens, cursor, fracFocus } — immutably.
 */
export function appendToFocus(calc, str) {
  const { cursor, fracFocus } = calc;
  const tokens = calc.tokens.map(t => ({ ...t })); // shallow clone each token
  const tok = tokens[cursor];

  if (tok && SLOT_TYPES.includes(tok.type) && fracFocus) {
    const current = tok[fracFocus] ?? '';
    if (current.replace(/[^0-9.]/g, '').length >= MAX_TEXT_LENGTH) return calc;
    tokens[cursor] = { ...tok, [fracFocus]: current + str };
    return { ...calc, tokens };
  }

  const t = tok && tok.type === 'text' ? tok : null;
  if (t) {
    if (t.val.replace(/[^0-9.]/g, '').length >= MAX_TEXT_LENGTH) return calc;
    tokens[cursor] = { ...t, val: t.val + str };
    return { ...calc, tokens };
  }

  // No text token at cursor — insert one after
  const next = cursor + 1;
  const newTokens = [...tokens];
  if (next >= newTokens.length || newTokens[next].type !== 'text') {
    newTokens.splice(next, 0, { type: 'text', val: '' });
  }
  newTokens[next] = { ...newTokens[next], val: newTokens[next].val + str };
  return { ...calc, tokens: newTokens, cursor: next, fracFocus: null };
}

/**
 * Pull the trailing base value from the current text token (for □^□ and □²).
 * Returns { calc: newCalcState, base: string }
 */
export function grabBase(calc) {
  const { cursor, fracFocus } = calc;
  const tokens = calc.tokens.map(t => ({ ...t }));
  const tok = tokens[cursor];

  if (tok && SLOT_TYPES.includes(tok.type) && fracFocus) {
    const v = tok[fracFocus] ?? '';
    const m = v.match(/([\w.π]+)$/);
    if (m) {
      tokens[cursor] = { ...tok, [fracFocus]: v.slice(0, v.length - m[0].length) };
      return { calc: { ...calc, tokens }, base: m[0] };
    }
    return { calc, base: '' };
  }

  const t = tok && tok.type === 'text' ? tok : null;
  if (t && t.val) {
    // Grab whole bracketed expression if ends with )
    if (t.val.endsWith(')')) {
      let depth = 0, i = t.val.length - 1;
      for (; i >= 0; i--) {
        if (t.val[i] === ')') depth++;
        else if (t.val[i] === '(') depth--;
        if (depth === 0) break;
      }
      if (i >= 0) {
        const base = t.val.slice(i);
        tokens[cursor] = { ...t, val: t.val.slice(0, i) };
        return { calc: { ...calc, tokens }, base };
      }
    }
    const m = t.val.match(/([\w.π]+)$/);
    if (m) {
      tokens[cursor] = { ...t, val: t.val.slice(0, t.val.length - m[0].length) };
      return { calc: { ...calc, tokens }, base: m[0] };
    }
  }
  return { calc, base: '' };
}

/**
 * Insert a structured token (frac, sqrt, pow, etc.) after the current cursor.
 * Returns new calc state with cursor moved into the new token.
 */
export function insertStructuredToken(calc, node, focusSlot) {
  const { cursor } = calc;
  const after = { type: 'text', val: '' };
  const before = calc.tokens.slice(0, cursor + 1);
  const rest   = calc.tokens.slice(cursor + 1);
  const tokens = [...before, node, after, ...rest];
  return { ...calc, tokens, cursor: before.length, fracFocus: focusSlot };
}

/**
 * Ensure a text token exists at idx, inserting one if needed.
 * Returns new calc state.
 */
export function ensureTextAt(calc, idx) {
  const tokens = [...calc.tokens];
  if (idx >= tokens.length || tokens[idx].type !== 'text') {
    tokens.splice(idx, 0, { type: 'text', val: '' });
  }
  return { ...calc, tokens, cursor: idx, fracFocus: null };
}

// ── BACKSPACE ───────────────────────────────────────────────────────────────

export function applyBackspace(calc) {
  const { cursor, fracFocus } = calc;
  const tokens = calc.tokens.map(t => ({ ...t }));
  const tok = tokens[cursor];

  if (tok && SLOT_TYPES.includes(tok.type) && fracFocus) {
    if (tok[fracFocus].length > 0) {
      tokens[cursor] = { ...tok, [fracFocus]: tok[fracFocus].slice(0, -1) };
      return { ...calc, tokens };
    }
    // Slot is empty — collapse the structured token
    const pi = cursor - 1;
    const ni = cursor + 1;
    const pv = (pi >= 0 && tokens[pi].type === 'text') ? tokens[pi].val : null;
    const nv = (ni < tokens.length && tokens[ni].type === 'text') ? tokens[ni].val : null;
    const merged = (pv ?? '') + (nv ?? '');
    const ss = pv !== null ? pi : cursor;
    const sc = 1 + (pv !== null ? 1 : 0) + (nv !== null ? 1 : 0);
    tokens.splice(ss, sc, { type: 'text', val: merged });
    return { ...calc, tokens, cursor: ss, fracFocus: null };
  }

  const t = tok && tok.type === 'text' ? tok : null;
  if (t && t.val.length > 0) {
    tokens[cursor] = { ...t, val: t.val.slice(0, -1) };
    return { ...calc, tokens };
  }

  if (cursor > 0) {
    return { ...calc, cursor: cursor - 1, fracFocus: getDefaultFocus(tokens[cursor - 1], 'end') };
  }

  return calc;
}

// ── CURSOR MOVEMENT ─────────────────────────────────────────────────────────

function getDefaultFocus(token, side) {
  if (!token) return null;
  if (token.type === 'frac')    return side === 'end' ? 'den' : 'num';
  if (token.type === 'sqrt')    return 'arg';
  if (token.type === 'nthroot') return side === 'end' ? 'arg' : 'deg';
  if (token.type === 'pow')     return side === 'end' ? 'exp' : 'base';
  if (token.type === 'log')     return side === 'end' ? 'arg' : 'base';
  if (token.type === 'mixed')   return side === 'end' ? 'den' : 'whole';
  return null;
}

export function moveCursor(calc, dir) {
  let { tokens, cursor, fracFocus } = calc;
  const tok = tokens[cursor];

  if (dir === 'up') {
    if (tok?.type === 'frac' || tok?.type === 'mixed') return { ...calc, fracFocus: 'num' };
    if (tok?.type === 'pow')  return { ...calc, fracFocus: 'exp' };
    return calc;
  }

  if (dir === 'down') {
    if (tok?.type === 'frac' || tok?.type === 'mixed') return { ...calc, fracFocus: 'den' };
    return calc;
  }

  if (dir === 'left') {
    const next = moveLeft(tokens, cursor, fracFocus);
    return { ...calc, ...next };
  }

  if (dir === 'right') {
    const next = moveRight(tokens, cursor, fracFocus);
    return { ...calc, ...next };
  }

  return calc;
}

function moveLeft(tokens, cursor, fracFocus) {
  const tok = tokens[cursor];
  if (tok?.type === 'frac' && fracFocus === 'den')    return { cursor, fracFocus: 'num' };
  if (tok?.type === 'mixed') {
    if (fracFocus === 'den') return { cursor, fracFocus: 'num' };
    if (fracFocus === 'num') return { cursor, fracFocus: 'whole' };
  }
  if (tok?.type === 'log' && fracFocus === 'arg')      return { cursor, fracFocus: 'base' };
  if (tok?.type === 'nthroot' && fracFocus === 'arg')  return { cursor, fracFocus: 'deg' };
  if (tok?.type === 'pow' && fracFocus === 'exp')      return { cursor, fracFocus: 'base' };
  if (cursor > 0) {
    const prev = cursor - 1;
    return { cursor: prev, fracFocus: getDefaultFocus(tokens[prev], 'end') };
  }
  return { cursor, fracFocus };
}

function moveRight(tokens, cursor, fracFocus) {
  const tok = tokens[cursor];
  if (tok?.type === 'frac' && fracFocus === 'num')     return { cursor, fracFocus: 'den' };
  if (tok?.type === 'mixed') {
    if (fracFocus === 'whole') return { cursor, fracFocus: 'num' };
    if (fracFocus === 'num')   return { cursor, fracFocus: 'den' };
  }
  if (tok?.type === 'log' && fracFocus === 'base')     return { cursor, fracFocus: 'arg' };
  if (tok?.type === 'nthroot' && fracFocus === 'deg')  return { cursor, fracFocus: 'arg' };
  if (tok?.type === 'pow' && fracFocus === 'base')     return { cursor, fracFocus: 'exp' };
  if (cursor < tokens.length - 1) {
    const next = cursor + 1;
    return { cursor: next, fracFocus: getDefaultFocus(tokens[next], 'start') };
  }
  return { cursor, fracFocus };
}

// ── TOKEN CLASS ───────────────────────────────────────────────────────────────

/**
 * Returns the CSS class modifier for a text token based on its value.
 * Keeping classification here means render-display.js never re-parses content.
 * @param {string} val - the text token value
 * @returns {'op'|'fn'|null}
 */
export function getTokenClass(val) {
  if (/^[+\-×÷\/%^]+$/.test(val)) return 'op';
  if (/[a-zA-Zπφ]/.test(val))     return 'fn';
  return null;
}
