## 1. Instruction State Machine

- [x] 1.1 Add a pure instruction resolver that evaluates loading errors, terminal results, active presentations, enemy turns, confirmations, pending action targets, and normal player selection in the specified priority order; verify it has no gameplay side effects.
- [x] 1.2 Add focused unit tests covering every instruction branch, including dead/exhausted/non-actionable selections, Move, Shoot, Overwatch, End Turn, blocking states, staged operations, and invalid-target stability; verify the instruction test suite passes.

## 2. React HUD Integration

- [x] 2.1 Derive the displayed instruction from the current battle and UI state and render one dynamic line below an `Instructions` heading in the lower-right corner; verify the line updates through the player action flow without duplicating gameplay state.
- [x] 2.2 Move the version label into the lower-left Settings corner and remove it from the lower-right corner; verify the DOM contains one version label below Settings and one Instructions panel.

## 3. Responsive Presentation

- [x] 3.1 Update the existing corner styles so the Instructions heading and line wrap within the 16:9 framed surface and remain separated from Settings, version, battlefield, and action controls at desktop and mobile landscape sizes; verify with responsive browser inspection.
- [x] 3.2 Run `npm test` and `npm run build` from the repository root, then exercise selection, action targeting, confirmation, cancellation, enemy-turn, presentation, result, and load-error states in real desktop and mobile landscape browser sessions.
