/**
 * router.js
 * Handles switching between Calculator and Statistics modules.
 * Reads [data-module] attributes — no hardcoded IDs outside this file.
 */

export function initRouter(store) {
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-module]');
    if (!btn) return;

    const next = btn.dataset.module;

    store.update(state => ({
      ...state,
      ui: { ...state.ui, activeModule: next }
    }));

    // Update module visibility
    document.querySelectorAll('.module').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.getElementById(`module-${next}`);
    if (target) target.classList.add('active');

    // Update active state on all module-switch buttons
    document.querySelectorAll('[data-module]').forEach(el => {
      el.classList.toggle('active', el.dataset.module === next);
    });
  });
}
