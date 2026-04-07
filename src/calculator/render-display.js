/**
 * render-display.js
 * Renders the calculator token array into the display DOM.
 * Reads state only. No calculations, no mutations.
 */

import { getTokenClass } from './token-model.js';

// ── PRETTY VALUE (inline HTML for a text token's content) ───────────────────

function prettyVal(str) {
  let s = str
    .replace(/\*/g, '×')
    .replace(/\/(?!\/)/g, '÷')
    .replace(/-/g, '−');

  // asin/acos/atan → sin⁻¹ etc.
  const sup1 = '<span style="display:inline-block;font-size:.52em;font-family:\'DM Mono\',monospace;position:relative;top:-0.55em;line-height:1">−1</span>';
  s = s
    .replace(/asin\(/g, 'sin' + sup1 + '(')
    .replace(/acos\(/g, 'cos' + sup1 + '(')
    .replace(/atan\(/g, 'tan' + sup1 + '(');

  // ^exp → raised superscript
  s = s.replace(
    /\^([-−]?[^+×÷\^()\s]+)/g,
    (_, exp) => `<span style="display:inline-block;font-size:.52em;font-family:'DM Mono',monospace;position:relative;top:-0.55em;line-height:1">${exp}</span>`
  );
  // lone ^ → placeholder
  s = s.replace(
    /\^$/,
    `<span style="display:inline-block;font-size:.52em;font-family:'DM Mono',monospace;position:relative;top:-0.55em;line-height:1;opacity:.4">□</span>`
  );
  return s;
}

// ── CURSOR ELEMENT ───────────────────────────────────────────────────────────

function mkCursor() {
  const c = document.createElement('span');
  c.className = 'slot-cursor';
  return c;
}

// ── TOKEN RENDERERS ──────────────────────────────────────────────────────────

function renderText(tok, isCur, fracFocus, onSlotClick) {
  if (tok.val === '' && !(isCur && fracFocus === null)) return null;
  const s = document.createElement('span');
  s.className = 'token' + (isCur && fracFocus === null ? ' cursor-after' : '');
  const cls = getTokenClass(tok.val);
  if (cls) s.classList.add(cls);
  s.innerHTML = prettyVal(tok.val);
  return s;
}

function renderFrac(tok, idx, isCur, fracFocus, onSlotClick) {
  const w = document.createElement('span');
  w.className = 'token frac';

  const ns = document.createElement('div');
  ns.className = 'frac-slot' + (isCur && fracFocus === 'num' ? ' active' : '') + (tok.num ? '' : ' empty');
  if (tok.num) ns.innerHTML = prettyVal(tok.num);
  if (isCur && fracFocus === 'num') ns.appendChild(mkCursor());
  ns.onclick = () => onSlotClick(idx, 'num');

  const bar = document.createElement('div');
  bar.className = 'frac-bar';
  bar.style.minWidth = Math.max((tok.num || '').length, (tok.den || '').length, 2) * 11 + 'px';

  const ds = document.createElement('div');
  ds.className = 'frac-slot' + (isCur && fracFocus === 'den' ? ' active' : '') + (tok.den ? '' : ' empty');
  if (tok.den) ds.innerHTML = prettyVal(tok.den);
  if (isCur && fracFocus === 'den') ds.appendChild(mkCursor());
  ds.onclick = () => onSlotClick(idx, 'den');

  w.appendChild(ns); w.appendChild(bar); w.appendChild(ds);
  if (isCur && fracFocus === null) w.classList.add('cursor-after');
  return w;
}

function renderSqrt(tok, idx, isCur, fracFocus, onSlotClick) {
  const active = isCur && fracFocus === 'arg';
  const w = document.createElement('span');
  w.className = 'token';
  if (isCur && fracFocus === null) w.classList.add('cursor-after');

  const lbl = document.createElement('span');
  lbl.style.cssText = `font-size:44px;font-family:'DM Mono',monospace;color:${active ? 'var(--green)' : '#1a2e22'};line-height:1;`;
  lbl.textContent = '√(';

  const box = document.createElement('span');
  box.style.cssText = `font-size:44px;font-family:'DM Mono',monospace;color:${active ? 'var(--green)' : '#1a2e22'};border-bottom:2px solid ${active ? 'var(--green)' : 'var(--border)'};padding:0 2px;cursor:pointer;min-width:20px;display:inline-flex;align-items:center;`;
  if (tok.arg) box.innerHTML = prettyVal(tok.arg);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; box.appendChild(ph); }
  if (active) box.appendChild(mkCursor());
  box.onclick = () => onSlotClick(idx, 'arg');

  const close = document.createElement('span');
  close.style.cssText = lbl.style.cssText;
  close.textContent = ')';

  w.appendChild(lbl); w.appendChild(box); w.appendChild(close);
  return w;
}

function renderNthroot(tok, idx, isCur, fracFocus, onSlotClick) {
  const degActive = isCur && fracFocus === 'deg';
  const argActive = isCur && fracFocus === 'arg';
  const w = document.createElement('span');
  w.className = 'token';
  if (isCur && fracFocus === null) w.classList.add('cursor-after');

  const deg = document.createElement('span');
  deg.style.cssText = `font-size:22px;font-family:'DM Mono',monospace;color:${degActive ? 'var(--green)' : '#1a2e22'};border:1.5px solid ${degActive ? 'var(--green)' : 'var(--border)'};border-radius:3px;padding:0 3px;cursor:pointer;min-width:16px;display:inline-flex;align-items:center;align-self:flex-start;margin-right:1px;`;
  if (tok.deg) deg.innerHTML = prettyVal(tok.deg);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; ph.style.fontSize = '12px'; deg.appendChild(ph); }
  if (degActive) deg.appendChild(mkCursor());
  deg.onclick = () => onSlotClick(idx, 'deg');

  const lbl = document.createElement('span');
  lbl.style.cssText = `font-size:44px;font-family:'DM Mono',monospace;color:${argActive ? 'var(--green)' : '#1a2e22'};line-height:1;`;
  lbl.textContent = '√(';

  const box = document.createElement('span');
  box.style.cssText = `font-size:44px;font-family:'DM Mono',monospace;color:${argActive ? 'var(--green)' : '#1a2e22'};border-bottom:2px solid ${argActive ? 'var(--green)' : 'var(--border)'};padding:0 2px;cursor:pointer;min-width:20px;display:inline-flex;align-items:center;`;
  if (tok.arg) box.innerHTML = prettyVal(tok.arg);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; box.appendChild(ph); }
  if (argActive) box.appendChild(mkCursor());
  box.onclick = () => onSlotClick(idx, 'arg');

  const close = document.createElement('span');
  close.style.cssText = lbl.style.cssText;
  close.textContent = ')';

  w.appendChild(deg); w.appendChild(lbl); w.appendChild(box); w.appendChild(close);
  return w;
}

