SPROUT CALCULATOR — ARCHITECTURE AUDIT
=======================================
Date: April 2026
Scope: Full file-by-file inspection of the refactored modular codebase.


════════════════════════════════════════
SECTION 1: FILE-BY-FILE AUDIT
════════════════════════════════════════

─────────────────────────────────────────
src/state/store.js
─────────────────────────────────────────
STATUS: Mostly clean. One real problem.

The store is a correct reactive container. getState/update/subscribe pattern
is sound. structuredClone on init is correct.

PROBLEM — Dead state fields in DEFAULT_STATE:
  functions.menuMode, functions.exprBuf, functions.evalBuf are defined in the
  store but function-menu-controller.js intentionally uses local closure
  variables for these (with comment "not worth putting in global store").
  The store fields are never read or written by any module.
  This means the store lies about what state it owns.
  A future developer will find these fields, wonder where they're updated,
  and waste time searching.

FIX: Remove menuMode, exprBuf, evalBuf from DEFAULT_STATE.
     They are local UI state and belong in the controller closure — which is
     exactly where they already live. The store should only declare what it
     actually stores.


─────────────────────────────────────────
src/app/bootstrap.js
─────────────────────────────────────────
STATUS: Clean. No issues.

Correctly creates store, wires three controllers, calls init on each.
Does not contain logic. Does not manipulate DOM directly.


─────────────────────────────────────────
src/app/router.js
─────────────────────────────────────────
STATUS: Clean. One minor redundancy.

Updates store and DOM both on module switch. That is correct here because
there is no render loop subscribed to ui.activeModule — the router IS the
render loop for module visibility. This is acceptable.

MINOR: The router updates [data-module] button active states and module
section visibility, but calculator-controller.js also toggles [data-module]
active class on smb-calculator / smb-statistics via the same data attribute.
If both fire on the same click there is a race condition on class state.
The router handles document-level [data-module] clicks. The calculator
controller also handles calcApp-level [data-module] clicks but routes them
to the router via the module attribute. These do not double-fire because
bindKeypad guards with `if (e.target.closest('.fn-menu-overlay')) return`
but does NOT guard against [data-module] clicks — it falls through the
switch without a case for data-module, so a statistics button click inside
calcApp would be silently eaten by bindKeypad with no action. This is a
latent bug: the statistics module button inside the screen-module-row is
inside #calcApp, so the calcApp click handler fires first, finds no matching
dataset attribute on the button, and does nothing. The router never sees it.

FIX: In bindKeypad, add an early return guard:
  if (btn.dataset.module) return; // Let router.js handle these.


─────────────────────────────────────────
src/calculator/calculator-controller.js
─────────────────────────────────────────
STATUS: Partially a dumping ground. Three distinct contamination problems.

PROBLEM 1 — calculate() contains business logic, not coordination:
  Lines 209-258. The controller calls buildEvalExpr, evaluate, buildDisplayExpr,
  formatResult, makeResultTokens — and then directly constructs the next
  calculator state inline. This is not coordination. This is the calculation
  action. It belongs in input-actions.js as a `calculate(state)` pure
  function. The controller should call act(calculate) exactly like every
  other action. Instead it bypasses the act() pattern entirely and calls
  store.update() directly with hand-built state.

  Consequence: the calculation action cannot be unit tested in isolation.
  It is tangled with dispExpr.textContent mutation on line 255.

PROBLEM 2 — dispExpr is mutated directly in two places, bypassing render():
  Line 229: dispExpr.textContent = ''
  Line 255: dispExpr.textContent = displayEx + ' ='
  Line 331: dispExpr.textContent = '' (inside history recall callback)
  These are DOM side effects executed outside render(). This means the
  dispExpr element's content is NOT derived from state — it is set
  imperatively and then orphaned. If render() is called without a prior
  calculate(), dispExpr shows whatever was last written imperatively.
  The dispExpr value should be stored in state (e.g. calculator.displayExpr)
  and rendered by render() like everything else.

PROBLEM 3 — applyRound() contains state construction logic:
  Lines 183-205. applyRound calls setRoundDp (correct), then immediately
  calls store.getState() again, constructs new token state manually, and
  calls store.update() a second time. This is two sequential mutations that
  should be one atomic action. It bypasses act() and duplicates the
  makeResultTokens/formatResult pattern already in calculate(). These should
  be merged into a single setRoundDp action that handles the token update
  when rawResult is present.

