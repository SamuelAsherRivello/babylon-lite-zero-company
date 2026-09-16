# Milestone 1 Camera Evidence

This record maps the `milestone-1-camera` implementation to its OpenSpec tasks.
The canonical visual is `screenshot01.png`; additional browser captures live in
the ignored `.playwright-cli/evidence/` directory.

## Runtime And Assets

- **2.1 Runtime lifecycle:** `@babylonjs/core` and `@babylonjs/loaders` are
  pinned in the npm lockfile. `sceneLifecycle.js` owns initialization, disposal,
  loading, and error transitions. The focused lifecycle assertions pass in
  `npm test`.
- **2.2 Local model:** `public/assets/models/character.glb` is an original CC0
  low-poly greybox humanoid. Its provenance, contents, and SHA-256 digest are
  recorded in `assets.md`. The GLB has an embedded buffer and no external URI,
  image, or texture dependency.
- **2.3 Shared descriptors:** `src/game/descriptors.js` defines exactly three
  blue units, three red units, three covers, one model source, the camera
  contract, and static presentation feedback. Focused tests assert those exact
  counts.

## Scene And UI

- **3.1 Scene inventory:** Browser smoke checks report six units and three cover
  blocks. The canonical 1600x900 capture shows the lit neutral-grey platform,
  all six blue/red character instances, and all three covers.
- **3.2 Presentation feedback:** Selection rings, colored movement cells, a shot
  tracer with muzzle/impact effects, and an Overwatch cone are visible. Browser
  assertions click every action and confirm selected unit, positions, health,
  action points, and turn state do not change.
- **3.3 Failure state:** The browser smoke suite intercepts the model request,
  returns a failure, and verifies the visible error state, zero unit HUDs, and
  disabled scene input. `asset-error.png` captures the result.
- **4.1 Final-form shell:** The Player Turn banner and Move, Shoot, Overwatch,
  and End Turn controls expose accessible names and remain nonfunctional. The
  title, repository, settings/fullscreen, and version corner roles are retained.
- **4.2 Projected HUDs:** All three players show health, AP, and Overwatch state;
  enemies show their presentation health bars. Browser checks retain all six
  projected HUDs while orbiting and zooming.
- **4.3 Unit inspection:** Each of the six units is selectable. The inspection
  surface updates health, weapon, AP, and Overwatch without enabling a tactical
  command or changing game state.

## Camera And Responsive Frame

- **5.1 Focus:** The initial camera targets the world origin. Selecting either
  team transfers focus while preserving alpha, beta, and radius.
- **5.2 Desktop input:** Real-browser checks cover right-button orbit, bounded
  wheel zoom, and canvas-scoped context-menu suppression with unchanged unit
  state.
- **5.3 Touch input:** Landscape emulation covers single-tap selection,
  two-finger orbit, and pinch zoom. Portrait emulation verifies the rotate-device
  blocker and preserved presentation state.
- **5.4 Framing:** The game frame is centered and height-maximizing at 16:9 with
  dark bars outside it. `desktop-wide.png`, `desktop-short.png`, and
  `mobile-landscape.png` cover pillarbox, letterbox, and collision-free mobile
  layouts.

## Delivery Verification

- `npm test`: 7 of 7 tests pass.
- `npm run build`: passes. Vite reports only its advisory large-chunk warning;
  no acceptance threshold is defined for this presentation milestone.
- `npm run test:browser`: passes against the retained Vite server.
- Desktop canvas sampling: 30,000 visible samples, 65 color buckets, variance
  1983.1956.
- Mobile canvas sampling: 30,030 visible samples, 71 color buckets, variance
  2247.8959.
- External requests: 0.
- Browser console problems: 0.
- `openspec validate milestone-1-camera --strict`: passes.
- `git diff --check`: passes; Git reports only working-tree line-ending notices.
- Placeholder scan outside the template checklist and OpenSpec planning files:
  no unresolved project placeholders.
- Live baseline: `http://127.0.0.1:5176/babylon-lite-zero-company/` returns HTTP
  200 and remains available for the next milestone.

## Captures

- `documentation/screenshot01.png`: canonical untouched desktop frame.
- `.playwright-cli/evidence/desktop-wide.png`: wide desktop pillarboxing.
- `.playwright-cli/evidence/desktop-short.png`: short desktop letterboxing.
- `.playwright-cli/evidence/mobile-portrait.png`: rotate-device blocker.
- `.playwright-cli/evidence/mobile-landscape-initial.png`: initial touch frame.
- `.playwright-cli/evidence/mobile-landscape.png`: touch orbit and pinch result.
- `.playwright-cli/evidence/asset-error.png`: local model failure state.
