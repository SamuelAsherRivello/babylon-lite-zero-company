# Zero Company Presentation Research

## Scope

This report covers the presentation lane for `milestone-1-camera`: tactical
camera framing, battlefield and environment composition, visual hierarchy,
readable combat UI, unit selection and focus, and the greybox treatment. It
also identifies presentation contracts that `milestone-2-gameplay` should
retain when static feedback becomes functional.

This is reference research, not permission to copy commercial art. The MVP
must use original or permissively licensed local assets and must not reproduce
Star Wars characters, logos, textures, audio, interface art, or other
proprietary assets.

## Sources

All web sources were accessed on **2026-09-16**.

1. [EA: Lead Zero Company to Victory on August 27](https://www.ea.com/games/starwars/zero-company/news/lead-zero-company-to-victory)
   - Primary source for the isometric Tactical Mission camera, battlefield
     screenshots, cover, health and hit information, action menus, and
     Overwatch presentation.
2. [EA: STAR WARS Zero Company official site](https://www.ea.com/games/starwars/zero-company)
   - Primary source for the broad visual identity and official tactical-combat
     gallery descriptions.
3. [EA Accessibility Resources: STAR WARS Zero Company](https://www.ea.com/able/resources/star-wars-zero-company)
   - Primary source for UI text-size options, color filters, gameplay
     highlights, action-camera settings, and the end-turn warning.
4. [O'Reilly: Grayboxing, Practical Game Design](https://www.oreilly.com/library/view/practical-game-design/9781787121799/7a35ab2c-b96b-447c-9bec-135031af1122.xhtml)
   - Secondary design reference for using simple playable geometry to validate
     layout and playability before visual dressing.
5. Local rendering target:
   `C:\Users\srive\Desktop\Screenshot_20260916_145213_ChatGPT.jpg`
   - User-supplied visual target for composition, UI complexity, rendering
     style, and the milestone's 3D element inventory.

## Observations

Confidence describes confidence in the observation, not a claim that the MVP
should reproduce the source exactly.

| ID | Evidence type | Observation | Confidence | MVP implication |
|---|---|---|---|---|
| P1 | Sourced fact | EA describes Tactical Missions as turn-based ground combat viewed from an isometric camera. Official image descriptions repeatedly distinguish this overhead combat view from lower third-person or action-camera views. | High | Use an elevated, angled overview as the normal camera. Do not make an over-the-shoulder camera the default. |
| P2 | Sourced fact | Official tactical screenshots are described as showing squad members, enemies, cover positions, and an action menu together in one view. | High | The opening overview must frame all six MVP units and all three cover blocks while leaving clear screen space for the action bar. |
| P3 | Sourced fact | EA's gameplay overview identifies visible health, Chance-to-Hit near a target, cover lines, mission objectives, and an Overwatch mode/cone as combat information. | High | Prefer information attached to the relevant unit or world location. Static health/AP/Overwatch, movement cells, shot feedback, and the cone are justified previews for milestone 1; live hit previews belong to milestone 2. |
| P4 | Sourced fact | EA describes Overwatch as an adjustable cone, and official screenshots are described as keeping that cone legible over an isometric battlefield. | High | Use a translucent directional ground cone with a bright edge or apex marker. It must remain readable without hiding units or cover. |
| P5 | Sourced fact | EA exposes an optional action camera and allows it to be reduced or disabled. | High | Stable tactical readability has priority over cinematic camera motion. Milestone 1 should use one predictable orbital camera and no automatic combat cutaways. |
| P6 | Sourced fact | EA provides multiple gameplay-UI text sizes, colorblind filters, and highlights for obscured characters and destructible cover. | High | Do not encode state only through hue. Team color should be reinforced by position, labels, rings, and silhouette; text and icons need strong contrast at small landscape sizes. Full accessibility settings are outside this MVP. |
| P7 | Sourced fact | The O'Reilly greyboxing reference defines greyboxing as validating playable geometry with simple, largely untextured forms before investing in final art. | High | Keep the platform and cover primitive, clean, and measurable. Lighting, shadows, and team materials should clarify shape rather than disguise it with decoration. |
| P8 | Local-target observation | The supplied target uses a single beige rectangular platform, three large grey rectangular cover blocks, three red units along the far side, and three blue units along the near side. All elements fit in one angled overview. | High | Treat this as the milestone-1 composition and 3D inventory ceiling: one platform, three covers, six character instances, with no decorative structures competing for attention. |
| P9 | Local-target observation | The target separates ownership with saturated blue/red character materials and health bars, while selection and action previews use cyan and yellow. Neutral ground and cover preserve contrast. | High | Use neutral low-saturation environment materials, blue/red teams, cyan selection/movement/shot accents, and yellow Overwatch accents. Exact colors may be adjusted for contrast and must not be the only state cue. |
| P10 | Local-target observation | The target's main UI has one small turn banner at the top and four equal action controls centered at the bottom. World-space indicators sit close to their units. | High | Keep the screen-space HUD sparse and symmetrical. Preserve battlefield visibility instead of adding side panels, minimaps, inventories, or explanatory text. |
| P11 | Local-target observation | Selection is shown by a bright ring under a unit; AP appears as three dots plus a compact label; health appears as a short bar; movement uses discrete highlighted floor cells; shot and Overwatch previews use thin directional geometry. | High | Recreate these information roles with original geometry and icons. Use stable dimensions so selection and HUD changes do not shift the layout. |
| P12 | Design inference | A camera that changes focus but preserves radius and orbit angles lets inspection feel intentional without disorienting the user. This exact input model comes from the approved project requirements, not from an observed Zero Company control scheme. | High for project fit; not a claim about the commercial game | Start focused on the world origin. Selecting any unit changes only the orbital target. Right-drag/wheel and two-finger drag/pinch operate around the current focus within clamps. |
| P13 | Design inference | With only six units, three covers, and one arena, silhouette separation is more valuable than environmental fidelity. Three cover blocks can create three readable lanes while preserving clear lines across the board. | Medium-high | Stagger unit positions and covers enough to prevent overlap in the opening camera. Keep every operative selectable and visually distinct at the default zoom. |
| P14 | Design inference | The action bar can look final while remaining semantically disabled in milestone 1. A visible disabled treatment avoids suggesting that action clicks should already spend AP. | High | Render the four final-form controls, but expose disabled state and guarantee that they do not mutate position, health, AP, Overwatch, or turn state. |

## MVP Include / Exclude

| Item | Decision | Milestone | Reason |
|---|---|---|---|
| Elevated isometric-style overview | Include | `milestone-1-camera` | Directly supported by EA's Tactical Mission description and the local target. |
| One neutral platform and three primitive cover blocks | Include | `milestone-1-camera` | Matches the approved inventory and keeps greybox geometry readable. |
| Six instances or clones of one locally bundled humanoid model | Include | `milestone-1-camera` | Meets the project constraint without copying Zero Company characters. |
| Blue player team and red enemy team with redundant rings/labels | Include | `milestone-1-camera` | Matches the target's fast team recognition while avoiding color-only communication. |
| Directional light, ambient fill, and readable contact shadows | Include | `milestone-1-camera` | Gives primitive geometry depth and unit grounding without environment dressing. |
| Top turn banner and bottom four-command action bar | Include | `milestone-1-camera` | Matches the approved UI inventory and complexity ceiling. |
| Player health, AP, and Overwatch world HUDs | Include | `milestone-1-camera` | Explicit milestone requirement and consistent with official world-associated combat information. |
| Selection rings and static movement, tracer, impact, and Overwatch examples | Include | `milestone-1-camera` | Demonstrates the complete presentation language before gameplay state is introduced. |
| Click/tap unit focus, constrained orbit, and constrained zoom | Include | `milestone-1-camera` | Explicit project control contract; supports inspection without adding gameplay. |
| Full campaign UI, objectives panel, minimap, inventory, loadout, abilities, utilities, and Advantage | Exclude | Both | Commercial-game breadth exceeds the six-unit MVP and the approved screen-complexity target. |
| Third-person exploration or over-the-shoulder action camera | Exclude | Both | The MVP is one tactical battle; cinematic cuts would disrupt the required stable orbital focus. |
| Star Wars logos, characters, names, models, textures, sounds, or copied UI art | Exclude | Both | Proprietary source material is for functional and compositional reference only. |
| Detailed environment dressing, destructible scenery, elevation systems, and multiple maps | Exclude | Both | Greybox validation and the three-cover inventory are the chosen scope. |
| Functional movement, shooting, Overwatch, AP spending, damage, AI, and turn changes | Exclude for now | `milestone-1-camera` | These belong to `milestone-2-gameplay`; milestone 1 must remain presentation-only. |
| Live target hit chance, line-of-sight warnings, enemy intent, results, and restart UI | Defer | `milestone-2-gameplay` | These require live tactical state and should extend the established presentation language. |
| Runtime web fonts, streamed models, remote textures, or remote audio | Exclude | Both | The application must remain complete offline after local files are available. |

## Requirement Mapping

### `milestone-1-camera`

| Requirement | Research mapping |
|---|---|
| **The game presents the complete greybox battlefield** | P1, P2, P7, P8, and P13 support the elevated overview, one platform, three covers, six visible operatives, and low-detail geometry. P9 supports neutral environment materials and blue/red team separation. |
| **The presentation matches the approved visual inventory** | P3, P4, P10, P11, and P14 map to the player-turn banner, four controls, rings, status indicators, movement cells, tracer/impact feedback, and Overwatch cone. The milestone keeps each example non-mutating. |
| **Player operatives have anchored in-world status HUDs** | P3 and P11 support placing concise tactical state near the relevant unit. P6 requires contrast and redundant cues; projected labels should remain legible and associated while orbiting. |
| **The game surface preserves a responsive 16:9 frame** | P2, P8, P10, and P13 require a composition that keeps all units, covers, banner, and action bar visible. The local target is already 16:9 and demonstrates the intended sparse vertical hierarchy. |
| **Presentation assets work without runtime network access** | The source boundary and include/exclude table require original or permissively licensed local models, icons, materials, and fonts. Research links are references only and are not runtime dependencies. |
| **The camera starts from a fixed overview** | P1, P2, P8, and P13 support an initial world-origin view that frames the complete encounter. |
| **Any operative can become the camera focus** | P12 maps directly: all six units are selectable; focus changes to the unit while radius and angles remain stable; the ring gives unambiguous feedback. |
| **Desktop pointer controls orbit and zoom around focus** | P5 and P12 favor a stable manual tactical camera. Implement the approved right-drag and wheel scheme with near/far and elevation limits. |
| **Mobile gestures orbit and zoom around focus** | P12 extends the same focus model to single-tap selection, two-finger orbit, and pinch zoom without introducing floor targeting. |
| **Portrait mobile blocks play with orientation guidance** | P2 and P10 make landscape width necessary for simultaneous battlefield and action-bar readability. Preserve scene and camera state behind the blocker. |

### `milestone-2-gameplay`

| Requirement area | Presentation continuity from this report |
|---|---|
| **Immediate player-turn battle and live HUD state** | Keep the P8/P10 opening composition and replace milestone-1 display values with live health, AP, turn, and Overwatch state. Do not add a title screen. |
| **All six units remain inspectable** | Retain P11/P12 selection rings and focus behavior. Add compact inspection data without obscuring the arena or replacing the selected unit as camera focus. |
| **Move exposes AP-tiered destination squares** | Convert P11's static floor cells into three clearly distinguishable AP tiers. Use redundant tone/pattern or labels so the tiers are not hue-only. |
| **Shoot, distance preview, and line of sight** | Convert the static tracer into action feedback and add concise target-adjacent probability/damage/blocked-state information, consistent with P3. Keep the overview stable outside the brief effect. |
| **Overwatch investment, aiming, and reaction fire** | Convert P4/P9/P11's static yellow cone into the adjustable committed area. Preserve transparency so covered units, floor cells, and obstacles remain readable. |
| **Sequential enemy activations and observable intent** | Use the existing selection/focus language to identify the active enemy, but avoid forced cinematic cuts. P5 supports letting the tactical overview remain authoritative. |
| **End-turn warning** | EA's accessibility page confirms an end-turn warning is a recognized affordance. Implement the project's required Are you sure prompt only when usable player AP remains. |
| **Readable combat feedback and offline assets** | Keep effects brief, directional, and subordinate to tactical information. Add only the specified local particles and three to five local licensed sounds; do not stream or copy commercial assets. |
| **Victory, defeat, and restart** | Present a focused result prompt over the established scene. Avoid adding campaign framing, rewards, or post-battle systems. |

## Presentation Recommendation

Build a clean tactical diorama rather than a miniature imitation of the
commercial game: a neutral platform, three high-contrast cover blocks, six
locally sourced instances, restrained lighting, and a stable elevated camera.
The user should understand team ownership, current selection, AP/health state,
movement reach, a shot line, and an Overwatch direction in a glance. Everything
else remains absent until it is needed by `milestone-2-gameplay`.
