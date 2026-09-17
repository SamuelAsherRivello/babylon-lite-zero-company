## MODIFIED Requirements

### Requirement: Enemy intent and resolution are observable

The active enemy SHALL be visually identified, and each chosen action SHALL be
announced or previewed long enough for the player to follow its target and AP
cost before or during resolution. The intent SHALL expose the chosen action's
relevant deterministic plan details, including destination and path for Move,
target plus hit and damage preview for Shoot, and target cell plus cone
geometry for Overwatch. The preview SHALL be derived from the selected plan and
SHALL NOT consume random results, alter the chosen action, or permit player
commands to change enemy resolution. The player SHALL retain camera inspection
without gaining control over the enemy action.

#### Scenario: Enemy performs an action

- **WHEN** the active enemy commits to Move, Shoot, or Overwatch
- **THEN** the interface identifies the active enemy and chosen action while
  preventing player commands from altering the resolution

#### Scenario: Enemy move intent is declared

- **WHEN** an enemy selects a Move plan
- **THEN** the observable intent identifies the enemy, AP cost, destination, and
  planned path before the move resolves

#### Scenario: Enemy shot intent is declared

- **WHEN** an enemy selects a Shoot plan
- **THEN** the observable intent identifies the enemy, target, AP cost, hit
  probability, and maximum damage before the shot resolves without consuming
  the shot's random result

#### Scenario: Enemy Overwatch intent is declared

- **WHEN** an enemy selects an Overwatch plan
- **THEN** the observable intent identifies the enemy, AP cost, target cell,
  range, and cone width before Overwatch is committed
