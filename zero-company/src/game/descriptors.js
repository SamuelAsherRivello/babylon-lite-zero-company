const DEFAULT_BASE_URL = import.meta.env?.BASE_URL ?? "/";

export const CHARACTER_MODEL_RELATIVE_PATH = "assets/models/character.glb";

function withTrailingSlash(value) {
  const baseUrl = value || "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function createPresentationDescriptors(baseUrl = DEFAULT_BASE_URL) {
  const assetBaseUrl = withTrailingSlash(baseUrl);

  return deepFreeze({
    model: {
      id: "character-model",
      url: `${assetBaseUrl}${CHARACTER_MODEL_RELATIVE_PATH}`,
      displayHeight: 1.55,
    },
    arena: {
      width: 13,
      depth: 8,
      height: 0.6,
      topY: 0.3,
    },
    camera: {
      alpha: -Math.PI / 2,
      beta: 0.82,
      radius: 15.5,
      minBeta: 0.58,
      maxBeta: 1.18,
      minRadius: 7,
      maxRadius: 19,
      orbitRadiansPerPixel: 0.006,
      zoomPerWheelPixel: 0.012,
    },
    units: [
      {
        id: "player-1",
        team: "player",
        label: "Vanguard",
        weapon: "Scattergun",
        health: 10,
        actionPoints: 3,
        overwatch: false,
        position: [-4.35, 0.31, -2.55],
        rotationY: 0,
      },
      {
        id: "player-2",
        team: "player",
        label: "Ranger",
        weapon: "Rifle",
        health: 10,
        actionPoints: 3,
        overwatch: false,
        position: [0, 0.31, -2.85],
        rotationY: 0,
      },
      {
        id: "player-3",
        team: "player",
        label: "Sentinel",
        weapon: "Longarm",
        health: 10,
        actionPoints: 3,
        overwatch: true,
        position: [4.35, 0.31, -2.55],
        rotationY: 0,
      },
      {
        id: "enemy-1",
        team: "enemy",
        label: "Enemy Rifleman",
        weapon: "Carbine",
        health: 10,
        actionPoints: 3,
        overwatch: false,
        position: [-4.35, 0.31, 2.55],
        rotationY: Math.PI,
      },
      {
        id: "enemy-2",
        team: "enemy",
        label: "Enemy Gunner",
        weapon: "Repeater",
        health: 10,
        actionPoints: 3,
        overwatch: false,
        position: [0, 0.31, 2.85],
        rotationY: Math.PI,
      },
      {
        id: "enemy-3",
        team: "enemy",
        label: "Enemy Marksman",
        weapon: "Longarm",
        health: 10,
        actionPoints: 3,
        overwatch: false,
        position: [4.35, 0.31, 2.55],
        rotationY: Math.PI,
      },
    ],
    covers: [
      {
        id: "cover-left",
        position: [-4.05, 1.25, 0.25],
        size: [1.75, 1.9, 1.6],
      },
      {
        id: "cover-center",
        position: [0, 1.25, 0.25],
        size: [1.75, 1.9, 1.6],
      },
      {
        id: "cover-right",
        position: [4.05, 1.25, 0.25],
        size: [1.75, 1.9, 1.6],
      },
    ],
    feedback: {
      selectedUnitId: "player-2",
      movementCells: [
        [-1.15, 0.31, -2.85],
        [1.15, 0.31, -2.85],
        [0, 0.31, -1.7],
        [0, 0.31, -4],
      ],
      shot: {
        from: [-4.35, 1.42, -2.48],
        to: [-4.35, 1.35, 2.48],
      },
      overwatch: {
        origin: [4.35, 0.315, -2.42],
        direction: [-0.42, 0, 0.91],
        range: 5.6,
        halfAngle: Math.PI / 7,
      },
    },
  });
}

export const presentationDescriptors = createPresentationDescriptors();
