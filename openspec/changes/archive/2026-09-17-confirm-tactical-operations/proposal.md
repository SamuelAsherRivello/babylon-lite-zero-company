## Why

Move and Shoot currently commit as soon as a valid target is selected, while Overwatch and End Turn use different confirmation mechanisms. A single inline confirmation row will make every player-controlled operation explicit, reversible before commitment, and visually consistent.

## What Changes

- Stage valid Move destinations, Shoot targets, and Overwatch directions without spending AP or resolving the operation.
- Show a shared `Confirm?` and `Cancel` row only after a valid operation target has been selected, and allow the player to retarget before confirming.
- Make `Confirm?` the only way to commit Move, Shoot, Overwatch, or End Turn; make `Cancel` abandon the entire operation without changing gameplay state.
- Always stage End Turn for confirmation, including when no player operative has usable AP, and replace the modal prompt with the shared inline row.
- Lay out the confirmation controls above the four tactical action buttons: each control spans two action columns, both use the action-button height, and the pair matches the full action-row width on supported desktop and mobile-landscape layouts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tactical-actions`: Change Move, Shoot, and Overwatch from mixed immediate or action-button confirmation paths to a shared staged-target and explicit-confirmation flow.
- `tactical-turn-loop`: Require the shared confirmation flow every time End Turn is requested, regardless of remaining player AP.
- `tactical-scene-presentation`: Add the conditional, responsive two-button confirmation row above the four tactical action buttons.

## Impact

- Deterministic battle command contracts and pending-action state in `zero-company/src/game/rules/`.
- React input routing and tactical action controls in `zero-company/src/App.jsx`.
- Action-bar and responsive layout styles in `zero-company/src/style.css`.
- Rule tests and real-browser smoke coverage under `zero-company/test/`.
- No new runtime dependencies, network access, save migration, or enemy-AI behavior changes.
