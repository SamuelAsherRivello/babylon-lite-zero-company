## Why

Zero Company needs a reviewable visual foundation before gameplay rules are
added. A first playable checkpoint will establish the complete greybox scene,
responsive 16:9 presentation, character and interface inventory, and camera
behavior while limiting interaction to inspection, orbit, and zoom.

## What Changes

- Replace the empty application content with a lit Babylon.js greybox arena.
- Present one platform, three block obstacles, three blue operatives, and three
  red enemies using six instances of one locally bundled character model.
- Render the complete presentation-level interface: turn banner, four action
  buttons, selection rings, unit health/AP/Overwatch indicators, and static
  examples of movement, shooting, and Overwatch feedback.
- Keep action controls nonfunctional and expose only character selection and
  camera interaction.
- Start the camera focused on the world origin; selecting any unit transfers
  focus while preserving the camera offset.
- Support right-button orbit and wheel zoom on desktop, plus two-finger orbit
  and pinch zoom on mobile.
- Fit the game into a centered 16:9 surface with a dark surround and required
  letterboxing or pillarboxing; mobile portrait shows a rotate-device prompt.
- Bundle all presentation assets locally so the checkpoint runs without a
  gameplay-time network connection.
- During apply, start exactly three research subagents to investigate Zero
  Company presentation, player mechanics, and enemy/combat behavior, then
  condense only relevant findings into one approved MVP brief before coding.
- After research, use the main agent plus one development agent for disjoint
  implementation work, one asset agent for licensed/fresh 2D, 3D, and audio
  assets, and one independent approval agent that must pass each task and the
  checkpoint before it is counted complete.
- Deliver this change as the first of five equal calendar-time checkpoints and
  finish by running Vite for browser play, tests, build, desktop/mobile visual
  review, and an independent approval gate.

## Capabilities

### New Capabilities

- `tactical-scene-presentation`: Complete nonfunctional greybox arena,
  character, HUD, responsive viewport, lighting, and presentation asset
  requirements.
- `tactical-camera-controls`: Unit focus, desktop orbit/zoom, mobile touch
  orbit/zoom, and landscape-orientation behavior.

### Modified Capabilities

None.

## Impact

- Replaces the blank `content_layer` with a Babylon.js canvas and scene while
  preserving React ownership of `ui_layer`.
- Adds the minimum Babylon.js runtime dependency and locally bundled model and
  presentation assets required by the approved visual target.
- Extends application tests and browser verification to cover framing, camera
  controls, selection, responsive layout, and noninteractive action controls.
- Produces the research brief, asset provenance, and approval record consumed
  by `milestone-2-gameplay`.
- Establishes the accepted scene and camera baseline required before
  `milestone-2-gameplay` may be applied.
