/**
 * bootstrap.js
 * Initialises the app: creates the store, wires all controllers,
 * sets up the router, and triggers the first render.
 *
 * Cross-controller wiring lives here — controllers do not import each other.
 */

import { createStore, DEFAULT_STATE }          from '../state/store.js';
import { initRouter }                           from './router.js';
import { createCalculatorController }           from '../calculator/calculator-controller.js';
import { createStatisticsController }           from '../statistics/statistics-controller.js';
import { createFunctionMenuController }         from '../functions/function-menu-controller.js';

export function bootstrapApp() {
  const store = createStore(DEFAULT_STATE);

  const calculator = createCalculatorController(store);
  const statistics  = createStatisticsController(store);
  const fnMenu      = createFunctionMenuController(store);

  // FIX 4: Give the calculator controller the fn-menu open function so that
  // pressing the f(x) button calls openMenu() — which always calls
  // updateDefsDisplay() — instead of directly toggling the overlay class.
  calculator.setFnMenuOpener(fnMenu.openMenu);

  // FIX 3: Give the fn-menu controller the calculator render function so it
  // can trigger a display update after writing a result via receiveExternalResult,
  // without importing or directly calling calculator-controller.
  fnMenu.setCalcRender(calculator.render);

  // Router handles module switching (Calculator ↔ Statistics)
  initRouter(store);

  // Initialise each module (attaches event listeners, first render)
  calculator.init();
  statistics.init();
  fnMenu.init();
}
