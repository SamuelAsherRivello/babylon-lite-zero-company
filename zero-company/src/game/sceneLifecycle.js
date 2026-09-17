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
  createEnemyIntentPreviewController,
  createLitArena,
  createPresentationMaterials,
  createProjectedHudReporter,
  createMovementPreviewController,
  createOverwatchPreviewController,
  createPresentationFailureGate,
  createPresentationQueue,
  createStaticFeedback,
  createUnitStateAnimator,
  createUnitsFromTemplate,
  getPresentationTimings,
} from "./presentationScene.js";

function runTimedPresentation(scene, durationMs, update) {
  if (durationMs <= 1) {
    try {
      update(1);
    } catch {
      // A failed visual update still completes its gameplay presentation gate.
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let elapsed = 0;
    let observer = null;
    let complete = false;
    const finish = () => {
      if (complete) {
        return;
      }
      complete = true;
      if (observer) {
        scene.onBeforeRenderObservable.remove(observer);
      }
      globalThis.clearTimeout(fallback);
      try {
        update(1);
      } catch {
        // The result is already determined by rules; presentation can fall back.
      }
      resolve();
    };
    const fallback = globalThis.setTimeout(finish, durationMs + 100);

    observer = scene.onBeforeRenderObservable.add(() => {
      try {
        elapsed += Math.max(scene.getEngine().getDeltaTime(), 0);
        const progress = Math.min(elapsed / durationMs, 1);
        update(progress);
        if (progress >= 1) {
          finish();
        }
      } catch {
        finish();
      }
    });
  });
}

