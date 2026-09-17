## Context

See `proposal.md` for motivation. The deterministic battle state already owns `pendingAction` for Move, Shoot, and Overwatch targeting and `pendingConfirmation` for End Turn. Overwatch can already retain and retarget a floor cell before commitment, but Move and Shoot currently resolve directly from React selection handlers. End Turn currently uses a separate modal and may transition immediately when no player AP remains.

React owns the HTML controls and presentation handoff, Babylon.js reports unit and floor selections, and the rules modules own deterministic validation and state transitions. The design must preserve those boundaries and the existing movement, attack, reaction-fire, audio, and animation resolution paths.

## Goals / Non-Goals

**Goals:**

- Represent every player-selected target in deterministic pending state before commitment.
- Derive one shared confirmation row from battle state rather than duplicating local UI state.
- Preserve retargeting and guarantee that staging or cancelling consumes no AP, randomness, health, position, or Overwatch state.
- Keep movement, shooting, and Overwatch presentation behavior unchanged after confirmation.
- Fit the confirmation row within the existing desktop and mobile-landscape action-bar geometry.

**Non-Goals:**

- Changing enemy AI decisions or adding confirmation to enemy actions.
- Changing movement ranges, weapon balance, Overwatch geometry, animation timing, or audio.
- Adding keyboard shortcuts, a general modal framework, dependencies, persistence, or network behavior.

## Decisions

### Store staged targets in `pendingAction`

Move will stage a `targetCell`, Shoot will stage a `targetId`, and Overwatch will continue staging its `targetCell` and direction. Target-selection commands will validate candidates before replacing the staged value. This keeps the pending choice observable, serializable, deterministic, and testable without introducing parallel React-only state.

Alternative considered: keep Move and Shoot targets in React component state. Rejected because cancellation, retargeting, restart behavior, and rule-level tests would then depend on two sources of truth.

### Keep final resolution in the existing action-specific paths

The shared `Confirm?` handler will inspect the pending operation and call the existing Move, Shoot, Overwatch, or End Turn resolution path. Move and Shoot will retain their React-managed presentation handoff after deterministic resolution; Overwatch and End Turn will retain command-dispatch transitions. Staging commands will not consume randomness or perform presentation work.

Alternative considered: move all action resolution into one generic rule command. Rejected because Move and Shoot currently return rich presentation plans consumed by React, while Overwatch and End Turn are immediate state transitions; combining them would broaden the change into a presentation architecture refactor.

### Derive confirmation readiness from battle state

The confirmation row will be visible only when End Turn is pending or the current pending action has a valid staged target. A single derived operation descriptor will provide the Confirm and Cancel handlers. No extra visibility boolean will be stored.

Before a valid target exists, the player can still switch actions or friendly selection through the existing cancellation behavior. Once confirmation is ready, the four action buttons remain visible but are disabled so only `Confirm?`, `Cancel`, or retargeting can conclude or revise the staged operation.

### Cancel clears the complete staged operation

For Move, Shoot, and Overwatch, Cancel dispatches the existing action-cancellation path and returns the selected operative to idle action state. For End Turn, Cancel clears the end-turn confirmation and leaves the player turn unchanged. Requesting End Turn replaces any targetless action mode rather than preserving a hidden operation behind the confirmation row.

Alternative considered: Cancel only the target and return to targeting. Rejected by the confirmed requirement that Cancel abandon the entire operation.

### Replace the modal with an inline two-column row

The action area will become a two-row layout. The existing four-column action row remains unchanged. The conditional confirmation row uses the same total width and gap system; `Confirm?` and `Cancel` each span two columns and share the current action-button height. Desktop uses the existing 78 px columns and 8 px gap, while the mobile-landscape media rule uses its existing 64 px columns and 5 px gap.

The DOM order is `Confirm?`, then `Cancel`, followed by the four tactical actions, matching both visual order and keyboard/accessibility order. The row is not rendered when confirmation is not ready, so it occupies no empty space.

Alternative considered: reuse the existing modal. Rejected because the requested controls must align directly above the action bar and remain consistent across all four operations.

## Risks / Trade-offs

- [Staged state becomes stale after an unexpected transition] -> Revalidate the current pending target at confirmation and reject safely without spending resources if it is no longer legal.
- [Movement and shooting accidentally resolve during selection] -> Add rule and browser regression tests that compare gameplay and random state before and after staging.
- [Legacy Overwatch double-press still commits] -> Disable action controls while confirmation is ready and add a rule/UI regression proving only `Confirm?` commits.
- [The extra row overlaps content on short landscape viewports] -> Reuse the action bar's responsive column sizes and verify bounding boxes at desktop and mobile-landscape viewport sizes.
- [End Turn behavior changes existing tests that assume zero-AP immediate transition] -> Replace those expectations with confirmation-required scenarios for both usable-AP and zero-AP states.

## Migration Plan

No persistent data migration is needed. Implement the pending-target contracts and tests first, then switch React selection and confirmation routing, replace the modal styles, and run the complete unit, build, and desktop/mobile browser checks. Rollback consists of reverting this scoped change; no saved data or external API requires coordination.
