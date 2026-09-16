# Zero Company MVP Research Brief

## Decision

The project will use STAR WARS Zero Company only as a reference for broad
tactical readability and turn-based concepts. The implementation is an
original 3v3 greybox game with original or permissively licensed local assets.
The three detailed reports remain the evidence record:

- [Presentation](01-presentation.md)
- [Player mechanics](02-player-mechanics.md)
- [Combat and AI](03-combat-ai.md)

All referenced web sources were accessed on 2026-09-16. Sourced facts,
observations of the user-provided image, and project-authored inferences remain
distinguished in those reports.

## Included Findings

| Finding | Confidence | Approved requirement mapping |
|---|---|---|
| Use a stable elevated tactical overview that initially frames the entire encounter. | High | `tactical-camera-controls`: fixed overview; `tactical-scene-presentation`: complete battlefield |
| Use one neutral platform, three simple cover blocks, and three blue versus three red model instances. | High for the supplied target; project-authored scope | `tactical-scene-presentation`: complete greybox battlefield |
| Keep the screen hierarchy sparse: turn banner above, four equal actions below, world information beside units. | High for the supplied target | `tactical-scene-presentation`: approved visual inventory and responsive 16:9 frame |
| Reinforce team and state colors with labels, rings, icons, position, and silhouette. | High | `tactical-scene-presentation`: complete battlefield, HUDs, and legible presentation |
| Present movement cells, a shot line with muzzle/impact feedback, and a directional Overwatch cone as static examples. | High | `tactical-scene-presentation`: approved visual inventory and non-mutating controls |
| Preserve a predictable camera rather than adding cinematic combat cuts. | High | `tactical-camera-controls`: focus-preserving desktop and touch orbit/zoom |
| Treat three AP, distance-cost movement, weapon roles, LOS, and directional Overwatch as milestone-2 inputs only. | High for broad concepts; exact rules are project-authored | `milestone-2-gameplay`; milestone 1 remains presentation-only |
| Use binary cover blocking, authored range curves, and bounded expected-damage AI only as explicit MVP heuristics. | High as approved project rules, not commercial-game facts | `milestone-2-gameplay`: tactical actions and enemy AI |

## Milestone 1 Implementation Contract

- Render exactly the approved 3D inventory: one platform, three covers, and six
  instances or clones from one local character model.
- Use neutral environment materials, blue/red team materials, cyan selection
  and shot accents, and yellow Overwatch accents with redundant non-color cues.
- Keep all action controls visibly nonfunctional. Selection may change the
  selected unit and camera focus only; it may not change AP, health, position,
  Overwatch, or turn state.
- Keep all runtime models, textures, icons, and fonts local.
- Preserve the existing four corner roles around the centered 16:9 game frame.
- Block portrait mobile input with orientation guidance while retaining scene
  and camera state.

## Original Versus Reference Boundary

The project may reuse general ideas such as an elevated tactical view, readable
cover lanes, AP indicators, movement previews, a shot tracer, and a directional
Overwatch area. It must not copy STAR WARS names, characters, logos, models,
textures, audio, maps, narrative, proprietary UI art, exact layouts, exact
statistics, or undisclosed formulas. The supplied screenshot defines element
inventory and complexity, not pixels to reproduce.

## Explicit Exclusions

- Campaign, base management, objectives, recruitment, bonds, injuries,
  progression, inventory, and loadout editing.
- Abilities, utilities, melee, grenades, critical hits, partial cover,
  destructible cover, elevation rules, and action cameras.
- Functional movement, shooting, damage, Overwatch, turn changes, AI, victory,
  defeat, or restart in `milestone-1-camera`.
- Runtime web fonts, streamed models, remote textures, remote audio, telemetry,
  or any other network dependency required to display or inspect the scene.

## Conflict Resolution

Official material describes richer systems than this MVP and does not publish
all formulas or AI behavior. Where the official sources are silent or broader,
the approved OpenSpec artifacts control. In particular, the fixed 3v3 roster,
three cover blocks, distance-scaled damage, binary zero-probability LOS, and
expected-damage AI are project decisions rather than claims about the
commercial game.
