import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import {
  cellToWorld,
  getOverwatchHalfAngle,
  OVERWATCH_PROFILE,
} from "./rules/index.js";

const COLORS = Object.freeze({
  arena: Color3.FromHexString("#707574"),
  cover: Color3.FromHexString("#494e52"),
  player: Color3.FromHexString("#177ddc"),
  enemy: Color3.FromHexString("#d94045"),
  cyan: Color3.FromHexString("#35e6f4"),
  yellow: Color3.FromHexString("#ffd43b"),
  selection: Color3.FromHexString("#49f2ff"),
  moveTwo: Color3.FromHexString("#69d391"),
  moveThree: Color3.FromHexString("#ffd43b"),
});

const STANDARD_PRESENTATION_TIMINGS = Object.freeze({
  moveStepMs: 180,
  shotMs: 420,
  damageMs: 260,
  deadSettleMs: 260,
});

const REDUCED_PRESENTATION_TIMINGS = Object.freeze({
  moveStepMs: 45,
  shotMs: 90,
  damageMs: 70,
  deadSettleMs: 1,
});

export function getPresentationTimings(reducedMotion = false) {
  return reducedMotion
    ? REDUCED_PRESENTATION_TIMINGS
    : STANDARD_PRESENTATION_TIMINGS;
}

export function resolvePresentationStatus(unit) {
  if (unit.health <= 0) {
    return "dead";
  }
  if (unit.activity === "taking-damage") {
    return "taking-damage";
  }
  if (unit.activity === "moving") {
    return "moving";
  }
  if (unit.activity === "shooting") {
    return "shooting";
  }
  if (unit.overwatch) {
    return "overwatch";
  }
  return "idle";
}

export function createShotFeedbackTimeline(hit) {
  return [
    "shot-facing",
    "muzzle-flash",
    "tracer-visible",
    hit ? "impact-visible" : "miss-visible",
    "shot-complete",
  ];
}

