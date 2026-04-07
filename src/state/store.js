/**
 * store.js
 * Central state container. All state lives here.
 * Modules read via getState(), mutate via update(), react via subscribe().
 */

export function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  return {
    getState() {
      return state;
    },

    /** updater receives current state, must return full next state */
    update(updater) {
      state = updater(state);
      listeners.forEach(fn => fn(state));
    },

    /** returns unsubscribe function */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

/** Default initial state shape */
export const DEFAULT_STATE = {
  ui: {
    activeModule: 'calculator'
  },
  calculator: {
    mode: 'deg',           // 'deg' | 'rad'
    shiftOn: false,
    ansFormat: 'decimal',  // 'decimal' | 'fraction' | 'mixed' | 'exact'
    roundDp: null,         // null = no rounding active
    tokens: [{ type: 'text', val: '' }],
    cursor: 0,
    fracFocus: null,       // slot name within structured token
    justCalc: false,       // true immediately after = pressed
    rawResult: null,       // numeric result of last calculation
    pendingDisplayLabel: undefined  // set by receiveExternalResult, consumed by render()
  },
  history: {
    items: []              // [{ expr, result, time }]
  },
  statistics: {
    mode: '1var',
    twoVarRows: 0
  },
  functions: {
    defs: { f: '', g: '' }
    // menuMode, exprBuf, evalBuf are local closure state in function-menu-controller.js
    // and do not belong in the global store
  }
};
