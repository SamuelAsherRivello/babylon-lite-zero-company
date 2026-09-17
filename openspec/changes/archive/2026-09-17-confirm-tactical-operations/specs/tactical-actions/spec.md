## MODIFIED Requirements

### Requirement: Move exposes AP-tiered destination squares

After the player selects Move for an interactive operative, the game SHALL
show every valid destination square reachable for one, two, or three AP using
three distinct visual tiers. The shipped level SHALL contain 13 columns and 8
rows of one-world-unit square cells. Every unit SHALL use a base movement of
3.9, eight-direction steps of equal reach cost, and floored movement allowances
of 3, 4, and 5 cells for one, two, and three AP respectively. Selecting a valid
destination SHALL stage its minimum displayed AP cost and path without moving
the operative or spending AP. The player SHALL be able to select another valid
destination to replace the staged destination. Only pressing `Confirm?` SHALL
spend the staged cost and animate the operative from its current cell center
through the staged path to the destination cell center. Move SHALL not include
an attack.

#### Scenario: Destination tiers are displayed

- **WHEN** an operative with three AP enters Move targeting
- **THEN** valid one-AP, two-AP, and three-AP destination squares are visible
  in three distinguishable colors

#### Scenario: Destination is chosen

- **WHEN** the player selects a valid two-AP destination
- **THEN** that destination becomes the staged Move target, the confirmation
  controls appear, and the operative remains in place with its AP unchanged

#### Scenario: Destination is retargeted

- **WHEN** the player selects another valid destination before confirming Move
- **THEN** the latest destination and its minimum AP cost replace the prior
  staged destination without spending AP

#### Scenario: Staged Move is confirmed

- **WHEN** the player presses `Confirm?` with a valid two-AP destination staged
- **THEN** the operative moves there, spends exactly two AP, and does not fire
  a weapon as part of the action

#### Scenario: Edge destinations stay on the floor

- **WHEN** movement destinations are generated near any arena edge
- **THEN** every highlight is centered inside a valid grid cell and no part of
  a highlighted cell extends beyond the 13-by-8 ground surface

#### Scenario: Cover and characters block destinations

- **WHEN** reachability crosses a cover-owned cell, a living unit, or a dead
  unit's final cell
- **THEN** those cells are excluded, paths do not cut diagonally through a
  blocked corner, and movement may continue only through legal cells

### Requirement: Shoot targets one visible enemy and only shoots

After the player selects Shoot, the game SHALL identify valid enemy targets.
Selecting one valid enemy SHALL stage that enemy as the Shoot target without
spending AP, consuming randomness, dealing damage, or starting presentation
feedback. The player SHALL be able to select another valid enemy to replace
the staged target. Only pressing `Confirm?` SHALL spend the weapon's action
cost, resolve exactly one attack against the latest staged target, and leave
the shooter in its current square. The Shoot button SHALL display the selected
unit's cost: one AP for short-range and balanced weapons and two AP for the
long-range weapon.

#### Scenario: Valid target is selected

- **WHEN** the player selects Shoot and then a valid enemy target
- **THEN** that enemy becomes the staged Shoot target, the confirmation
  controls appear, and no AP, health, position, or random state changes

#### Scenario: Shoot target is replaced

- **WHEN** the player selects another valid enemy before confirming Shoot
- **THEN** the latest enemy replaces the prior staged target without resolving
  an attack

#### Scenario: Staged shot is confirmed

- **WHEN** the player presses `Confirm?` with a valid enemy staged
- **THEN** one attack resolves against that enemy, the required AP is spent,
  and the shooter does not move

### Requirement: Overwatch consumes remaining AP and requires confirmation

Selecting Overwatch with at least one AP SHALL preview a ground-plane cone and
show that confirmation will consume all AP the operative currently has. Floor
taps or clicks SHALL update the cone toward the chosen point; the player SHALL
be able to retarget repeatedly without spending AP. Selecting a valid floor
point SHALL show the shared confirmation controls. Only pressing `Confirm?`
SHALL commit the latest cone, spend all remaining AP, set the reaction-shot
allowance to the number of AP spent, and make that operative noninteractive
until its next player turn. Pressing Overwatch again SHALL NOT commit the cone.

#### Scenario: Cone is retargeted before confirmation

- **WHEN** an operative with two AP selects multiple valid floor points before
  confirming Overwatch
- **THEN** the cone follows the latest point and no AP is spent yet

#### Scenario: Overwatch is confirmed

- **WHEN** the player presses `Confirm?` with a valid cone while the operative
  has two AP
- **THEN** both AP are spent, the cone is committed with at most two reaction
  shots, and the operative cannot take another action until its next turn

#### Scenario: Overwatch action button cannot commit

- **WHEN** a valid Overwatch cone is staged and the player presses Overwatch
  again
- **THEN** no AP is spent and no Overwatch commitment is created

### Requirement: Player action modes are cancelable before commitment

Before Move, Shoot, or Overwatch commits AP, selecting another friendly unit
or another action SHALL cancel the pending mode without changing health, AP,
position, turn, random state, or Overwatch state. After a valid target is
staged, pressing `Cancel` SHALL abandon the entire pending operation, clear its
target and previews, hide the confirmation controls, and return the selected
operative to its idle action state. The four tactical action controls SHALL not
commit or end a staged operation while its confirmation controls are visible.

#### Scenario: Pending Move is replaced by Shoot

- **WHEN** the player enters Move targeting and selects Shoot before choosing a
  destination
- **THEN** movement highlights clear, Shoot targeting begins, and no AP is spent

#### Scenario: Staged target is cancelled

- **WHEN** the player presses `Cancel` after staging a valid Move, Shoot, or
  Overwatch target
- **THEN** the pending operation ends, its previews clear, and all gameplay and
  random state remain unchanged
