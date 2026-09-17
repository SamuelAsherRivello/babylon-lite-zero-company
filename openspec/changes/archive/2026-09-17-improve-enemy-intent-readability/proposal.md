## Why

Enemy turns are currently legal and deterministic, but their intent is only
summarized as a short action banner before resolution. Players need a clearer
preview of what the active enemy is about to do so movement, shooting, and
Overwatch decisions read as tactical choices instead of sudden automation.

## What Changes

- Expand enemy intent presentation to show the active enemy, chosen action, AP
  cost, target or destination, and the relevant hit/damage or Overwatch area
  details before the action resolves.
- Reuse deterministic planner output for presentation so intent previews do
  not consume random outcomes or change the chosen AI action.
- Add presentation-only scene previews for enemy movement paths, shot target
  lines, and enemy Overwatch cones while preserving player camera inspection
  and preventing player commands during enemy resolution.
- Keep all assets local and avoid new runtime network dependencies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `enemy-tactical-ai`: enemy intent becomes a richer observable contract that
  exposes chosen plan details without changing deterministic planning.
- `tactical-scene-presentation`: enemy intent previews become part of the
  visible battle presentation and must stay inside the responsive frame.
- `offline-combat-feedback`: intent previews and action feedback must remain
  presentation-only, local, and non-mutating.

## Impact

- Affected source areas: enemy plan selection in
  `zero-company/src/game/rules/enemyAi.js`, enemy turn orchestration and intent
  state in `zero-company/src/App.jsx`, Babylon presentation preview plumbing in
  `zero-company/src/game/presentationScene.js` and
  `zero-company/src/game/sceneLifecycle.js`, and HUD styling in
  `zero-company/src/style.css`.
- Affected tests: focused enemy AI serialization tests, browser smoke coverage
  for enemy intent details, and presentation tests for preview-only rendering.
- No new package dependency is expected.
