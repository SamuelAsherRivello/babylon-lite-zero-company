## MODIFIED Requirements

### Requirement: End Turn handles remaining AP explicitly

End Turn SHALL remain available throughout the player turn. Pressing End Turn
SHALL stage an end-turn operation and show the shared `Confirm?` and `Cancel`
controls regardless of whether any living, interactive player operative has
usable AP. The player turn SHALL remain active and gameplay state SHALL remain
unchanged until the player chooses one of those controls. Pressing `Confirm?`
SHALL begin the enemy turn. Pressing `Cancel` SHALL abandon the end-turn
operation, hide the confirmation controls, and resume the player turn
unchanged. End Turn SHALL NOT transition directly to the enemy turn.

#### Scenario: Player ends with usable AP

- **WHEN** End Turn is pressed while at least one interactive player operative
  retains usable AP
- **THEN** the shared confirmation controls appear and the turn does not change
  until the player confirms

#### Scenario: Player ends with no usable AP

- **WHEN** End Turn is pressed and no interactive player operative has usable
  AP
- **THEN** the shared confirmation controls still appear and the player turn
  remains active until the player confirms

#### Scenario: End Turn is confirmed

- **WHEN** the player presses `Confirm?` for a staged end-turn operation
- **THEN** the enemy turn begins

#### Scenario: End Turn is cancelled

- **WHEN** the player presses `Cancel` for a staged end-turn operation
- **THEN** the confirmation controls hide and the player turn resumes without
  changing health, AP, position, random state, or Overwatch commitments
