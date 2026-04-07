/**
 * calculator-controller.js
 * Owns all calculator DOM event wiring and orchestrates renders.
 * Calls actions (pure) → updates store → calls renderers (DOM only).
 * This file coordinates — it does not contain logic or rendering itself.
 */

import { SHIFT_DEFS } from '../shared/constants.js';
import { renderDisplay } from './render-display.js';
import { renderHistory }  from './render-history.js';
import { buildDisplayExpr, buildEvalExpr, evaluate } from './evaluator.js';
import { formatResult, makeResultTokens } from './formatter.js';
import {
  inputNum, inputDot, inputAns,
  insertText, insertMul, insertDiv,
  insertFraction, insertSqrt, insertPow, insertSq,
  insertLog, insertSciNotation,
  doFn, insertDMS, toggleSign,
  doBackspace, clearEntry, clearAll,
  doMoveCursor,
  setMode, setFormat, setRoundDp,
  toggleShift
} from './input-actions.js';

export function createCalculatorController(store) {
  // ── DOM REFERENCES ──────────────────────────────────────────────────────────
  const dispExpr     = document.getElementById('dispExpr');
  const dispRender   = document.getElementById('dispRender');
  const historyList  = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const calcApp      = document.getElementById('calcApp');
  const shiftInd     = document.getElementById('shiftInd');
  const ansInd       = document.getElementById('ansInd');
  const roundWrap    = document.getElementById('roundWrap');
  const roundPopover = document.getElementById('roundPopover');
  const roundDpInput = document.getElementById('roundDpInput');

  // Callback set by bootstrap so the fn-menu button can call openMenu()
  // without the controller importing function-menu-controller directly.
  // Set via setFnMenuOpener() below.
  let fnMenuOpener = null;

  // ── INIT ────────────────────────────────────────────────────────────────────

  function init() {
    bindKeypad();
    bindFormatBar();
    bindHistoryPanel();
    bindSidebar();
    bindKeyboard();
    bindRoundPopover();
    render();
  }

  /**
   * Called by bootstrap after both controllers are created, to wire the
   * fn-menu open callback without creating a direct import dependency.
   * Fix 4: ensures fn-menu opens via openMenu() every time.
   */
  function setFnMenuOpener(opener) {
    fnMenuOpener = opener;
  }

  // ── EVENT BINDING ────────────────────────────────────────────────────────────

  function bindKeypad() {
    document.getElementById('calcApp').addEventListener('click', e => {
      // Ignore clicks that originate inside fn-menu-overlay
      if (e.target.closest('.fn-menu-overlay')) return;

      const btn = e.target.closest('button');
      if (!btn) return;

      // FIX 2: Let router.js handle module-switch buttons — do not consume them here.
      // Without this guard the click was silently dropped when the statistics
      // button inside #calcApp was pressed, because no switch case matched it.
      if (btn.dataset.module !== undefined) return;

      // Number keys
      if (btn.dataset.num !== undefined) { act(s => inputNum(s, btn.dataset.num)); return; }

      // Text insert (operators, brackets)
      if (btn.dataset.text !== undefined) { act(s => insertText(s, btn.dataset.text)); return; }

      // Function keys (sin, cos, etc.)
      if (btn.dataset.fn !== undefined) { act(s => doFn(s, btn.dataset.fn)); return; }

      // Cursor arrow keys
      if (btn.dataset.cursor !== undefined) { act(s => doMoveCursor(s, btn.dataset.cursor)); return; }

      // Mode buttons (DEG/RAD) — handled here, not by router
      if (btn.dataset.mode !== undefined) { act(s => setMode(s, btn.dataset.mode)); return; }

      // Named actions
      switch (btn.dataset.action) {
        case 'shift':       act(toggleShift); break;
        case 'ans':         act(inputAns); break;
        case 'frac':        act(insertFraction); break;
        case 'sqrt':        act(insertSqrt); break;
        case 'pow':         act(insertPow); break;
        case 'sq':          act(insertSq); break;
        case 'log':         act(insertLog); break;
        case 'sci':         act(insertSciNotation); break;
        case 'mul':         act(insertMul); break;
        case 'div':         act(insertDiv); break;
        case 'dot':         act(inputDot); break;
        case 'sign':        act(toggleSign); break;
        case 'dms':         act(insertDMS); break;
        case 'backspace':   act(doBackspace); break;
        case 'ce':          act(clearEntry); break;
        case 'ac':          act(clearAll); break;
        case 'calculate':   calculate(); break;
        case 'toggle-round': toggleRoundPopover(); break;
        case 'fn-menu':
          // FIX 4: Call through fnMenuOpener so openMenu() runs and
          // updateDefsDisplay() is always called on open.
          if (fnMenuOpener) fnMenuOpener();
          break;
      }
    });
  }

  function bindFormatBar() {
    document.getElementById('formatBar')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-format]');
      if (btn) { act(s => setFormat(s, btn.dataset.format)); return; }
    });

    // OK button inside round popover
    document.getElementById('roundGoBtn')?.addEventListener('mousedown', e => {
      e.stopPropagation();
      applyRound();
    });

    // Close popover on outside click
    document.addEventListener('mousedown', e => {
      if (!roundWrap?.contains(e.target)) closeRoundPopover();
    });
  }

  function bindHistoryPanel() {
    document.getElementById('historyToggle')?.addEventListener('click', () => {
      document.getElementById('historyPanel').classList.toggle('collapsed');
    });

    document.getElementById('historyClearBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      store.update(state => ({ ...state, history: { items: [] } }));
      render();
    });
  }

  function bindSidebar() {
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
      const device = document.getElementById('device');
      const collapsed = device.classList.toggle('sidebar-collapsed');
      document.getElementById('sidebarChevron').style.transform =
        collapsed ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (!document.getElementById('module-calculator').classList.contains('active')) return;
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key >= '0' && e.key <= '9')      { e.preventDefault(); act(s => inputNum(s, e.key)); }
      else if (e.key === '.')                  { e.preventDefault(); act(inputDot); }
      else if (e.key === '+')                  { e.preventDefault(); act(s => insertText(s, '+')); }
      else if (e.key === '-')                  { e.preventDefault(); act(s => insertText(s, '-')); }
      else if (e.key === '*')                  { e.preventDefault(); act(insertMul); }
      else if (e.key === '/')                  { e.preventDefault(); act(insertDiv); }
      else if (e.key === '%')                  { e.preventDefault(); act(s => insertText(s, '%')); }
      else if (e.key === '(')                  { e.preventDefault(); act(s => insertText(s, '(')); }
      else if (e.key === ')')                  { e.preventDefault(); act(s => insertText(s, ')')); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace')          { e.preventDefault(); act(doBackspace); }
      else if (e.key === 'Escape')             { e.preventDefault(); act(clearAll); }
      else if (e.key === 'ArrowLeft')          { e.preventDefault(); act(s => doMoveCursor(s, 'left')); }
      else if (e.key === 'ArrowRight')         { e.preventDefault(); act(s => doMoveCursor(s, 'right')); }
      else if (e.key === 'ArrowUp')            { e.preventDefault(); act(s => doMoveCursor(s, 'up')); }
      else if (e.key === 'ArrowDown')          { e.preventDefault(); act(s => doMoveCursor(s, 'down')); }
    });
  }

  function bindRoundPopover() {
    roundDpInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.stopPropagation(); applyRound(); }
    });
  }

  // ── ROUND POPOVER ────────────────────────────────────────────────────────────

  function toggleRoundPopover() {
    roundPopover?.classList.toggle('open');
    if (roundPopover?.classList.contains('open')) {
      setTimeout(() => roundDpInput?.focus(), 50);
    }
  }

  function closeRoundPopover() {
    roundPopover?.classList.remove('open');
  }

  function applyRound() {
    let dp = parseInt(roundDpInput?.value ?? '2', 10);
    if (isNaN(dp) || dp < 0) dp = 0;
    if (dp > 15) dp = 15;
    act(s => setRoundDp(s, dp));
    closeRoundPopover();
    // Re-format current result at new dp
    const calc = store.getState().calculator;
    if (calc.rawResult !== null) {
      const formatted = formatResult(calc.rawResult, 'round', dp);
      store.update(state => ({
        ...state,
        calculator: {
          ...state.calculator,
          tokens: makeResultTokens(formatted),
          cursor: 0,
          fracFocus: null,
          justCalc: true
        }
      }));
      render();
    }
  }

  // ── CALCULATE ────────────────────────────────────────────────────────────────

  function calculate() {
    const calc = store.getState().calculator;
    const raw  = buildEvalExpr(calc.tokens);
    if (!raw.trim()) return;

    const outcome   = evaluate(raw, calc.mode);
    const displayEx = buildDisplayExpr(calc.tokens);
    const hasDeg    = raw.includes('°');

    if (outcome.error) {
      store.update(state => ({
        ...state,
        calculator: {
          ...state.calculator,
          tokens:    [{ type: 'text', val: 'SYNTAX ERR' }],
          cursor:    0,
          fracFocus: null,
          justCalc:  false
        }
      }));
      dispExpr.textContent = '';
    } else {
      const formatted = formatResult(
        outcome.value,
        calc.ansFormat,
        calc.roundDp
      ) + (hasDeg ? '°' : '');

      store.update(state => ({
        ...state,
        calculator: {
          ...state.calculator,
          rawResult: outcome.value,
          tokens:    makeResultTokens(formatted),
          cursor:    0,
          fracFocus: null,
          justCalc:  true
        },
        history: {
          items: [
            { expr: displayEx, result: formatted, time: new Date().toLocaleTimeString() },
            ...state.history.items
          ].slice(0, 50)
        }
      }));

      dispExpr.textContent = displayEx + ' =';
    }

    render();
  }

  // ── ACT ──────────────────────────────────────────────────────────────────────

  /** Apply a pure state transformer, then re-render. */
  function act(transformer) {
    store.update(transformer);
    render();
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────

  function render() {
    const { calculator: calc, history } = store.getState();

    // Display
    renderDisplay(
      dispRender,
      calc.tokens,
      calc.cursor,
      calc.fracFocus,
      (idx, slot) => {
        store.update(state => ({
          ...state,
          calculator: { ...state.calculator, cursor: idx, fracFocus: slot }
        }));
        render();
      }
    );

    // FIX 3: consume pendingDisplayLabel written by receiveExternalResult action.
    // If present, write it to dispExpr and clear it from state so it fires once.
    if (calc.pendingDisplayLabel !== undefined) {
      dispExpr.textContent = calc.pendingDisplayLabel;
      store.update(state => ({
        ...state,
        calculator: { ...state.calculator, pendingDisplayLabel: undefined }
      }));
    } else if (!calc.justCalc && calc.rawResult === null) {
      // After AC or a fresh start — clear the expression label so stale
      // "57+4 =" text does not persist above an empty display.
      dispExpr.textContent = '';
    }

    // Mode buttons
    document.getElementById('btnDeg')?.classList.toggle('active', calc.mode === 'deg');
    document.getElementById('btnRad')?.classList.toggle('active', calc.mode === 'rad');

    // Shift state
    calcApp?.classList.toggle('shift-on', calc.shiftOn);
    updateShiftLabels(calc.shiftOn);

    // ANS indicator
    ansInd?.classList.toggle('has-ans', calc.rawResult !== null);

    // Format buttons
    const formats = ['decimal', 'fraction', 'mixed', 'exact'];
    formats.forEach(f => {
      document.getElementById(`fmt-${f}`)?.classList.toggle('active', calc.ansFormat === f);
    });
    const roundBtn = document.getElementById('fmt-round');
    if (roundBtn) {
      roundBtn.classList.toggle('active', calc.ansFormat === 'round');
      roundBtn.textContent = calc.roundDp !== null ? `Round: ${calc.roundDp}dp` : 'Round';
    }

    // History
    renderHistory(
      historyList,
      historyEmpty,
      history.items,
      item => {
        store.update(state => ({
          ...state,
          calculator: {
            ...state.calculator,
            tokens:    [{ type: 'text', val: item.result }],
            cursor:    0,
            fracFocus: null,
            justCalc:  true,
            rawResult: parseFloat(item.result)
          }
        }));
        dispExpr.textContent = '';
        render();
      }
    );
  }

  // ── SHIFT LABELS ──────────────────────────────────────────────────────────────

  function updateShiftLabels(shiftOn) {
    Object.entries(SHIFT_DEFS).forEach(([id, [norm, sh]]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = shiftOn ? sh : norm;
    });
  }

  return { init, render, setFnMenuOpener };
}
