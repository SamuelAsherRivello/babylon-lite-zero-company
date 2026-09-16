# Combat and AI Research

## Scope

This report covers the combat and enemy-decision lane for the approved
three-player-versus-three-enemy browser MVP. It examines range, line of sight,
cover, hit probability, damage, Overwatch, enemy decision behavior, and player
recommendations. It does not propose campaign systems, progression, character
abilities, items, destructible environments, or additional combat actions.

Verified facts below come from official Electronic Arts material. Where EA does
not disclose a rule or algorithm, the report labels the result as an **MVP
heuristic** rather than presenting it as STAR WARS Zero Company behavior.

## Sources

All sources were accessed on **2026-09-16**.

1. [EA Help: turn-based tactics and combat basics](https://help.ea.com/en/articles/star-wars/zero-company/turn-based-tactics-basics/)
   - Primary source for three AP per Operator, variable movement cost,
     Chance-to-Hit factors, cover, Overwatch, action ordering, and broad weapon
     behavior.
2. [EA Help: improving at turn-based tactics](https://help.ea.com/en/articles/star-wars/zero-company/improve-turn-based-tactics/)
   - Primary source for player recommendations, including AP efficiency,
     positioning, target selection, cover use, Overwatch, and early End Turn
     warnings.
3. [EA Help: Specialization and Weapon Class guide](https://help.ea.com/en/articles/star-wars/zero-company/specialization-and-weapon-class-guide/)
   - Primary source for short-, medium-, and long-range weapon roles, differing
     attack costs, weapon damage, and penalties outside optimal range.
4. [Game AI Pro: An Introduction to Utility Theory](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf)
   - Supplemental industry reference for the utility-AI pattern: score legal
     actions in a common scale and choose a top-scoring action. Used only
     because the official EA sources do not describe Zero Company's enemy AI.
5. [Game AI Pro 3: Choosing Effective Utility-Based Considerations](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf)
   - Supplemental industry reference for small, explainable considerations in
     tactical movement and skill selection. Used only to shape the bounded MVP
     heuristic.

## Observations

### Verified Zero Company facts

- Combat alternates between the player's squad and the enemy. The player's
  whole squad shares a turn, and each Operator has three AP.
- Movement, attacks, and Overwatch consume AP. Longer movement costs more AP,
  so action order and retaining enough AP for a follow-up matter.
- Chance-to-Hit is displayed before an attack. EA identifies distance, weapon
  range, line of sight, cover, and positioning as inputs. Greater distance
  generally lowers hit chance; weapon classes have different optimal ranges.
- An Operator usually needs a clear view to attack. EA does not publish a
  geometric line-of-sight algorithm or state that every obstruction always
  reduces hit chance to exactly zero.
- Cover lowers incoming Chance-to-Hit. The full game distinguishes partial and
  full cover, supports flanking and advantageous positions, and may allow cover
  destruction.
- Weapon classes differ in base damage, optimal range, and AP cost. Official
  examples establish close-range, versatile medium-range, and precision
  long-range roles. EA documents a strike penalty outside optimal range, but
  does not state that all weapon damage universally decreases with every unit
  of distance.
- Official Overwatch watches a selected area during the enemy turn and can
  automatically attack an enemy that moves through or acts within it. It can
  interrupt movement, defend an area, protect repositioning teammates, and
  punish an advance. Committing Overwatch ends that Operator's turn, and enemies
  can use Overwatch too.
- EA recommends checking hit chance before committing AP; moving or changing
  angle when the odds are poor; ending in cover; preserving AP for an attack or
  Overwatch; using Overwatch as a final action; and concentrating attacks on a
  priority threat instead of spreading damage without securing eliminations.
- EA confirms that ending a turn with AP remaining can display a warning. It
  also says not every available AP must be spent when ending early is the
  better choice.
- No reviewed official source explains how Zero Company's enemy AI enumerates,
  scores, sequences, or breaks ties between actions.

### Proposed MVP combat heuristics

These are original implementation rules for this MVP, not claims about the
commercial game's internal formulas.

1. **Shared legality:** Player and enemy actions query the same movement, AP,
   weapon, line-of-sight, and Overwatch rules. AI receives no hidden future
   random result.
2. **Line of sight:** Treat the three solid cover blocks as binary blockers. A
   fully intersected shooter-to-target test returns zero hit probability and
   makes Shoot invalid. Do not add partial cover percentages in this MVP.
3. **Authored range curves:** Give the three fixed weapons short, balanced, and
   long-range curves. In accordance with the approved MVP requirement, each
   curve has its highest hit probability and damage at adjacent range, with
   both values decreasing monotonically over distance. These curves are a
   deliberate simplification and are not copied from EA's formulas.
4. **Preview parity:** The same pure combat query produces the preview and the
   resolved attack inputs. Resolution may miss according to the shown
   probability, but a hit never exceeds the displayed damage.
5. **Overwatch commitment:** Let the acting unit invest one, two, or three
   remaining AP. Investment is the maximum number of reaction shots. The user
   aims a cone and confirms it; the unit is then locked until its next turn.
   Check reactions only when an opponent moves into the cone with clear line of
   sight. This intentionally excludes the full game's action-within-area trigger.
6. **Bounded enemy choice:** For the active enemy only, enumerate legal direct
   shots, bounded move-then-shoot options, legal moves, and directional
   Overwatch. Reject actions that exceed remaining AP.
7. **Primary utility:** Score attack candidates first by expected damage
   (`hitProbability * damage`), using a deterministic estimate rather than
   peeking at the next random roll. A reachable move is worthwhile when its
   follow-up shot improves expected damage enough to beat an immediate shot.
8. **Defensive fallback:** When no immediate or reachable attack has positive
   expected damage, prefer Overwatch aimed toward a reachable player approach
   lane. If no useful legal action remains, relinquish the remaining AP.
9. **Stable execution:** Break equal scores with stable unit and cell IDs,
   execute one action, wait for its rules and presentation to resolve, then
   replan from current state. Complete one enemy's activation before starting
   the next enemy.
10. **Readable intent:** Identify the active enemy and its chosen Move, Shoot,
    or Overwatch action. Camera and inspection remain available, but player
    commands cannot change enemy resolution.

### Player recommendations for the MVP

- Check the displayed hit chance and damage before shooting.
- When a move leaves enough AP for a shot, compare the current shot with the
  move-then-shoot preview and choose the higher expected damage.
- Do not spend all AP moving unless the new position is worth giving up an
  attack or Overwatch.
- Use the block covers to break line of sight when ending exposed would permit
  a strong enemy shot.
- Concentrate damage when an elimination can remove an enemy's future AP.
- When no good shot is available, aim Overwatch across the most likely approach
  path and invest only the AP needed for the expected number of reactions.
- Treat these as situational guidance, not a guaranteed optimal strategy.

## Confidence

| Finding | Confidence | Basis and limitation |
| --- | --- | --- |
| Three AP per Operator and squad-wide player turn | High | Explicit official EA combat guide. |
| Distance, weapon range, LOS, cover, and positioning affect Chance-to-Hit | High | Explicit official EA combat guide. Exact formulas are undisclosed. |
| Cover has partial/full strengths in the commercial game | High | Explicit official EA combat guide. Destructibility is outside this MVP. |
| Weapon roles and AP costs differ by class | High | Explicit official EA weapon guide. MVP values must be independently authored. |
| Official Overwatch covers an area and ends the Operator's turn | High | Explicit official EA combat and tactics guides. |
| Universal distance-based damage falloff | Low as a Zero Company fact; High as an approved MVP rule | Not established by reviewed EA sources; required by the approved MVP spec. |
| Binary blocked LOS gives exactly zero hit chance | Medium as an inference; High as an approved MVP rule | EA says clear view is usually required; exact commercial calculation is undisclosed. |
| Expected-damage utility describes Zero Company enemy AI | Unknown | No official AI algorithm was found. This is an original, bounded MVP heuristic supported by general utility-AI literature. |
| Moving for a stronger shot, preserving AP, cover, Overwatch, and focus fire are useful recommendations | High | Explicit official EA tactics guidance, condensed to available MVP actions. |

## MVP Include/Exclude Boundary

| Topic | Include in 3v3 MVP | Exclude from 3v3 MVP |
| --- | --- | --- |
| Teams and turns | Three blue players, three red enemies, three AP each, alternating side turns, sequential enemies | Reinforcements, additional factions, simultaneous enemy actions |
| Movement | Grid destinations grouped into one-, two-, and three-AP tiers | Stances, elevation rules, environmental hazards, free actions |
| Shooting | One target, fixed AP cost by authored weapon, displayed hit chance and damage, seeded resolution | Critical hits, burst modes, abilities, grenades, melee, support attacks |
| Range and weapons | One fixed short-, balanced-, and long-range archetype; independent deterministic curves | Loadouts, upgrades, commercial-game numeric replication |
| Line of sight | Three solid covers act as binary blockers; blocked shot is invalid and shows 0% | Partial visibility, penetration, suppression, destructible cover |
| Cover | Readable block placement and LOS protection | Partial/full cover percentage modifiers, flanking bonuses, high ground |
| Overwatch | One- to three-AP cone; one reaction maximum per AP; movement-entry and LOS trigger; lock until next turn | Triggering on non-movement actions, abilities that break Overwatch, complex interrupts |
| Enemy AI | Same legal rules; bounded expected-damage scoring; move-then-shoot; defensive Overwatch; stable ties | Learning AI, hidden information, long-horizon search, personalities, difficulty levels |
| Advice | Preview odds/damage, improve position, preserve AP, use cover/Overwatch, focus threats | Tutorial campaign, recommendation engine, adaptive coaching |

## Requirement Mapping

### `milestone-1-camera`

| Requirement | Research mapping |
| --- | --- |
| `tactical-scene-presentation`: complete greybox battlefield | Three block covers should visibly interrupt plausible firing lanes between the three blue and three red units. They are presentation geometry only in this milestone. |
| `tactical-scene-presentation`: approved visual inventory | The static shot tracer, muzzle/impact feedback, movement cells, and Overwatch cone should communicate Shoot, movement cost, and directional reaction fire without resolving combat. |
| `tactical-scene-presentation`: anchored player HUDs | Static HUD examples should show health, three AP, and Overwatch state clearly enough to support the later live rules. |
| `tactical-camera-controls`: camera is the only interaction | Selecting and inspecting any unit may change camera focus and selection treatment only. No click may move a unit, spend AP, roll a hit, change health, commit Overwatch, or invoke AI. |
| Milestone 1 exclusion | No combat formula, LOS resolution, cover modifier, reaction, enemy decision, or player recommendation becomes functional during this change. This report is an implementation input for milestone 2. |

### `milestone-2-gameplay`

| Requirement | Research mapping |
| --- | --- |
| `tactical-actions`: Move tiers | Longer movement consuming more AP is source-aligned; the exact grid thresholds and three colors remain authored MVP values. |
| `tactical-actions`: Shoot targets one visible enemy | Use one shared legality query. A solid-cover intersection invalidates the shot and reports 0% because that is the approved MVP rule. |
| `tactical-actions`: distance-scaled hit probability and damage | Distance-sensitive hit chance and distinct weapon ranges are source-aligned. Monotonic damage falloff and adjacent maximums are explicit MVP rules, not copied Zero Company behavior. |
| `tactical-actions`: Overwatch investment and reactions | The cone, enemy-turn reaction, defensive purpose, and post-commit lock are source-aligned in concept. The one-shot-per-invested-AP limit and movement-only trigger are the approved MVP simplification. |
| `enemy-tactical-ai`: shared rules | AI must use the same AP, reachability, weapon curves, LOS, cone, and reaction limits as the player and must not inspect future random rolls. |
| `enemy-tactical-ai`: bounded utility | Evaluate legal immediate shots and move-then-shoot sequences by expected damage, use Overwatch as the defensive fallback, and apply stable tie-breaking. This is an original MVP heuristic because EA does not disclose its AI. |
| `enemy-tactical-ai`: finite sequential activation | Replan after each completed action, cap candidate enumeration to the small board, relinquish useless AP, and finish one enemy before activating the next. |
| `enemy-tactical-ai`: observable intent | Show the active enemy and chosen action while preserving camera inspection and blocking player command input. |
| `tactical-turn-loop`: early End Turn | Preserve the approved confirmation when usable player AP remains; this is directly consistent with EA's documented optional warning. |

## Research Conclusion

The official material supports the MVP's three-AP tactical rhythm, positional
hit chance, weapon-range roles, cover awareness, and defensive Overwatch. The
MVP should deliberately simplify those ideas into binary LOS, three authored
range curves, and movement-triggered reaction cones. Enemy behavior should be
implemented as a small deterministic utility policy centered on expected
damage, with directional Overwatch as its defensive fallback. That policy is
appropriate for the approved 3v3 board, easy to test and explain, and is not
represented as a copy of Zero Company's undisclosed AI.
