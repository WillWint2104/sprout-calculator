/**
 * function-menu-controller.js
 * Owns all event wiring for the f(x)/g(x) function editor overlay.
 *
 * Boundary: this module reads/writes only state.functions.
 * When a result is produced, it calls receiveExternalResult() — a calculator
 * action — passing only the numeric value and display label.
 * It does not import formatter internals or write calculator state directly.
 */

import { evaluateFn }           from './function-evaluator.js';
import { receiveExternalResult } from '../calculator/input-actions.js';

export function createFunctionMenuController(store) {
  // Local UI buffers — transient UI state, not worth storing globally
  let exprBuf  = '';
  let evalBuf  = '';
  let menuMode = null; // 'def-f' | 'def-g' | 'eval-f' | 'eval-g' | 'eval-fg' | 'eval-gf'

  // Callback used by calculator-controller to trigger a re-render after
  // receiveExternalResult writes into the calculator state slice.
  // Set via setCalcRender() below.
  let calcRender = null;

  function init() {
    bindOverlayClose();
    bindModeButtons();
    bindDefPad();
    bindEvalPad();
    bindSaveButton();
    bindEvalGoButton();
  }

  /**
   * Called by bootstrap to give this controller a way to trigger a
   * calculator render after writing a result into calculator state.
   * This avoids a direct import of calculator-controller.
   */
  function setCalcRender(renderFn) {
    calcRender = renderFn;
  }

  // ── OVERLAY ────────────────────────────────────────────────────────────────

  function bindOverlayClose() {
    const overlay = document.getElementById('fnMenuOverlay');
    overlay?.addEventListener('click', e => {
      if (e.target === overlay) closeMenu();
    });
    document.getElementById('fnMenuClose')?.addEventListener('click', closeMenu);
  }

  /**
   * FIX 4: openMenu() is the single entry point for opening the overlay.
   * It always calls updateDefsDisplay() so the panel is never stale.
   * bootstrap.js passes this function to calculator-controller via
   * setFnMenuOpener(), replacing the previous direct classList.add('open').
   */
  function openMenu() {
    document.getElementById('fnMenuOverlay')?.classList.add('open');
    updateDefsDisplay();
  }

  function closeMenu() {
    document.getElementById('fnMenuOverlay')?.classList.remove('open');
    menuMode = null;
    ['fnDefFx','fnDefGx','fnEvalFx','fnEvalGx','fnEvalFG','fnEvalGF'].forEach(id => {
      document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById('fnDefRow').style.display  = 'none';
    document.getElementById('fnEvalRow').style.display = 'none';
  }

  // ── MODE BUTTONS ────────────────────────────────────────────────────────────

  function bindModeButtons() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-fn-action]');
      if (!btn) return;
      const action = btn.dataset.fnAction;
      if (action.startsWith('def-'))  selectDefMode(action.slice(4));
      if (action.startsWith('eval-')) selectEvalMode(action.slice(5));
    });
  }

  function selectDefMode(fn) {
    menuMode = 'def-' + fn;
    document.getElementById('fnDefFx')?.classList.toggle('active', fn === 'f');
    document.getElementById('fnDefGx')?.classList.toggle('active', fn === 'g');
    ['fnEvalFx','fnEvalGx','fnEvalFG','fnEvalGF'].forEach(id =>
      document.getElementById(id)?.classList.remove('active')
    );
    document.getElementById('fnEvalRow').style.display = 'none';
    document.getElementById('fnDefLabel').textContent  = (fn === 'f' ? 'f' : 'g') + '(x) =';

    const defs = store.getState().functions.defs;
    exprBuf = defs[fn] || '';
    document.getElementById('fnDefDisplay').textContent = exprBuf;
    document.getElementById('fnDefRow').style.display   = 'block';
  }

  function selectEvalMode(type) {
    menuMode = 'eval-' + type;
    ['fnEvalFx','fnEvalGx','fnEvalFG','fnEvalGF'].forEach(id =>
      document.getElementById(id)?.classList.remove('active')
    );
    const idMap = { f: 'fnEvalFx', g: 'fnEvalGx', fg: 'fnEvalFG', gf: 'fnEvalGF' };
    if (idMap[type]) document.getElementById(idMap[type])?.classList.add('active');
    ['fnDefFx','fnDefGx'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById('fnDefRow').style.display = 'none';

    const labels = { f: 'f(x): x =', g: 'g(x): x =', fg: 'f(g(x)): x =', gf: 'g(f(x)): x =' };
    document.getElementById('fnEvalLabel').textContent    = labels[type] || 'x =';
    document.getElementById('fnEvalRow').style.display    = 'flex';
    document.getElementById('fnEvalResult').style.display = 'none';
    document.getElementById('fnEvalInput').value          = '';
    evalBuf = '';
    document.getElementById('fnEvalInput')?.focus();
  }

  // ── DEFINE PAD ────────────────────────────────────────────────────────────

  function bindDefPad() {
    document.addEventListener('mousedown', e => {
      const btn = e.target.closest('[data-fn-pad]');
      if (!btn) return;
      e.stopPropagation();
      exprBuf += btn.dataset.fnPad;
      document.getElementById('fnDefDisplay').textContent = exprBuf;
    });

    document.getElementById('fnPadDel')?.addEventListener('mousedown', e => {
      e.stopPropagation();
      exprBuf = exprBuf.slice(0, -1);
      document.getElementById('fnDefDisplay').textContent = exprBuf;
    });

    const fnEvalInput = document.getElementById('fnEvalInput');
    fnEvalInput?.addEventListener('input', () => {
      evalBuf = fnEvalInput.value;
    });
  }

  // ── EVAL PAD ──────────────────────────────────────────────────────────────

  function bindEvalPad() {
    document.addEventListener('mousedown', e => {
      const btn = e.target.closest('[data-fn-eval]');
      if (!btn) return;
      e.stopPropagation();
      evalBuf += btn.dataset.fnEval;
      const input = document.getElementById('fnEvalInput');
      if (input) input.value = evalBuf;
    });

    document.getElementById('fnEvalPadDel')?.addEventListener('mousedown', e => {
      e.stopPropagation();
      evalBuf = evalBuf.slice(0, -1);
      const input = document.getElementById('fnEvalInput');
      if (input) input.value = evalBuf;
    });

    document.getElementById('fnEvalInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.stopPropagation(); runEval(); }
    });
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────

  function bindSaveButton() {
    document.getElementById('fnSaveBtn')?.addEventListener('click', saveDef);
  }

  function saveDef() {
    if (!menuMode || !menuMode.startsWith('def-')) return;
    const fn = menuMode.slice(4);
    store.update(state => ({
      ...state,
      functions: {
        ...state.functions,
        defs: { ...state.functions.defs, [fn]: exprBuf.trim() }
      }
    }));
    updateDefsDisplay();
    document.getElementById('fnDefRow').style.display = 'none';
    document.getElementById(fn === 'f' ? 'fnDefFx' : 'fnDefGx')?.classList.remove('active');
    menuMode = null;
  }

  // ── EVALUATE ──────────────────────────────────────────────────────────────

  function bindEvalGoButton() {
    document.getElementById('fnEvalGoBtn')?.addEventListener('click', runEval);
  }

  function runEval() {
    const raw = (document.getElementById('fnEvalInput')?.value ?? '').trim();
    if (!raw) { alert('Enter a value for x'); return; }
    const xVal = parseFloat(raw);
    if (isNaN(xVal)) { alert('x must be a number'); return; }

    const type = menuMode ? menuMode.slice(5) : 'f';
    const defs = store.getState().functions.defs;
    const mode = store.getState().calculator.mode;

    if ((type === 'f' || type === 'fg' || type === 'gf') && !defs.f) {
      alert('Please define f(x) first.'); return;
    }
    if ((type === 'g' || type === 'fg' || type === 'gf') && !defs.g) {
      alert('Please define g(x) first.'); return;
    }

    const outcome = evaluateFn(type, defs, xVal, mode);

    if (outcome.error) {
      alert('Error: ' + outcome.error);
      return;
    }

    // Show result inside the fn menu panel
    const resultEl = document.getElementById('fnEvalResult');
    if (resultEl) {
      resultEl.textContent = `${outcome.label} = ${outcome.result}`;
      resultEl.style.display = 'block';
    }

    // FIX 3: Push result into calculator via the dedicated action.
    // This module no longer imports formatter.js or writes calculator
    // internals (tokens, cursor, fracFocus, justCalc, rawResult) directly.
    const displayLabel = `${outcome.label} =`;
    store.update(state => receiveExternalResult(state, outcome.result, displayLabel));

    // Trigger a calculator render so the display updates immediately.
    if (calcRender) calcRender();
  }

  // ── DEFS DISPLAY ──────────────────────────────────────────────────────────

  function updateDefsDisplay() {
    const defs  = store.getState().functions.defs;
    const parts = [];
    if (defs.f) parts.push('f(x) = ' + defs.f);
    if (defs.g) parts.push('g(x) = ' + defs.g);
    const el = document.getElementById('fnDefsText');
    if (el) el.textContent = parts.length ? parts.join('   |   ') : 'None defined';
  }

  function render() {
    // fn menu renders on-demand only
  }

  return { init, render, openMenu, setCalcRender };
}
