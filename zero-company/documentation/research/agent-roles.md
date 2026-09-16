# Agent Roles

## Research Round

Exactly three subagents completed the required research round:

| Agent | Research lane | Report |
|---|---|---|
| Agent 1 (`01a0a9f4-abc1-7412-b8c1-5bc48bfdd31a`) | Camera, visual language, environment, and interface | `01-presentation.md` |
| Agent 2 (`01a0a9f4-ad30-7922-a288-f2b40726572a`) | Squad, AP, movement, shooting, and turn mechanics | `02-player-mechanics.md` |
| Agent 3 (`01a0a9f4-ae82-7033-ac6c-4c6baa97a880`) | Combat, LOS, Overwatch, recommendations, and enemy AI | `03-combat-ai.md` |

## Post-Research Ownership

- **Main agent:** React interface, projected HUD integration, responsive CSS,
  automated tests, integration, browser verification, task tracking, and
  recording approval decisions.
- **Agent 1 - development:** Babylon runtime, scene descriptors, scene
  lifecycle, entity construction, and camera input modules under
  `zero-company/src/game/`. Agent 1 does not edit React, CSS, tests, assets,
  OpenSpec artifacts, or this documentation.
- **Agent 2 - assets:** the local character model and any directly required
  presentation asset files under `zero-company/public/assets/`, plus provenance
  in `zero-company/documentation/assets.md`. Agent 2 does not edit application
  code, tests, OpenSpec artifacts, or research records.
- **Agent 3 - verifier:** read-only review of artifacts, diffs, test/build
  output, browser evidence, console state, offline behavior, and provenance.
  Agent 3 does not implement fixes or edit task checkboxes. The main agent
  records each decision in `approval-log.md`.

## Approval Protocol

1. The responsible implementer supplies the relevant diff and focused evidence.
2. Agent 3 returns `PASS` or `FAIL` with requirement and task references.
3. A failure returns to the responsible implementer and is reviewed again.
4. No implementation task is checked off until its required evidence exists
   and Agent 3 has returned `PASS`.
5. Checkpoint 1 requires a final review of all artifacts, runtime evidence,
   test/build output, local-only assets, and the clean browser console.
