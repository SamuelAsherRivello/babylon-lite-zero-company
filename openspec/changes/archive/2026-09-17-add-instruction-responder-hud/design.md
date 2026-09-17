## Context

The React HUD in `zero-company/src/App.jsx` already has access to the battle state, selected unit, pending action, confirmation readiness, presentation state, and loading/result state. Tactical rules and command handlers already encode the action phases and confirmation boundaries described by the existing tactical specs. The change therefore needs a read-only projection of those values plus a small corner-layout adjustment.

## Goals / Non-Goals

**Goals:**

- Define one deterministic instruction resolver with an explicit priority order.
- Keep instruction derivation independent of React rendering so every state branch can be unit tested.
- Render the instruction panel within the existing 16:9 HUD and preserve desktop/mobile landscape layout constraints.
- Reuse the current action, turn, presentation, loading, and result state rather than introducing a second gameplay state machine.

**Non-Goals:**

- Changing tactical commands, AP costs, target validation, turn transitions, or presentation timing.
- Adding tooltips, tutorials, narration, localization, network services, or new dependencies.
- Changing the existing action controls or confirmation interaction.

## Decisions

### Use a pure ordered resolver

Create a small module that accepts the state needed to describe the current UI and returns one instruction string. Evaluate terminal and blocking states first, followed by confirmation, pending targeting, and normal player selection. This makes priority explicit and prevents JSX conditionals from becoming a second source of truth.

An event-driven instruction store was considered but rejected because instructions are a projection of existing state and do not need independent persistence. Deriving them during render also ensures invalid input naturally leaves guidance unchanged when the underlying tactical state is unchanged.

### Use existing readiness fields for confirmation guidance

The resolver will inspect the existing pending confirmation and pending-action target fields that already determine whether `Confirm?` is rendered. Move uses a staged destination, Shoot uses a staged target, and Overwatch uses a staged target cell plus direction. End Turn uses the existing end-turn confirmation marker. This keeps the instruction line aligned with the controls the player can actually press.

### Treat action availability as the selection boundary

Normal selection guidance will use the selected unit's existing available-actions result. A dead, enemy, exhausted, or otherwise non-actionable selection resolves to `Click a blue player`; an actionable player resolves to `Choose an action`. No new definition of playable or exhausted is introduced.

### Keep the corner roles within the existing HUD

The version element will move into the existing lower-left Settings section, and the existing lower-right version slot will become an Instructions section. CSS will preserve the current corner positioning, pointer-event behavior, typography, and responsive rules, adding only the layout and wrapping needed for the longer instruction text.

## Risks / Trade-offs

- [Risk] The instruction can become stale if a new gameplay state bypasses the existing render state update. -> [Mitigation] Keep the resolver pure and test every current state branch; browser-check each transition in the playable flow.
- [Risk] Longer text can collide with controls on narrow landscape screens. -> [Mitigation] Use the existing responsive corner styles, allow wrapping within a bounded width, and verify desktop and mobile landscape viewports.
- [Risk] Presentation and enemy-turn timing can be visually ambiguous. -> [Mitigation] Give presentation blocking priority over enemy-turn guidance and inspect the live browser flow after implementation.

## Migration Plan

No data migration or compatibility shim is required. Add the resolver and tests, wire its returned string into the existing HUD, move the version element, then run the repository test/build commands and real-browser checks. Rollback consists of reverting the scoped HUD, resolver, tests, and change artifacts.