export function createPresentationQueue({ onFailure = () => {} } = {}) {
  let tail = Promise.resolve();

  return {
    enqueue(label, operation) {
      const result = tail.then(async () => {
        try {
          await operation();
          return true;
        } catch (error) {
          try {
            onFailure(label, error);
          } catch {
            // Presentation diagnostics must never interrupt gameplay fallback.
          }
          return false;
        }
      });
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}

export function createPresentationFailureGate(nextFailure = null) {
  let pending = nextFailure === "move" || nextFailure === "shot"
    ? nextFailure
    : null;

  return {
    consume(kind) {
      if (pending !== kind) {
        return false;
      }
      pending = null;
      return true;
    },
    get pending() {
      return pending;
    },
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(value, 1));
}

export function sampleUnitPresentationPose({
  status,
  coverDefense = false,
  elapsed,
  stateElapsed = elapsed,
  phaseOffset = 0,
  reducedMotion = false,
}) {
  const timings = getPresentationTimings(reducedMotion);
  const phase = elapsed * 2.2 + phaseOffset;
  const pose = {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleY: 1,
    emissive: { r: 0, g: 0, b: 0 },
  };

  if (status === "dead") {
    const progress = reducedMotion
      ? 1
      : clamp01((stateElapsed * 1000) / timings.deadSettleMs);
    const eased = 1 - ((1 - progress) ** 3);
    pose.rotationZ = progress >= 1 ? -1.42 : -1.42 * eased;
    pose.positionY = 0.04 * eased;
    pose.scaleY = 1 - 0.04 * eased;
    return pose;
  }

  if (status === "taking-damage") {
    const flash = 1 - clamp01((stateElapsed * 1000) / timings.damageMs);
    if (!reducedMotion) {
      pose.positionX = Math.sin(elapsed * 68) * 0.055 * flash;
      pose.rotationZ = Math.sin(elapsed * 52) * 0.08 * flash;
    }
    pose.emissive = { r: 0.9 * flash, g: 0.12 * flash, b: 0.08 * flash };
    return pose;
  }

  if (status === "moving") {
    if (!reducedMotion) {
      pose.positionY = Math.abs(Math.sin(elapsed * 13)) * 0.09;
      pose.rotationZ = Math.sin(elapsed * 13) * 0.035;
    }
    return pose;
  }

  if (status === "shooting") {
    const progress = clamp01((stateElapsed * 1000) / timings.shotMs);
    const recoil = Math.sin(progress * Math.PI);
    pose.positionZ = -(0.03 + recoil * (reducedMotion ? 0.025 : 0.075));
    pose.rotationX = -0.045 * (reducedMotion ? 0.55 : 1);
    pose.emissive = {
      r: 0.12 * recoil,
      g: 0.18 * recoil,
      b: 0.2 * recoil,
    };
    return pose;
  }

  if (status === "overwatch") {
    if (coverDefense) {
      pose.positionY = -0.14;
      pose.scaleY = 0.86;
      pose.rotationX = 0.05;
    }
    if (!reducedMotion) {
      pose.positionY += Math.sin(phase * 1.4) * 0.018;
      pose.rotationY = Math.sin(phase * 1.8) * 0.025;
    }
    return pose;
  }

  if (coverDefense) {
    pose.positionY = -0.14;
    pose.scaleY = 0.86;
    pose.rotationX = 0.05;
  }
  if (!reducedMotion) {
    pose.positionY += Math.sin(phase) * 0.025;
    pose.rotationZ = Math.sin(phase * 0.7) * 0.009;
  }
  return pose;
}

function createStandardMaterial(scene, name, color, options = {}) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = options.specularColor ?? new Color3(0.14, 0.14, 0.14);
  material.emissiveColor = options.emissiveColor ?? Color3.Black();
  material.alpha = options.alpha ?? 1;
  material.disableLighting = options.disableLighting ?? false;
  material.backFaceCulling = options.backFaceCulling ?? true;
  return material;
}

export function createPresentationMaterials(scene) {
  return {
    arena: createStandardMaterial(scene, "material-arena", COLORS.arena),
    cover: createStandardMaterial(scene, "material-cover", COLORS.cover),
    player: createStandardMaterial(scene, "material-team-player", COLORS.player, {
      specularColor: new Color3(0.25, 0.32, 0.38),
    }),
    enemy: createStandardMaterial(scene, "material-team-enemy", COLORS.enemy, {
      specularColor: new Color3(0.38, 0.22, 0.22),
    }),
    movement: createStandardMaterial(scene, "material-movement-preview", COLORS.cyan, {
      alpha: 0.3,
      emissiveColor: COLORS.cyan.scale(0.48),
      disableLighting: true,
      backFaceCulling: false,
    }),
    movementTwo: createStandardMaterial(scene, "material-movement-preview-two", COLORS.moveTwo, {
      alpha: 0.34,
      emissiveColor: COLORS.moveTwo.scale(0.45),
      disableLighting: true,
      backFaceCulling: false,
    }),
    movementThree: createStandardMaterial(scene, "material-movement-preview-three", COLORS.moveThree, {
      alpha: 0.32,
      emissiveColor: COLORS.moveThree.scale(0.42),
      disableLighting: true,
      backFaceCulling: false,
    }),
    selection: createStandardMaterial(scene, "material-selection", COLORS.selection, {
      emissiveColor: COLORS.selection.scale(0.8),
      disableLighting: true,
    }),
    overwatch: createStandardMaterial(scene, "material-overwatch", COLORS.yellow, {
      alpha: 0.26,
      emissiveColor: COLORS.yellow.scale(0.42),
      disableLighting: true,
      backFaceCulling: false,
    }),
    glowCyan: createStandardMaterial(scene, "material-shot-feedback", COLORS.cyan, {
      emissiveColor: COLORS.cyan,
      disableLighting: true,
    }),
  };
}

export function createLitArena(scene, descriptors, materials) {
  scene.clearColor = new Color4(0.13, 0.15, 0.18, 1);
  scene.ambientColor = new Color3(0.2, 0.22, 0.25);

  const ambient = new HemisphericLight(
    "light-ambient",
    new Vector3(0.25, 1, -0.2),
    scene,
  );
  ambient.intensity = 0.48;
  ambient.groundColor = new Color3(0.13, 0.15, 0.18);

  const key = new DirectionalLight(
    "light-key",
    new Vector3(-0.55, -1, 0.5),
    scene,
  );
  key.position = new Vector3(7, 11, -8);
  key.intensity = 0.95;

  const shadows = new ShadowGenerator(1024, key);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.0008;

  const arena = MeshBuilder.CreateBox(
    "arena-platform",
    {
      width: descriptors.arena.width,
      height: descriptors.arena.height,
      depth: descriptors.arena.depth,
    },
    scene,
  );
  arena.position.y = 0;
  arena.material = materials.arena;
  arena.receiveShadows = true;
  arena.isPickable = true;
  arena.metadata = { kind: "arena" };

  const covers = descriptors.covers.map((descriptor) => {
    const [width, height, depth] = descriptor.size;
    const cover = MeshBuilder.CreateBox(
      descriptor.id,
      { width, height, depth },
      scene,
    );
    cover.position = Vector3.FromArray(descriptor.position);
    cover.material = materials.cover;
    cover.receiveShadows = true;
    cover.isPickable = false;
    cover.metadata = { kind: "cover", coverId: descriptor.id };
    shadows.addShadowCaster(cover);
    return cover;
  });

  return { ambient, key, shadows, arena, covers };
}

function createMovementCells(scene, descriptors, material) {
  return descriptors.feedback.movementCells.map((position, index) => {
    const cell = MeshBuilder.CreateGround(
      `movement-cell-${index + 1}`,
      { width: 1.05, height: 1.05 },
      scene,
    );
    cell.position = Vector3.FromArray(position);
    cell.material = material;
    cell.isPickable = false;
    cell.enableEdgesRendering();
    cell.edgesColor = new Color4(COLORS.cyan.r, COLORS.cyan.g, COLORS.cyan.b, 0.95);
    cell.edgesWidth = 2;
    cell.metadata = { kind: "movement-preview", presentationOnly: true };
    return cell;
  });
}

function createShotFeedback(scene, descriptors, material) {
  const from = Vector3.FromArray(descriptors.feedback.shot.from);
  const to = Vector3.FromArray(descriptors.feedback.shot.to);
  const tracer = MeshBuilder.CreateLines(
    "shot-tracer",
    { points: [from, to], updatable: false },
    scene,
  );
  tracer.color = COLORS.cyan;
  tracer.alpha = 0.98;
  tracer.isPickable = false;
  tracer.metadata = { kind: "shot-preview", presentationOnly: true };

  const muzzle = MeshBuilder.CreateSphere(
    "shot-muzzle",
    { diameter: 0.2, segments: 12 },
    scene,
  );
  muzzle.position = from;
  muzzle.material = material;
  muzzle.isPickable = false;

  const impact = MeshBuilder.CreateSphere(
    "shot-impact",
    { diameter: 0.28, segments: 12 },
    scene,
  );
  impact.position = to;
  impact.material = material;
  impact.isPickable = false;

  return { tracer, muzzle, impact };
}

function createOverwatchCone(scene, descriptors, material) {
  const { origin, direction, range, halfAngle } = descriptors.feedback.overwatch;
  const directionAngle = Math.atan2(direction[0], direction[2]);
  const positions = [0, 0, 0];
  const indices = [];
  const segments = 28;

  for (let index = 0; index <= segments; index += 1) {
    const angle = -halfAngle + (index / segments) * halfAngle * 2;
    positions.push(Math.sin(angle) * range, 0, Math.cos(angle) * range);
    if (index > 0) {
      indices.push(0, index, index + 1);
    }
  }

  const cone = new Mesh("overwatch-cone", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = [];
  VertexData.ComputeNormals(positions, indices, vertexData.normals);
  vertexData.applyToMesh(cone);
  cone.position = Vector3.FromArray(origin);
  cone.rotation.y = directionAngle;
  cone.material = material;
  cone.isPickable = false;
  cone.enableEdgesRendering();
  cone.edgesColor = new Color4(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b, 0.9);
  cone.edgesWidth = 2;
  cone.metadata = { kind: "overwatch-preview", presentationOnly: true };
  return cone;
}

export function createStaticFeedback(scene, descriptors, materials) {
  return {
    movementCells: createMovementCells(scene, descriptors, materials.movement),
    shot: descriptors.feedback.shot
      ? createShotFeedback(scene, descriptors, materials.glowCyan)
      : null,
    overwatchCone: descriptors.feedback.overwatch
      ? createOverwatchCone(scene, descriptors, materials.overwatch)
      : null,
  };
}

export function createMovementPreviewController(scene, materials) {
  let meshes = [];

  function clear() {
    for (const mesh of meshes) {
      mesh.dispose();
    }
    meshes = [];
  }

  function setDestinations(destinations) {
    clear();
    meshes = destinations.map((destination) => {
      const world = cellToWorld(destination.cell);
      const mesh = MeshBuilder.CreateGround(
        `move-destination-${destination.cell.column}-${destination.cell.row}`,
        { width: 0.92, height: 0.92 },
        scene,
      );
      mesh.position = new Vector3(world.x, world.y + 0.018, world.z);
      mesh.material = destination.minimumActionPoints === 1
        ? materials.movement
        : destination.minimumActionPoints === 2
          ? materials.movementTwo
          : materials.movementThree;
      mesh.isPickable = true;
      mesh.enableEdgesRendering();
      mesh.edgesColor = new Color4(1, 1, 1, 0.72);
      mesh.edgesWidth = 1.5;
      mesh.metadata = {
        kind: "move-destination",
        cell: { ...destination.cell },
        minimumActionPoints: destination.minimumActionPoints,
      };
      return mesh;
    });
  }

  return { clear, setDestinations };
}

export function createOverwatchPreviewController(scene, material) {
  let cones = [];

  function clear() {
    for (const cone of cones) {
      cone.dispose();
    }
    cones = [];
  }

  function setPreviews(previews) {
    clear();
    for (const preview of previews) {
      if (!preview?.targetCell) {
        continue;
      }
      const origin = cellToWorld(preview.originCell);
      const target = cellToWorld(preview.targetCell);
      const length = Math.hypot(target.x - origin.x, target.z - origin.z) || 1;
      cones.push(createOverwatchCone(
        scene,
        {
          feedback: {
            overwatch: {
              origin: [origin.x, origin.y + 0.02, origin.z],
              direction: [(target.x - origin.x) / length, 0, (target.z - origin.z) / length],
              range: preview.range ?? OVERWATCH_PROFILE.range,
              halfAngle: preview.halfAngle ?? getOverwatchHalfAngle(1),
            },
          },
        },
        material,
      ));
    }
  }

  function setPreview(preview) {
    setPreviews(preview ? [preview] : []);
  }

  function getTipWorld() {
    const cone = cones[0];
    if (!cone) {
      return null;
    }
    cone.computeWorldMatrix(true);
    return Vector3.TransformCoordinates(
      new Vector3(0, 0, OVERWATCH_PROFILE.range),
      cone.getWorldMatrix(),
    );
  }

  return { clear, getTipWorld, setPreview, setPreviews };
}

export function getEnemyIntentPreviewSummary(intent) {
  if (!intent) {
    return { kind: "none", count: 0 };
  }
  if (intent.action === "move") {
    return {
      kind: "move",
      count: (intent.path?.length ?? 0) + (intent.destination ? 1 : 0),
    };
  }
  if (intent.action === "shoot") {
    return {
      kind: "shoot",
      count: intent.originCell && intent.targetCell ? 1 : 0,
    };
  }
  if (intent.action === "overwatch") {
    return {
      kind: "overwatch",
      count: intent.originCell && intent.targetCell ? 1 : 0,
    };
  }
  return { kind: intent.action, count: 0 };
}

export function createEnemyIntentPreviewController(scene, materials) {
  let meshes = [];

  function clear() {
    for (const mesh of meshes) {
      mesh.dispose();
    }
    meshes = [];
  }

  function addMoveCell(cell, index, isDestination = false) {
    const world = cellToWorld(cell);
    const mesh = MeshBuilder.CreateGround(
      `enemy-intent-move-${index}-${cell.column}-${cell.row}`,
      { width: isDestination ? 0.86 : 0.64, height: isDestination ? 0.86 : 0.64 },
      scene,
    );
    mesh.position = new Vector3(world.x, world.y + 0.026, world.z);
    mesh.material = isDestination ? materials.enemy : materials.movement;
    mesh.isPickable = false;
    mesh.enableEdgesRendering();
    mesh.edgesColor = new Color4(COLORS.enemy.r, COLORS.enemy.g, COLORS.enemy.b, 0.86);
    mesh.edgesWidth = isDestination ? 2 : 1.25;
    mesh.metadata = {
      kind: isDestination ? "enemy-intent-destination" : "enemy-intent-path",
      presentationOnly: true,
      cell: { ...cell },
    };
    meshes.push(mesh);
  }

  function addShotLine(intent) {
    const origin = cellToWorld(intent.originCell);
    const target = cellToWorld(intent.targetCell);
    const line = MeshBuilder.CreateLines(
      `enemy-intent-shot-${intent.unitId}-${intent.targetId}`,
      {
        points: [
          new Vector3(origin.x, origin.y + 0.42, origin.z),
          new Vector3(target.x, target.y + 0.42, target.z),
        ],
      },
      scene,
    );
    line.color = COLORS.enemy;
    line.alpha = 0.88;
    line.isPickable = false;
    line.metadata = {
      kind: "enemy-intent-shot",
      presentationOnly: true,
      unitId: intent.unitId,
      targetId: intent.targetId,
    };
    meshes.push(line);
  }

  function addOverwatchCone(intent) {
    const origin = cellToWorld(intent.originCell);
    const target = cellToWorld(intent.targetCell);
    const length = Math.hypot(target.x - origin.x, target.z - origin.z) || 1;
    const cone = createOverwatchCone(
      scene,
      {
        feedback: {
          overwatch: {
            origin: [origin.x, origin.y + 0.035, origin.z],
            direction: [(target.x - origin.x) / length, 0, (target.z - origin.z) / length],
            range: intent.range ?? OVERWATCH_PROFILE.range,
            halfAngle: intent.halfAngle ?? getOverwatchHalfAngle(1),
          },
        },
      },
      materials.overwatch,
    );
    cone.name = `enemy-intent-overwatch-${intent.unitId}`;
    cone.metadata = {
      kind: "enemy-intent-overwatch",
      presentationOnly: true,
      unitId: intent.unitId,
    };
    meshes.push(cone);
  }

  function setIntent(intent) {
    clear();
    if (!intent) {
      return getEnemyIntentPreviewSummary(intent);
    }

    if (intent.action === "move") {
      for (const [index, cell] of (intent.path ?? []).entries()) {
        addMoveCell(cell, index);
      }
      if (intent.destination) {
        addMoveCell(intent.destination, intent.path?.length ?? 0, true);
      }
    } else if (intent.action === "shoot" && intent.originCell && intent.targetCell) {
      addShotLine(intent);
    } else if (intent.action === "overwatch" && intent.originCell && intent.targetCell) {
      addOverwatchCone(intent);
    }

    return getEnemyIntentPreviewSummary(intent);
  }

  function getSnapshot() {
    return {
      meshes: meshes.map((mesh) => ({
        name: mesh.name,
        pickable: mesh.isPickable,
        kind: mesh.metadata?.kind ?? null,
      })),
    };
  }

  return { clear, getSnapshot, setIntent };
}

function getHierarchyBounds(meshes) {
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    minimumY = Math.min(minimumY, bounds.minimumWorld.y);
    maximumY = Math.max(maximumY, bounds.maximumWorld.y);
  }

  return { minimumY, maximumY };
}

function replaceInstancesWithConcreteMeshes(model, unitId) {
  const instances = model
    .getChildMeshes(false)
    .filter((mesh) => mesh.getClassName() === "InstancedMesh");

  for (const instance of instances) {
    const concrete = instance.sourceMesh.clone(
      `${unitId}-${instance.name || instance.id}-mesh`,
      instance.parent,
      true,
    );
    if (!concrete) {
      throw new Error(`Unable to create a concrete mesh for ${instance.name || instance.id}.`);
    }

    concrete.position.copyFrom(instance.position);
    concrete.scaling.copyFrom(instance.scaling);
    if (instance.rotationQuaternion) {
      concrete.rotationQuaternion = instance.rotationQuaternion.clone();
    } else {
      concrete.rotation.copyFrom(instance.rotation);
    }
    concrete.visibility = instance.visibility;
    concrete.isVisible = instance.isVisible;
    concrete.setEnabled(instance.isEnabled());

    for (const child of instance.getChildren()) {
      child.parent = concrete;
    }
    instance.dispose(true, false);
  }
}

function tagUnitHierarchy(root, descriptor) {
  for (const node of [root, ...root.getDescendants(false)]) {
    node.metadata = {
      ...(node.metadata ?? {}),
      kind: "unit",
      unitId: descriptor.id,
      team: descriptor.team,
      presentationOnly: true,
    };

    if (node instanceof Mesh || "isPickable" in node) {
      node.isPickable = true;
    }
  }
}

function createSelectionRing(scene, descriptor, material) {
  const ring = MeshBuilder.CreateTorus(
    `selection-ring-${descriptor.id}`,
    { diameter: 1.15, thickness: 0.075, tessellation: 48 },
    scene,
  );
  ring.position = new Vector3(0, 0.035, 0);
  ring.material = material;
  ring.isPickable = false;
  ring.setEnabled(false);
  ring.metadata = {
    kind: "selection-ring",
    unitId: descriptor.id,
    presentationOnly: true,
  };
  return ring;
}

export function createCharacterTemplate(scene, importResult) {
  for (const animationGroup of importResult.animationGroups ?? []) {
    animationGroup.stop();
  }

  const template = new TransformNode("character-template", scene);
  const importedNodes = [
    ...(importResult.transformNodes ?? []),
    ...(importResult.meshes ?? []),
  ];
  const uniqueNodes = [...new Set(importedNodes)];
  const importedNodeSet = new Set(uniqueNodes);
  const roots = uniqueNodes.filter(
    (node) => !node.parent || !importedNodeSet.has(node.parent),
  );

  if (roots.length === 0 || (importResult.meshes?.length ?? 0) === 0) {
    template.dispose();
    throw new Error("The character GLB did not contain a renderable mesh hierarchy.");
  }

  for (const root of roots) {
    root.parent = template;
  }
  template.setEnabled(false);
  return template;
}

export function createUnitsFromTemplate({
  scene,
  descriptors,
  materials,
  shadows,
  template,
}) {
  return descriptors.units.map((descriptor) => {
    const container = new TransformNode(`unit-${descriptor.id}`, scene);
    container.position = Vector3.FromArray(descriptor.position);
    container.rotation.y = descriptor.rotationY;
    container.metadata = {
      kind: "unit",
      unitId: descriptor.id,
      team: descriptor.team,
      presentationOnly: true,
    };

    const model = template.instantiateHierarchy(
      container,
      { doNotInstantiate: true },
      (source, clone) => {
        clone.name =
          source === template
            ? `model-${descriptor.id}`
            : `${descriptor.id}-${source.name || source.id}`;
      },
    );
    if (!model) {
      container.dispose();
      throw new Error(`Unable to clone the character model for ${descriptor.id}.`);
    }
    model.setEnabled(true);
    if (model.rotationQuaternion) {
      model.rotationQuaternion.toEulerAnglesToRef(model.rotation);
      model.rotationQuaternion = null;
    }
    replaceInstancesWithConcreteMeshes(model, descriptor.id);

    const meshes = model.getChildMeshes(false);
    if (meshes.length === 0) {
      container.dispose();
      throw new Error(`Character clone ${descriptor.id} has no renderable meshes.`);
    }

    let bounds = getHierarchyBounds(meshes);
    const sourceHeight = Math.max(bounds.maximumY - bounds.minimumY, 0.001);
    model.scaling.scaleInPlace(descriptors.model.displayHeight / sourceHeight);
    bounds = getHierarchyBounds(meshes);
    model.position.y += descriptors.arena.topY - bounds.minimumY;

    if (meshes.some((mesh) => mesh.getClassName() === "InstancedMesh")) {
      container.dispose();
      throw new Error(`Character clone ${descriptor.id} still contains instanced meshes.`);
    }

    const unitMaterial = (
      descriptor.team === "player" ? materials.player : materials.enemy
    ).clone(`material-unit-${descriptor.id}`);
    for (const mesh of meshes) {
      mesh.material = unitMaterial;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
    }
    tagUnitHierarchy(container, descriptor);

    const selectionRing = createSelectionRing(scene, descriptor, materials.selection);
    selectionRing.parent = container;

    const hudAnchor = new TransformNode(`hud-anchor-${descriptor.id}`, scene);
    hudAnchor.parent = container;
    hudAnchor.position = new Vector3(0, descriptors.model.displayHeight + 0.34, 0);
    hudAnchor.metadata = { kind: "hud-anchor", unitId: descriptor.id };

    return {
      descriptor,
      container,
      model,
      meshes,
      selectionRing,
      hudAnchor,
      material: unitMaterial,
      baseModelPosition: model.position.clone(),
      baseModelRotation: model.rotation.clone(),
      baseModelScaling: model.scaling.clone(),
    };
  });
}

export function createUnitStateAnimator(scene, units, { reducedMotion = false } = {}) {
  const states = new Map(
    units.map((unit) => [unit.descriptor.id, {
      status: "idle",
      overwatch: null,
      coverDefense: false,
      enteredAt: 0,
      transient: null,
    }]),
  );
  let elapsed = 0;

  const observer = scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime() / 1000;
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      const state = states.get(unit.descriptor.id);
      const activeState = state.transient ?? state;
      const pose = sampleUnitPresentationPose({
        status: activeState.status,
        coverDefense: state.coverDefense,
        elapsed,
        stateElapsed: Math.max(0, elapsed - activeState.enteredAt),
        phaseOffset: index * 0.72,
        reducedMotion,
      });
      unit.model.position.copyFrom(unit.baseModelPosition);
      unit.model.rotation.copyFrom(unit.baseModelRotation);
      unit.model.scaling.copyFrom(unit.baseModelScaling);
      unit.model.position.x += pose.positionX;
      unit.model.position.y += pose.positionY;
      unit.model.position.z += pose.positionZ;
      unit.model.rotation.x += pose.rotationX;
      unit.model.rotation.y += pose.rotationY;
      unit.model.rotation.z += pose.rotationZ;
      unit.model.scaling.y *= pose.scaleY;
      unit.material.emissiveColor.copyFromFloats(
        pose.emissive.r,
        pose.emissive.g,
        pose.emissive.b,
      );
    }
  });

  return {
    sync(battleState) {
      for (const stateUnit of battleState.units) {
        const unit = units.find((candidate) => candidate.descriptor.id === stateUnit.id);
        if (!unit) {
          continue;
        }
        const previous = states.get(stateUnit.id);
        const status = resolvePresentationStatus(stateUnit);
        states.set(stateUnit.id, {
          status,
          overwatch: stateUnit.overwatch,
          coverDefense: Boolean(stateUnit.coverDefense),
          enteredAt: previous?.status === status ? previous.enteredAt : elapsed,
          transient: status === "dead" ? null : previous?.transient ?? null,
        });
        if (stateUnit.overwatch?.direction) {
          unit.container.rotation.y = Math.atan2(
            stateUnit.overwatch.direction.column,
            stateUnit.overwatch.direction.row,
          );
        }
      }
    },
    setTransientStatus(unitId, status) {
      const state = states.get(unitId);
      if (!state || state.status === "dead") {
        return undefined;
      }
      const previous = state.transient;
      state.transient = { status, enteredAt: elapsed };
      return previous;
    },
    restoreTransientStatus(unitId, transient) {
      const state = states.get(unitId);
      if (state && state.status !== "dead") {
        state.transient = transient ?? null;
      }
    },
    clearTransientStatus(unitId) {
      const state = states.get(unitId);
      if (state) {
        state.transient = null;
      }
    },
    snapshot() {
      return units.map((unit) => ({
        id: unit.descriptor.id,
        status: (
          states.get(unit.descriptor.id)?.transient?.status ??
          states.get(unit.descriptor.id)?.status ??
          "idle"
        ),
        modelPosition: unit.model.position.asArray(),
        modelRotation: unit.model.rotation.asArray(),
        modelScaling: unit.model.scaling.asArray(),
      }));
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
    },
  };
}

