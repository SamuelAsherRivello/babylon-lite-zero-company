import {
  ArcRotateCamera,
  Color3,
  Engine,
  Matrix,
  MeshBuilder,
  Scene,
  SceneLoader,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF/index.js";

import { createCameraController } from "./cameraController.js";
import { createPresentationDescriptors } from "./descriptors.js";
import { cellToWorld, worldToCell } from "./rules/index.js";
import {
  createCharacterTemplate,
  createLitArena,
  createPresentationMaterials,
  createProjectedHudReporter,
  createMovementPreviewController,
  createOverwatchPreviewController,
  createStaticFeedback,
  createUnitStateAnimator,
  createUnitsFromTemplate,
} from "./presentationScene.js";

function createShotParticles(scene, materials, from, to, hit) {
  const particles = [];
  const origins = [from, ...(hit ? Array.from({ length: 5 }, () => to) : [])];
  const directions = [
    new Vector3(0, 0.8, 0.45),
    new Vector3(0.7, 0.45, 0.25),
    new Vector3(-0.6, 0.55, 0.32),
    new Vector3(0.35, 0.7, -0.55),
    new Vector3(-0.28, 0.82, -0.48),
    new Vector3(0.08, 0.92, 0.62),
  ];

  for (let index = 0; index < origins.length; index += 1) {
    const particle = MeshBuilder.CreateSphere(
      `shot-particle-${index}`,
      { diameter: index === 0 ? 0.19 : 0.11, segments: 6 },
      scene,
    );
    particle.position.copyFrom(origins[index]);
    particle.material = materials.glowCyan;
    particle.isPickable = false;
    particle.metadata = { kind: "shot-particle", presentationOnly: true };
    particles.push({ mesh: particle, velocity: directions[index] });
  }

  let elapsed = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const delta = scene.getEngine().getDeltaTime() / 1000;
    elapsed += delta;
    const scale = Math.max(0.05, 1 - elapsed / 0.32);
    for (const particle of particles) {
      particle.mesh.position.addInPlace(particle.velocity.scale(delta));
      particle.mesh.scaling.setAll(scale);
    }
    if (elapsed >= 0.32) {
      scene.onBeforeRenderObservable.remove(observer);
      for (const particle of particles) {
        particle.mesh.dispose();
      }
    }
  });
}

function splitAssetUrl(url) {
  const separator = url.lastIndexOf("/");
  return {
    rootUrl: url.slice(0, separator + 1),
    fileName: url.slice(separator + 1),
  };
}

function makeCallbacks(options) {
  return {
    onLoadingChange: options.onLoadingChange ?? (() => {}),
    onError: options.onError ?? (() => {}),
    onReady: options.onReady ?? (() => {}),
    onSelectionChange: options.onSelectionChange ?? (() => {}),
    onProjectedHudPositions: options.onProjectedHudPositions,
    onCameraChange: options.onCameraChange ?? (() => {}),
    onCellSelect: options.onCellSelect ?? (() => {}),
    onWorldPick: options.onWorldPick ?? (() => {}),
  };
}

export function setArcRotateTargetPreservingOrbit(camera, target) {
  const alpha = camera.alpha;
  const beta = camera.beta;
  const radius = camera.radius;
  camera.setTarget(target);
  camera.alpha = alpha;
  camera.beta = beta;
  camera.radius = radius;
}

