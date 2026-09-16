# Player Mechanics Research

## Scope

This report covers only official information relevant to the approved Zero
Company browser MVP: squad composition, the three-action-point economy,
distance-based movement costs, shooting and weapon-range concepts, turn flow,
and player-facing tactical recommendations. It does not define enemy AI,
camera behavior, art direction, campaign systems, or new product scope.

The commercial game is used as a mechanics reference only. The MVP remains an
original, compact three-versus-three implementation and must not reproduce
proprietary characters, writing, art, audio, maps, or data tables.

## Sources

All sources were accessed on **2026-09-16**.

1. [EA: Lead Zero Company To Victory on August 27](https://www.ea.com/games/starwars/zero-company/news/lead-zero-company-to-victory)
   - Primary official gameplay overview covering squad turns, three AP per
     operator, movement cost, attacks, range, line of sight, Overwatch, cover,
     action ordering, and tactical recommendations.
2. [EA Help: Turn-based tactics and combat basics](https://help.ea.com/en/articles/star-wars/zero-company/turn-based-tactics-basics/)
   - Primary official support guide covering AP, movement, attacks,
     Chance-to-Hit, weapon range, line of sight, cover, and positioning.
3. [EA Help: Specialization and Weapon Class guide](https://help.ea.com/en/articles/star-wars/zero-company/specialization-and-weapon-class-guide/)
   - Primary official support guide explaining weapon-class damage, optimal
     range, AP-cost differences, and short-, medium-, and long-range roles.
4. [EA Help: Improving at turn-based tactics](https://help.ea.com/en/articles/star-wars/zero-company/improve-turn-based-tactics/)
   - Primary official strategy guide recommending AP planning, repositioning
     when hit chance is poor, cover use, squad coordination, and defensive
     Overwatch.
5. [StarWars.com: How to Play Star Wars Zero Company](https://www.starwars.com/news/star-wars-zero-company-guide)
   - Official Lucasfilm gameplay primer confirming three AP per operator,
     movement-cost previews, attack costs, shared squad turns, and Overwatch.
6. [EA Accessibility: Star Wars Zero Company](https://www.ea.com/able/resources/star-wars-zero-company)
   - Primary official accessibility reference confirming an optional
     end-of-turn warning when usable AP remains.

## Observations

### Squad composition

- **Confirmed:** The player commands a squad of Operators. Official material
  describes both authored Operators and player-created recruits, with varied
  roles, abilities, equipment, and weapon classes.
- **Confirmed:** The entire player squad acts during one shared squad turn;
  the opposing side acts after that turn ends.
- **Not established by the reviewed sources:** A universal deployment count of
  exactly three Operators. The approved MVP's three-player-unit roster is a
  deliberate product constraint, not a claim about the commercial game's
  mission size.
- **MVP inference:** Three fixed player roles using short-, balanced-, and
  long-range weapons preserve meaningful squad differentiation without adding
  recruitment, customization, abilities, or loadout screens.

### Three-action economy and turn flow

- **Confirmed:** Each Operator receives three Action Points each turn.
- **Confirmed:** AP can fund movement, attacks, abilities, utility items, and
  Overwatch; costs vary by action and weapon class.
- **Confirmed:** Actions may be ordered flexibly within the squad turn.
- **Confirmed:** The player ends the squad turn before the enemy side acts.
- **Confirmed:** Official accessibility support includes an end-turn warning
  that protects against leaving possible AP unspent.
- **MVP inference:** Refreshing every living unit to three AP at the start of
  its side's turn and discarding unused AP is the simplest readable expression
  of the approved turn economy.

### Movement distance and AP cost

- **Confirmed:** Movement spends AP, and longer movement costs more AP.
- **Confirmed:** The game previews reachable locations and their AP costs
  before movement is committed.
- **MVP inference:** Showing floor squares in distinct one-, two-, and three-AP
  tiers directly communicates the official distance-cost relationship while
  fitting the approved grid-sized arena.
- **MVP inference:** Move should remain a movement-only action. Combining a
  move with an automatic attack would blur the AP decision the MVP is designed
  to teach.

### Shooting, weapons, and range

- **Confirmed:** Attacks spend AP; weapon class can change the attack cost.
- **Confirmed:** A ranged attack requires a target within weapon range and
  normally requires clear line of sight.
- **Confirmed:** Chance-to-Hit is shown before commitment. Distance, weapon
  range, line of sight, cover, flanking, and elevation can affect it.
- **Confirmed:** Weapon classes differ in damage, optimal range, and AP use.
  Official examples span short-, medium-, and long-range combat roles.
- **MVP inference:** Use exactly three fixed archetypes: short-range,
  balanced, and long-range. Each should expose a clear hit probability and
  damage preview without reproducing official weapon names or stat tables.
- **MVP inference:** The approved rule that adjacent targets receive maximum
  hit probability and maximum damage, with both values decreasing over
  distance, is a simplified local tuning rule. Official sources confirm range
  effects on accuracy and weapon performance, but do not establish that exact
  universal damage-falloff formula.
- **MVP inference:** Blocked line of sight should produce zero hit probability
  and an invalid target. This makes the official line-of-sight dependency
  unambiguous in a small browser prototype.

### Player recommendations

- **Confirmed:** Plan the whole turn before committing AP, and avoid spending
  every point on movement unless necessary.
- **Confirmed:** When Chance-to-Hit is poor, consider moving first, changing
  angle, or choosing another target.
- **Confirmed:** Good positioning, flanking, elevation, and cover improve
  survivability or attack quality.
- **Confirmed:** Overwatch is useful for controlling approach lanes and
  protecting teammates during the enemy turn. It ends that Operator's turn,
  so official guidance recommends it as a final action.
- **Confirmed:** There is no single superior tactic; the player should adapt
  to the battlefield and objective.
- **MVP inference:** The concise recommendation model is: seek the highest
  useful expected damage through range and line-of-sight positioning, then use
  directional Overwatch with remaining AP when a defensive finish is better.

## Confidence

| Finding | Confidence | Basis |
| --- | --- | --- |
| Shared squad turn followed by enemy turn | High | Stated by EA and StarWars.com |
| Three AP for every Operator each turn | High | Repeated across official gameplay guides |
| Movement cost increases with distance | High | Explicit EA gameplay description |
| Attacks use AP and depend on weapon class | High | Explicit EA gameplay and weapon guides |
| Range, line of sight, cover, and position affect hit chance | High | Explicit EA combat guide |
| Short-, medium-, and long-range weapon roles exist | High | Explicit EA weapon-class guide |
| End-turn warning for remaining AP | High | Explicit EA accessibility documentation |
| Exactly three deployed player units | Low as a commercial-game fact; High as an MVP requirement | Not established officially; fixed by approved MVP scope |
| Adjacent range always gives maximum damage and accuracy | Medium as an MVP abstraction; Low as a commercial-game fact | Approved local rule, not established as a universal official formula |
| Three fixed MVP weapon archetypes adequately represent the range decision | High as a design inference | Minimal mapping from official weapon-role distinctions |

## MVP Include / Exclude

| Include in the 3v3 browser MVP | Exclude from this MVP |
| --- | --- |
| Exactly three player units and three enemies | Commercial campaign, mission map, and base management |
| Three AP per living unit at its side's turn start | Recruitment, authored characters, and custom Operators |
| One shared player turn followed by a sequential enemy turn | Bonds, progression, injuries, permadeath, and Rally |
| Separate Move, Shoot, and Overwatch actions | Abilities, Advantage, utilities, and Call for Backup |
| One-, two-, and three-AP movement destination tiers | Destructible cover, elevation rules, and flanking bonuses |
| Three fixed weapon roles: short, balanced, and long | Official weapon names, exact stats, and loadout customization |
| Pre-commit hit chance, damage, range, and line-of-sight feedback | Melee, critical hits, weapon mods, and multiple fire modes |
| Zero-probability invalid shots when line of sight is blocked | Reproduction of official UI, characters, maps, or audiovisual assets |
| End-turn confirmation while usable player AP remains | Tutorials, difficulty modes, objectives, and campaign saves |
| Directional Overwatch as the defensive end-of-turn option | Any mechanic not already approved in the two milestones |

## Requirement Mapping

### `milestone-1-camera`

| Approved requirement | Research mapping |
| --- | --- |
| Three blue operatives and three red enemies | Use a visibly readable squad-versus-opposition composition; the exact 3v3 count is the MVP constraint, not an official deployment count. |
| Player-turn banner | Reflect the confirmed whole-squad-then-enemy turn structure without enabling turn progression. |
| Move, Shoot, Overwatch, and End Turn controls | These are the approved subset of the official action vocabulary; keep them presentation-only in milestone 1. |
| Static one-, two-, and three-AP movement cells | Preview the confirmed relationship between distance and AP cost without changing position or AP. |
| Static shot tracer and target feedback | Communicate a ranged attack between a shooter and valid target without resolving accuracy, damage, or line of sight. |
| Static directional Overwatch cone | Represent the official targeted-area reaction concept without triggering fire. |
| Player HUD health, AP, and Overwatch state | Three AP and per-operator tactical state are core readable information; milestone 1 values remain static. |
| Unit inspection without commands | Show role and weapon-range identity, but do not add loadouts, abilities, or gameplay mutation. |

### `milestone-2-gameplay`

| Approved requirement | Research mapping |
| --- | --- |
| `tactical-turn-loop`: shared 3v3 battle and three AP refresh | Directly reflects the official shared squad turn and three-AP economy, reduced to the approved fixed roster. |
| `tactical-turn-loop`: End Turn warning | Directly supported by EA's documented warning when possible AP remains. |
| `tactical-actions`: tiered movement squares | Directly expresses increasing movement cost and pre-commit destination-cost previews. |
| `tactical-actions`: Shoot as a separate action | Matches AP-funded attacks; the MVP intentionally omits abilities and utilities. |
| `tactical-actions`: short, balanced, and long weapons | Condenses official weapon classes and optimal-range roles into three original archetypes. |
| `tactical-actions`: distance-scaled hit chance and damage | Hit-chance falloff is source-supported; universal damage falloff is an explicit MVP simplification. |
| `tactical-actions`: line of sight required | Directly reflects official attack eligibility and Chance-to-Hit factors. |
| `tactical-actions`: directional, AP-funded Overwatch | Reflects the official adjustable target area, AP investment, reaction fire, and turn-ending behavior. |
| `enemy-tactical-ai`: maximize useful expected damage or defend with Overwatch | Inference from official advice to improve position when odds are poor and use Overwatch to control approach lanes. |
| `battle-results`: elimination and restart | Original MVP objective; official sources note varied mission objectives, so this is intentionally not presented as universal Zero Company behavior. |

## Condensed MVP Guidance

The approved game should teach one compact decision repeatedly: each of three
Operators has three AP, and the player may spend those points to reposition for
a better shot, fire when range and line of sight make the attack worthwhile,
or commit remaining AP to directional Overwatch before ending the shared squad
turn. Milestone 1 should show that vocabulary without changing game state.
Milestone 2 should implement only that loop, using original values and assets.
