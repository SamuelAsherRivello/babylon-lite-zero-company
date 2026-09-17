# Tactical Turn Loop Specification

## Purpose

Define the playable three-versus-three turn structure, action-point economy,
inspection permissions, and player-controlled turn-ending behavior.

## Requirements

### Requirement: A battle starts immediately on the player turn

The application SHALL enter the battle without a title or setup screen. The
battle SHALL contain exactly three player operatives and three enemies, and
each living player operative SHALL begin the opening player turn with three
action points.

#### Scenario: Application opens into action

- **WHEN** the application finishes loading
- **THEN** the player-turn battle is ready with three player operatives, three
  enemies, and three AP on each living player operative

### Requirement: Units receive three AP at the start of their side's turn

At the start of a player turn, every living player operative SHALL have three
AP. At the start of an enemy turn, every living enemy SHALL have three AP.
Unused AP SHALL not carry into a later turn.

#### Scenario: Player AP refreshes

- **WHEN** an enemy turn completes and a new player turn begins
- **THEN** every living player operative has exactly three AP regardless of
  the AP it held at the end of the prior player turn

#### Scenario: Enemy AP refreshes

- **WHEN** a player turn completes and a new enemy turn begins
- **THEN** every living enemy has exactly three AP

### Requirement: All six units remain inspectable during either turn

The user SHALL be able to select any of the six units, including dead units,
during player turns, enemy turns, and terminal result states. Inspection SHALL
show identity, health, weapon, AP, and Status. Player inspection SHALL also show
available actions when legal. Tactical actions SHALL be enabled only for a
living player operative during the player turn. A dead unit SHALL remain
visible, selectable, and camera-focusable but SHALL expose no actions.

#### Scenario: Enemy is inspected during player turn

- **WHEN** the user selects a living enemy during the player turn
- **THEN** enemy information is shown and no player action is enabled for that
  enemy

#### Scenario: Player is inspected during enemy turn

- **WHEN** the user selects a living player operative during the enemy turn
- **THEN** its information remains visible but its action controls cannot spend
  AP or interrupt the active enemy

### Requirement: Player HUDs reflect live tactical state

The in-world HUD for each living player operative SHALL display current health,
remaining AP, and whether the operative is committed to Overwatch. HUD values
SHALL update after every relevant state transition.

#### Scenario: Action points are spent

- **WHEN** a player operative completes an action costing AP
- **THEN** its in-world AP display shows the remaining AP before another player
  input is accepted

### Requirement: Inspection exposes one user-facing character status

Every unit SHALL expose exactly one Status value from Idle, Moving, Shooting,
Overwatch, Taking Damage, or Dead. Dead takes precedence over every other
state; Taking Damage and active movement or shooting temporarily override
Overwatch; a surviving committed unit returns to Overwatch after reaction
feedback; all other stable units show Idle.

#### Scenario: Committed unit reaction-shoots

- **WHEN** an Overwatch unit begins a reaction shot and survives its resolution
- **THEN** Status changes from Overwatch to Shooting and returns to Overwatch
  after shooting feedback completes

#### Scenario: Unit dies

- **WHEN** damage reduces a unit to zero health
- **THEN** its Status becomes Dead permanently until Restart, its final cell
  remains movement-blocking, and selecting it shows no enabled action

### Requirement: End Turn handles remaining AP explicitly

End Turn SHALL remain available throughout the player turn. If any living,
interactive player operative has usable AP, pressing End Turn SHALL show an
Are you sure prompt. Confirming SHALL begin the enemy turn and cancelling SHALL
resume the player turn unchanged. If no usable player AP remains, pressing End
Turn SHALL begin the enemy turn immediately.

#### Scenario: Player ends with usable AP

- **WHEN** End Turn is pressed while at least one interactive player operative
  retains usable AP
- **THEN** a confirmation prompt appears and the turn does not change until the
  user confirms

#### Scenario: Player ends with no usable AP

- **WHEN** End Turn is pressed and no interactive player operative has usable
  AP
- **THEN** the enemy turn begins without a confirmation prompt

### Requirement: Enemy activations are sequential and noninteractive

During the enemy turn, living enemies SHALL activate one at a time in a stable
order. One enemy SHALL finish or relinquish its activation before the next
enemy begins, and player input SHALL not pause, redirect, or spend AP during
the sequence.

#### Scenario: Enemy sequence advances

- **WHEN** the active enemy finishes spending or relinquishing its AP
- **THEN** the next living enemy becomes active, or a new player turn begins if
  no living enemy remains to activate
