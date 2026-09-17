# Asset Provenance

## Milestone 1 Character Model

| Field | Value |
| --- | --- |
| Asset | Original low-poly greybox field operative |
| Creator | OpenAI Codex, Agent 2, created at the project owner's direction |
| Source URL | Not applicable; this asset was created locally for this repository and was not downloaded |
| License | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| Access/creation date | 2026-09-16 |
| Canonical local path | `zero-company/public/assets/models/character.glb` |
| Required textures | None; geometry, normals, materials, and buffers are embedded in the GLB |

### Description

`character.glb` is an original, deliberately generic humanoid assembled from
low-poly box geometry. It contains a head, visor, torso armor, arms, legs,
boots, backpack, and an abstract non-branded equipment silhouette. The neutral
body material is named `TintableBody` so application code can replace or tint
it for the approved blue and red team clones. Dark detail and equipment
materials are also embedded.

The model contains no STAR WARS or Zero Company names, logos, characters,
uniforms, weapons, textures, maps, or extracted proprietary material. It was
created from numeric primitive geometry and basic PBR material values without
using a third-party model, image, or texture as input.

### Modifications

There is no upstream asset to modify. The project-authored model was:

- proportioned into a simple standing humanoid suitable for an elevated
  tactical camera;
- given a generic visor, backpack, armor blocks, and equipment silhouette to
  remain readable at small scale;
- organized as named model-part nodes sharing one embedded cube geometry;
- assigned three embedded materials, including one explicitly tintable body
  material; and
- packaged as a single glTF 2.0 binary with no external file references.

### Redistribution Rationale

The geometry and material definitions were created specifically for this
repository and contain no imported third-party content. The asset is dedicated
to CC0 1.0 so it can be copied, recolored, instanced, modified, built into the
application, and redistributed with the public repository and release files.
No attribution is legally required under CC0, but this record is retained for
auditability.

## Verification

Verification performed on 2026-09-16:

| Check | Result |
| --- | --- |
| File is nonempty | PASS: 3,948 bytes |
| Container signature | PASS: glTF binary (`glTF`) |
| GLB version | PASS: 2 |
| Declared file and chunk lengths | PASS |
| Scene inventory | PASS: 1 scene, 19 nodes, 3 meshes, 3 materials |
| Geometry inventory | PASS: 3 accessors backed by one embedded binary buffer |
| External buffer URIs | PASS: none |
| External image or texture URIs | PASS: none |
| Required sibling files | PASS: none |
| SHA-256 | `8e4742726a493e9c8886c2ec6f3838e3621054813894eef4e1864f9672c0b1e4` |

The model is therefore self-contained at runtime and can be served entirely
from the repository's local `public/assets/` tree.

## Milestone 2 Audio

No audio assets were included in milestone 1. Milestone 2 adds exactly four
original sound effects for the compact battle. All four were generated locally
on 2026-09-16 from mathematical waveforms and deterministically seeded noise;
no recorded, sampled, downloaded, or proprietary source material was used.

| Purpose | Local filename | Creator, source, or generation method | License | Modification |
| --- | --- | --- | --- | --- |
| Movement step | `zero-company/public/assets/audio/step.wav` | OpenAI Codex, Agent 2; original local synthesis using a decaying low-frequency thump and filtered deterministically seeded noise; no external source URL | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | Rendered directly as mono 44.1 kHz, 16-bit PCM WAV; no post-generation modification |
| Gunshot | `zero-company/public/assets/audio/shot.wav` | OpenAI Codex, Agent 2; original local synthesis using a descending oscillator sweep, seeded noise transient, and low-frequency body; no external source URL | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | Rendered directly as mono 44.1 kHz, 16-bit PCM WAV; no post-generation modification |
| Impact or damage | `zero-company/public/assets/audio/impact.wav` | OpenAI Codex, Agent 2; original local synthesis using two decaying resonances and a filtered seeded-noise impact transient; no external source URL | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | Rendered directly as mono 44.1 kHz, 16-bit PCM WAV; no post-generation modification |
| Overwatch confirmation | `zero-company/public/assets/audio/overwatch.wav` | OpenAI Codex, Agent 2; original local synthesis using paired 620 Hz and 930 Hz harmonic confirmation pulses; no external source URL | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | Rendered directly as mono 44.1 kHz, 16-bit PCM WAV; no post-generation modification |

### Audio License And Redistribution Basis

The four sound effects are original project output made solely from generated
sample values. They contain no third-party recordings, samples, franchise
audio, speech, music, or trademarked sonic material. They are dedicated to
CC0 1.0 so they may be bundled, copied, modified, and redistributed with the
public repository and release builds. No runtime network request or sibling
audio dependency is required.

### Audio Verification

`ffprobe` parsed each file as a WAV containing one `pcm_s16le` stream at
44,100 Hz, mono, 16 bits per sample.

| Local filename | Duration | Size | SHA-256 |
| --- | ---: | ---: | --- |
| `step.wav` | 0.160 s | 14,156 bytes | `8a90603d58d5979a5ed9945ba22b5c39948f645e388633e780ef6ffa64c383b1` |
| `shot.wav` | 0.280 s | 24,740 bytes | `4995303f0fbcca210d5ad6c231464ab43760a5be2650d08243153cf5c006492f` |
| `impact.wav` | 0.240 s | 21,212 bytes | `fcfde5f3a25869c3040b280cdbc3714be0978d4b487de5ce1cf13dcfeb0fd323` |
| `overwatch.wav` | 0.380 s | 33,560 bytes | `9f88b863949783ee1ec6ebeaa220ff6936c1aef45125e712684dd1c1c1b9304e` |

Audio asset count: **4**.
