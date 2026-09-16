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

## Audio

No audio assets are included in milestone 1.
