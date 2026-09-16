## Purpose

Define the complete, locally rendered greybox battle presentation that the
camera milestone must expose before any tactical action changes game state.

## ADDED Requirements

### Requirement: The game presents the complete greybox battlefield

The application SHALL render one lit tactical platform, three block-shaped
cover obstacles, three blue player operatives, and three red enemy operatives
inside the first playable view. The six operatives SHALL use instances or
clones of one locally bundled 3D character model, with team color providing
the primary visual distinction.

#### Scenario: Initial scene is complete

- **WHEN** the application finishes loading
- **THEN** the platform, all three cover blocks, all three blue operatives,
  and all three red operatives are visible in the framed battle view

#### Scenario: Teams share one character source

- **WHEN** the six operative meshes are inspected
- **THEN** they originate from one bundled character model and use blue or red
  team treatment without requiring six separate character assets

### Requirement: The presentation matches the approved visual inventory

The application SHALL show a player-turn banner, Move, Shoot, Overwatch, and
End Turn controls, selection rings, health indicators, action-point
indicators, Overwatch state indicators, movement-cell highlighting, a shot
tracer with impact or muzzle feedback, and an aimed Overwatch cone. These
elements SHALL remain presentation-only in this milestone.

#### Scenario: Complete interface is visible

- **WHEN** the initial player-turn view is displayed
- **THEN** every named interface and tactical-feedback element is represented
  without obscuring the six units or the primary battlefield

#### Scenario: Action controls do not mutate state

- **WHEN** the user presses Move, Shoot, Overwatch, or End Turn
- **THEN** no unit moves, attacks, enters Overwatch, spends AP, or changes turn

### Requirement: Player operatives have anchored in-world status HUDs

Each player-controlled operative SHALL have an in-world HUD that displays its
health, action points, and Overwatch state. Each HUD SHALL remain visually
associated with its operative as the camera orbits, zooms, or changes focus.

#### Scenario: HUD follows its operative

- **WHEN** the camera position changes
- **THEN** every player HUD remains aligned with its corresponding operative
  and stays legible without drifting onto another unit

### Requirement: The game surface preserves a responsive 16:9 frame

The playable surface SHALL remain centered at a 16:9 aspect ratio, grow as
tall as the available viewport permits without exceeding its width, and use a
dark background for any space outside the frame. Interface text and controls
SHALL remain inside the frame without overlap at supported desktop and mobile
landscape sizes.

#### Scenario: Wide desktop requires side bars

- **WHEN** the browser viewport is wider than 16:9
- **THEN** the game fills the available height and dark pillarboxing occupies
  the remaining horizontal space

#### Scenario: Short desktop requires top and bottom bars

- **WHEN** the browser viewport is narrower than 16:9
- **THEN** the game fits the available width and dark letterboxing occupies
  the remaining vertical space

### Requirement: Presentation assets work without runtime network access

All models, textures, fonts needed for the game presentation, and other scene
assets SHALL be bundled with the application. Loading the built application
after its local files are available SHALL make no runtime request for an
external asset.

#### Scenario: Scene loads from bundled assets

- **WHEN** the built application runs with external network access unavailable
- **THEN** the complete presentation loads without a missing model, texture,
  font, or visual-feedback asset
