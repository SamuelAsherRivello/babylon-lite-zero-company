# Tactical Scene Presentation Specification

## Purpose

Define the complete, locally rendered greybox battle presentation that the
camera milestone must expose before any tactical action changes game state.

## Requirements

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
tracer with impact or muzzle feedback, and an aimed Overwatch cone. During the
enemy turn, it SHALL also present the active enemy's declared intent with
action-specific preview geometry: planned path and destination for Move, target
line for Shoot, and cone area for Overwatch. These elements SHALL remain
presentation-only in this milestone.

#### Scenario: Complete interface is visible

- **WHEN** the initial player-turn view is displayed
- **THEN** every named interface and tactical-feedback element is represented
  without obscuring the six units or the primary battlefield

#### Scenario: Action controls do not mutate state

- **WHEN** the user presses Move, Shoot, Overwatch, or End Turn
- **THEN** no unit moves, attacks, enters Overwatch, spends AP, or changes turn

#### Scenario: Enemy intent preview is visible

- **WHEN** an enemy declares Move, Shoot, or Overwatch intent
- **THEN** the active enemy, intended action, AP cost, and relevant preview
  geometry are visible inside the framed battle view before resolution

### Requirement: Player operatives have anchored in-world status HUDs

Each player-controlled operative SHALL have an in-world HUD that displays its
health, action points, and Overwatch state. Each HUD SHALL remain visually
associated with its operative as the camera orbits, zooms, or changes focus.

#### Scenario: HUD follows its operative

- **WHEN** the camera position changes
- **THEN** every player HUD remains aligned with its corresponding operative
  and stays legible without drifting onto another unit

### Requirement: Cover defense is visible in combat previews

When a selected attack target receives cover defense, the interface SHALL show
that cover is reducing hit probability before the attack is confirmed. The
cover indicator SHALL fit inside the existing 16:9 game frame and SHALL NOT
obscure unit health, AP, Overwatch state, or action-confirmation controls.

#### Scenario: Player previews a covered shot

- **WHEN** the player targets a visible enemy with active cover defense
- **THEN** the combat preview identifies the cover modifier and displays the
  reduced hit probability before confirmation

#### Scenario: Cover indicator fits the game frame

- **WHEN** cover-defense preview UI is visible on supported desktop or mobile
  landscape viewports
- **THEN** it remains inside the framed surface without overlapping essential
  HUD or action controls

### Requirement: Cover defense changes character pose

When a living unit currently has active cover defense, its character
presentation SHALL visibly lower into an in-cover pose such as a restrained
squat or brace. The in-cover pose SHALL be programmatic, SHALL NOT require a
new model or authored animation asset, and SHALL NOT change the unit's grid
cell, collider, selection target, health, AP, Overwatch state, or combat
resolution.

#### Scenario: Covered unit lowers into cover

- **WHEN** a living unit has active cover defense
- **THEN** its character presentation appears visibly lower than its normal
  idle stance while remaining selected and targetable in its original cell

#### Scenario: Cover pose clears when not defended

- **WHEN** the unit no longer has active cover defense because it moved away
  from cover, became flanked, died, or the attack preview cleared
- **THEN** the in-cover pose clears without changing gameplay state

### Requirement: The game surface preserves a responsive 16:9 frame

The playable surface SHALL remain centered at a 16:9 aspect ratio, grow as
tall as the available viewport permits without exceeding its width, and use a
dark background for any space outside the frame. Interface text and controls
SHALL remain inside the frame without overlap at supported desktop and mobile
landscape sizes. Enemy intent banners and preview overlays SHALL remain inside
the same responsive frame and SHALL NOT obscure essential unit HUD values or
action resolution feedback.

#### Scenario: Wide desktop requires side bars

- **WHEN** the browser viewport is wider than 16:9
- **THEN** the game fills the available height and dark pillarboxing occupies
  the remaining horizontal space

#### Scenario: Short desktop requires top and bottom bars

- **WHEN** the browser viewport is narrower than 16:9
- **THEN** the game fits the available width and dark letterboxing occupies
  the remaining vertical space

#### Scenario: Enemy intent fits supported viewports

- **WHEN** enemy intent is visible on supported desktop or mobile landscape
  viewports
- **THEN** the intent text and preview overlays stay within the framed surface
  without overlapping essential HUD, result, or action-feedback content

### Requirement: Pending operations use aligned inline confirmation controls

The interface SHALL render `Confirm?` on the left and `Cancel` on the right in
one row immediately above the Move, Shoot, Overwatch, and End Turn action row.
Each confirmation control SHALL have the same height, each SHALL span two of
the four action columns, and the confirmation pair SHALL match the full width
and horizontal alignment of the action row at supported desktop and mobile
landscape sizes. The confirmation row SHALL be absent until a valid Move,
Shoot, or Overwatch target is staged or End Turn is requested. While the row
is visible, the four tactical action controls SHALL remain visible underneath
it but SHALL not commit or end the staged operation.

#### Scenario: No operation is ready to confirm

- **WHEN** the player has not staged a valid action target and has not requested
  End Turn
- **THEN** no confirmation row occupies space above the action controls

#### Scenario: Valid action target is ready

- **WHEN** the player stages a valid Move destination, Shoot target, or
  Overwatch direction
- **THEN** `Confirm?` and `Cancel` appear above the four action controls with
  `Confirm?` on the left and `Cancel` on the right

#### Scenario: End Turn is ready

- **WHEN** the player presses End Turn
- **THEN** the same inline `Confirm?` and `Cancel` row appears instead of a
  modal dialog

#### Scenario: Confirmation controls fit supported viewports

- **WHEN** the game is displayed at a supported desktop or mobile landscape
  viewport
- **THEN** both confirmation controls align with the four-button action row,
  remain inside the 16:9 frame, and do not overlap the battlefield controls

### Requirement: Presentation assets work without runtime network access

All models, textures, fonts needed for the game presentation, and other scene
assets SHALL be bundled with the application. Loading the built application
after its local files are available SHALL make no runtime request for an
external asset.

#### Scenario: Scene loads from bundled assets

- **WHEN** the built application runs with external network access unavailable
- **THEN** the complete presentation loads without a missing model, texture,
  font, or visual-feedback asset

### Requirement: Corner layout includes the instruction responder

The framed game interface SHALL place the project version in the lower-left corner beneath the existing Settings controls, and SHALL place an `Instructions` heading with one dynamic instruction line in the lower-right corner.

#### Scenario: Initial corner layout is displayed

- **WHEN** the battle view is visible
- **THEN** Settings and the version label appear in the lower-left corner, while the lower-right corner contains the `Instructions` heading and one instruction line

#### Scenario: Instructions fit supported viewports

- **WHEN** the game is displayed at supported desktop or mobile landscape sizes
- **THEN** the heading and instruction line remain inside the framed surface, fit their parent corner, and do not overlap the battlefield, action controls, or other corner content

#### Scenario: Version follows Settings

- **WHEN** the lower-left corner is rendered
- **THEN** the version label appears below Settings and is no longer rendered in the lower-right corner
