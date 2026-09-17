## 1. Prerequisite And Continuing Roles

- [x] 1.1 Verify `milestone-1-camera` is implemented, approved, synced, and archived, and verify its live scene/camera baseline still passes before changing gameplay behavior.
- [x] 1.2 Load the approved research brief and role records from milestone 1, reconstituting Agent 1 development, Agent 2 assets, and Agent 3 read-only verification only if needed; verify no duplicate research round or scope expansion occurs and obtain Agent 3 PASS.
- [x] 1.3 Split the gameplay write sets between the main agent and Agent 1, reserve all asset/provenance writes for Agent 2, and verify Agent 3 has read-only access to artifacts, diffs, tests, and runtime evidence before implementation starts.

## 2. Delivery Checkpoint 2: Rules, Turns, And Inspection

- [x] 2.1 Write failing focused tests for opening player state, exact 3v3 roster, three-AP refresh, phase permissions, sequential enemy order, status precedence, dead-unit inspection/occupancy, remaining-AP confirmation, and restartable serializable state; verify the tests fail for the intended missing behavior and obtain Agent 3 PASS.
- [x] 2.2 Implement the pure battle state, command validation, semantic event output, seeded/scripted random source, AP refresh, and phase controller; verify the checkpoint-2 rules tests pass and obtain Agent 3 PASS.
- [x] 2.3 Connect all-six-unit inspection including dead units, Status, live player HUD values, action enablement, active-unit treatment, and enemy information to battle state; verify every status and living/dead inspection during player, enemy, and result phases in tests and browser evidence, then obtain Agent 3 PASS.
- [x] 2.4 Activate End Turn with Are you sure confirmation only while usable player AP remains, and activate noninteractive sequential enemy placeholders that relinquish AP; verify confirm/cancel/immediate-end and input-lock cases and obtain Agent 3 PASS.
- [x] 2.5 Run focused tests, `npm test`, and `npm run build`; start or retain Vite and report its URL; verify checkpoint-2 desktop/mobile gameplay and console evidence, then iterate until Agent 3 records checkpoint PASS.

## 3. Delivery Checkpoint 3: Move And Shoot

- [x] 3.1 Write failing tests for the data-defined 13-by-8 grid, exact starts, equal 2-by-2 cover footprints, center mapping, blocked living/dead cells, no corner cutting, 3/4/5 eight-direction reach, movement-only semantics, weapon costs, Euclidean falloff, obstacle-only LOS, and preview/resolution parity; verify intended failures and obtain Agent 3 PASS.
- [x] 3.2 Implement level data, grid-to-world mapping, reachable-cell search, three-color minimum AP tiers, centered/in-bounds highlights, destination selection, per-step occupancy updates, and movement animation gating; verify every start/end is a cell center and each destination spends its displayed cost without attacking, then obtain Agent 3 PASS.
- [x] 3.3 Implement one shared obstacle-only LOS, Euclidean hit-probability, and damage calculation for previews and resolution, with adjacent maximums and deterministic archetype falloff; verify cover-blocked, character-crossing, adjacent, diagonal, and distant unit tests and obtain Agent 3 PASS.
- [x] 3.4 Activate Shoot targeting, cost-on-button, and valid-target feedback; resolve one stationary attack through the seeded random source and update health/death state after feedback; verify one-AP short/balanced, two-AP long-range, miss, hit, lethal, insufficient-AP, and cancelled-target browser flows and obtain Agent 3 PASS.
- [x] 3.5 Verify switching unit or action cancels uncommitted Move/Shoot state without changing AP, health, position, turn, or Overwatch state; run focused tests and obtain Agent 3 PASS.
- [x] 3.6 Run focused tests, `npm test`, and `npm run build`; start or retain Vite and report its URL; verify checkpoint-3 desktop/mobile Move/Shoot and console evidence, then iterate until Agent 3 records checkpoint PASS.

## 4. Delivery Checkpoint 4: Overwatch, Enemy AI, And Results