PROBLEM 4 — bindSidebar() does not belong here:
  The sidebar toggle controls device layout — it is a UI layout concern, not
  a calculator concern. It belongs in bootstrap.js or a layout controller.
  Currently a CSS class toggle on #device and a style mutation on #sidebarChevron
  live inside createCalculatorController. If the sidebar is ever made reactive
  to state, this wiring is in the wrong place.

PROBLEM 5 — history recall (line 319-333) constructs raw state inline:
  The callback inside renderHistory() directly calls store.update() with
  hand-built calculator state. This is a third place (alongside calculate()
  and applyRound()) where token state is constructed outside input-actions.js.
  This should be a recallHistory(state, item) action.


─────────────────────────────────────────
src/calculator/input-actions.js
─────────────────────────────────────────
STATUS: Mostly correct. Two problems.

PROBLEM 1 — insertFraction resets state unconditionally:
  Line 116: `let calc = resetCalcState(state.calculator)` always fires,
  even when not justCalc. This means pressing the fraction button mid-expression
  discards everything typed. The original monolith only reset on justCalc.
  This is a behaviour regression introduced in the refactor.
  Compare insertPow (line 138) which correctly checks justCalc first.

PROBLEM 2 — insertLog also resets unconditionally (line 177):
  Same problem as insertFraction. Mid-expression log insertion destroys
  existing input.

PROBLEM 3 — insertSciNotation resets unconditionally (line 187):
  Same pattern. Three functions share this regression.

PROBLEM 4 — getAnsStr is duplicated logic:
  getAnsStr (lines 32-37) formats a number to a clean string. This is
  essentially a subset of formatResult('decimal') from formatter.js but
  reimplemented inline. Not catastrophic, but a future change to decimal
  formatting precision would need to be applied in two places.


─────────────────────────────────────────
src/calculator/token-model.js
─────────────────────────────────────────
STATUS: Clean. One note.

Pure functions, no DOM, no side effects. The boundary is correct.

NOTE: appendToFocus does `calc.tokens.map(t => ({ ...t }))` — a shallow
clone of each token — but then mutates tokens[cursor] with a new object.
The shallow clone is unnecessary because the mutation creates a new object
anyway (tokens[cursor] = { ...tok, ... }). The map is a minor inefficiency
but not a correctness problem.

NOTE: getCurrentToken is exported but never imported by any file. Dead export.


─────────────────────────────────────────
src/calculator/evaluator.js
─────────────────────────────────────────
STATUS: Boundary is correct (no DOM, no state). But the file is misnamed and
contains two distinct responsibilities that will need to separate eventually.

PROBLEM 1 — buildDisplayExpr does not belong in evaluator.js:
  buildDisplayExpr (lines 17-28) converts tokens to a human-readable string
  for display above the screen. This is a rendering/formatting concern — it
  produces output for the user to read. It has nothing to do with evaluation.
  It belongs in formatter.js or a separate display-expr.js.
  Currently, calculator-controller.js imports both buildDisplayExpr AND
  evaluate from the same file, which makes the evaluator responsible for
  display formatting. Wrong.

PROBLEM 2 — The regex-chain "parser" is not a parser:
  Lines 85-106. This is a string substitution pipeline that transforms
  display symbols into JS-evaluable text. It is brittle because:
  a) Order of replacements matters and is not documented
  b) `\be\b` (Euler's number) will incorrectly match inside function names
     if a new function containing 'e' is added
  c) The lookbehind `(?<!Math\.)(?<!\.)log\(` is fragile — if the token
     serialiser ever emits `Math.log(` it will double-replace
  d) `10\*\*\(` replacing to `_pow10(` relies on the exact string produced
     by buildEvalExpr for scientific notation tokens — a tight coupling
     between the serialiser and the evaluator that will break silently if
     buildEvalExpr changes

PROBLEM 3 — Dynamic Function() evaluation is still the mechanism:
  This was acknowledged in the original scaffold as "transitional" but it is
  now the permanent implementation. There is no safe path to replace it
  without rewriting evaluate() entirely. This is acceptable for now but
  should be documented clearly as a known risk.

