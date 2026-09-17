## Why

After the scene and camera baseline is approved, Zero Company needs a complete
small tactical battle rather than a broader campaign. This change turns the
visual checkpoint into an immediately playable three-versus-three encounter
and uses evidence-driven approval gates to prevent incomplete work from being
counted as progress.

## What Changes

- Require `milestone-1-camera` to be implemented, verified, synced, archived,
  and approved before gameplay implementation starts.
- Begin directly on the player turn with three player operatives and three
  enemies, each unit receiving three AP at the start of its side's turn.
- Let the player inspect all six units, including dead units, during either
  side's turn. Inspection shows health, weapon, AP, and a user-facing status;
  only living player units expose enabled actions during the player turn.
- Add Move, Shoot, Overwatch, and End Turn interactions using the confirmed
  targeting and confirmation flows.
- Ship one data-defined 13-column by 8-row level with one-unit square cells,
  whole-cell cover footprints, grid-centered starts, and color-tiered movement
  destinations. All units use eight-direction movement, a 3.9 base allowance,
  and floored 1.0/1.2/1.3 multipliers for 3/4/5-cell reach at 1/2/3 AP.
- Animate every move center-to-center without combining movement with attacks.
- Add three fixed weapon archetypes whose Euclidean-distance hit probability
  and damage are highest at adjacent range and decrease with distance. Show
  Shoot cost on its button: short and balanced weapons cost one AP and the
  long-range weapon costs two AP.
- Keep the three equal-height cover blocks as whole 2-by-2-cell obstacles that
  fully block normal and reaction line of sight; characters never block LOS.
- Make Overwatch consume all of the operative's remaining AP on second-press
  confirmation. Its ground-plane cone can be retargeted before commitment and
  grants at most one reaction shot per AP consumed, only when an opponent's
  completed movement step enters the cone with clear LOS.
- Allow End Turn at any time; request confirmation when any usable player AP
  remains and end immediately when none remains.
- Run the enemy turn without player input, one enemy at a time, spending each
  enemy's three AP on Move, Shoot, or Overwatch under the same combat rules.
- Show victory when all three enemies are defeated and defeat when all three
  player operatives are defeated; both results offer Restart.
- Add restrained lighting, combat particles, and 3-5 locally bundled,
  permissively licensed sound effects with recorded attribution.
- Use programmatic transforms and color/muzzle flicker to communicate Idle,
  Moving, Shooting, Overwatch, Taking Damage, and Dead; authored skeletal
  character animations remain future work.
- Consume the approved three-agent research brief from `milestone-1-camera`
  without repeating or broadening research, and continue its established agent
  roles: main plus one development agent, one asset agent, and one independent
  approval agent.
- Require the approval agent to pass every implementation task and delivery
  checkpoint against the proposal and evidence before progress continues.
- Divide implementation into delivery checkpoints 2 through 5, each consuming
  about 20% of the total calendar time. At each checkpoint, run tests and build,
  start or retain a Vite server so the user can play the current game, collect
  desktop/mobile browser evidence, and iterate on any failed approval until it
  passes.

## Capabilities

### New Capabilities

- `tactical-turn-loop`: Player/enemy phases, per-unit AP, sequential enemy
  activations, turn transitions, inspection permissions, and early-end
  confirmation.
- `tactical-actions`: Movement destinations, distance-scaled shooting,
  line-of-sight restrictions, weapon roles, Overwatch investment/aiming, and
  reaction resolution.
- `enemy-tactical-ai`: Automatic enemy AP spending and tactical selection of
  movement, shooting, and defensive Overwatch.
- `battle-results`: Three-versus-three elimination, victory/defeat prompts,
  and deterministic restart behavior.
- `offline-combat-feedback`: Locally bundled sound, particles, animation, and
  attribution required for a complete offline-capable battle.

### Modified Capabilities

None.

## Impact

- Adds deterministic gameplay state and rules beneath the accepted scene,
  camera, and React/Babylon ownership boundary.
- Activates the existing visual action controls and unit HUDs without adding a
  title screen, campaign, inventory, loadout editor, progression, networking,
  telemetry, or runtime asset downloads.
- Adds tests for rules and state transitions plus real-browser checks for all
  player actions, enemy sequencing, mobile controls, offline assets, results,
  and restart.
- Requires traceable research notes, asset licensing records, five total
  playable Vite checkpoints across both changes, and approval evidence for
  every completed task and checkpoint.
