## ADDED Requirements

### Requirement: Enemy intent previews are local and non-mutating

Enemy intent feedback SHALL use locally rendered UI and scene previews derived
from deterministic plan data. Rendering or clearing the intent preview MUST NOT
change battle state, spend AP, consume randomness, trigger network requests, or
replace the subsequent action feedback for movement, shooting, Overwatch, or
reaction fire.

#### Scenario: Intent preview is rendered offline

- **WHEN** an enemy intent preview appears while external requests are blocked
- **THEN** the preview renders using bundled application code and local assets
  without making an external network request

#### Scenario: Intent preview resolves to action feedback

- **WHEN** the declared enemy action begins resolving
- **THEN** the intent preview clears or yields to the existing movement, shot,
  Overwatch, and reaction feedback without changing the deterministic outcome
