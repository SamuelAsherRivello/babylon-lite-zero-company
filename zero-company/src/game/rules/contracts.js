export const BATTLE_PHASES = Object.freeze({
  PLAYER: "player",
  ENEMY: "enemy",
  RESULT: "result",
});

export const TEAMS = Object.freeze({
  PLAYER: "player",
  ENEMY: "enemy",
});

export const ACTIONS = Object.freeze({
  MOVE: "move",
  SHOOT: "shoot",
  OVERWATCH: "overwatch",
});

export const UNIT_STATUSES = Object.freeze({
  IDLE: "Idle",
  MOVING: "Moving",
  SHOOTING: "Shooting",
  OVERWATCH: "Overwatch",
  TAKING_DAMAGE: "Taking Damage",
  DEAD: "Dead",
});

export const COMMANDS = Object.freeze({
  BEGIN_ACTION: "BEGIN_ACTION",
  AIM_OVERWATCH: "AIM_OVERWATCH",
  CONFIRM_OVERWATCH: "CONFIRM_OVERWATCH",
  CANCEL_ACTION: "CANCEL_ACTION",
  REQUEST_END_TURN: "REQUEST_END_TURN",
  CONFIRM_END_TURN: "CONFIRM_END_TURN",
  CANCEL_END_TURN: "CANCEL_END_TURN",
  RELINQUISH_ACTIVE_ENEMY: "RELINQUISH_ACTIVE_ENEMY",
  RESTART: "RESTART",
});

export const END_TURN_CONFIRMATION = "end-turn";
export const MAX_ACTION_POINTS = 3;