function renderMixed(tok, idx, isCur, fracFocus, onSlotClick) {
  const w = document.createElement('span');
  w.className = 'token mixed-tok';
  if (isCur && fracFocus === null) w.classList.add('cursor-after');

  const whole = document.createElement('span');
  whole.className = 'mixed-whole' + (isCur && fracFocus === 'whole' ? ' active-slot' : '');
  if (tok.whole) whole.innerHTML = prettyVal(tok.whole);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; whole.appendChild(ph); }
  if (isCur && fracFocus === 'whole') whole.appendChild(mkCursor());
  whole.onclick = () => onSlotClick(idx, 'whole');

  const fracPart = document.createElement('span');
  fracPart.className = 'mixed-frac-part';

  const numS = document.createElement('span');
  numS.className = 'frac-slot' + (isCur && fracFocus === 'num' ? ' active-slot' : '');
  if (tok.num) numS.innerHTML = prettyVal(tok.num);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; numS.appendChild(ph); }
  if (isCur && fracFocus === 'num') numS.appendChild(mkCursor());
  numS.onclick = () => onSlotClick(idx, 'num');

  const bar = document.createElement('div'); bar.className = 'frac-bar';

  const denS = document.createElement('span');
  denS.className = 'frac-slot' + (isCur && fracFocus === 'den' ? ' active-slot' : '');
  if (tok.den) denS.innerHTML = prettyVal(tok.den);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; denS.appendChild(ph); }
  if (isCur && fracFocus === 'den') denS.appendChild(mkCursor());
  denS.onclick = () => onSlotClick(idx, 'den');

  fracPart.appendChild(numS); fracPart.appendChild(bar); fracPart.appendChild(denS);
  w.appendChild(whole); w.appendChild(fracPart);
  return w;
}

