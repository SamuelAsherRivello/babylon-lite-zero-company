## Purpose

Define unit-focused camera selection, orbit, zoom, and mobile orientation
behavior while keeping camera inspection as the milestone's only interaction.

## ADDED Requirements

### Requirement: The camera starts from a fixed overview

The camera SHALL begin at a defined distance and angle while focused on the
world origin, with all six operatives and the three cover blocks visible.

#### Scenario: First camera frame is an overview

- **WHEN** the battle scene first becomes interactive
- **THEN** the camera targets the world origin from the configured offset and
  frames the complete battlefield

### Requirement: Any operative can become the camera focus

The user SHALL be able to select any of the six operatives with a primary
pointer press or single-finger tap. Selection SHALL transfer the camera focus
to that operative while preserving the camera's current angular and distance
offset and SHALL show an unambiguous selection treatment.

#### Scenario: Player operative is selected

- **WHEN** the user selects a blue operative
- **THEN** that operative becomes selected and the camera focus moves to it
  without resetting the current orbit angle or zoom distance

#### Scenario: Enemy operative is selected

- **WHEN** the user selects a red operative
- **THEN** that operative becomes selected and the camera focus moves to it
  without enabling a tactical action

### Requirement: Desktop pointer controls orbit and zoom around focus

On a desktop pointer device, holding and dragging the secondary mouse button
SHALL orbit the camera around the current focus, and the mouse wheel SHALL zoom
toward or away from that focus within configured near and far limits. The
secondary-button interaction SHALL not open the browser context menu over the
game surface.

#### Scenario: Right drag orbits

- **WHEN** the user right-drags across the game surface
- **THEN** the camera rotates around the current focus without moving the focus

#### Scenario: Wheel zoom is clamped

- **WHEN** the user scrolls repeatedly toward either zoom limit
- **THEN** the camera approaches but does not cross the configured near or far
  boundary

### Requirement: Mobile gestures orbit and zoom around focus

On a touch device in landscape orientation, a two-finger drag SHALL orbit the
camera around the current focus and a pinch gesture SHALL zoom within the same
near and far limits. A single-finger tap SHALL remain available for operative
selection.

#### Scenario: Two-finger drag orbits

- **WHEN** the user drags two fingers across the game surface
- **THEN** the camera rotates around the current focus without selecting a
  floor position or changing presentation state

#### Scenario: Pinch changes distance

- **WHEN** the user pinches inward or outward
- **THEN** the camera distance changes around the current focus and remains
  inside the configured zoom limits

### Requirement: Portrait mobile blocks play with orientation guidance

When a mobile viewport is in portrait orientation, the application SHALL
cover the game surface with a rotate-device prompt and prevent camera input.
Returning to landscape SHALL restore the existing scene and camera state.

#### Scenario: Portrait orientation is blocked

- **WHEN** a mobile device displays the application in portrait orientation
- **THEN** a rotate-device prompt is shown and selection, orbit, and zoom do
  not affect the scene

#### Scenario: Landscape restores camera inspection

- **WHEN** the same device returns to landscape orientation
- **THEN** the prompt disappears and camera inspection resumes from the state
  held before the orientation change
