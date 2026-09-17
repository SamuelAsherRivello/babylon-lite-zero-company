## Why

The tactical battle currently exposes controls and previews, but it does not tell a player the single next input required to progress through an action. A persistent instruction responder will make the first playable flow understandable at a glance and reduce ambiguity during targeting, confirmation, enemy turns, presentations, and terminal states.

## What Changes

- Add an `Instructions` panel in the lower-right corner with one dynamic line of guidance.
- Derive the guidance from the current battle state, selection, pending action, confirmation state, presentation state, loading state, and result state.
- Prioritize blocking guidance such as waiting for a presentation, watching the enemy turn, or restarting after a result or load error.
- Guide the normal player flow through selecting an actionable blue player, choosing an action, selecting the appropriate target, and confirming the staged operation.
- Keep invalid target clicks from changing the current instruction state.
- Treat dead or exhausted blue players as non-actionable selections and continue guiding the user to select an actionable blue player.
- Move the version label from the lower-right corner to the lower-left corner beneath Settings.

## Capabilities

### New Capabilities

- `instruction-responder`: Provides state-derived, single-step tactical instructions for player, enemy, presentation, loading, and result states.

### Modified Capabilities

- `tactical-scene-presentation`: Changes the reusable corner layout so version appears below Settings in the lower-left and the lower-right contains the Instructions panel.

## Impact

- React HUD rendering in `zero-company/src/App.jsx` and its presentation styles in `zero-company/src/style.css`.
- A pure instruction derivation module under `zero-company/src/` with focused unit tests, keeping deterministic guidance separate from React rendering.
- Existing tactical action, turn-loop, loading, and presentation state contracts are read-only inputs; no gameplay rules, commands, dependencies, or runtime network behavior need to change.
- Browser verification is required at supported desktop and mobile landscape sizes, alongside the repository's existing test and build commands.
