## MODIFIED Requirements

### Requirement: Enemy decisions use the same action rules as player decisions

Enemy Move, Shoot, and Overwatch actions SHALL obey the same AP costs,
movement reachability, weapon range curves, line-of-sight rules, cover-defense
and flanking rules, Overwatch cone rules, and reaction limits as equivalent
player actions. The AI SHALL not read hidden future random outcomes when
choosing an action. Enemy Overwatch SHALL consume all AP remaining at
commitment.

#### Scenario: Enemy considers a blocked target

- **WHEN** an enemy evaluates a player operative without line of sight
- **THEN** it treats the immediate shot as invalid and does not fire through
  the obstacle

#### Scenario: Enemy considers a covered target

- **WHEN** an enemy evaluates a visible player operative with active cover
  defense
- **THEN** it scores the shot using the same cover-adjusted hit probability
  shown to the player for an equivalent attack

### Requirement: Enemy actions maximize bounded tactical utility

For every AP decision, the AI SHALL score legal action sequences using
expected damage as the primary utility. It SHALL consider moving closer or
flanking when that improves hit probability or damage enough to increase
expected damage, and it SHALL consider directional Overwatch as a defensive
alternative when no immediate sequence offers better attack utility.
Tie-breaking SHALL be stable so identical battle states produce identical
choices before attack randomness.

#### Scenario: A legal high-value shot is available

- **WHEN** an enemy can shoot a visible player for greater expected damage than
  any legal move-and-attack or Overwatch option
- **THEN** it selects that shot

#### Scenario: Moving improves expected damage

- **WHEN** a legal move followed by a shot has greater expected damage than an
  immediate shot and fits the remaining AP
- **THEN** the enemy performs the move and then evaluates the improved shot

#### Scenario: Moving creates a flank

- **WHEN** a legal move creates a flank that removes the target's cover defense
  and increases expected damage enough to beat the immediate covered shot
- **THEN** the enemy may choose that move-and-shoot sequence

#### Scenario: Defensive Overwatch is preferred

- **WHEN** no immediate or reachable attack sequence has positive expected
  damage and a player approach lane can be covered
- **THEN** the enemy may commit all remaining AP to Overwatch aimed toward that
  lane