export function createProjectedHudReporter({
  scene,
  engine,
  camera,
  units,
  onProjectedHudPositions,
}) {
  if (typeof onProjectedHudPositions !== "function") {
    return () => {};
  }

  const observer = scene.onAfterRenderObservable.add(() => {
    const renderWidth = Math.max(engine.getRenderWidth(), 1);
    const renderHeight = Math.max(engine.getRenderHeight(), 1);
    const clientWidth = Math.max(engine.getRenderingCanvasClientRect()?.width ?? renderWidth, 1);
    const clientHeight = Math.max(engine.getRenderingCanvasClientRect()?.height ?? renderHeight, 1);
    const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);

    const positions = units.map((unit) => {
      const worldPosition = unit.hudAnchor.getAbsolutePosition();
      const projected = Vector3.Project(
        worldPosition,
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
      const x = Math.round((projected.x / renderWidth) * clientWidth);
      const y = Math.round((projected.y / renderHeight) * clientHeight);
      const visible =
        projected.z >= 0 &&
        projected.z <= 1 &&
        x >= 0 &&
        x <= clientWidth &&
        y >= 0 &&
        y <= clientHeight;

      return {
        id: unit.descriptor.id,
        team: unit.descriptor.team,
        label: unit.descriptor.label,
        weapon: unit.descriptor.weapon,
        health: unit.descriptor.health,
        actionPoints: unit.descriptor.actionPoints,
        overwatch: unit.descriptor.overwatch,
        x,
        y,
        visible,
      };
    });

    onProjectedHudPositions(positions);
  });

  return () => scene.onAfterRenderObservable.remove(observer);
}
