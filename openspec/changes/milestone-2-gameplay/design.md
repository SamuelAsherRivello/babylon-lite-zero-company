## Context

This change begins only after `milestone-1-camera` has established and passed
the visual scene, camera controls, responsive frame, local character model, and
presentation UI. The task is to activate that exact screen as a compact,
immediately playable three-versus-three tactical game. The implementation must
remain understandable and testable despite asynchronous Babylon animation,
probabilistic combat, sequential enemy decisions, desktop and touch input, and
an evidence-gated multi-agent delivery process.

## Goals / Non-Goals

**Goals:**

- Implement one complete player/enemy battle loop with three AP per unit,
  Move, Shoot, Overwatch, elimination results, and restart.
- Keep combat rules deterministic under a supplied random source and separate
  from Babylon rendering so tests can verify state transitions exactly.
- Make range, hit chance, damage, line of sight, AP cost, and enemy intent
  visible before or during commitment.
- Apply the approved research brief from `milestone-1-camera` without widening
  the scoped MVP.
- Deliver checkpoints 2 through 5 with a playable Vite build and independent
  evidence-based approval at each boundary.

**Non-Goals:**

- No title/setup flow, campaign, strategic layer, recruitment, inventory,
  loadout editing, progression, procedural levels, network play, accounts,
  telemetry, or remote runtime content.
- No attempt to reproduce proprietary source-game art, audio, code, story,
  names, map layout, or exact balancing data.
- No simultaneous enemy activations or player interruption during enemy turns.

## Decisions

### The rules engine is a pure state machine

Battle state will be serializable data containing phase, activation order,
units, grid coordinates, health, AP, weapons, Overwatch commitments, selection,
pending action, result, and random-source state. Pure reducers or commands will
validate intent and emit state changes plus semantic events. Babylon consumes
events for movement and effects; React consumes state for controls and HUDs.
Input is accepted only when the state machine reaches a stable player-input
state.

Embedding rules directly in mesh callbacks was rejected because it would make
line-of-sight, restart, AI, and animation ordering difficult to test.

### The arena uses a discrete square grid over the approved scene

Level data owns grid dimensions, starting cells, and whole-cell cover
footprints so future levels can vary without changing rules. The shipped level
is 13 columns by 8 rows with one-world-unit cells. Column/row `(c, r)` maps to
world center `(c - 6, arenaTop, r - 3.5)`. Players start at `(2,1)`, `(6,1)`,
and `(10,1)`; enemies start at `(2,6)`, `(6,6)`, and `(10,6)`. The three equal
cover blocks use 2-by-2 footprints near their approved middle-row positions
and retain an approximately 1.9-unit height.

All six units begin with base movement 3.9. Spending one, two, or three AP
applies 1.0, 1.2, or 1.3 and floors the result, producing 3, 4, or 5 equal-cost
eight-direction steps. Reachability excludes cover and every living or dead
unit cell, prevents diagonal corner cutting, and assigns each destination its
minimum AP tier. Animation remains continuous through cell centers; logical
occupancy updates only after each step reaches its center.

### Combat previews and resolution share one calculation path

Each fixed weapon archetype defines AP cost, adjacent maximum probability,
adjacent maximum damage, and deterministic distance falloff. A single combat
query calculates distance, obstruction, hit probability, and damage range for
both previews and attack resolution. Euclidean center distance drives range
curves. Segment tests against full-height cover volumes provide line of sight;
characters never block LOS. Blocked shots return zero probability and cannot
be committed. Short-range and balanced shots cost one AP, long-range shots
cost two, and the selected cost is shown on the Shoot button.

Exact numeric tuning will be documented in code and tests after the required
research, but it may not violate the approved monotonic falloff or create a
fourth weapon/loadout choice.

### Overwatch is a committed reaction record

Confirming Overwatch creates a record containing owner, direction, cone angle
and range, every AP the owner had remaining, and the same number of reaction
shots. There is no AP selector. The owner becomes locked until its next side
turn. Movement is resolved in center-to-center steps; after each completed
step, eligible opposing records test the mover's cell center against the
ground-plane cone, obstacle-only line of sight, and remaining shots in stable
order. A qualifying record can fire once per step and decrements its allowance.
Result checks run after every reaction before movement continues.

### Status is derived separately from combat eligibility

Rules retain health, phase, AP, Overwatch commitment, and presentation events
as authoritative data. A single selector derives Idle, Moving, Shooting,
Overwatch, Taking Damage, or Dead with precedence `Dead > Taking Damage >
Moving/Shooting > Overwatch > Idle`. Dead units remain selectable and retain a
movement-blocking final cell but never block LOS or expose commands.

