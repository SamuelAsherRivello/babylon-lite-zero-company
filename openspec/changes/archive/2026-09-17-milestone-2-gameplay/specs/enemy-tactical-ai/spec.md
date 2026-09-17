## Purpose

Define a transparent, bounded enemy decision policy that spends each enemy's
activation on legal tactical actions without accepting player commands.

## ADDED Requirements

### Requirement: Enemy decisions use the same action rules as player decisions

Enemy Move, Shoot, and Overwatch actions SHALL obey the same AP costs,
movement reachability, weapon range curves, line-of-sight rules, Overwatch
cone rules, and reaction limits as equivalent player actions. The AI SHALL not
read hidden future random outcomes when choosing an action. Enemy Overwatch
SHALL consume all AP remaining at commitment.

#### Scenario: Enemy considers a blocked target

- **WHEN** an enemy evaluates a player operative without line of sight
- **THEN** it treats the immediate shot as invalid and does not fire through
  the obstacle

### Requirement: Enemy actions maximize bounded tactical utility

For every AP decision, the AI SHALL score legal action sequences using
expected damage as the primary utility. It SHALL consider moving closer when
that improves hit probability or damage enough to increase expected damage,
and it SHALL consider directional Overwatch as a defensive alternative when no
immediate sequence offers better attack utility. Tie-breaking SHALL be stable
so identical battle states produce identical choices before attack randomness.

#### Scenario: A legal high-value shot is available

- **WHEN** an enemy can shoot a visible player for greater expected damage than
  any legal move-and-attack or Overwatch option
- **THEN** it selects that shot

#### Scenario: Moving improves expected damage

- **WHEN** a legal move followed by a shot has greater expected damage than an
  immediate shot and fits the remaining AP
- **THEN** the enemy performs the move and then evaluates the improved shot

#### Scenario: Defensive Overwatch is preferred

- **WHEN** no immediate or reachable attack sequence has positive expected
  damage and a player approach lane can be covered
- **THEN** the enemy may commit all remaining AP to Overwatch aimed toward that
  lane

### Requirement: Each enemy completes a finite activation

The AI SHALL either spend AP on a legal action or explicitly relinquish the
remainder when no useful legal action exists. It SHALL cap planning work and
complete each activation without an infinite decision or animation loop.

#### Scenario: No useful action exists

- **WHEN** an active enemy has AP but no legal action with positive tactical
  utility
- **THEN** it relinquishes the remaining AP and allows the turn sequence to
  continue

### Requirement: Enemy intent and resolution are observable

The active enemy SHALL be visually identified, and each chosen action SHALL be
announced or previewed long enough for the player to follow its target and AP
cost before or during resolution. The player SHALL retain camera inspection
without gaining control over the enemy action.

#### Scenario: Enemy performs an action

- **WHEN** the active enemy commits to Move, Shoot, or Overwatch
- **THEN** the interface identifies the active enemy and chosen action while
  preventing player commands from altering the resolution
