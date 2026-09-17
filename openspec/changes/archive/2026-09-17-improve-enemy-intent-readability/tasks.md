## 1. Intent Data Contract

- [x] 1.1 Add focused rule or view-model tests proving an enemy Shoot plan can be converted into a serializable intent containing unit, target, AP cost, hit probability, maximum damage, and unchanged random state.
- [x] 1.2 Add focused tests for Move, move-then-shoot, Overwatch, and relinquish intent view models, verifying destination, path, follow-up target, cone geometry, sequence, and non-mutating planner behavior.
- [x] 1.3 Implement the intent view-model formatter at the rules/React boundary and verify the focused intent tests pass without changing `chooseEnemyPlan()` scoring results.

## 2. React Enemy Intent Presentation

- [x] 2.1 Expand enemy turn intent state to store the full view model from the selected plan and verify existing enemy activation tests still resolve the captured plan after the preview delay.
- [x] 2.2 Update the enemy intent HUD text to show action-specific target, destination, AP, hit probability, damage, or Overwatch details and verify accessible text appears in browser assertions.
- [x] 2.3 Clear intent state on action completion, enemy activation advance, restart, presentation fallback, and battle result; verify stale intent text and datasets disappear in focused browser checks.

## 3. Babylon Intent Preview Presentation

- [x] 3.1 Add a presentation-only enemy intent preview controller for Move paths or destinations, Shoot target relationships, and Overwatch cones; verify presentation snapshot or browser datasets report the expected preview kind and count.
- [x] 3.2 Route the React intent view model into the scene preview controller and verify previews are non-pickable, clear on `null`, and do not replace committed movement highlights, shot feedback, or Overwatch indicators.
- [x] 3.3 Add fallback handling so preview rendering failure does not block enemy resolution; verify a forced or simulated preview failure still completes the enemy activation.

## 4. Regression Verification

- [x] 4.1 Update browser smoke coverage for enemy Shoot, Move, move-then-shoot, and Overwatch intent readability at desktop and mobile-landscape sizes; verify the checks wait on stable intent predicates.
- [x] 4.2 Run `npm.cmd test` from the repository root and verify rule, presentation, and browser-support tests pass.
- [x] 4.3 Run `npm.cmd run build` from the repository root and verify the production bundle completes without new dependency or asset warnings beyond pre-existing bundle-size warnings.
- [x] 4.4 Run `openspec validate improve-enemy-intent-readability --strict` and verify the change artifacts and delta specs are valid before handoff.