- [x] 4.1 Write failing tests for Overwatch consuming all remaining AP, retarget-before-confirm, second-press commitment, lockout, ground-plane cell-center cone plus obstacle-only LOS checks, one reaction per consumed AP, expiry, stable reaction order, and death during movement; verify intended failures and obtain Agent 3 PASS.
- [x] 4.2 Implement no-selector Overwatch with visible all-remaining-AP cost, floor-directed preview cone, repeated retargeting, second-press confirmation, committed Status/HUD, shot capacity equal to AP consumed, and player lockout; verify one/two/three-AP commitment flows and obtain Agent 3 PASS.
- [x] 4.3 Implement post-step cell-center reaction checks and enemy Overwatch using the same remaining-AP, cone, and obstacle-LOS rules, stopping queued activity on a terminal result; verify cone misses, blocked LOS, multiple-shot limits, expiry, and lethal reactions and obtain Agent 3 PASS.
- [x] 4.4 Write failing AI tests for legal shared rules, expected-damage scoring, move-then-shoot improvement, defensive Overwatch, stable tie-breaking, finite relinquish, and one-at-a-time activation; verify intended failures and obtain Agent 3 PASS.
- [x] 4.5 Implement bounded enemy replanning and sequential Move/Shoot/Overwatch resolution with visible active-enemy intent while player camera/inspection remains available; verify deterministic AI cases and noninteractive browser playback, then obtain Agent 3 PASS.
- [x] 4.6 Implement immediate victory/defeat prompts with retained camera/dead-unit inspection and in-memory Restart restoring grid starts, health, weapons, AP, Overwatch, Status, selection, random state, and player phase; verify all-player/all-enemy elimination, dead-cell blocking, terminal inspection, and both restart paths, then obtain Agent 3 PASS.
- [x] 4.7 Run focused tests, `npm test`, and `npm run build`; start or retain Vite and report its URL; verify checkpoint-4 desktop/mobile full-loop and console evidence, then iterate until Agent 3 records checkpoint PASS.

## 5. Delivery Checkpoint 5: Assets, Feedback, And Offline Polish

- [x] 5.1 Have Agent 2 source or create exactly three to five redistributable sound effects and any remaining original/permissive visual assets, record creator/source/license/local filename for each, and obtain Agent 3 provenance PASS before integration.
- [x] 5.2 Integrate local action sounds with browser gesture unlocking and persistent mute in Settings; verify blocked-audio and muted play remain fully playable and obtain Agent 3 PASS.
- [x] 5.3 Integrate programmatic Idle bob, center-to-center walking bob/facing, Overwatch aim motion, shooting recoil/muzzle flicker, damage shake/color flash, dead settling, and restrained local tracer/impact feedback whose timing gates presentation but never determines rules; verify every Status, event ordering, reduced/failed feedback fallback, and Agent 3 PASS.
- [x] 5.4 Polish desktop mouse and mobile landscape touch targeting without regressing camera gestures, 16:9 framing, rotate-device blocking, HUD alignment, or accessible control states; verify the supported viewport matrix and obtain Agent 3 PASS.
- [x] 5.5 Run focused tests, `npm test`, `npm run build`, full desktop/mobile browser flows, clean-console checks, and a blocked-external-network playthrough through result and restart; iterate until every check passes and Agent 3 records checkpoint PASS.

## 6. Documentation And Release

- [x] 6.1 Update README gameplay, controls, mobile orientation, offline behavior, asset attribution links, and visible version; verify every documented command and current UI claim against the checkout and obtain Agent 3 PASS.
- [x] 6.2 Complete the template delivery checklist, verify OpenSpec implementation consistency and strict validation, and have Agent 3 issue final PASS only after every task and all five checkpoint records are complete.
- [x] 6.3 Sync and archive `milestone-2-gameplay`, verify main specs and archives, then commit only scoped project files and perform a normal non-force push after confirming no secret or unrelated file is staged.
- [x] 6.4 Create a new, non-overwriting GitHub release whose version matches the README and repository version file, verify the public repository and release page show that version, and retain the final Vite URL for local play.
