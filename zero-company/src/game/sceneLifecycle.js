import {
  ArcRotateCamera,
  Engine,
  Scene,
  SceneLoader,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF/index.js";

import { createCameraController } from "./cameraController.js";
import { createPresentationDescriptors } from "./descriptors.js";
import {
  createCharacterTemplate,
  createLitArena,
  createPresentationMaterials,
  createProjectedHudReporter,
  createStaticFeedback,
  createUnitsFromTemplate,
} from "./presentationScene.js";

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
      removeHudReporter();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      units = [];
      characterTemplate = null;
    },
  };

  return api;
}
