/**
 * statistics-controller.js
 * Owns all statistics DOM event wiring.
 * Calls statistics-engine (pure) and updates DOM directly.
 * Completely isolated from calculator internals.
 */

import { calcOneVar, calcTwoVar } from './statistics-engine.js';

export function createStatisticsController(store) {
  let chart1 = null;
  let chart2 = null;
  let twoVarRows = [];

  function init() {
    bindStatsModeButtons();
    bindOneVar();
    bindTwoVar();

    // Initialise 2-var table with 6 rows
    for (let i = 0; i < 6; i++) addTwoVarRow();
  }

  // ── MODE SWITCHING ────────────────────────────────────────────────────────

  function bindStatsModeButtons() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-stats-mode]');
      if (!btn) return;
      const mode = btn.dataset.statsMode;
      setStatsMode(mode);
    });
  }

  function setStatsMode(mode) {
    store.update(state => ({ ...state, statistics: { ...state.statistics, mode } }));

    document.getElementById('stb-1var')?.classList.toggle('active', mode === '1var');
    document.getElementById('stb-2var')?.classList.toggle('active', mode === '2var');
    const p1 = document.getElementById('stats-1var-panel');
    const p2 = document.getElementById('stats-2var-panel');
    if (p1) p1.style.display = mode === '1var' ? 'block' : 'none';
    if (p2) p2.style.display = mode === '2var' ? 'block' : 'none';
  }

  // ── 1-VAR ─────────────────────────────────────────────────────────────────

  function bindOneVar() {
    document.getElementById('calcStats1Btn')?.addEventListener('click', runOneVar);
  }

  function runOneVar() {
    const raw  = document.getElementById('statsInput1')?.value ?? '';
    const nums = raw.split(/[\s,\n]+/).map(Number).filter(n => !isNaN(n) && String(n) !== '');
    if (!nums.length) return;

    const r = calcOneVar(nums);
    if (!r) return;

    document.getElementById('statsSorted1').textContent = r.sorted.join(', ');
    document.getElementById('s1-n').textContent      = r.n;
    document.getElementById('s1-sum').textContent    = r.sum;
    document.getElementById('s1-mean').textContent   = r.mean;
    document.getElementById('s1-med').textContent    = r.median;
    document.getElementById('s1-mode').textContent   = r.mode;
    document.getElementById('s1-range').textContent  = r.range;
    document.getElementById('s1-popsd').textContent  = r.popSD;
    document.getElementById('s1-sampsd').textContent = r.sampSD;
    document.getElementById('s1-sumx2').textContent  = r.sumx2;
    document.getElementById('s1-minmax').textContent = `${r.min} / ${r.max}`;

    if (chart1) chart1.destroy();
    const ctx = document.getElementById('statsChart1')?.getContext('2d');
    if (!ctx) return;
    chart1 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: nums.map(String),
        datasets: [{
          data: nums,
          backgroundColor: 'rgba(46,125,82,.6)',
          borderColor: '#2e7d52',
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 9 } } }
        }
      }
    });
  }

  // ── 2-VAR ─────────────────────────────────────────────────────────────────

  function bindTwoVar() {
    document.getElementById('twovarAddRowBtn')?.addEventListener('click', addTwoVarRow);
    document.getElementById('calcStats2Btn')?.addEventListener('click', runTwoVar);
  }

  function addTwoVarRow() {
    const tbody = document.getElementById('twovarBody');
    if (!tbody) return;
    const idx = twoVarRows.length;
    const tr  = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-light);font-size:11px;padding:4px 8px;font-family:'DM Mono',monospace">${idx + 1}</td>
      <td><input type="number" placeholder="x" id="tvx${idx}"></td>
      <td><input type="number" placeholder="y" id="tvy${idx}"></td>
    `;
    tbody.appendChild(tr);
    twoVarRows.push(idx);
  }

  function runTwoVar() {
    const xs = [], ys = [];
    twoVarRows.forEach(i => {
      const x = parseFloat(document.getElementById(`tvx${i}`)?.value);
      const y = parseFloat(document.getElementById(`tvy${i}`)?.value);
      if (!isNaN(x) && !isNaN(y)) { xs.push(x); ys.push(y); }
    });
    if (xs.length < 2) return;

    const r = calcTwoVar(xs, ys);
    if (!r) return;

    document.getElementById('s2-n').textContent         = r.n;
    document.getElementById('s2-meanx').textContent     = r.meanX;
    document.getElementById('s2-meany').textContent     = r.meanY;
    document.getElementById('s2-sdx').textContent       = r.sdX;
    document.getElementById('s2-sdy').textContent       = r.sdY;
    document.getElementById('s2-r').textContent         = r.r;
    document.getElementById('s2-a').textContent         = r.slope;
    document.getElementById('s2-b').textContent         = r.intercept;
    document.getElementById('s2-line').textContent      = r.regressionLine;

    if (chart2) chart2.destroy();
    const ctx = document.getElementById('statsChart2')?.getContext('2d');
    if (!ctx) return;
    chart2 = new Chart(ctx, {
      data: {
        datasets: [
          {
            type: 'scatter',
            label: 'Data',
            data: r.scatterData,
            backgroundColor: 'rgba(46,125,82,.7)',
            pointRadius: 5
          },
          {
            type: 'line',
            label: r.regressionLine,
            data: r.regrPoints,
            borderColor: '#d4732a',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { type: 'linear', ticks: { font: { size: 9 } } },
          y: { type: 'linear', ticks: { font: { size: 9 } } }
        },
        plugins: { legend: { labels: { font: { size: 10 } } } }
      }
    });
  }

  function render() {
    // Statistics renders on-demand via button clicks, not on store change
  }

  return { init, render };
}
