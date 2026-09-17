const PLAYER_PHASE = "player";
const ENEMY_PHASE = "enemy";
const RESULT_PHASE = "result";

function hasStagedTarget(pendingAction) {
  if (!pendingAction) {
    return false;
  }

  if (pendingAction.action === "move") {
    return Boolean(pendingAction.targetCell);
  }
  if (pendingAction.action === "shoot") {
    return Boolean(pendingAction.targetId);
  }
  if (pendingAction.action === "overwatch") {
    return Boolean(pendingAction.targetCell && pendingAction.direction);
  }
  return false;
}

export function getInstructionText({
  battle,
  selectedUnit,
  presentationBusy = false,
  loadState = null,
}) {
  if (loadState?.status === "error") {
    return "Restart the battle";
  }
  if (!battle || battle.phase === RESULT_PHASE || battle.result !== null) {
    return "Restart the battle";
  }
  if (loadState?.status === "loading") {
    return "Preparing battlefield";
  }
  if (presentationBusy) {
    return "Wait for the action to finish";
  }
  if (battle.phase === ENEMY_PHASE) {
    return "Watch the enemy action";
  }
  if (battle.pendingConfirmation !== null || hasStagedTarget(battle.pendingAction)) {
    return "Choose Confirm";
  }

  const pendingAction = battle.pendingAction?.action;
  if (pendingAction === "move" || pendingAction === "overwatch") {
    return "Click a floor tile";
  }
  if (pendingAction === "shoot") {
    return "Click a red enemy";
  }
  if (
    battle.phase === PLAYER_PHASE &&
    battle.result === null &&
    selectedUnit?.team === "player" &&
    selectedUnit.availableActions?.length > 0
  ) {
    return "Choose an action";
  }
  return "Click a blue player";
}
