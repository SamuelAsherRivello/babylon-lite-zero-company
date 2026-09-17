## Purpose

Provide one clear, state-driven next-step instruction so players always know the single input that can progress the current tactical interaction.

## ADDED Requirements

### Requirement: Instructions identify the next player input

During a player turn, the application SHALL display exactly one instruction line that describes the next single input required by the current tactical state.

#### Scenario: No actionable player is selected

- **WHEN** the battle is in the player phase, no blocking presentation or confirmation is active, and the selected unit is dead, exhausted, or not an actionable player operative
- **THEN** the instruction line SHALL read `Click a blue player`

#### Scenario: An actionable player is selected

- **WHEN** the battle is in the player phase, no blocking presentation or confirmation is active, and the selected unit has at least one available action
- **THEN** the instruction line SHALL read `Choose an action`

#### Scenario: Move is awaiting a destination

- **WHEN** Move is the pending action and no valid destination is staged
- **THEN** the instruction line SHALL read `Click a floor tile`

#### Scenario: Shoot is awaiting an enemy

- **WHEN** Shoot is the pending action and no valid enemy target is staged
- **THEN** the instruction line SHALL read `Click a red enemy`

#### Scenario: Overwatch is awaiting a direction

- **WHEN** Overwatch is the pending action and no direction is staged
- **THEN** the instruction line SHALL read `Click a floor tile`

#### Scenario: A tactical operation is staged

- **WHEN** a valid Move destination, Shoot target, or Overwatch direction is staged
- **THEN** the instruction line SHALL read `Choose Confirm`

#### Scenario: End Turn is awaiting confirmation

- **WHEN** End Turn has been requested and its confirmation is pending
- **THEN** the instruction line SHALL read `Choose Confirm`

### Requirement: Instructions prioritize blocking states

The instruction responder SHALL prioritize a blocking state over normal selection or action guidance.

#### Scenario: A presentation is active

- **WHEN** player or enemy action feedback is being presented and input cannot progress the battle
- **THEN** the instruction line SHALL describe waiting for the presentation to finish

#### Scenario: The enemy turn is active

- **WHEN** the battle is in the enemy phase and no presentation is active
- **THEN** the instruction line SHALL describe watching the enemy action

#### Scenario: The battle has ended

- **WHEN** the battle is in a terminal result state
- **THEN** the instruction line SHALL read `Restart the battle`

#### Scenario: Loading has failed

- **WHEN** application loading has failed
- **THEN** the instruction line SHALL read `Restart the battle`

### Requirement: Invalid targeting does not advance guidance

Invalid target input SHALL leave the current instruction line and pending tactical state unchanged.

#### Scenario: Invalid target is clicked

- **WHEN** the player clicks a floor tile, enemy, or other target that is invalid for the pending action
- **THEN** the responder SHALL continue displaying the same next-step instruction and the pending action SHALL remain unchanged

### Requirement: Guidance is derived without mutating gameplay

The instruction value SHALL be derived from current state and SHALL not spend AP, alter selection, resolve actions, change turns, or modify random state.

#### Scenario: Battle state changes

- **WHEN** selection, pending action, confirmation, presentation, loading, turn, or result state changes
- **THEN** the displayed instruction SHALL update to the highest-priority matching state on the next render
