## Context

The current React/Vite application owns a reusable four-corner `ui_layer` but
does not yet have a 3D runtime. This change establishes the complete approved
screen before gameplay: a compact Babylon.js greybox battle, six visible
operatives, tactical HUD and feedback, and camera inspection. The attached
reference image is the visual-complexity ceiling and inventory target, not a
source asset. The implementation must support desktop and mobile browsers,
keep all runtime assets local, and preserve the repository-root npm workflow
with application code under `zero-company/`.

## Goals / Non-Goals

**Goals:**

- Establish a stable React/Babylon ownership boundary and a disposable scene
  lifecycle that survives React development behavior.
- Reproduce the approved greybox composition and interface inventory with one
  reusable character model, lighting, team colors, and restrained feedback.
- Implement unit selection plus focus-preserving orbit and zoom for desktop
  and mobile landscape.
- Complete the three-lane research round and condense its relevant findings
  into an approved MVP brief before implementation begins.
- Finish delivery checkpoint 1 with tests, build, a live Vite URL, browser
  evidence, and independent approval.

**Non-Goals:**

- No AP spending, movement, shooting, damage, Overwatch resolution, enemy AI,
  turn transition, results, or restart behavior.
- No campaign, title screen, loadout, inventory, progression, networking,
  telemetry, or runtime asset download.
- No unique production model per unit or environment decoration beyond the
  approved visual inventory.

## Decisions

### React owns interface state and Babylon owns the world

React will continue to render `ui_layer`, including corner roles, turn banner,
action bar, orientation blocker, and other screen-space interface. A dedicated
scene component will own the Babylon engine, canvas, meshes, lights, picking,
and render loop inside `content_layer`. Scene callbacks report only selection
and camera-relevant state to React.

This keeps accessible HTML controls easy to test and prevents gameplay UI from
being embedded in the render loop. A Babylon-only GUI was rejected because it
would duplicate the existing React layer and make responsive DOM testing less
direct.

### One scene module defines named presentation entities

The scene will create stable, named entities for the arena, three covers, six
operatives, selection rings, movement cells, shot feedback, and Overwatch cone.
Unit descriptors will carry team, label, display health, display AP, and static
weapon identity so milestone 2 can replace display values with live state
without rebuilding the scene graph.

The character will be one locally bundled glTF/GLB source cloned or instanced
six times and recolored with blue and red materials. Primitive-only soldiers
were rejected because the user explicitly requested one 3D character model.

### World HUDs use projected DOM anchors

Player HUDs will remain React elements whose screen positions are updated from
Babylon world-to-screen projections after rendering. Each anchor will be
clamped or hidden when its unit is not projectable, and the HUD layer will not
accept pointer input. This preserves crisp text and lets milestone 2 update HUD
content through ordinary React state.

Babylon texture-based labels were considered but would complicate responsive
text sizing and accessibility.

### A constrained orbital rig handles all input modes

The camera will use an orbital target, radius, azimuth, and elevation with
configured limits. Its initial target is the world origin. Selecting a unit
changes only the target; current radius and angles remain intact. Pointer
handling will map right-button drag and wheel on desktop, single-tap selection
plus two-finger drag and pinch on touch, and suppress the context menu only on
the canvas.

Using Babylon's default controls without an explicit input mapping was
rejected because it would permit unintended left-drag orbit and conflict with
unit selection and future floor targeting.

### CSS owns the 16:9 frame and orientation blocker

An outer full-viewport shell will provide the dark surround. An inner frame
will use a fixed 16:9 aspect ratio constrained by both viewport dimensions.
React UI and the Babylon canvas will fill the same frame. A portrait mobile
media/orientation condition will display a blocking prompt without destroying
the scene, preserving camera state across rotation.

### Checkpoint acceptance requires runtime evidence

Delivery checkpoint 1 is complete only after focused tests, `npm test`,
`npm run build`, and real-browser review at desktop and mobile landscape sizes.
The Vite server remains running at a reported local URL for user play. An
independent verifier reviews the proposal, specs, task evidence, screenshots,
console state, and interaction checks; a failure returns the item to
implementation and verification until it passes.

### Research and agent roles begin before implementation

At apply start, exactly three research subagents receive non-overlapping briefs:

1. Camera, visual language, environment, and interface presentation.
2. Squad composition, AP, movement, shooting, and turn mechanics.
3. Combat resolution, line of sight, Overwatch, recommendations, and enemy AI.

Each returns sources, observations, confidence, and an MVP inclusion/exclusion
table. The main agent reconciles conflicts and records one condensed research
brief before implementation begins. Only findings compatible with these specs
may affect presentation or future tuning; scope changes require artifact
revision.

After research, the same three agents are reassigned: Agent 1 and the main
agent split disjoint development tasks; Agent 2 finds or creates the licensed
2D, 3D, and audio asset set and attribution; Agent 3 becomes a read-only,
independent verifier. Agent 3 checks each completed task against the proposal,
specs, design, diff, focused verification, and runtime evidence. A failed item
returns to the responsible implementer and repeats verification; it is not
checked off or used to advance the checkpoint until Agent 3 records PASS.

## Risks / Trade-offs

- **Projected HUD jitter:** Per-frame projection can make labels vibrate.
  Stable world anchors and rounded pixel positions reduce visible movement.
- **Touch gesture ambiguity:** Browsers may reserve pinch gestures. Canvas
  `touch-action` and pointer tracking will be scoped to the game frame and
  verified on emulated mobile sizes plus an available touch-capable browser.
- **Model loading delay:** A local model can arrive after the scene starts.
  The loading state will keep the scene noninteractive until required assets
  are ready and report a visible failure instead of silently omitting units.
- **Static feedback could imply gameplay:** Presentation examples will be
  clearly non-mutating and controls will expose disabled semantics while still
  showing their final visual form.
- **Small landscape screens:** The complete action bar and corner template can
  compete for space. Responsive constraints will reduce gaps and wrap only
  where the 16:9 frame remains legible; text will not scale with viewport width.

## Migration Plan

1. Run the three research lanes, reconcile them into the scoped MVP brief, and
   assign the post-research development, asset, and verifier roles.
2. Add the minimum Babylon runtime packages and local presentation assets with
   their source and license notes.
3. Introduce the scene lifecycle, entity descriptors, and unit picking behind
   the existing React shell.
4. Add projected HUD and presentation-only tactical feedback.
5. Add the 16:9 frame, orientation blocker, and mapped camera controls.
6. Run the checkpoint verification and preserve the approved scene contract as
   the prerequisite baseline for `milestone-2-gameplay`.

Rollback is additive: the pre-change React shell remains represented in Git
history, and no persisted user or server data requires migration.
