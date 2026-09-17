## ADDED Requirements

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
