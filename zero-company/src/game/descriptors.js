import { cellToWorld, LEVEL_DEFINITION } from "./rules/index.js";

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
  const unitPositions = Object.fromEntries(
    Object.entries(LEVEL_DEFINITION.starts).map(([unitId, cell]) => {
      const world = cellToWorld(cell);
      return [unitId, [world.x, world.y + 0.01, world.z]];
    }),
  );
  const covers = LEVEL_DEFINITION.covers.map((cover) => {
    const worlds = cover.cells.map((cell) => cellToWorld(cell));
    const minimumX = Math.min(...worlds.map((world) => world.x));
    const maximumX = Math.max(...worlds.map((world) => world.x));
    const minimumZ = Math.min(...worlds.map((world) => world.z));
    const maximumZ = Math.max(...worlds.map((world) => world.z));
    return {
      id: cover.id,
      position: [
        (minimumX + maximumX) / 2,
        LEVEL_DEFINITION.arenaTop + 0.95,
        (minimumZ + maximumZ) / 2,
      ],
      size: [
        maximumX - minimumX + LEVEL_DEFINITION.cellSize,
        1.9,
        maximumZ - minimumZ + LEVEL_DEFINITION.cellSize,
      ],
    };
  });

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
        position: unitPositions["player-1"],
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
        position: unitPositions["player-2"],
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
        position: unitPositions["player-3"],
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
        position: unitPositions["enemy-1"],
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
        position: unitPositions["enemy-2"],
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
        position: unitPositions["enemy-3"],
        rotationY: Math.PI,
      },
    ],
    covers,
    feedback: {
      selectedUnitId: "player-2",
      movementCells: [],
      shot: null,
      overwatch: null,
    },
  });
}

export const presentationDescriptors = createPresentationDescriptors();
