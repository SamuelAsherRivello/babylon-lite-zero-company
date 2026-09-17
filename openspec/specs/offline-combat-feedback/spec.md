# Offline Combat Feedback Specification

## Purpose

Define the locally bundled visual, audio, animation, and attribution feedback
needed to make the compact battle readable and complete while offline.

## Requirements

### Requirement: Combat actions have readable visual feedback

Move SHALL animate the acting unit along its resolved path. Shoot and reaction
fire SHALL show a brief tracer plus restrained muzzle and impact particles.
Overwatch SHALL show its committed cone and remaining reaction capacity. These
effects SHALL not change the deterministic gameplay result they visualize.

#### Scenario: Shot resolves

- **WHEN** a normal or reaction shot is committed
- **THEN** tracer, muzzle, and impact feedback identifies the shooter and target
  without obscuring the health or AP update

#### Scenario: Unit moves

- **WHEN** a Move action resolves
- **THEN** the unit visibly travels to the destination before the next dependent
  action begins

### Requirement: Character states use programmatic animation

The static character model SHALL communicate Idle with subtle height and body
oscillation, Moving with center-to-center translation and walking bob,
Overwatch by facing the cone with restrained aim motion, Shooting with target
facing, recoil, and muzzle flicker, Taking Damage with shake and a brief color
flash, and Dead with a settled rotated pose. Authored skeletal animation SHALL
not be required for this change.

#### Scenario: Character changes presentation state

- **WHEN** a unit moves, shoots, enters Overwatch, takes damage, or dies
- **THEN** its transform and optional color or muzzle feedback visibly
  communicates the corresponding Status without changing gameplay state

### Requirement: The battle uses three to five local sound effects

The game SHALL use between three and five distinct, locally bundled sound
effects covering the key interaction and combat events. Every sound SHALL be
original or permissively licensed for redistribution, and the repository SHALL
record its source, creator when available, license, and local filename.

#### Scenario: Audio inventory is audited

- **WHEN** the bundled audio assets and attribution record are inspected
- **THEN** there are no fewer than three and no more than five distinct effects
  and every file has redistribution provenance

### Requirement: Gameplay remains complete without external connectivity

The built battle SHALL not fetch models, textures, fonts, audio, rules, or
telemetry from an external origin at runtime. With external network access
unavailable, all actions, enemy turns, feedback, results, and restart SHALL
remain usable.

#### Scenario: Complete battle is played offline

- **WHEN** the built application is loaded from its available local files while
  external requests are blocked
- **THEN** the user can play through a result and restart with all required
  visuals and sounds available

### Requirement: Feedback respects user and browser audio constraints

Audio SHALL begin only after a user gesture when required by the browser and
SHALL expose a persistent mute control through the existing settings area.
Missing or blocked audio playback SHALL not stop input, animation, or rules.

#### Scenario: Browser blocks initial audio

- **WHEN** the browser denies sound playback before a user gesture
- **THEN** the game remains playable and enables later sound after an eligible
  gesture without replaying stale effects
