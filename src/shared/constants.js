/**
 * constants.js
 * All magic values, key maps, and config in one place.
 * Import from here — never hardcode strings in logic files.
 */

export const SLOT_TYPES = ['frac', 'sqrt', 'nthroot', 'pow', 'mixed', 'log'];

export const MAX_TEXT_LENGTH = 14;

export const FORMATS = {
  DECIMAL:  'decimal',
  FRACTION: 'fraction',
  MIXED:    'mixed',
  EXACT:    'exact',
  ROUND:    'round'
};

export const MODULES = {
  CALCULATOR: 'calculator',
  STATISTICS: 'statistics'
};

/** Shift key alternate labels. [normal, shifted] innerHTML strings. */
export const SHIFT_DEFS = {
  'sbtn-frac': [
    '<div class="nd-key"><div class="nd-frac"><span>a</span><div class="nd-frac-bar"></div><span>b</span></div></div>',
    '<div class="nd-key" style="display:flex;align-items:center;gap:3px;font-family:DM Mono,monospace;font-weight:700;color:#1a2e22"><span style="font-size:17px">a</span><div style="display:flex;flex-direction:column;align-items:center;gap:0;font-size:11px;line-height:1.2"><span>b</span><div style="height:1.5px;width:12px;background:#1a2e22;margin:1px 0"></div><span>c</span></div></div>'
  ],
  'sbtn-sqrt': [
    '<svg class="nd-sqrt-svg" width="32" height="22" viewBox="0 0 32 22" fill="none"><polyline points="1,13 5,13 9,20 14,3 20,3" stroke="#1a2e22" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/><line x1="20" y1="3" x2="31" y2="3" stroke="#1a2e22" stroke-width="1.6" stroke-linecap="round"/><text x="22" y="15" font-family="DM Mono,monospace" font-size="9" fill="#8aab98">□</text></svg>',
    '<svg class="nd-sqrt-svg" width="38" height="22" viewBox="0 0 38 22" fill="none"><text x="1" y="10" font-family="DM Mono,monospace" font-size="8" fill="#1a2e22">n</text><polyline points="7,13 11,13 15,20 20,3 26,3" stroke="#1a2e22" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/><line x1="26" y1="3" x2="37" y2="3" stroke="#1a2e22" stroke-width="1.6" stroke-linecap="round"/><text x="28" y="15" font-family="DM Mono,monospace" font-size="9" fill="#8aab98">□</text></svg>'
  ],
  'sbtn-pow': [
    '<div class="nd-key"><div class="nd-pow-wrap"><span class="nd-pow-base-box">□</span><span class="nd-pow-exp-box">□</span></div></div>',
    '<div class="nd-key"><div class="nd-pow-wrap"><span class="nd-pow-base-box">□</span><span class="nd-pow-exp-box">□</span></div></div>'
  ],
  'sbtn-sq': [
    '<div class="nd-key"><div class="nd-sq-wrap"><span class="nd-sq-base">□</span><span class="nd-sq-exp">2</span></div></div>',
    '<div class="nd-key"><div class="nd-sq-wrap"><span class="nd-sq-base">□</span><span class="nd-sq-exp">3</span></div></div>'
  ],
  'sbtn-log': [
    '<div class="nd-key" style="display:flex;align-items:flex-end;gap:0;font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#1a2e22"><span>log</span><div style="display:flex;flex-direction:column;align-items:center;font-size:8px;gap:0;margin-bottom:1px"><span style="border:1px solid var(--border);border-radius:2px;padding:0 2px;min-width:10px;text-align:center">□</span></div><div style="border:1px solid var(--border);border-radius:2px;padding:0 3px;font-size:11px;min-width:14px;text-align:center;margin-left:1px">□</div></div>',
    '<span class="key-pri">10<sup style="font-size:.6em">x</sup></span>'
  ],
  'sbtn-ln':  [
    '<span class="key-pri" style="font-size:15px">ln</span>',
    '<span class="key-pri">e<sup style="font-size:.6em">x</sup></span>'
  ],
  'sbtn-sci': [
    '<div class="nd-key" style="display:flex;align-items:flex-end;gap:1px;font-family:\'DM Mono\',monospace;font-weight:500;color:#1a2e22;line-height:1;font-size:11px;"><span style="font-size:11px;">×10</span><span style="font-size:8px;margin-bottom:1px;">n</span></div>',
    '<div class="nd-key" style="display:flex;align-items:flex-end;gap:1px;font-family:\'DM Mono\',monospace;font-weight:500;color:#1a2e22;line-height:1;font-size:11px;"><span style="font-size:11px;">×10</span><span style="font-size:8px;margin-bottom:1px;">n</span></div>'
  ],
  'sbtn-sin':  ['<span class="key-pri">sin</span>', '<span class="key-pri">sin<sup style="font-size:.65em">-1</sup></span>'],
  'sbtn-cos':  ['<span class="key-pri">cos</span>', '<span class="key-pri">cos<sup style="font-size:.65em">-1</sup></span>'],
  'sbtn-tan':  ['<span class="key-pri">tan</span>', '<span class="key-pri">tan<sup style="font-size:.65em">-1</sup></span>'],
  'sbtn-pi':   ['<span class="key-pri">π</span>',   '<span class="key-pri">2π</span>'],
  'sbtn-e':    ['<span class="key-pri">e</span>',   '<span class="key-pri">φ</span>'],
  'sbtn-abs':  ['<span class="key-pri">|x|</span>', '<span class="key-pri">sgn</span>'],
  'sbtn-dms':  ['<span class="key-pri">°</span>',   '<span class="key-pri" style="font-size:11px">°↔DMS</span>']
};

/**
 * Normal and shifted output for fn-type buttons.
 * [normalOutput, shiftedOutput]
 */
export const FN_MAP = {
  sin:     ['sin(',  'asin('],
  cos:     ['cos(',  'acos('],
  tan:     ['tan(',  'atan('],
  ln:      ['ln(',   'exp('],
  pi:      ['π',     '2π'],
  e_const: ['e',     'φ'],
  abs:     ['abs(',  'sgn(']
};
