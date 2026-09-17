## ADDED Requirements

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
