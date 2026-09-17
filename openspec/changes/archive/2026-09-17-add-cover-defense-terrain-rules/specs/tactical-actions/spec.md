## MODIFIED Requirements

### Requirement: Weapons use distance-scaled hit probability and damage

The three player operatives SHALL carry three fixed archetypes: short-range,
balanced, and long-range. Each weapon SHALL define maximum hit probability and
maximum damage at adjacent range. Both values SHALL decrease as the distance
between grid-cell centers increases in Euclidean world distance according to
deterministic, testable curves appropriate to that archetype. When a target has
cover defense and is not flanked, the displayed hit probability SHALL include
the deterministic cover reduction. Cover defense SHALL NOT reduce displayed
damage. A hit SHALL never exceed the probability or damage displayed before
confirmation.

#### Scenario: Adjacent target receives maximum values

- **WHEN** a shooter evaluates an adjacent enemy with clear line of sight and no
  active cover defense
- **THEN** the preview shows that weapon's maximum hit probability and maximum
  damage

#### Scenario: More distant target receives lower values

- **WHEN** the same weapon evaluates a farther enemy with clear line of sight
  and no active cover defense
- **THEN** its displayed hit probability and maximum damage are both lower
  than the adjacent values

#### Scenario: Cover reduces hit probability only

- **WHEN** a shooter evaluates a visible enemy that has active cover defense
- **THEN** the preview shows lower hit probability than the same shot without
  cover defense and keeps the same damage range

### Requirement: Shooting requires line of sight

A target without an unobstructed line from shooter to target SHALL have zero
hit probability and SHALL not be selectable for Shoot. The preview SHALL state
that line of sight is blocked. Only level obstacles block LOS; living and dead
characters do not. Cover defense SHALL apply only after line of sight has
already been established.

#### Scenario: Cover blocks line of sight

- **WHEN** any of the level's full-height cover obstacles intersects the line
  between shooter and target
- **THEN** the target shows zero hit probability and cannot be confirmed

#### Scenario: Cover defense requires line of sight

- **WHEN** a target is adjacent to cover but the cover obstacle blocks line of
  sight from the shooter
- **THEN** the target remains unselectable for blocked line of sight rather than
  selectable with a cover-defense modifier

### Requirement: Overwatch fires only on qualifying opponent movement

A committed Overwatch unit SHALL fire only during the opposing side's turn.
After each completed center-to-center movement step, the mover's new cell center
SHALL be tested against the cone on the ground plane and against obstacle-only
line of sight. Both tests MUST pass. The unit SHALL make at most one reaction
shot per AP consumed at commitment, decrementing its remaining shot allowance
after each reaction. Overwatch reaction hit probability SHALL use the same
cover-defense and flanking rules as Shoot. Overwatch SHALL expire at the start
of the unit's next side turn.

#### Scenario: Opponent enters a cone with clear line of sight

- **WHEN** an opponent completes a movement step with its cell center inside an
  opposing Overwatch cone and no cover blocks line of sight
- **THEN** one reaction attack may resolve and one committed shot is consumed

#### Scenario: Cone entry is hidden by cover

- **WHEN** an opponent's cell center enters the cone but a cover block
  intersects line of sight
- **THEN** Overwatch does not fire and its remaining shot allowance is unchanged

#### Scenario: Opponent enters cone while defended by cover

- **WHEN** an opponent completes a movement step inside an opposing Overwatch
  cone with clear line of sight and active cover defense
- **THEN** the reaction attack resolves using the cover-adjusted hit probability
  and consumes one committed shot

#### Scenario: Opponent never enters the cone

- **WHEN** opposing units complete their turn without entering the committed
  cone with line of sight
- **THEN** the Overwatch unit does not shoot and its state expires at the start
  of its next side turn