PROBLEM 4 — fact() and nCr() are defined privately inside evaluator.js:
  These are mathematical functions. They could belong in a shared math-utils
  or live alongside similar functions. Minor concern — they are at least
  isolated to this file.


─────────────────────────────────────────
src/calculator/formatter.js
─────────────────────────────────────────
STATUS: Clean. Correct boundary.

Pure number-to-string functions. No DOM. Correctly isolated.
makeResultTokens is arguably a token-model concern (it creates tokens) but
it is a thin utility and does not contaminate anything.

ONE WEAK POINT: The 'round' format string is used as an ansFormat value but
is not listed in the FORMATS constant in constants.js. The constant exports
DECIMAL, FRACTION, MIXED, EXACT — but not ROUND. This means format validation
would silently miss 'round'. Add ROUND: 'round' to FORMATS.


─────────────────────────────────────────
src/calculator/render-display.js
─────────────────────────────────────────
STATUS: Contains a real contamination: token classification logic.

PROBLEM — renderText() decides token CSS class based on content (lines 49-50):
  if (/^[+\-×÷\/%^]+$/.test(tok.val)) s.classList.add('op');
  else if (/[a-zA-Zπφ]/.test(tok.val)) s.classList.add('fn');

  This is classification logic in a render file. The renderer is deciding
  what kind of token it is looking at by inspecting the value. This belongs
  in the token model. Tokens should carry a semantic type or subtype that
  renderers consume, not content that renderers re-parse.

  If a token value like "sin(3+2)" contains letters, it gets .fn styling.
  If it's "+" it gets .op styling. The regex rules governing this are
  business logic, not presentation. A renderer should receive pre-classified
  data and apply styles accordingly.

PROBLEM 2 — prettyVal() is part render, part format/transform:
  prettyVal (lines 9-33) does symbol substitution (*, /, - to ×, ÷, −) and
  builds HTML for superscripts. The symbol substitution part is a formatting
  transform. The HTML building part is presentation. These are two different
  concerns bundled into one function. This is minor but means the display
  representation of operators (×, ÷, −) is defined in the render layer rather
  than the model, making it hard to change consistently.

PROBLEM 3 — Inline styles instead of CSS classes throughout:
  renderSqrt, renderNthroot, renderMixed all use inline style strings with
  hardcoded px values. Example: `font-size:44px;font-family:'DM Mono'...`
  These should be CSS classes in tokens.css. Currently changing the display
  font size requires editing the JavaScript render file.


─────────────────────────────────────────
src/calculator/render-history.js
─────────────────────────────────────────
STATUS: Clean. No issues.

Correctly isolated. Takes data, returns DOM. No logic, no state mutations.


─────────────────────────────────────────
src/statistics/statistics-engine.js
─────────────────────────────────────────
STATUS: Clean. Correct boundary.

Pure calculation functions. No DOM. No imports. Genuinely isolated.

MINOR: fmt and fmt5 are separate inline formatters. These could use
toPrecisionStr from shared/utils.js for consistency. Minor.


─────────────────────────────────────────
src/statistics/statistics-controller.js
─────────────────────────────────────────
STATUS: Clean. One note.

Correctly isolated from calculator. Calls pure engine, updates DOM.
Does not import from calculator.