function createShotParticles(scene, materials, from, to, hit, durationMs) {
  const particles = [];
  const origins = [from, ...Array.from({ length: hit ? 5 : 3 }, () => to)];
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
    particle.metadata = {
      kind: "shot-particle",
      effectKind: index === 0 ? "muzzle-flash" : hit ? "impact-particle" : "miss-marker",
      presentationOnly: true,
    };
    particles.push({ mesh: particle, velocity: directions[index] });
  }

  let elapsed = 0;
  const lifetime = Math.max(0.06, Math.min(durationMs / 1000, 0.32));
  const observer = scene.onBeforeRenderObservable.add(() => {
    const delta = scene.getEngine().getDeltaTime() / 1000;
    elapsed += delta;
    const scale = Math.max(0.05, 1 - elapsed / lifetime);
    for (const particle of particles) {
      particle.mesh.position.addInPlace(particle.velocity.scale(delta));
      particle.mesh.scaling.setAll(scale);
    }
    if (elapsed >= lifetime) {
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
  const reducedMotion = options.reducedMotion ?? Boolean(
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
  const presentationTimings = getPresentationTimings(reducedMotion);
  const presentationFailureGate = createPresentationFailureGate(
    import.meta.env?.DEV ? options.failNextPresentation : null,
  );
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
  const enemyIntentPreview = createEnemyIntentPreviewController(scene, materials);
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
  let presentationSequence = 0;
  let activeShotFeedbackCount = 0;
  const unitCells = new Map();
  const presentationEvents = [];

  function recordPresentationEvent(type, details = {}) {
    presentationEvents.push({
      sequence: presentationSequence,
      type,
      ...details,
    });
    presentationSequence += 1;
    if (presentationEvents.length > 80) {
      presentationEvents.splice(0, presentationEvents.length - 80);
    }
  }

  const presentationQueue = createPresentationQueue({
    onFailure: (label) => {
      recordPresentationEvent("presentation-fallback", { label });
    },
  });

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
      unitStateAnimator = createUnitStateAnimator(scene, units, { reducedMotion });
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

  async function performShotFeedback(shooterId, targetId, hit, { reaction = false } = {}) {
    const shooter = getUnit(shooterId);
    const target = getUnit(targetId);
    if (!shooter || !target || disposed) {
      recordPresentationEvent("shot-feedback-skipped", {
        shooterId,
        targetId,
        reaction,
      });
      return;
    }

    let tracer = null;
    const startingScale = shooter.container.scaling.clone();
    const previousShooterTransient = unitStateAnimator?.setTransientStatus(
      shooterId,
      "shooting",
    );
    const previousTargetTransient = hit
      ? unitStateAnimator?.setTransientStatus(targetId, "taking-damage")
      : undefined;

    try {
      const from = shooter.container
        .getAbsolutePosition()
        .add(new Vector3(0, 1.05, 0));
      const to = target.container
        .getAbsolutePosition()
        .add(new Vector3(0, 1.0, 0));
      const direction = to.subtract(from);
      if (direction.lengthSquared() > 0.0001) {
        shooter.container.rotation.y = Math.atan2(direction.x, direction.z);
      }
      recordPresentationEvent("shot-facing", { shooterId, targetId, reaction });

      createShotParticles(
        scene,
        materials,
        from,
        to,
        hit,
        presentationTimings.shotMs,
      );
      recordPresentationEvent("muzzle-flash", { shooterId, targetId, reaction });

      tracer = MeshBuilder.CreateLines(
        `shot-${shooterId}-${targetId}`,
        { points: [from, to] },
        scene,
      );
      tracer.color = hit
        ? Color3.FromHexString("#35e6f4")
        : Color3.FromHexString("#e8edf1");
      tracer.alpha = hit ? 1 : 0.55;
      tracer.isPickable = false;
      tracer.metadata = { kind: "shot-tracer", presentationOnly: true, reaction };
      recordPresentationEvent("tracer-visible", { shooterId, targetId, reaction });
      recordPresentationEvent(hit ? "impact-visible" : "miss-visible", {
        shooterId,
        targetId,
        reaction,
      });

      await runTimedPresentation(scene, presentationTimings.shotMs, (progress) => {
        if (disposed) {
          return;
        }
        const recoil = Math.sin(progress * Math.PI);
        shooter.container.scaling.copyFrom(startingScale);
        shooter.container.scaling.z *= 1 - recoil * (reducedMotion ? 0.025 : 0.1);
        if (tracer) {
          tracer.alpha = (hit ? 1 : 0.55) * (1 - progress * 0.72);
        }
      });
    } catch {
      recordPresentationEvent("shot-feedback-fallback", {
        shooterId,
        targetId,
        reaction,
      });
    } finally {
      if (!shooter.container.isDisposed()) {
        shooter.container.scaling.copyFrom(startingScale);
      }
      tracer?.dispose();
      unitStateAnimator?.restoreTransientStatus(shooterId, previousShooterTransient);
      if (hit) {
        unitStateAnimator?.restoreTransientStatus(targetId, previousTargetTransient);
      }
      recordPresentationEvent("shot-complete", { shooterId, targetId, reaction });
    }
  }

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
    setEnemyIntentPreview(intent) {
      if (disposed) {
        return { kind: "none", count: 0 };
      }
      return enemyIntentPreview.setIntent(intent);
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
    async animateUnitPath(
      unitId,
      path,
      onStep = () => {},
      reactions = [],
      onReaction = () => {},
    ) {
      if (presentationFailureGate.consume("move")) {
        recordPresentationEvent("presentation-forced-failure", { kind: "move" });
        throw new Error("Forced move presentation failure for DEV verification.");
      }
      return presentationQueue.enqueue(`move:${unitId}`, async () => {
        const unit = getUnit(unitId);
        if (!unit || disposed) {
          return;
        }

        unitStateAnimator?.setTransientStatus(unitId, "moving");
        try {
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
            recordPresentationEvent("move-step-started", { unitId, cell: { ...cell } });
            await runTimedPresentation(scene, presentationTimings.moveStepMs, (progress) => {
              if (disposed) {
                return;
              }
              Vector3.LerpToRef(from, to, progress, unit.container.position);
              if (!reducedMotion) {
                unit.container.position.y += Math.sin(progress * Math.PI) * 0.055;
              }
            });
            if (disposed) {
              return;
            }
            unit.container.position.copyFrom(to);
            unitCells.set(unitId, { ...cell });
            onStep({ ...cell });
            recordPresentationEvent("move-step-complete", { unitId, cell: { ...cell } });

            const stepReactions = reactions.filter((reaction) => (
              reaction.completedCell?.column === cell.column &&
              reaction.completedCell?.row === cell.row
            ));
            for (const reaction of stepReactions) {
              try {
                onReaction({ ...reaction });
              } catch {
                recordPresentationEvent("reaction-callback-fallback", {
                  reactorId: reaction.reactorId,
                  moverId: reaction.moverId,
                });
              }
              await performShotFeedback(
                reaction.reactorId,
                reaction.moverId,
                reaction.hit,
                { reaction: true },
              );
            }
          }
        } finally {
          unitStateAnimator?.clearTransientStatus(unitId);
        }
      });
    },
    async playShotFeedback(shooterId, targetId, hit) {
      if (presentationFailureGate.consume("shot")) {
        recordPresentationEvent("presentation-forced-failure", { kind: "shot" });
        throw new Error("Forced shot presentation failure for DEV verification.");
      }
      activeShotFeedbackCount += 1;
      return presentationQueue.enqueue(
        `shot:${shooterId}:${targetId}`,
        () => performShotFeedback(shooterId, targetId, hit),
      ).finally(() => {
        activeShotFeedbackCount = Math.max(0, activeShotFeedbackCount - 1);
      });
    },
    async syncBattleState(state) {
      if (!ready || disposed) {
        return;
      }

      latestBattleState = state;
      unitStateAnimator?.sync(state);
      return presentationQueue.enqueue("state-sync", async () => {
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
          animations.push(runTimedPresentation(
            scene,
            reducedMotion ? 1 : 260,
            (progress) => {
              if (disposed) {
                return;
              }
              Vector3.LerpToRef(from, to, progress, unit.container.position);
              if (!reducedMotion) {
                unit.container.position.y += Math.sin(progress * Math.PI) * 0.055;
              }
            },
          ).then(() => {
            if (!disposed) {
              unit.container.position.copyFrom(to);
              unitCells.set(stateUnit.id, { ...stateUnit.cell });
            }
          }));
        }
        await Promise.all(animations);
      });
    },
    syncUnitStates(state) {
      latestBattleState = state;
      unitStateAnimator?.sync(state);
      return unitStateAnimator?.snapshot() ?? [];
    },
    getPresentationSnapshot() {
      return {
        units: unitStateAnimator?.snapshot() ?? [],
        shotParticleCount: Math.max(
          activeShotFeedbackCount,
          scene.meshes.filter(
            (mesh) => mesh.metadata?.kind === "shot-particle",
          ).length,
        ),
        reducedMotion,
        enemyIntentPreview: enemyIntentPreview.getSnapshot(),
        events: presentationEvents.map((event) => ({ ...event })),
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
      enemyIntentPreview.clear();
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
