/**
 * statistics-engine.js
 * Pure statistical calculations. No DOM. No state.
 */

const fmt = v => parseFloat(v.toPrecision(6)).toString();

// ── 1-VARIABLE ────────────────────────────────────────────────────────────────

export function calcOneVar(nums) {
  if (!nums.length) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const n      = nums.length;
  const sum    = nums.reduce((a, b) => a + b, 0);
  const mean   = sum / n;

  const med = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const freq = {};
  nums.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
  const maxF  = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter(k => freq[k] === maxF).map(Number);

  const popVar  = nums.reduce((a, x) => a + (x - mean) ** 2, 0) / n;
  const sampVar = n > 1 ? nums.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1) : 0;
  const sumx2   = nums.reduce((a, x) => a + x * x, 0);

  return {
    sorted,
    n,
    sum:    fmt(sum),
    mean:   fmt(mean),
    median: fmt(med),
    mode:   modes.length > 3 ? modes.slice(0, 3).join(', ') + '…' : modes.join(', '),
    range:  fmt(sorted[n - 1] - sorted[0]),
    popSD:  fmt(Math.sqrt(popVar)),
    sampSD: n > 1 ? fmt(Math.sqrt(sampVar)) : 'N/A',
    sumx2:  fmt(sumx2),
    min:    sorted[0],
    max:    sorted[n - 1]
  };
}

// ── 2-VARIABLE ────────────────────────────────────────────────────────────────

const fmt5 = v => parseFloat(v.toPrecision(5)).toString();

export function calcTwoVar(xs, ys) {
  if (xs.length < 2) return null;

  const n  = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;

  const sdx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) / n);
  const sdy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0) / n);
  const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / n;

  const r = sdx && sdy ? cov / (sdx * sdy) : 0;
  const a = sdx ? cov / (sdx * sdx) : 0;
  const b = my - a * mx;

  return {
    n,
    meanX: fmt5(mx), meanY: fmt5(my),
    sdX:   fmt5(sdx), sdY: fmt5(sdy),
    r:     fmt5(r),
    slope: fmt5(a),
    intercept: fmt5(b),
    regressionLine: `ŷ = ${fmt5(a)}x + ${fmt5(b)}`,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    regrPoints: [
      { x: Math.min(...xs), y: a * Math.min(...xs) + b },
      { x: Math.max(...xs), y: a * Math.max(...xs) + b }
    ],
    scatterData: xs.map((x, i) => ({ x, y: ys[i] }))
  };
}
