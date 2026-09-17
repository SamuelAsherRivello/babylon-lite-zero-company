## Why

Cover currently blocks movement and line of sight, but it has no tactical value
when a unit is exposed beside it. Adding a small defensive-cover layer makes
positioning matter more without expanding the game into a large terrain system.

## What Changes

- Add terrain-derived cover defense for units adjacent to cover when a shooter
  does not have a clear flank: a 20 percentage-point hit-probability reduction
  clamped to a 5% minimum for otherwise legal shots.
- Show cover defense in attack previews before the player confirms a shot.
- Show a visible lower in-cover character pose when cover defense is active.
- Apply the same cover-adjusted preview to player shots, enemy shots, enemy
  plan scoring, and Overwatch reaction attacks.
- Keep full cover blockers unchanged: a blocked line of sight still makes the
  target unselectable with zero hit probability.
- Add lightweight presentation feedback that identifies when a shot preview is
  reduced by cover.
- Avoid new packages, external assets, or runtime network calls.

## Capabilities

### New Capabilities

- `tactical-terrain-effects`: defines defensive cover effects, flank behavior,
  and how terrain modifiers appear in combat previews.

### Modified Capabilities

- `tactical-actions`: Shoot and Overwatch previews and resolution use
  cover-adjusted hit probability when line of sight remains clear.
- `enemy-tactical-ai`: enemy plan utility uses the same cover-adjusted attack
  previews as player actions.
- `tactical-scene-presentation`: visible combat previews and character posing
  identify cover defense without obscuring the existing 16:9 battle interface.

## Impact

- Affected source areas: cover/level helpers in
  `zero-company/src/game/rules/level.js` and `grid.js`, line and attack
  preview logic in `lineOfSight.js`, `combat.js`, `shoot.js`, and
  `overwatch.js`, enemy utility in `enemyAi.js`, player/enemy preview display
  in `App.jsx`, and scene/HUD styling in `presentationScene.js` and
  `style.css`.
- Affected tests: combat foundation, shoot rules, Overwatch foundation,
  enemy AI, browser smoke, presentation tests, and character state presentation.
- No new dependency is expected.
