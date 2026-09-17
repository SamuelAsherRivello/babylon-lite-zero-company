## Context

See proposal.md for motivation. Current enemy planning already returns rich
serializable plan objects: Move plans contain destination, path, cost, follow-up
shot data, and expected damage; Shoot plans contain target, cost, preview, and
expected damage; Overwatch plans contain target cell, normalized direction,
range, width ratio, half angle, and cost. `App.jsx` currently reduces this to a
small `enemyIntent` object and waits briefly before resolving the action. The
Babylon presentation already has reusable movement, shot, and Overwatch preview
constructors, while React owns the DOM banner.

## Goals / Non-Goals

**Goals:**

- Preserve deterministic enemy planning and use the selected plan as the single
  source for intent display.
- Expose action-specific plan detail in the DOM and Babylon presentation.
- Keep enemy-turn input locked while preserving camera/unit inspection.
- Cover desktop and mobile landscape browser visibility.

**Non-Goals:**

- Changing enemy plan scoring, target priority, AP costs, or random resolution.
- Adding new art, audio, packages, network services, or telemetry.
- Adding player reaction choices during the enemy intent pause.
- Reworking the pending-operation confirmation flow from
  `confirm-tactical-operations`.

## Decisions

1. Store a presentation-safe intent snapshot in React state.

   `enemyIntent` should be expanded from the selected enemy plan, copying only
   serializable display data needed by UI and scene previews. This avoids
   retaining mutable references to battle state or recomputing a different plan
   after the pause. Alternative considered: recompute previews from current
   state inside the scene. That risks drift if state changes during the delay.

2. Keep rule-layer plan objects deterministic and presentation-neutral.

   Add a small rule-facing helper only if needed to normalize intent data from a
   chosen plan. The helper must not consume randomness or depend on React,
   Babylon, DOM, timers, or browser APIs. Alternative considered: build intent
   shape entirely in `App.jsx`. That is acceptable for a thin adapter, but any
   repeated shape shared by tests should live beside the planner.

3. Reuse existing preview controllers with enemy-specific descriptors.

   Movement path, shot line, and Overwatch cone should flow through the current
   presentation preview patterns, adding a dedicated enemy-intent preview
   controller only where lifecycle separation is needed. Alternative considered:
   merge enemy intent into player movement and Overwatch preview state. That
   increases the chance of stale player preview meshes surviving across turns.

4. Preserve enemy-turn lockout.

   The existing disabled action buttons and command rejection remain the source
   of input safety. Intent previews are read-only visual affordances and should
   not create selectable meshes or command targets. Alternative considered:
   allow intent previews to be interactive inspection controls. That is outside
   this readability slice.

## Risks / Trade-offs

- Intent data can drift from resolution if copied incompletely -> verify tests
  compare intent snapshot fields to the chosen plan and resolved action.
- Extra scene overlays can clutter small landscape viewports -> verify browser
  smoke checks on desktop and mobile landscape, including overlap-sensitive
  selectors and screenshots where helpful.
- Move-then-shoot plans contain a follow-up shot but the current runtime only
  resolves the first action in the selected plan -> present the immediate chosen
  action plus known follow-up summary only if implementation also resolves or
  intentionally defers the follow-up consistently.
- `confirm-tactical-operations` may alter action-bar layout while this change
  is pending -> keep intent UI isolated from confirm/cancel controls and rerun
  browser smoke after both changes are integrated.

## Migration Plan

No data migration is required. Apply as a normal frontend/rules update: add
focused rule tests for intent snapshots, extend presentation and browser
coverage, then run `npm.cmd test`, `npm.cmd run build`, browser smoke on
desktop and mobile landscape, and `openspec validate --specs --strict`.