### Enemy planning searches a small legal action space

The AI will enumerate bounded sequences that fit remaining AP, including
immediate shots, reachable move-then-shot options, repositioning, and
directional Overwatch. It scores expected damage first, then survivability or
coverage, AP efficiency, and stable unit/cell identifiers for tie-breaking.
The active enemy executes only the first selected action, waits for resolution,
then replans from the new state until AP is spent or relinquished.

A long-horizon or learning AI was rejected as unnecessary for one small board
and harder to explain, reproduce, and approve.

### Animation gates commands but does not own outcomes

Rules determine hit, damage, death, and destination before presentation begins.
The presentation queue plays movement, tracer, particles, audio, and HUD updates
in order, then acknowledges completion so the turn controller can continue.
Reduced-motion or failed audio paths shorten presentation without altering the
result. During enemy resolution, unit inspection and camera movement remain
available, but all gameplay commands are rejected.

The static GLB uses programmatic translation, rotation, scale or height
oscillation, shake, recoil, and material or muzzle flicker for its six statuses.
Authored skeletal clips and replacement character animation assets are deferred
to a future proposal.

### Approved research and agent roles continue from milestone 1

Implementation begins by loading the reconciled research brief and approval
record produced by `milestone-1-camera`; it does not start another research
round. The main agent and Agent 1 continue to split disjoint development tasks,
Agent 2 continues to own licensed or original 2D/3D/audio assets and attribution,
and Agent 3 remains read-only and independently approves each task and
checkpoint. If those agent processes cannot persist between applies, three
replacement agents receive the same existing role records without repeating
research.

The verifier checks proposal, specs, design, tasks, diffs, automated results,
live browser evidence, console state, asset provenance, and offline behavior.
A failed item returns to the responsible implementer and repeats verification;
it is not checked off or used to advance the milestone until Agent 3 records
PASS.

### Four gameplay checkpoints complete the five-part schedule

`milestone-1-camera` is checkpoint 1 and approximately 20% of total calendar
time. This change uses four more approximately equal checkpoints:

2. Rules foundation, live inspection/HUD, turn phase, AP, and End Turn.
3. Player Move and Shoot, grid/pathing, weapons, previews, LOS, damage, and
   deterministic tests.
4. Overwatch, sequential enemy AI, victory/defeat, and restart.
5. Final local assets, 3-5 sounds, particles, touch/offline polish, full
   regression and release-readiness evidence.

Every checkpoint ends with focused tests, `npm test`, `npm run build`, a Vite
server left running at a reported local URL, desktop and mobile browser review,
and Agent 3 approval. Work continues after a passing gate rather than waiting
for a new implementation instruction.

## Risks / Trade-offs

- **Probabilistic tests can flake:** All rules accept a seeded or scripted
  random source; browser smoke tests assert legal state changes, not a specific
  unseeded roll.
- **Reaction ordering can become ambiguous:** Stable unit order, per-step checks,
  and result checks after every shot are part of the rules contract and tests.
- **AI animation may feel slow or opaque:** Intent labels and bounded animation
  timing keep the noninteractive turn readable without dragging.
- **Mobile gestures can conflict with action targeting:** One-finger taps own
  selection/targets while two-finger gestures own camera movement; pending
  targeting is preserved unless a gesture ends as a valid tap.
- **Asset licensing can block completion:** The art agent records provenance
  before integration and can create original alternatives when a redistributable
  source is unclear.
- **Agent approval can become ceremonial:** The verifier receives explicit
  acceptance evidence and must report failures with artifact references; a pass
  without test/runtime evidence is invalid.
- **Offline claims can miss hidden requests:** Final browser verification will
  inspect network activity with external requests blocked after local load.

## Migration Plan

1. Verify, sync, archive, and approve `milestone-1-camera`; record its live
   baseline before changing gameplay behavior.
2. Load the approved research brief and continue the established agent roles.
3. Add the pure rules model and connect live state to the accepted scene and UI.
4. Deliver and approve checkpoints 2 through 4 in order, retaining a playable
   Vite URL after each.
5. Integrate licensed assets and final feedback, complete checkpoint 5, and run
   full desktop/mobile/offline verification.
6. Sync and archive this change only after every task and checkpoint has a
   recorded PASS and the implementation matches all capability specs.

Because the application stores no authoritative server data, rollback is an
additive code rollback to the approved camera milestone. Local presentation
preferences may be ignored safely if their newer keys are absent.
