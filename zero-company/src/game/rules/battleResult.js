import { BATTLE_PHASES, TEAMS } from "./contracts.js";

export function getBattleResult(units) {
  const playersAlive = units.some(
    (unit) => unit.team === TEAMS.PLAYER && unit.health > 0,
  );
  const enemiesAlive = units.some(
    (unit) => unit.team === TEAMS.ENEMY && unit.health > 0,
  );

  if (!enemiesAlive) {
    return "victory";
  }
  if (!playersAlive) {
    return "defeat";
  }
  return null;
}

export function applyTerminalResult(state) {
  if (state.result !== null || state.phase === BATTLE_PHASES.RESULT) {
    return { state, result: state.result, events: [] };
  }

  const result = getBattleResult(state.units);
  if (!result) {
    return { state, result: null, events: [] };
  }

  const defeatedTeam =
    result === "victory" ? TEAMS.ENEMY : TEAMS.PLAYER;
  return {
    state: {
      ...state,
      phase: BATTLE_PHASES.RESULT,
      result,
      units: state.units.map((unit) =>
        unit.activity === null ? unit : { ...unit, activity: null },
      ),
      activeUnitId: null,
      enemyActivationOrder: [],
      enemyActivationIndex: -1,
      pendingConfirmation: null,
      pendingAction: null,
      pendingResolution: null,
    },
    result,
    events: [{ type: "battle-ended", result, defeatedTeam }],
  };
}
