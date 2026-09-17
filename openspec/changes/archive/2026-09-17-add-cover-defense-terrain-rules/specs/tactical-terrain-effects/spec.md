## Purpose

Define terrain effects that make cover-adjacent positioning tactically useful
while preserving deterministic local combat and readable previews.

## ADDED Requirements

### Requirement: Adjacent cover can defend a target

A unit SHALL receive cover defense when it occupies a legal non-cover cell that
is orthogonally or diagonally adjacent to at least one cover-owned cell and the
incoming shot line is not a clear flank. Cover defense SHALL reduce hit
probability by 20 percentage points, clamped to a 5% minimum for an otherwise
legal shot, and the reduction SHALL be displayed in the attack preview. Cover
defense SHALL NOT reduce damage, AP cost, weapon range, movement cost, or
line-of-sight blocking.

#### Scenario: Target gains cover defense

- **WHEN** a shooter evaluates a target adjacent to cover without a clear flank
- **THEN** the preview shows a reduced hit probability and identifies cover as
  the modifier

#### Scenario: Cover defense clamps legal shots

- **WHEN** a legal shot's distance-scaled hit probability is less than or equal
  to the 20 percentage-point cover reduction
- **THEN** the preview remains selectable at 5% hit probability and identifies
  cover as the modifier

#### Scenario: Cover defense does not replace blockers

- **WHEN** a full-height cover obstacle intersects line of sight between shooter
  and target
- **THEN** the target remains unselectable with zero hit probability rather than
  receiving a selectable cover-defense preview

### Requirement: Flanking bypasses cover defense

A shot SHALL be treated as flanking when the shooter has clear line of sight and
the target's adjacent cover is not between or beside the target relative to the
incoming shot direction. Flanked targets SHALL use the normal distance-scaled
hit probability without a cover-defense reduction.

#### Scenario: Shooter flanks cover

- **WHEN** a shooter attacks a cover-adjacent target from a clear flank angle
- **THEN** the preview uses the normal distance-scaled hit probability and does
  not list cover as an active modifier

### Requirement: Terrain modifiers are deterministic and local

Terrain modifiers SHALL be derived entirely from level geometry, unit cells,
and the chosen attack. The modifier calculation MUST NOT consume random values,
perform network requests, depend on rendered meshes, or produce different
results for preview and resolution of the same attack.

#### Scenario: Preview matches resolution

- **WHEN** a cover-adjusted shot is previewed and then resolved from the same
  state
- **THEN** the hit roll is compared against the same cover-adjusted probability
  shown in the preview
