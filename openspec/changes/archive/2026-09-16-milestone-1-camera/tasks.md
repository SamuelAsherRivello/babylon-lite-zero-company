## 1. Research And Agent Gate

- [x] 1.1 Start exactly three research subagents with the design's camera/presentation, player-mechanics, and combat/AI briefs; save source-linked findings with confidence and MVP inclusion/exclusion tables, and verify all three reports exist before continuing.
- [x] 1.2 Reconcile the three reports into one scoped research brief that records applicable Zero Company findings, original-versus-reference boundaries, and rejected out-of-scope features; verify every included item maps to an existing proposal requirement.
- [x] 1.3 Reassign Agent 1 to disjoint development work, Agent 2 to original/permissively licensed art and audio provenance, and Agent 3 to read-only approval; verify the work split and approval log are recorded and obtain Agent 3 PASS on the research package before checking off this group.

## 2. Runtime And Asset Foundation

- [x] 2.1 Add the minimum Babylon.js runtime dependency and scene component lifecycle under `zero-company/`; verify install metadata is consistent, a focused lifecycle test passes, and Agent 3 records PASS before checking off.
- [x] 2.2 Source or create one redistributable local character model plus required presentation textures, record creator/source/license/local filename, and verify the files load without an external URL and Agent 3 records PASS before checking off.
- [x] 2.3 Define stable unit, cover, camera, and presentation-feedback descriptors shared by React and Babylon; verify focused tests assert exactly three blue units, three red units, three covers, and one model source, then obtain Agent 3 PASS.

## 3. Greybox Scene

- [x] 3.1 Build the lit tactical platform, three block covers, and six model instances with blue/red team materials; verify a browser frame shows the complete approved mesh inventory and Agent 3 records PASS.
- [x] 3.2 Add selection rings plus static movement cells, shot tracer/muzzle-impact feedback, and Overwatch cone without gameplay mutation; verify focused interaction tests prove the visuals exist and no AP, position, health, or turn state changes, then obtain Agent 3 PASS.
- [x] 3.3 Add loading and asset-failure handling that prevents partial interaction and reports a visible failure; verify a focused failed-model test and Agent 3 PASS.

## 4. Complete Presentation UI

- [x] 4.1 Implement the player-turn banner and final-form Move, Shoot, Overwatch, and End Turn controls while preserving all four template corner roles; verify accessible labels and nonfunctional behavior in tests and obtain Agent 3 PASS.
- [x] 4.2 Implement projected in-world player HUDs for health, AP, and Overwatch state; verify all three HUDs stay bound to their units across camera changes in a browser check and obtain Agent 3 PASS.
- [x] 4.3 Add selected-unit presentation and static inspection content for all six units without enabling tactical commands; verify every unit can be selected and no action mutates scene state, then obtain Agent 3 PASS.

## 5. Camera And Responsive Frame

- [x] 5.1 Implement initial world-origin framing and focus transfer to any selected unit while preserving camera radius and angles; verify focused state tests plus player/enemy selection in the browser and obtain Agent 3 PASS.
- [x] 5.2 Implement desktop right-drag orbit, wheel zoom limits, and canvas-scoped context-menu suppression; verify real-browser pointer interactions and unchanged unit state, then obtain Agent 3 PASS.
- [x] 5.3 Implement single-tap selection, two-finger orbit, pinch zoom, and state-preserving portrait rotate-device blocking; verify mobile-landscape and portrait browser scenarios and obtain Agent 3 PASS.
- [x] 5.4 Implement the centered, height-maximizing 16:9 game frame with dark letterboxing/pillarboxing and collision-free responsive UI; verify desktop-wide, desktop-short, and mobile-landscape screenshots and obtain Agent 3 PASS.

## 6. Delivery Checkpoint 1

- [x] 6.1 Run focused tests, `npm test`, `npm run build`, and an external-request audit; verify they pass with no runtime asset dependency on the public internet and obtain Agent 3 PASS.
- [x] 6.2 Start or retain the Vite server, report the current local URL, and capture desktop plus mobile browser evidence for scene inventory, camera controls, unit focus, orientation blocking, responsive framing, and clean console state.
- [x] 6.3 Have Agent 3 compare the implementation and evidence against every proposal, spec, design, and task item; iterate failed items with the responsible agent until PASS, then record the checkpoint approval before marking any implementation task complete.
- [x] 6.4 Sync and archive `milestone-1-camera` only after checkpoint PASS, verify its main specs and archive are valid, and leave the approved live Vite build available as the baseline for `milestone-2-gameplay`.
