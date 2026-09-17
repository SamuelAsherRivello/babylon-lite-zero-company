import { Scalar, Vector3 } from "@babylonjs/core";

const TAP_DISTANCE_SQUARED = 36;

function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerCentroid(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function findUnitId(mesh) {
  let current = mesh;

  while (current) {
    if (current.metadata?.unitId) {
      return current.metadata.unitId;
    }
    current = current.parent;
  }

  return null;
}

export function createCameraController({
  canvas,
  scene,
  camera,
  cameraDescriptor,
  focusUnit,
  onWorldPick = () => {},
  onCameraChange = () => {},
}) {
  const pointers = new Map();
  let enabled = true;
  let disposed = false;
  let mouseOrbitPointerId = null;
  let touchGesture = null;
  const previousTouchAction = canvas.style.touchAction;

  canvas.style.touchAction = "none";

  function clampCamera() {
    camera.beta = Scalar.Clamp(
      camera.beta,
      cameraDescriptor.minBeta,
      cameraDescriptor.maxBeta,
    );
    camera.radius = Scalar.Clamp(
      camera.radius,
      cameraDescriptor.minRadius,
      cameraDescriptor.maxRadius,
    );
  }

  function notifyCameraChange() {
    onCameraChange({
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.asArray(),
    });
  }

  function markTouchGesture() {
    for (const pointer of pointers.values()) {
      if (pointer.pointerType === "touch") {
        pointer.gesture = true;
      }
    }
  }

  function startTouchGesture() {
    const touches = [...pointers.values()].filter(
      (pointer) => pointer.pointerType === "touch",
    );

    if (touches.length < 2) {
      touchGesture = null;
      return;
    }

    const [first, second] = touches;
    touchGesture = {
      centroid: pointerCentroid(first, second),
      distance: Math.max(pointerDistance(first, second), 1),
    };
    markTouchGesture();
  }

  function updateTouchGesture() {
    const touches = [...pointers.values()].filter(
      (pointer) => pointer.pointerType === "touch",
    );

    if (touches.length < 2) {
      touchGesture = null;
      return;
    }

    const [first, second] = touches;
    const nextCentroid = pointerCentroid(first, second);
    const nextDistance = Math.max(pointerDistance(first, second), 1);

    if (!touchGesture) {
      startTouchGesture();
      return;
    }

    const deltaX = nextCentroid.x - touchGesture.centroid.x;
    const deltaY = nextCentroid.y - touchGesture.centroid.y;
    camera.alpha -= deltaX * cameraDescriptor.orbitRadiansPerPixel;
    camera.beta -= deltaY * cameraDescriptor.orbitRadiansPerPixel;
    camera.radius *= touchGesture.distance / nextDistance;
    clampCamera();

    touchGesture = {
      centroid: nextCentroid,
      distance: nextDistance,
    };
    markTouchGesture();
    notifyCameraChange();
  }

  function pickWorld(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const pick = scene.pick(clientX - bounds.left, clientY - bounds.top);
    const unitId = pick?.hit ? findUnitId(pick.pickedMesh) : null;

    if (unitId) {
      focusUnit(unitId);
      return;
    }
    if (pick?.hit) {
      onWorldPick(pick);
    }
  }

  function onPointerDown(event) {
    if (!enabled || disposed) {
      return;
    }

    const pointer = {
      id: event.pointerId,
      pointerType: event.pointerType,
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      gesture: false,
    };
    pointers.set(event.pointerId, pointer);
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events may not be registered as active by the browser.
    }

    if (event.pointerType === "mouse" && event.button === 2) {
      mouseOrbitPointerId = event.pointerId;
      event.preventDefault();
    } else if (event.pointerType === "touch") {
      startTouchGesture();
    }
  }

  function onPointerMove(event) {
    const pointer = pointers.get(event.pointerId);
    if (!enabled || !pointer || disposed) {
      return;
    }

    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.moved ||=
      (pointer.x - pointer.startX) ** 2 +
        (pointer.y - pointer.startY) ** 2 >
      TAP_DISTANCE_SQUARED;

    if (pointer.pointerType === "mouse" && mouseOrbitPointerId === event.pointerId) {
      camera.alpha -= deltaX * cameraDescriptor.orbitRadiansPerPixel;
      camera.beta -= deltaY * cameraDescriptor.orbitRadiansPerPixel;
      clampCamera();
      notifyCameraChange();
      event.preventDefault();
      return;
    }

    if (pointer.pointerType === "touch") {
      updateTouchGesture();
      if (touchGesture) {
        event.preventDefault();
      }
    }
  }

  function finishPointer(event, cancelled = false) {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) {
      return;
    }

    pointers.delete(event.pointerId);

    if (mouseOrbitPointerId === event.pointerId) {
      mouseOrbitPointerId = null;
    }

    if (
      enabled &&
      !cancelled &&
      !pointer.moved &&
      !pointer.gesture &&
      ((pointer.pointerType === "mouse" && pointer.button === 0) ||
        pointer.pointerType === "touch")
    ) {
      pickWorld(event.clientX, event.clientY);
    }

    if (pointer.pointerType === "touch") {
      startTouchGesture();
    }

    try {
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // Capture can disappear before pointerup/pointercancel reaches the canvas.
    }
  }

  function onPointerUp(event) {
    finishPointer(event);
  }

  function onPointerCancel(event) {
    finishPointer(event, true);
  }

  function onWheel(event) {
    if (!enabled || disposed) {
      return;
    }

    camera.radius += event.deltaY * cameraDescriptor.zoomPerWheelPixel;
    clampCamera();
    notifyCameraChange();
    event.preventDefault();
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);

  return {
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) {
        pointers.clear();
        mouseOrbitPointerId = null;
        touchGesture = null;
      }
    },
    focusWorldOrigin() {
      camera.setTarget(Vector3.Zero());
      notifyCameraChange();
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      pointers.clear();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
