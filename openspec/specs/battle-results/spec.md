# Battle Results Specification

## Purpose

Define elimination victory and defeat, terminal-state input behavior, and a
clean restart into the same immediately playable battle.

## Requirements

### Requirement: Eliminating all enemies produces victory

The game SHALL enter a victory state immediately after the third enemy is
reduced to zero health. No further queued action SHALL damage or move a unit
after victory is established. Camera control and inspection of all six living
or dead units SHALL remain available while the result prompt is open.

#### Scenario: Final enemy is defeated

- **WHEN** an attack reduces the last living enemy to zero health
- **THEN** a victory prompt appears and battle actions stop

### Requirement: Eliminating all players produces defeat

The game SHALL enter a defeat state immediately after the third player
operative is reduced to zero health. No further queued enemy action SHALL
damage or move a unit after defeat is established. Camera control and
inspection SHALL remain available while the result prompt is open.

#### Scenario: Final player operative is defeated

- **WHEN** an attack reduces the last living player operative to zero health
- **THEN** a defeat prompt appears and the enemy sequence stops

### Requirement: Results provide a deterministic restart

Victory and defeat prompts SHALL both include a Restart button. Restart SHALL
restore initial unit positions, health, weapons, AP, Overwatch state, selection,
Status, random source state, and player-turn phase without reloading the
browser page.

#### Scenario: Battle is restarted after victory

- **WHEN** the user presses Restart on the victory prompt
- **THEN** a fresh three-versus-three battle begins on the player turn with the
  same initial state as a new application session

#### Scenario: Battle is restarted after defeat

- **WHEN** the user presses Restart on the defeat prompt
- **THEN** a fresh three-versus-three battle begins on the player turn with the
  same initial state as a new application session
