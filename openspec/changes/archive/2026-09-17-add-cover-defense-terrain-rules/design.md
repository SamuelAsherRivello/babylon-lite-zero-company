## Context

Cover cells are currently full blockers: movement excludes them, line of sight
fails when the segment between cells intersects a cover cell, and blocked shots
are unselectable with zero hit probability. Weapon values are calculated in
`combat.js` from Euclidean cell distance, and `shoot.js`, `overwatch.js`, and
`enemyAi.js` already consume the same attack preview path. The greybox level
contains three fixed 2-by-2 cover blocks, which is enough geometry for a first
cover-defense slice.

## Goals / Non-Goals

**Goals:**

- Add deterministic hit-probability reduction for targets using adjacent cover.
- Make the cover reduction exactly 20 percentage points with a 5% minimum for
  otherwise legal shots.
- Make flanking a positioning reward without changing movement costs or AP.
- Give actively defended units a visible lower in-cover pose.
- Reuse one shared attack preview calculation for player shots, enemy shots,
  Overwatch reactions, and AI expected-damage scoring.
- Keep binary line-of-sight blockers exactly as blockers.

**Non-Goals:**

- Destructible cover, height/elevation, suppression, armor, damage reduction,
  or new cover art.
- Changing weapon AP costs, movement reachability, cone geometry, or turn flow.
- Adding authored animation, external assets, packages, or network services.

## Decisions

1. Model cover defense as a modifier on hit probability only.

   The first terrain rule should be obvious in previews and simple to balance.
   Damage remains unchanged so the player can understand cover as "harder to
   hit," not "less damage after hit." Alternative considered: damage reduction.
   That would require extra resolution messaging and makes expected damage less
   legible for this slice.

   The modifier is a flat 20 percentage-point subtraction from base hit
   probability, clamped to 5% for otherwise legal shots. This makes cover
   immediately visible while avoiding selectable 0% clear-line shots.

2. Compute cover defense from grid geometry, not rendered meshes.

   The rules layer should derive covered/flanked state from `level.covers`,
   shooter cell, and target cell. Rendering may visualize the result but never
   owns it. Alternative considered: use cover mesh bounds from Babylon. That
   would break deterministic Node tests and rules/presentation separation.

3. Use one shared attack-preview modifier pipeline.

   `queryAttack` should return base probability plus any active modifiers, and
   `resolveAttack` should compare the hit roll against that same final
   probability. `getAttackPreview`, enemy planning, and Overwatch then inherit
   the modifier. Alternative considered: add cover only in `shoot.js`. That
   would miss enemy AI and reaction fire.

4. Start with a conservative flank rule.

   A target is defended when adjacent cover lies generally between or beside the
   target relative to the incoming shot. A clear side/rear angle bypasses the
   modifier. The exact helper should be tested against named examples rather
   than tuned by visuals. Alternative considered: every adjacent cover always
   defends. That is easier but removes the movement/flanking payoff.

5. Show an in-cover pose only from rules-derived cover defense.

   Presentation should receive a per-unit covered state derived from the same
   geometry and attack context as the preview. The pose should be a small
   programmatic lower/squat transform layered with existing status poses and
   must not move the logical cell, collider, or selection target. Alternative
   considered: show the pose whenever a unit is adjacent to cover. That is
   easier to read, but it can imply protection from flanked angles where the
   rules do not grant cover defense.

## Risks / Trade-offs

- Flank geometry can feel unintuitive -> Mitigate with focused examples in
  tests and visible preview modifiers.
- Cover can make already low-probability shots feel too punishing -> Mitigate
  with the confirmed 5% minimum hit chance for otherwise legal covered shots.
- In-cover pose can look like gameplay movement if it shifts the actor too far
  -> Mitigate by adjusting only presentation transform and verifying projected
  HUD and selection remain anchored to the original unit cell.
- AI may overvalue flanking paths if cover adjustment is too strong -> Mitigate
  with enemy AI tests that compare immediate covered shots and legal flank
  moves.
- Concurrent `confirm-tactical-operations` changes may affect confirmation UI
  placement -> Mitigate by keeping cover indicators within existing attack
  preview surfaces and rerunning browser smoke after integration.

## Migration Plan

No saved data migration is required. Implement as a rules-first change with
focused combat and AI tests, then add the preview presentation. Verify with
`npm.cmd test`, `npm.cmd run build`, desktop and mobile browser smoke, and
`openspec validate --specs --strict`.
