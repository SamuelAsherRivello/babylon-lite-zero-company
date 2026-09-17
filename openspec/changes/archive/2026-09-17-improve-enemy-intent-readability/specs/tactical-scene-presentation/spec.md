## MODIFIED Requirements

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
