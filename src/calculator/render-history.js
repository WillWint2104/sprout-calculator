/**
 * render-history.js
 * Renders the calculation history list.
 * DOM only — no maths, no state mutations.
 */

import { escapeHtml } from '../shared/utils.js';

/**
 * @param {HTMLElement} listEl    - #historyList
 * @param {HTMLElement} emptyEl   - #historyEmpty
 * @param {Array}       items     - history state items
 * @param {Function}    onRecall  - (item) => void — called when user clicks an item
 */
export function renderHistory(listEl, emptyEl, items, onRecall) {
  // Remove existing items (keep the empty message element)
  listEl.querySelectorAll('.history-item').forEach(el => el.remove());

  if (!items.length) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-left">
        <div class="history-expr">${escapeHtml(item.expr)} =</div>
        <div class="history-time">${item.time}</div>
      </div>
      <div class="history-result">${escapeHtml(item.result)}</div>
      <span class="history-recall">↵</span>
    `;
    div.addEventListener('click', () => onRecall(item));
    listEl.appendChild(div);
  });
}