export function createZeroCompanyScene(canvas, options = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("createZeroCompanyScene requires an HTMLCanvasElement.");
  }

  const callbacks = makeCallbacks(options);
  const descriptors = createPresentationDescriptors(
    options.baseUrl ?? import.meta.env?.BASE_URL ?? "/",
  );
  const engine = new Engine(
    canvas,
    true,
    {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: false,
      stencil: true,
    },
    true,
  );
  const scene = new Scene(engine);
  const materials = createPresentationMaterials(scene);
  const arena = createLitArena(scene, descriptors, materials);
  const feedback = createStaticFeedback(scene, descriptors, materials);
  const movementPreview = createMovementPreviewController(scene, materials);
  const overwatchPreview = createOverwatchPreviewController(scene, materials.overwatch);
  const camera = new ArcRotateCamera(
    "tactical-camera",
    descriptors.camera.alpha,
    descriptors.camera.beta,
    descriptors.camera.radius,
    Vector3.Zero(),
    scene,
  );
  camera.lowerBetaLimit = descriptors.camera.minBeta;
  camera.upperBetaLimit = descriptors.camera.maxBeta;
  camera.lowerRadiusLimit = descriptors.camera.minRadius;
  camera.upperRadiusLimit = descriptors.camera.maxRadius;
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.fov = 0.68;

  let disposed = false;
  let ready = false;
  let inputRequested = true;
  let selectedUnitId = null;
  let units = [];
  let characterTemplate = null;
  let removeHudReporter = () => {};
  let unitStateAnimator = null;
  let latestBattleState = null;
  const unitCells = new Map();

  function getUnit(unitId) {
    return units.find((unit) => unit.descriptor.id === unitId) ?? null;
  }

  function selectUnit(unitId, { focus = true, notify = true } = {}) {
    if (!ready || disposed) {
      return false;
    }

    const unit = getUnit(unitId);
    if (!unit) {
      return false;
    }

    selectedUnitId = unitId;
    for (const candidate of units) {
      candidate.selectionRing.setEnabled(candidate.descriptor.id === unitId);
    }

    if (focus) {
      setArcRotateTargetPreservingOrbit(
        camera,
        unit.container
          .getAbsolutePosition()
          .add(new Vector3(0, descriptors.model.displayHeight * 0.52, 0)),
      );
    }

    if (notify) {
      callbacks.onSelectionChange({
        ...unit.descriptor,
        position: [...unit.descriptor.position],
      });
    }
    callbacks.onCameraChange({
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.asArray(),
    });
    return true;
  }

  const cameraController = createCameraController({
    canvas,
    scene,
    camera,
    cameraDescriptor: descriptors.camera,
    focusUnit: (unitId) => selectUnit(unitId),
    onCameraChange: callbacks.onCameraChange,
    onWorldPick: (pick) => {
      const cell = pick.pickedMesh?.metadata?.cell ?? (
        pick.pickedPoint
          ? worldToCell({ x: pick.pickedPoint.x, z: pick.pickedPoint.z })
          : null
      );
      if (cell) {
        callbacks.onWorldPick({ cell: { ...cell }, meshName: pick.pickedMesh?.name ?? null });
        callbacks.onCellSelect({ ...cell });
      }
    },
  });
  cameraController.setEnabled(false);

  function syncInputState() {
    cameraController.setEnabled(ready && inputRequested && !disposed);
  }

  function resize() {
    if (!disposed) {
      engine.resize();
    }
  }

  window.addEventListener("resize", resize);
  engine.runRenderLoop(() => {
    if (!disposed) {
      scene.render();
    }
  });

  callbacks.onLoadingChange({ status: "loading", url: descriptors.model.url });

  const { rootUrl, fileName } = splitAssetUrl(descriptors.model.url);
  const readyPromise = SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene)
    .then((importResult) => {
      if (disposed) {
        return null;
      }

      characterTemplate = createCharacterTemplate(scene, importResult);
      units = createUnitsFromTemplate({
        scene,
        descriptors,
        materials,
        shadows: arena.shadows,
        template: characterTemplate,
      });
      unitStateAnimator = createUnitStateAnimator(scene, units);
      if (latestBattleState) {
        unitStateAnimator.sync(latestBattleState);
      }
      for (const unit of units) {
        const start = unit.descriptor.position;
        unitCells.set(unit.descriptor.id, {
          column: Math.round(start[0] + 6),
          row: Math.round(start[2] + 3.5),
        });
      }
      removeHudReporter = createProjectedHudReporter({
        scene,
        engine,
        camera,
        units,
        onProjectedHudPositions: callbacks.onProjectedHudPositions,
      });

      ready = true;
      syncInputState();
      selectUnit(descriptors.feedback.selectedUnitId, { focus: false, notify: true });
      callbacks.onLoadingChange({ status: "ready", url: descriptors.model.url });
      callbacks.onReady({
        descriptors,
        scene,
        camera,
        units: units.map((unit) => ({
          id: unit.descriptor.id,
          team: unit.descriptor.team,
          node: unit.container,
        })),
      });
      return api;
    })
    .catch((error) => {
      if (disposed) {
        return null;
      }

      ready = false;
      syncInputState();
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      callbacks.onLoadingChange({
        status: "error",
        url: descriptors.model.url,
        error: normalizedError,
      });
      callbacks.onError(normalizedError);
      throw normalizedError;
    });

  // React effects may ignore this promise; attach a rejection observer so an
  // expected asset-error callback does not also become an unhandled rejection.
  readyPromise.catch(() => {});

  const api = {
    engine,
    scene,
    camera,
    descriptors,
    feedback,
    ready: readyPromise,
    get selectedUnitId() {
      return selectedUnitId;
    },
    get isReady() {
      return ready;
    },
    setInputEnabled(enabled) {
      inputRequested = Boolean(enabled);
      syncInputState();
    },
    setMovementDestinations(destinations) {
      if (!disposed) {
        movementPreview.setDestinations(destinations);
      }
    },
    setOverwatchPreview(preview) {
      if (!disposed) {
        overwatchPreview.setPreview(preview);
      }
    },
    setOverwatchPreviews(previews) {
      if (!disposed) {
        overwatchPreview.setPreviews(previews);
      }
    },
    projectCell(cell) {
      const world = cellToWorld(cell);
      const renderWidth = Math.max(engine.getRenderWidth(), 1);
      const renderHeight = Math.max(engine.getRenderHeight(), 1);
      const clientRect = engine.getRenderingCanvasClientRect();
      const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
      const projected = Vector3.Project(
        new Vector3(world.x, world.y + 0.03, world.z),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
      return {
        x: (projected.x / renderWidth) * (clientRect?.width ?? renderWidth),
        y: (projected.y / renderHeight) * (clientRect?.height ?? renderHeight),
      };
    },
    projectOverwatchTip() {
      const world = overwatchPreview.getTipWorld();
      if (!world) {
        return null;
      }
      const renderWidth = Math.max(engine.getRenderWidth(), 1);
      const renderHeight = Math.max(engine.getRenderHeight(), 1);
      const clientRect = engine.getRenderingCanvasClientRect();
      const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
      const projected = Vector3.Project(
        world,
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
      return {
        x: (projected.x / renderWidth) * (clientRect?.width ?? renderWidth),
        y: (projected.y / renderHeight) * (clientRect?.height ?? renderHeight),
      };
    },
    async animateUnitPath(unitId, path, onStep = () => {}) {
      const unit = getUnit(unitId);
      if (!unit || disposed) {
        return;
      }

      for (const cell of path) {
        if (disposed) {
          return;
        }
        const targetWorld = cellToWorld(cell);
        const from = unit.container.position.clone();
        const to = new Vector3(targetWorld.x, targetWorld.y + 0.01, targetWorld.z);
        const direction = to.subtract(from);
        if (direction.lengthSquared() > 0.0001) {
          unit.container.rotation.y = Math.atan2(direction.x, direction.z);
        }
        const duration = 180;
        let elapsed = 0;
        await new Promise((resolve) => {
          const observer = scene.onBeforeRenderObservable.add(() => {
            elapsed += engine.getDeltaTime();
            const progress = Math.min(elapsed / duration, 1);
            Vector3.LerpToRef(from, to, progress, unit.container.position);
            unit.container.position.y += Math.sin(progress * Math.PI) * 0.08;
            if (progress >= 1) {
              unit.container.position.copyFrom(to);
              unitCells.set(unitId, { ...cell });
              scene.onBeforeRenderObservable.remove(observer);
              onStep({ ...cell });
              resolve();
            }
          });
        });
      }
    },
    async playShotFeedback(shooterId, targetId, hit) {
      const shooter = getUnit(shooterId);
      const target = getUnit(targetId);
      if (!shooter || !target || disposed) {
        return;
      }
      const from = shooter.container.getAbsolutePosition().add(new Vector3(0, 1.05, 0));
      const to = target.container.getAbsolutePosition().add(new Vector3(0, 1.0, 0));
      const direction = to.subtract(from);
      if (direction.lengthSquared() > 0.0001) {
        shooter.container.rotation.y = Math.atan2(direction.x, direction.z);
      }
      const tracer = MeshBuilder.CreateLines(
        `shot-${shooterId}-${targetId}`,
        { points: [from, to] },
        scene,
      );
      tracer.color = hit ? Color3.FromHexString("#35e6f4") : Color3.FromHexString("#e8edf1");
      tracer.alpha = hit ? 1 : 0.55;
      tracer.isPickable = false;
      createShotParticles(scene, materials, from, to, hit);
      shooter.container.scaling.z = 0.9;
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      if (!disposed) {
        shooter.container.scaling.z = 1;
        tracer.dispose();
      }
    },
    async syncBattleState(state) {
      if (!ready || disposed) {
        return;
      }

      latestBattleState = state;
      unitStateAnimator?.sync(state);

      const animations = [];
      for (const stateUnit of state.units) {
        const unit = getUnit(stateUnit.id);
        const previousCell = unitCells.get(stateUnit.id);
        if (
          !unit ||
          (previousCell?.column === stateUnit.cell.column &&
            previousCell?.row === stateUnit.cell.row)
        ) {
          continue;
        }

        const targetWorld = cellToWorld(stateUnit.cell);
        const from = unit.container.position.clone();
        const to = new Vector3(targetWorld.x, targetWorld.y + 0.01, targetWorld.z);
        const duration = 260;
        let elapsed = 0;
        animations.push(new Promise((resolve) => {
          const observer = scene.onBeforeRenderObservable.add(() => {
            elapsed += engine.getDeltaTime();
            const progress = Math.min(elapsed / duration, 1);
            Vector3.LerpToRef(from, to, progress, unit.container.position);
            unit.container.position.y += Math.sin(progress * Math.PI) * 0.08;
            if (progress >= 1) {
              unit.container.position.copyFrom(to);
              scene.onBeforeRenderObservable.remove(observer);
              resolve();
            }
          });
        }));
        unitCells.set(stateUnit.id, { ...stateUnit.cell });
      }
      await Promise.all(animations);
    },
    syncUnitStates(state) {
      latestBattleState = state;
      unitStateAnimator?.sync(state);
      return unitStateAnimator?.snapshot() ?? [];
    },
    getPresentationSnapshot() {
      return {
        units: unitStateAnimator?.snapshot() ?? [],
        shotParticleCount: scene.meshes.filter(
          (mesh) => mesh.metadata?.kind === "shot-particle",
        ).length,
      };
    },
    selectUnit,
    focusWorldOrigin() {
      if (!disposed) {
        cameraController.focusWorldOrigin();
      }
    },
    resize,
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      ready = false;
      window.removeEventListener("resize", resize);
      cameraController.dispose();
      movementPreview.clear();
      overwatchPreview.clear();
      unitStateAnimator?.dispose();
      unitStateAnimator = null;
      removeHudReporter();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      units = [];
      unitCells.clear();
      characterTemplate = null;
    },
  };

  return api;
}