function renderLog(tok, idx, isCur, fracFocus, onSlotClick) {
  const w = document.createElement('span');
  w.className = 'token log-tok';
  if (isCur && fracFocus === null) w.classList.add('cursor-after');

  const lblWrap = document.createElement('span'); lblWrap.className = 'log-label-wrap';
  const lbl = document.createElement('span'); lbl.className = 'log-label'; lbl.textContent = 'log';

  const baseS = document.createElement('span');
  baseS.className = 'log-base' + (isCur && fracFocus === 'base' ? ' active-slot' : '');
  if (tok.base) baseS.innerHTML = prettyVal(tok.base);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; ph.style.fontSize = '12px'; baseS.appendChild(ph); }
  if (isCur && fracFocus === 'base') baseS.appendChild(mkCursor());
  baseS.onclick = () => onSlotClick(idx, 'base');
  lblWrap.appendChild(lbl); lblWrap.appendChild(baseS);

  const argS = document.createElement('span');
  argS.className = 'log-arg' + (isCur && fracFocus === 'arg' ? ' active-slot' : '');
  if (tok.arg) argS.innerHTML = prettyVal(tok.arg);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; argS.appendChild(ph); }
  if (isCur && fracFocus === 'arg') argS.appendChild(mkCursor());
  argS.onclick = () => onSlotClick(idx, 'arg');

  w.appendChild(lblWrap); w.appendChild(argS);
  return w;
}

function renderPow(tok, idx, isCur, fracFocus, onSlotClick) {
  const w = document.createElement('span');
  w.className = 'token pow-tok';
  if (isCur && fracFocus === null) w.classList.add('cursor-after');

  const base = document.createElement('span');
  base.className = 'pow-base' + (isCur && fracFocus === 'base' ? ' active-slot' : '');
  if (tok.base) base.innerHTML = prettyVal(tok.base);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; base.appendChild(ph); }
  if (isCur && fracFocus === 'base') base.appendChild(mkCursor());
  base.onclick = () => onSlotClick(idx, 'base');

  const exp = document.createElement('span');
  exp.className = 'pow-exp' + (isCur && fracFocus === 'exp' ? ' active-slot' : '');
  if (tok.exp) exp.innerHTML = prettyVal(tok.exp);
  else { const ph = document.createElement('span'); ph.className = 'slot-empty'; exp.appendChild(ph); }
  if (isCur && fracFocus === 'exp') exp.appendChild(mkCursor());
  exp.onclick = () => onSlotClick(idx, 'exp');

  w.appendChild(base); w.appendChild(exp);
  return w;
}

// ── MAIN RENDER ──────────────────────────────────────────────────────────────

/**
 * Render the token array into the dispRender element.
 * @param {HTMLElement} container  - #dispRender
 * @param {Array}       tokens
 * @param {number}      cursor
 * @param {string|null} fracFocus
 * @param {Function}    onSlotClick  - (tokenIndex, slotName) => void
 */
export function renderDisplay(container, tokens, cursor, fracFocus, onSlotClick) {
  container.innerHTML = '';

  tokens.forEach((tok, idx) => {
    const isCur = idx === cursor;
    let el = null;

    switch (tok.type) {
      case 'text':    el = renderText(tok, isCur, fracFocus); break;
      case 'frac':    el = renderFrac(tok, idx, isCur, fracFocus, onSlotClick); break;
      case 'sqrt':    el = renderSqrt(tok, idx, isCur, fracFocus, onSlotClick); break;
      case 'nthroot': el = renderNthroot(tok, idx, isCur, fracFocus, onSlotClick); break;
      case 'mixed':   el = renderMixed(tok, idx, isCur, fracFocus, onSlotClick); break;
      case 'log':     el = renderLog(tok, idx, isCur, fracFocus, onSlotClick); break;
      case 'pow':     el = renderPow(tok, idx, isCur, fracFocus, onSlotClick); break;
    }

    if (el) container.appendChild(el);
  });

  // Always show something for cursor when display is empty
  if (container.innerHTML === '') {
    const s = document.createElement('span');
    s.className = 'token cursor-after';
    s.textContent = '';
    container.appendChild(s);
  }
}
