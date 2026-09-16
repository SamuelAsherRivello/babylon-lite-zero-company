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

const COLORS = Object.freeze({
  arena: Color3.FromHexString("#707574"),
  cover: Color3.FromHexString("#494e52"),
  player: Color3.FromHexString("#177ddc"),
  enemy: Color3.FromHexString("#d94045"),
  cyan: Color3.FromHexString("#35e6f4"),
  yellow: Color3.FromHexString("#ffd43b"),
  selection: Color3.FromHexString("#49f2ff"),
});

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
  arena.isPickable = false;
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
    shot: createShotFeedback(scene, descriptors, materials.glowCyan),
    overwatchCone: createOverwatchCone(scene, descriptors, materials.overwatch),
  };
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

    for (const mesh of meshes) {
      mesh.material = descriptor.team === "player" ? materials.player : materials.enemy;
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

    return { descriptor, container, model, meshes, selectionRing, hudAnchor };
  });
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