NOTE: render() method returns empty (line that just says "Statistics renders
on-demand"). This is fine architecturally but means the controller does not
participate in any reactive render cycle — store.subscribe() is never used.
If a future requirement needs stats to react to store changes, this needs
wiring. For now it is correct.

NOTE: twoVarRows is a plain array used as a row-index counter. It works but
is fragile — if rows are ever deleted, indices break. Minor concern for now.


─────────────────────────────────────────
src/functions/function-evaluator.js
─────────────────────────────────────────
STATUS: Clean. Correct boundary.

Pure evaluation. No DOM. No state. Correctly isolated.

NOTE: evalFnExpr uses a different regex pipeline than evaluator.js for the
same mathematical expressions. This is duplicated evaluation logic. The two
pipelines will diverge — if someone fixes a bug in evaluator.js they will
not know to also fix function-evaluator.js. These should share a common
expression normalisation function.


─────────────────────────────────────────
src/functions/function-menu-controller.js
─────────────────────────────────────────
STATUS: Contains one real coupling violation.

PROBLEM — Imports formatResult and makeResultTokens from calculator/formatter.js:
  Line 10: import { formatResult, makeResultTokens } from '../calculator/formatter.js';
  Lines 205-216: After evaluating f(x), the controller reads
  state.calculator.ansFormat and state.calculator.roundDp, then formats
  the result using the calculator's current format settings, then directly
  writes token state into state.calculator.

  This is function-menu-controller.js acting as if it is part of the
  calculator module. It is reading calculator internals (ansFormat, roundDp)
  and writing calculator internals (tokens, cursor, fracFocus, justCalc,
  rawResult). This is not isolated behaviour — it is direct manipulation of
  another module's state from outside.

  The correct boundary: when f(x) evaluation produces a result, the function
  menu should dispatch a single action like `receiveExternalResult(state, value)`
  that lives in input-actions.js. The function menu passes the numeric value.
  The calculator module decides what to do with it. The function menu does not
  need to know that tokens, cursor, fracFocus, justCalc exist.

PROBLEM 2 — openMenu() is defined but never called from init():
  openMenu (line 37) builds the overlay open logic but the actual trigger
  (data-action="fn-menu") is handled in calculator-controller.js line 95
  which directly calls classList.add('open') without going through
  openMenu(). This means the updateDefsDisplay() call inside openMenu() is
  never executed when the menu opens from the button. The defs display
  will be stale unless the user has triggered it by other means.

PROBLEM 3 — Three alert() calls for validation:
  Lines 177, 179, 185, 187. alert() is a blocking browser call that
  interrupts user flow. This is the wrong mechanism for input validation.
  Not a modularity problem but a quality problem worth fixing.


─────────────────────────────────────────
src/shared/constants.js
─────────────────────────────────────────
STATUS: Mixed concern. Should not contain HTML.

PROBLEM — SHIFT_DEFS contains inline HTML strings:
  This is a constants file but it stores large blobs of HTML markup for
  button labels. HTML belongs in the HTML file or in a render module.
  Constants should hold values, not markup. SHIFT_DEFS is consumed by
  calculator-controller.js which calls el.innerHTML = ... — this is a DOM
  render operation driven by data from a constants file.

  The data-only part of SHIFT_DEFS (which buttons have shift states) is
  a legitimate constant. The HTML content of each state is a template/render
  concern. These are two things bundled together.

  This is minor but it means updating a button label requires editing
  constants.js instead of an HTML template.

PROBLEM 2 — MODES and FORMATS constants defined but not used:
  grep shows MODES and FORMATS are never imported by any file. They were
  written with good intent but are dead code. Either use them or remove them.


════════════════════════════════════════
SECTION 2: RESPONSIBILITY BOUNDARY MAP
════════════════════════════════════════

ACTUAL responsibilities vs STATED responsibilities:

FILE                          | STATED                     | ACTUAL
------------------------------|----------------------------|------------------------------------------
calculator-controller.js      | Coordinates only           | Coordinates + calculates + formats + mutates dispExpr directly
input-actions.js              | Pure state transforms      | Pure state transforms (correct, except 3 reset bugs)
token-model.js                | Pure token manipulation    | Pure token manipulation (correct)
evaluator.js                  | Engine only                | Engine + display expression builder (two concerns)
formatter.js                  | Format only                | Format only (correct)
render-display.js             | Render only                | Render + token classification logic + formatting (prettyVal)
render-history.js             | Render only                | Render only (correct)
function-menu-controller.js   | Isolated from calculator   | Reads AND writes calculator internals directly
statistics-controller.js      | Isolated from calculator   | Isolated (correct)
statistics-engine.js          | Pure calculations          | Pure calculations (correct)
function-evaluator.js         | Pure evaluation            | Pure evaluation, but duplicate pipeline to evaluator.js
store.js                      | Central state              | Central state + 3 dead fields that belong elsewhere
constants.js                  | Config/constants           | Config + HTML markup + dead exports


════════════════════════════════════════
SECTION 3: FIXES IN PRIORITY ORDER
════════════════════════════════════════

── MANDATORY NOW ─────────────────────────────────────────────────────────────

PRIORITY 1 — BUG: insertFraction, insertLog, insertSciNotation reset mid-expression
  File: src/calculator/input-actions.js, lines 116, 177, 187
  These three functions call resetCalcState() unconditionally instead of only
  when justCalc is true. Mid-expression use of these buttons destroys existing input.
  Fix: Change each to `if (state.calculator.justCalc) calc = resetCalcState(calc)`
  matching the pattern used correctly in insertPow and insertSq.
  Risk if not fixed: Data loss on every non-trivial expression using fractions, log, sci.

PRIORITY 2 — BUG/COUPLING: Module switch button click silently eaten by calcApp handler
  File: src/app/router.js, src/calculator/calculator-controller.js line 52-97
  The statistics button inside #calcApp fires the calcApp click handler first.
  No [data-module] case exists in the switch — the click is silently dropped.
  Fix: Add `if (btn.dataset.module) return;` at the top of the calcApp
  click handler so router.js can process it.
  Risk if not fixed: Switching to statistics from the in-screen button does not work.

PRIORITY 3 — COUPLING: function-menu-controller writes calculator token state directly
  File: src/functions/function-menu-controller.js lines 204-217
  Fix: Add a receiveExternalResult(state, numericValue) action to input-actions.js.
  The function menu calls act(s => receiveExternalResult(s, outcome.result)).
  Remove the formatResult and makeResultTokens imports from function-menu-controller.
  Risk if not fixed: Any change to how calculator stores results breaks fn menu silently.

PRIORITY 4 — BUG: openMenu() never called when fn-menu button pressed
  File: src/functions/function-menu-controller.js line 37
        src/calculator/calculator-controller.js line 95
  calculator-controller bypasses openMenu() and directly mutates the overlay class.
  updateDefsDisplay() is therefore never called on open.
  Fix: In calculator-controller.js line 95, replace the direct classList call with
  a custom event or expose openMenu() from the function menu controller and call it.
  Simplest fix: export openMenu from the fn menu controller and call it from
  bootstrap.js wiring, or pass it to the calculator controller as a callback.
  Risk if not fixed: Stale function definitions shown when menu opens.

PRIORITY 5 — LOGIC IN RENDER: Token classification in render-display.js
  File: src/calculator/render-display.js lines 49-50
  The regex classification of token values as 'op' or 'fn' is business logic.
  Fix: Move the classification to token-model.js. Add a getTokenClass(tok)
  function that returns 'op', 'fn', or null. render-display.js calls it.
  Risk if not fixed: Classification rules will be changed in the wrong file,
  causing invisible inconsistencies between display and model.

PRIORITY 6 — STATE: Dead fields in store DEFAULT_STATE
  File: src/state/store.js lines 55-57
  menuMode, exprBuf, evalBuf are declared but never used.
  Fix: Remove them. They live correctly as closure variables in
  function-menu-controller.js.
  Risk if not fixed: Developer confusion about state ownership; future code
  may accidentally try to sync these, causing bugs.

── SAFE TO DEFER ─────────────────────────────────────────────────────────────

PRIORITY 7 — COUPLING: calculate() logic in controller instead of action
  File: src/calculator/calculator-controller.js lines 209-258
  Move calculate() into input-actions.js as a pure action.
  Move history update into the same action.
  Store displayExpr in state.calculator.displayExpr.
  Render dispExpr from state in render(), not imperatively.
  This is a clean-up that eliminates three separate places where
  dispExpr.textContent is written imperatively.
  Defer: Nothing breaks today. Defer until the next feature touches calculate().

PRIORITY 8 — COUPLING: buildDisplayExpr in evaluator.js
  File: src/calculator/evaluator.js lines 17-28
  Move buildDisplayExpr to formatter.js. It formats for display, not for evaluation.
  Defer: Wrong home but no breakage today.

PRIORITY 9 — DUPLICATION: Two separate expression normalisation pipelines
  Files: src/calculator/evaluator.js and src/functions/function-evaluator.js
  Extract normaliseExpression(expr, mode) into shared/math-utils.js.
  Both evaluators import and use it.
  Defer: Low immediate risk, but divergence will happen eventually.

PRIORITY 10 — CONSTANTS: SHIFT_DEFS HTML in constants.js
  File: src/shared/constants.js
  Extract HTML templates to a separate shift-labels.js or move them into
  the HTML as hidden template elements.
  Defer: No correctness problem, but constants.js is the wrong home for markup.

PRIORITY 11 — DEAD CODE: MODES, FORMATS constants never imported
  File: src/shared/constants.js
  Either import and use them throughout the codebase to replace raw strings,
  or delete them.
  Defer: No harm, but misleading.

PRIORITY 12 — DEAD EXPORT: getCurrentToken in token-model.js never imported
  File: src/calculator/token-model.js
  Delete unused export.
  Defer: Trivial.

PRIORITY 13 — CONSTANTS: 'round' missing from FORMATS constant
  File: src/shared/constants.js
  Add ROUND: 'round'.
  Defer: Cosmetic but should be fixed before adding format validation.


════════════════════════════════════════
SECTION 4: FILES TO SPLIT FURTHER
════════════════════════════════════════

evaluator.js should become two files:
  expression-builder.js — buildDisplayExpr, buildEvalExpr, cleanSlot
  evaluator.js           — evaluate(), fact(), nCr() only
  Reason: Two distinct phases that will evolve independently. The builder
  is a serialisation concern. The evaluator is an execution concern.

calculator-controller.js could benefit from extracting:
  format-bar-controller.js — round popover, format button wiring, applyRound
  Reason: The round popover has its own state (open/closed), its own DOM
  elements, and its own logic. It is a sub-feature that is currently
  embedded in the main controller.
  This is optional — only worth doing if the format bar grows more features.


════════════════════════════════════════
SECTION 5: FILES TO MERGE
════════════════════════════════════════

None should be merged. All current file sizes are appropriate.
render-history.js is small (40 lines) but is correctly isolated and will
grow if history features are added (filtering, search, persistence).
Do not merge it into the controller.


════════════════════════════════════════
SECTION 6: TOP 10 HIGHEST-RISK ISSUES
════════════════════════════════════════

Ranked by: probability of causing a live bug × difficulty of debugging.

1. insertFraction/insertLog/insertSciNotation unconditional reset [LIVE BUG]
   Severity: High. Students lose typed expressions silently.

2. Module switch button click silently eaten [LIKELY LIVE BUG]
   Severity: High. Statistics tab may not be reachable from the in-screen button.

3. openMenu() bypassed — stale defs display [LIVE BUG]
   Severity: Medium. Students see stale f(x) definitions in the panel.

4. function-menu-controller writes calculator token state directly
   Severity: Medium. Any refactor of calculator state shape silently breaks f(x).

5. dispExpr mutated imperatively in 3 places outside render()
   Severity: Medium. Expression label can get out of sync with display state.

6. Two separate expression evaluation pipelines that will diverge
   Severity: Medium-low. A trig bug fixed in evaluator.js will remain in
   function-evaluator.js. Will produce different results for same input.

7. Dynamic Function() evaluation with regex normalisation pipeline
   Severity: Medium-low. Brittle to new function names. Cannot be safely
   unit tested because it executes arbitrary JS. CSP policies will break it.

8. Token classification logic in render-display.js
   Severity: Low-medium. Will produce wrong styling when new token types
   or values are added, with no obvious connection to the render file.

9. Dead state fields in store (menuMode, exprBuf, evalBuf)
   Severity: Low. Misleads developers, may cause future sync bugs.

10. MODES/FORMATS constants defined but never used
    Severity: Low. Raw strings throughout codebase instead of constants
    means typos in format names will produce silent no-ops.


════════════════════════════════════════
SUMMARY: WHAT IS GENUINELY GOOD
════════════════════════════════════════

These parts are real improvements, not fake modularity:

- statistics-engine.js is genuinely pure and isolated. Zero coupling.
- token-model.js is genuinely pure. Correct abstraction.
- formatter.js is genuinely pure. Correct abstraction.
- render-history.js is clean and correctly scoped.
- function-evaluator.js is pure and isolated (aside from pipeline duplication).
- The store pattern (getState/update/subscribe) is sound.
- The data-attribute event delegation pattern in index.html is correct
  and eliminates inline handlers as required.
- statistics-controller.js imports nothing from calculator. Clean isolation.
- bootstrap.js is thin and correct.
