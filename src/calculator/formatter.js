/**
 * formatter.js
 * Formats a numeric result into a display string.
 * Pure functions. No DOM. No state.
 */

// ── FRACTION UTILITIES ───────────────────────────────────────────────────────

function toFraction(x, maxDen = 1000) {
  if (Number.isInteger(x)) return [x, 1];
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = x;
  do {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    h2 = h1; h1 = h;
    k2 = k1; k1 = k;
    b = 1 / (b - a);
    if (k1 > maxDen) break;
  } while (Math.abs(x - h1 / k1) > 1e-9);
  if (k1 > maxDen) return null;
  return [sign * h1, k1];
}

function checkSurd(x) {
  for (let n = 2; n <= 200; n++) {
    const sq = Math.sqrt(n);
    if (Math.abs(x - sq)     < 1e-9) return `√${n}`;
    if (Math.abs(x + sq)     < 1e-9) return `-√${n}`;
    if (Math.abs(x - sq / 2) < 1e-9) return `√${n}/2`;
    if (Math.abs(x - sq * 2) < 1e-9) return `2√${n}`;
  }
  return null;
}

// ── MAIN FORMATTER ───────────────────────────────────────────────────────────

/**
 * Format a number for display.
 * @param {number} n
 * @param {string} format  - 'decimal' | 'fraction' | 'mixed' | 'exact' | 'round'
 * @param {number|null} roundDp
 * @returns {string}
 */
export function formatResult(n, format, roundDp) {
  if (!isFinite(n) || isNaN(n)) return isNaN(n) ? 'ERROR' : '∞';

  if (format === 'round' && roundDp !== null) {
    return n.toFixed(roundDp);
  }

  if (format === 'decimal') {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
    if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-4 && n !== 0)) {
      const s = n.toPrecision(7);
      const [coef, exp] = s.split('e');
      if (exp) return `${parseFloat(coef).toString()}×10^${parseInt(exp, 10)}`;
    }
    return parseFloat(n.toPrecision(12)).toString();
  }

  if (format === 'fraction' || format === 'mixed') {
    const f = toFraction(n);
    if (!f) return parseFloat(n.toPrecision(10)).toString();
    const [num, den] = f;
    if (den === 1) return num.toString();
    if (format === 'mixed' && Math.abs(num) >= den) {
      const w = Math.trunc(num / den);
      const r = Math.abs(num) % den;
      return r === 0 ? w.toString() : `${w} ${r}/${den}`;
    }
    return `${num}/${den}`;
  }

  if (format === 'exact') {
    const surd = checkSurd(n);
    if (surd) return surd;
    const f = toFraction(n);
    if (f) {
      const [num, den] = f;
      return den === 1 ? num.toString() : `${num}/${den}`;
    }
    return parseFloat(n.toPrecision(10)).toString();
  }

  return n.toString();
}

// ── RESULT → TOKEN ARRAY ─────────────────────────────────────────────────────

/**
 * Turn a formatted string into a token array for display.
 * Handles fractions and mixed numbers as structured tokens.
 */
export function makeResultTokens(formatted) {
  const fracMatch = formatted.match(/^(-?\d+)\/(\d+)$/);
  if (fracMatch) {
    return [
      { type: 'text', val: '' },
      { type: 'frac', num: fracMatch[1], den: fracMatch[2] },
      { type: 'text', val: '' }
    ];
  }
  const mixedMatch = formatted.match(/^(-?\d+) (\d+)\/(\d+)$/);
  if (mixedMatch) {
    return [
      { type: 'text', val: mixedMatch[1] + ' ' },
      { type: 'frac', num: mixedMatch[2], den: mixedMatch[3] },
      { type: 'text', val: '' }
    ];
  }
  return [{ type: 'text', val: formatted }];
}
