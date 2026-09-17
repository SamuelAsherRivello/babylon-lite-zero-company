## 1. Deterministic Pending Operations

- [x] 1.1 Add failing rule tests for staging and retargeting valid Move destinations and Shoot targets without changing AP, health, position, or random state; verify the focused tests fail on the immediate-resolution behavior.
- [x] 1.2 Add Move and Shoot target-staging command contracts and pending-action fields, including invalid-target rejection and complete cancellation; verify the focused staging and cancellation tests pass.
- [x] 1.3 Change End Turn requests to require confirmation with and without usable player AP, and verify updated turn-loop tests cover confirm and cancel without an immediate phase transition.
- [x] 1.4 Remove the Overwatch action-button double-press commitment path while retaining aim, retarget, explicit confirm, and cancel behavior; verify focused Overwatch command tests pass.

## 2. Shared React Confirmation Flow

- [x] 2.1 Add failing browser assertions that Move, Shoot, and Overwatch selections only stage their latest valid target and that End Turn displays the same inline confirmation controls; verify the assertions fail before the UI change.
- [x] 2.2 Route floor and unit selection through the new staging commands, derive confirmation readiness from battle state, and verify selection alone starts no movement, shot, AP spending, random consumption, or turn transition.
- [x] 2.3 Implement shared `Confirm?` routing for Move, Shoot, Overwatch, and End Turn using their existing resolution and presentation paths; verify each operation commits only after `Confirm?` is pressed.
- [x] 2.4 Implement shared `Cancel` routing that clears the entire staged operation and its previews without gameplay mutation; verify retargeting remains available until confirmation and cancellation returns to the idle action state.

## 3. Action-Bar Presentation

- [x] 3.1 Replace the End Turn modal with a conditional inline confirmation row and keep the four tactical action buttons visible but non-committing while confirmation is ready; verify accessible button names and DOM order are `Confirm?`, `Cancel`, Move, Shoot, Overwatch, End Turn.
- [x] 3.2 Style `Confirm?` and `Cancel` as equal two-column controls above the four-button row, sharing its total width and button height; verify bounding-box alignment at desktop and supported mobile-landscape viewport sizes.
- [x] 3.3 Verify the confirmation row is absent and occupies no space when no valid action target or End Turn request is pending, and verify it remains inside the responsive 16:9 frame without overlap.

## 4. Regression Verification

- [x] 4.1 Update affected rule and browser expectations for explicit confirmation while preserving movement, shooting, Overwatch, enemy AI, audio, and presentation behavior; verify `npm.cmd test` passes from the repository root.
- [x] 4.2 Run `npm.cmd run build` and the real-browser smoke test at desktop and mobile-landscape sizes, record any unrelated pre-existing failure separately, and verify the requested confirmation flow visually.
- [x] 4.3 Run `openspec validate confirm-tactical-operations --strict` and verify every artifact and delta specification is valid before handoff.
