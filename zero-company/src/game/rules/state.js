import { BATTLE_PHASES, MAX_ACTION_POINTS, TEAMS } from "./contracts.js";
import { LEVEL_DEFINITION } from "./level.js";
import {
  cloneRandomSource,
  createSeededRandom,
  normalizeSeed,
  resetRandomSource,
} from "./random.js";

const INITIAL_ROSTER = Object.freeze([
  {
    id: "player-1",
    team: TEAMS.PLAYER,
    label: "Vanguard",
    weaponId: "short",
  },
  {
    id: "player-2",
    team: TEAMS.PLAYER,
    label: "Ranger",
    weaponId: "balanced",
  },
  {
    id: "player-3",
    team: TEAMS.PLAYER,
    label: "Sentinel",
    weaponId: "long",
  },
  {
    id: "enemy-1",
    team: TEAMS.ENEMY,
    label: "Enemy Rifleman",
    weaponId: "balanced",
  },
  {
    id: "enemy-2",
    team: TEAMS.ENEMY,
    label: "Enemy Gunner",
    weaponId: "short",
  },
  {
    id: "enemy-3",
    team: TEAMS.ENEMY,
    label: "Enemy Marksman",
    weaponId: "long",
  },
]);

function createUnit(descriptor) {
  return {
    ...descriptor,
    cell: { ...LEVEL_DEFINITION.starts[descriptor.id] },
    maxHealth: 10,
    health: 10,
    actionPoints:
      descriptor.team === TEAMS.PLAYER ? MAX_ACTION_POINTS : 0,
    activity: null,
    overwatch: null,
  };
}

export function createInitialBattle(options = {}) {
  const initialSeed = normalizeSeed(options.seed);
  const suppliedRandom = options.randomSource
    ? cloneRandomSource(options.randomSource)
    : createSeededRandom(initialSeed);
  const initialRandom = resetRandomSource(suppliedRandom);

  return {
    schemaVersion: 1,
    initialSeed,
    phase: BATTLE_PHASES.PLAYER,
    round: 1,
    result: null,
    units: INITIAL_ROSTER.map(createUnit),
    selectedUnitId: "player-2",
    activeUnitId: null,
    enemyActivationOrder: [],
    enemyActivationIndex: -1,
    pendingConfirmation: null,
    pendingAction: null,
    initialRandom: cloneRandomSource(initialRandom),
    random: cloneRandomSource(initialRandom),
  };
}

export function restartBattle(state) {
  return createInitialBattle({
    seed: state.initialSeed,
    randomSource: state.initialRandom,
  });
}

export function getInitialRoster() {
  return INITIAL_ROSTER.map((unit) => ({
    ...unit,
    cell: { ...LEVEL_DEFINITION.starts[unit.id] },
  }));
}
