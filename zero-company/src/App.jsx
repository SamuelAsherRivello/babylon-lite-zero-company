import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare2,
  Crosshair,
  Eye,
  GitFork,
  Maximize,
  Move,
  RotateCcw,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import versionText from "../../version.txt?raw";
import { createZeroCompanyScene } from "./game/index.js";
import { createAudioController } from "./game/audioController.js";
import {
  chooseEnemyPlan,
  createScriptedRandom,
  createInitialBattle,
  dispatchBattleCommand,
  getAttackPreview,
  getReachableDestinations,
  getUnitInspection,
  resolveEnemyOverwatch,
  resolveMoveWithOverwatch,
  resolveShoot,
  WEAPON_DEFINITIONS,
} from "./game/rules/index.js";

const fullscreenStorageKey = "babylon-lite-zero-company.fullscreen";
const repositoryUrl = "https://github.com/SamuelAsherRivello/babylon-lite-zero-company";
const portraitQuery = "(orientation: portrait) and (pointer: coarse)";
const uiMarginPixels = 20;

function createRuntimeBattle() {
  if (!import.meta.env.DEV) {
    return createInitialBattle();
  }

  const scenario = new URLSearchParams(window.location.search).get("e2e-result");
  if (scenario !== "victory" && scenario !== "defeat" && scenario !== "reaction") {
    return createInitialBattle();
  }

  const state = createInitialBattle({
    randomSource: createScriptedRandom([0, 0, 0, 0]),
  });
  if (scenario === "reaction") {
    let reactionState = state;
    for (const command of [
      { type: "BEGIN_ACTION", unitId: "player-1", action: "overwatch" },
      { type: "AIM_OVERWATCH", unitId: "player-1", targetCell: { column: 2, row: 6 } },
      { type: "CONFIRM_OVERWATCH", unitId: "player-1" },
      { type: "REQUEST_END_TURN" },
      { type: "CONFIRM_END_TURN" },
    ]) {
      reactionState = dispatchBattleCommand(reactionState, command).state;
    }
    return reactionState;
  }
  return {
    ...state,
    units: state.units.map((unit) => {
      if (scenario === "victory") {
        if (unit.id === "enemy-1") {
          return { ...unit, cell: { column: 2, row: 2 }, health: 1 };
        }
        if (unit.id === "enemy-2" || unit.id === "enemy-3") {
          return { ...unit, health: 0 };
        }
      }
      if (scenario === "defeat") {
        if (unit.id === "player-1") {
          return { ...unit, health: 1 };
        }
        if (unit.id === "player-2" || unit.id === "player-3") {
          return { ...unit, health: 0 };
        }
        if (unit.id === "enemy-1") {
          return { ...unit, cell: { column: 2, row: 2 } };
        }
      }
      return unit;
    }),
  };
}

const actionControls = [
  { id: "move", label: "Move", Icon: Move },
  { id: "shoot", label: "Shoot", Icon: Crosshair },
  { id: "overwatch", label: "Overwatch", Icon: Eye },
  { id: "end-turn", label: "End Turn", Icon: SkipForward },
];

const overwatchAimCells = Object.freeze([
  { column: 0, row: 0 },
  { column: 0, row: 7 },
  { column: 6, row: 7 },
  { column: 12, row: 7 },
  { column: 3, row: 0 },
]);

const weaponLabels = Object.freeze({
  short: "Scattergun",
  balanced: "Rifle",
  long: "Longarm",
});

function projectedPositionsMatch(previous, next) {
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((entry, index) => {
    const candidate = next[index];
    return (
      entry.id === candidate.id &&
      entry.x === candidate.x &&
      entry.y === candidate.y &&
      entry.visible === candidate.visible
    );
  });
}

function usePortraitBlocker() {
  const [blocked, setBlocked] = useState(() => {
    return typeof window !== "undefined" && window.matchMedia(portraitQuery).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(portraitQuery);
    const update = () => setBlocked(mediaQuery.matches);

    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);

  return blocked;
}

function GameScene({
  battle,
  committedOverwatchPreviews,
  enemyIntent,
  failNextPresentation,
  inputEnabled,
  movePresentation,
  movementDestinations,
  onCellSelect,
  onLoadingChange,
  onMoveComplete,
  onMoveStep,
  onPresentationSettled,
  onProjectedHudPositions,
  onReactionFeedback,
  onSelectionChange,
  onShotComplete,
  overwatchPreview,
  selectedUnitId,
  shotPresentation,
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const movementDestinationsRef = useRef(movementDestinations);
  movementDestinationsRef.current = movementDestinations;

  useEffect(() => {
    const canvas = canvasRef.current;
    const game = createZeroCompanyScene(canvasRef.current, {
      failNextPresentation,
      onLoadingChange: (state) => {
        canvas.dataset.sceneStatus = state.status;
        onLoadingChange(state);
      },
      onError: (error) => onLoadingChange({ status: "error", error }),
      onReady: ({ descriptors, scene }) => {
        canvas.dataset.unitCount = String(descriptors.units.length);
        canvas.dataset.coverCount = String(descriptors.covers.length);
        canvas.dataset.presentationMeshCount = String(scene.meshes.length);
        canvas.dataset.reducedMotion = String(
          gameRef.current?.getPresentationSnapshot().reducedMotion ?? false,
        );
      },
      onProjectedHudPositions,
      onCellSelect,
      onWorldPick: (pick) => {
        canvas.dataset.lastWorldPick = JSON.stringify(pick);
      },
      onSelectionChange: (unit) => {
        canvas.dataset.selectedUnit = unit.id;
        onSelectionChange(unit);
      },
      onCameraChange: (cameraState) => {
        canvas.dataset.cameraState = JSON.stringify(cameraState);
        window.requestAnimationFrame(() => {
          const currentGame = gameRef.current;
          if (currentGame) {
            canvas.dataset.movementDestinations = JSON.stringify(
              movementDestinationsRef.current.map((destination) => ({
                ...destination.cell,
                cost: destination.minimumActionPoints,
                steps: destination.steps,
                ...currentGame.projectCell(destination.cell),
              })),
            );
            canvas.dataset.overwatchAimPoints = JSON.stringify(
              overwatchAimCells.map((cell) => ({
                ...cell,
                ...currentGame.projectCell(cell),
              })),
            );
          }
        });
      },
    });
    gameRef.current = game;

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [failNextPresentation, onCellSelect, onLoadingChange, onProjectedHudPositions, onSelectionChange]);

  useEffect(() => {
    gameRef.current?.setInputEnabled(inputEnabled);
  }, [inputEnabled]);

  useEffect(() => {
    const game = gameRef.current;
    let active = true;
    game?.ready.then(() => {
      if (active) {
        game.selectUnit(selectedUnitId, { focus: false, notify: false });
        if (canvasRef.current) {
          canvasRef.current.dataset.selectedUnit = selectedUnitId;
        }
      }
    });
    return () => {
      active = false;
    };
  }, [selectedUnitId]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.battleState = JSON.stringify(battle);
    }
    const game = gameRef.current;
    let active = true;
    game?.ready.then(() => {
      if (!active || !canvasRef.current) {
        return;
      }
      canvasRef.current.dataset.unitPresentationStates = JSON.stringify(
        game.syncUnitStates(battle),
      );
    });
    return () => {
      active = false;
    };
  }, [battle]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.enemyIntent = JSON.stringify(enemyIntent);
      if (enemyIntent) {
        const history = JSON.parse(canvasRef.current.dataset.enemyIntentHistory ?? "[]");
        history.push(enemyIntent);
        canvasRef.current.dataset.enemyIntentHistory = JSON.stringify(history);
      }
    }
  }, [enemyIntent]);

  useEffect(() => {
    const game = gameRef.current;
    game?.setMovementDestinations(movementDestinations);
    if (canvasRef.current) {
      canvasRef.current.dataset.movementDestinationCount = String(movementDestinations.length);
    }
    let active = true;
    game?.ready.then(() => {
      if (!active || !canvasRef.current) {
        return;
      }
      canvasRef.current.dataset.movementDestinations = JSON.stringify(
        movementDestinations.map((destination) => ({
          ...destination.cell,
          cost: destination.minimumActionPoints,
          steps: destination.steps,
          ...game.projectCell(destination.cell),
        })),
      );
    });
    return () => {
      active = false;
    };
  }, [movementDestinations]);

  useEffect(() => {
    const game = gameRef.current;
    game?.setOverwatchPreviews([
      ...(overwatchPreview ? [overwatchPreview] : []),
      ...committedOverwatchPreviews,
    ]);
    if (canvasRef.current) {
      canvasRef.current.dataset.overwatchPreview = JSON.stringify(overwatchPreview);
      canvasRef.current.dataset.overwatchConeCount = String(
        committedOverwatchPreviews.length + (overwatchPreview ? 1 : 0),
      );
    }
    let active = true;
    game?.ready.then(() => {
      if (!active || !canvasRef.current) {
        return;
      }
      canvasRef.current.dataset.overwatchAimPoints = JSON.stringify(
        overwatchAimCells.map((cell) => ({ ...cell, ...game.projectCell(cell) })),
      );
      canvasRef.current.dataset.renderedOverwatchTip = JSON.stringify(
        game.projectOverwatchTip(),
      );
      canvasRef.current.dataset.overwatchOriginPoint = JSON.stringify(
        overwatchPreview ? game.projectCell(overwatchPreview.originCell) : null,
      );
      canvasRef.current.dataset.overwatchTargetPoint = JSON.stringify(
        overwatchPreview ? game.projectCell(overwatchPreview.targetCell) : null,
      );
    });
    return () => {
      active = false;
    };
  }, [committedOverwatchPreviews, overwatchPreview]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game || !movePresentation) {
      return undefined;
    }

    let active = true;
    if (canvasRef.current) {
      canvasRef.current.dataset.moveVisitedCells = "[]";
    }
    game.ready
      .then(() => game.animateUnitPath(
        movePresentation.unitId,
        movePresentation.path,
        (cell) => {
          if (!active) {
            return;
          }
          const visited = JSON.parse(canvasRef.current?.dataset.moveVisitedCells ?? "[]");
          visited.push(cell);
          if (canvasRef.current) {
            canvasRef.current.dataset.moveVisitedCells = JSON.stringify(visited);
          }
          onMoveStep(movePresentation.unitId, cell);
        },
        movePresentation.reactions ?? [],
        (reaction) => {
          if (canvasRef.current) {
            const history = JSON.parse(
              canvasRef.current.dataset.reactionFeedbackHistory ?? "[]",
            );
            history.push(reaction);
            canvasRef.current.dataset.reactionFeedbackHistory = JSON.stringify(history);
          }
          onReactionFeedback(reaction);
        },
      ))
      .catch(() => {
        if (canvasRef.current) {
          canvasRef.current.dataset.presentationFallback = "move";
        }
      })
      .finally(() => {
        if (active) {
          if (canvasRef.current) {
            canvasRef.current.dataset.presentationEvents = JSON.stringify(
              game.getPresentationSnapshot().events,
            );
          }
          onMoveComplete(movePresentation.finalState);
        }
      });
    return () => {
      active = false;
    };
  }, [movePresentation, onMoveComplete, onMoveStep, onReactionFeedback]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game || !shotPresentation) {
      return undefined;
    }
    let active = true;
    if (canvasRef.current) {
      canvasRef.current.dataset.shotStatus = "playing";
      canvasRef.current.dataset.lastShot = JSON.stringify({
        shooterId: shotPresentation.shooterId,
        targetId: shotPresentation.targetId,
        hit: shotPresentation.hit,
        damage: shotPresentation.damage,
      });
    }
    game.ready
      .then(() => {
        const playback = game.playShotFeedback(
          shotPresentation.shooterId,
          shotPresentation.targetId,
          shotPresentation.hit,
        );
        if (canvasRef.current) {
          canvasRef.current.dataset.shotParticleCount = String(
            game.getPresentationSnapshot().shotParticleCount,
          );
        }
        return playback;
      })
      .catch(() => {
        if (canvasRef.current) {
          canvasRef.current.dataset.presentationFallback = "shot";
        }
      })
      .finally(() => {
        if (active) {
          if (canvasRef.current) {
            canvasRef.current.dataset.shotStatus = "complete";
            canvasRef.current.dataset.presentationEvents = JSON.stringify(
              game.getPresentationSnapshot().events,
            );
          }
          onShotComplete(shotPresentation.finalState);
        }
      });
    return () => {
      active = false;
    };
  }, [onShotComplete, shotPresentation]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game || movePresentation || shotPresentation) {
      return undefined;
    }

    let active = true;
    game.ready
      .then(() => game.syncBattleState(battle))
      .finally(() => {
        if (active) {
          onPresentationSettled();
        }
      });
    return () => {
      active = false;
    };
  }, [battle, movePresentation, onPresentationSettled, shotPresentation]);

  return (
    <canvas
      ref={canvasRef}
      id="game_canvas"
      aria-label="Zero Company tactical battlefield"
    />
  );
}

function UnitHud({ active, attackPreview, onSelect, selected, unit }) {
  if (!unit.visible) {
    return null;
  }

  const isPlayer = unit.team === "player";

  return (
    <button
      type="button"
      className={`unit-hud unit-hud_${unit.team}${active ? " unit-hud_active" : ""}${selected ? " unit-hud_selected" : ""}`}
      aria-label={`Inspect ${unit.label}`}
      aria-pressed={selected}
      data-unit-id={unit.id}
      data-unit-status={unit.status}
      data-valid-target={attackPreview?.selectable ? "true" : "false"}
      onClick={() => onSelect(unit.id)}
      style={{ left: `${unit.x}px`, top: `${unit.y}px` }}
    >
      <div className="unit-health" aria-label={`${unit.health} health`}>
        <span style={{ width: `${unit.health * 10}%` }} />
      </div>
      {isPlayer ? (
        <div className="unit-status-line">
          <span className="ap-dots" aria-label={`${unit.actionPoints} action points`}>
            {Array.from({ length: unit.actionPoints }, (_, index) => (
              <i key={index} />
            ))}
          </span>
          <b>{unit.actionPoints} AP</b>
          {unit.overwatch ? (
            <span className="overwatch-capacity" aria-label={`${unit.overwatch.shotsRemaining} Overwatch shots`}>
              <Eye aria-label="Overwatch" size={14} />
              {unit.overwatch.shotsRemaining}
            </span>
          ) : null}
        </div>
      ) : null}
      {attackPreview ? (
        <div className={`attack-preview${attackPreview.blocked ? " attack-preview_blocked" : ""}`}>
          {attackPreview.blocked
            ? "Blocked / 0%"
            : `${Math.round(attackPreview.hitProbability * 100)}% / ${attackPreview.maxDamage} dmg`}
        </div>
      ) : null}
    </button>
  );
}

function InspectionPanel({ unit }) {
  if (!unit) {
    return null;
  }

  return (
    <section className="inspection-panel" aria-live="polite">
      <div className={`team-mark team-mark_${unit.team}`} />
      <div>
        <strong>{unit.label}</strong>
        <span>{unit.team === "player" ? "Operative" : "Enemy"}</span>
      </div>
      <dl>
        <div><dt>Health</dt><dd>{unit.health}/{unit.maxHealth}</dd></div>
        <div><dt>Weapon</dt><dd>{weaponLabels[unit.weaponId] ?? unit.weaponId}</dd></div>
        <div><dt>AP</dt><dd>{unit.actionPoints}</dd></div>
        <div><dt>Status</dt><dd>{unit.status}</dd></div>
        {unit.team === "player" ? (
          <div>
            <dt>Actions</dt>
            <dd>{unit.availableActions.length > 0 ? unit.availableActions.join(", ") : "None"}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export function App() {
  const [battle, setBattle] = useState(createRuntimeBattle);
  const battleRef = useRef(battle);
  const presentationBusyRef = useRef(false);
  const audioRef = useRef(null);
  if (audioRef.current === null) {
    audioRef.current = createAudioController();
  }
  const [presentationBusy, setPresentationBusy] = useState(false);
  const [movePresentation, setMovePresentation] = useState(null);
  const [shotPresentation, setShotPresentation] = useState(null);
  const [enemyIntent, setEnemyIntent] = useState(null);
  const [muted, setMuted] = useState(() => audioRef.current.muted);
  const [fullscreenPreferred, setFullscreenPreferred] = useState(() => {
    return localStorage.getItem(fullscreenStorageKey) === "true";
  });
  const [loadState, setLoadState] = useState({ status: "loading", error: null });
  const [hudPositions, setHudPositions] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(() => battle.selectedUnitId);
  const portraitBlocked = usePortraitBlocker();
  const e2eScenario = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("e2e-result")
    : null;
  const failNextPresentation = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("e2e-presentation-failure")
    : null;
  const versionNumber = versionText.trim().replace(/^version=/, "").replace(/^v/, "");
  const contentLayer = document.getElementById("content_layer");

  const playSound = useCallback((effect) => {
    void audioRef.current.play(effect);
  }, []);

  useEffect(() => {
    const unlock = () => audioRef.current.unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!shotPresentation) {
      return undefined;
    }
    playSound("shot");
    if (!shotPresentation.hit) {
      return undefined;
    }
    const timeout = window.setTimeout(() => playSound("impact"), 120);
    return () => window.clearTimeout(timeout);
  }, [playSound, shotPresentation]);

  const handleLoadingChange = useCallback((nextState) => {
    setLoadState({
      status: nextState.status,
      error: nextState.error?.message ?? null,
    });
  }, []);

  const handleHudPositions = useCallback((nextPositions) => {
    setHudPositions((current) => {
      return projectedPositionsMatch(current, nextPositions) ? current : nextPositions;
    });
  }, []);

  const handleSelectionChange = useCallback((unit) => {
    const current = battleRef.current;
    if (presentationBusyRef.current) {
      setSelectedUnitId(unit.id);
      return;
    }
    if (current.pendingAction?.action === "overwatch") {
      const aimed = dispatchBattleCommand(current, {
        type: "AIM_OVERWATCH",
        unitId: current.pendingAction.unitId,
        targetCell: unit.cell,
      });
      if (aimed.accepted) {
        setBattle(aimed.state);
      }
      return;
    }
    if (current.pendingAction?.action === "shoot") {
      const outcome = resolveShoot(current, {
        shooterId: current.pendingAction.unitId,
        targetId: unit.id,
      });
      if (outcome.accepted) {
        const hit = outcome.hit;
        setPresentationBusy(true);
        setSelectedUnitId(unit.id);
        setBattle({
          ...current,
          units: current.units.map((candidate) => {
            if (candidate.id === current.pendingAction.unitId) {
              return { ...candidate, activity: "shooting" };
            }
            if (candidate.id === unit.id && hit) {
              return { ...candidate, activity: "taking-damage" };
            }
            return candidate;
          }),
        });
        setShotPresentation({
          shooterId: current.pendingAction.unitId,
          targetId: unit.id,
          hit: outcome.hit,
          damage: outcome.damage,
          finalState: outcome.state,
        });
        return;
      }
    }
    if (
      current.pendingAction &&
      current.pendingAction.unitId !== unit.id &&
      unit.team === "player"
    ) {
      const cancellation = dispatchBattleCommand(current, {
        type: "CANCEL_ACTION",
        selectedUnitId: unit.id,
      });
      if (cancellation.accepted) {
        setBattle(cancellation.state);
      }
    }
    setSelectedUnitId(unit.id);
  }, []);

  const selectedUnit = getUnitInspection(battle, selectedUnitId);
  const selectedActions = new Set(
    presentationBusy ? [] : selectedUnit?.availableActions ?? [],
  );
  const battleUnits = new Map(battle.units.map((unit) => [unit.id, unit]));
  battleRef.current = battle;
  presentationBusyRef.current = presentationBusy;
  const movementDestinations =
    battle.pendingAction?.action === "move" && !presentationBusy
      ? getReachableDestinations(battle, battle.pendingAction.unitId)
      : [];
  const overwatchUnit = battle.pendingAction?.action === "overwatch"
    ? battleUnits.get(battle.pendingAction.unitId)
    : null;
  const overwatchPreview = overwatchUnit && battle.pendingAction.targetCell
    ? {
        originCell: overwatchUnit.cell,
        targetCell: battle.pendingAction.targetCell,
      }
    : null;
  const committedOverwatchPreviews = useMemo(() => battle.units
    .filter((unit) => unit.overwatch)
    .map((unit) => ({
      unitId: unit.id,
      originCell: unit.overwatch.originCell,
      targetCell: unit.overwatch.targetCell,
      range: unit.overwatch.range,
      halfAngle: unit.overwatch.halfAngle,
    })), [battle.units]);
  const attackPreviews = new Map();
  if (battle.pendingAction?.action === "shoot" && !presentationBusy) {
    for (const unit of battle.units) {
      if (unit.team !== battleUnits.get(battle.pendingAction.unitId)?.team) {
        attackPreviews.set(
          unit.id,
          getAttackPreview(battle, battle.pendingAction.unitId, unit.id),
        );
      }
    }
  }

  const beginAction = (action) => {
    if (!selectedUnit || !selectedActions.has(action)) {
      return;
    }

    const outcome = dispatchBattleCommand(battle, {
      type: "BEGIN_ACTION",
      unitId: selectedUnit.id,
      action,
    });
    if (outcome.accepted) {
      setBattle(outcome.state);
    }
  };

  const applyCommand = useCallback((command) => {
    setBattle((current) => dispatchBattleCommand(current, command).state);
  }, []);

  const restartBattle = useCallback(() => {
    const restarted = dispatchBattleCommand(battleRef.current, {
      type: "RESTART",
    }).state;
    setMovePresentation(null);
    setShotPresentation(null);
    setEnemyIntent(null);
    setPresentationBusy(false);
    setSelectedUnitId(restarted.selectedUnitId);
    setBattle(restarted);
  }, []);

  const handleCellSelect = useCallback((cell) => {
    const current = battleRef.current;
    if (current.pendingAction?.action === "overwatch") {
      const aimed = dispatchBattleCommand(current, {
        type: "AIM_OVERWATCH",
        unitId: current.pendingAction.unitId,
        targetCell: cell,
      });
      if (aimed.accepted) {
        setBattle(aimed.state);
      }
      return;
    }
    if (current.pendingAction?.action !== "move") {
      return;
    }
    const outcome = resolveMoveWithOverwatch(current, {
      unitId: current.pendingAction.unitId,
      destination: cell,
    });
    if (outcome.accepted) {
      setPresentationBusy(true);
      setMovePresentation({
        unitId: current.pendingAction.unitId,
        path: outcome.path,
        reactions: outcome.reactions,
        finalState: outcome.state,
      });
    }
  }, []);

  const handleMoveStep = useCallback((unitId, cell) => {
    playSound("step");
    setBattle((current) => ({
      ...current,
      units: current.units.map((unit) =>
        unit.id === unitId
          ? { ...unit, cell: { ...cell }, activity: "moving" }
          : unit,
      ),
    }));
  }, [playSound]);

  const handleMoveComplete = useCallback((finalState) => {
    setBattle(finalState);
    setMovePresentation(null);
    setEnemyIntent(null);
    setPresentationBusy(false);
  }, []);

  const handleShotComplete = useCallback((finalState) => {
    setBattle(finalState);
    setShotPresentation(null);
    setEnemyIntent(null);
    setPresentationBusy(false);
  }, []);

  const handleReactionFeedback = useCallback((reaction) => {
    playSound("shot");
    if (reaction.hit) {
      window.setTimeout(() => playSound("impact"), 120);
    }
  }, [playSound]);

  const handlePresentationSettled = useCallback(() => {
    setPresentationBusy(false);
  }, []);

  useEffect(() => {
    if (
      battle.phase !== "enemy" ||
      !battle.activeUnitId ||
      battle.result ||
      presentationBusy ||
      loadState.status !== "ready"
    ) {
      return undefined;
    }

    const activeEnemy = battle.units.find((unit) => unit.id === battle.activeUnitId);
    const forcedReactionMove = e2eScenario === "reaction" &&
      activeEnemy?.id === "enemy-1" &&
      activeEnemy.cell.column === 2 &&
      activeEnemy.cell.row === 6;
    const plan = (forcedReactionMove
      ? {
          unitId: "enemy-1",
          action: "move",
          cost: 1,
          destination: { column: 2, row: 5 },
        }
      : chooseEnemyPlan(battle)) ?? {
      unitId: battle.activeUnitId,
      action: "relinquish",
      cost: 0,
      reason: "activation-complete",
    };
    setEnemyIntent({
      unitId: plan.unitId,
      action: plan.action,
      cost: plan.cost,
      targetId: plan.targetId ?? null,
      destination: plan.destination ?? null,
    });

    const timeout = window.setTimeout(() => {
      const current = battleRef.current;
      if (
        current.phase !== "enemy" ||
        current.activeUnitId !== plan.unitId ||
        current.result ||
        presentationBusyRef.current
      ) {
        return;
      }

      if (plan.action === "move") {
        const outcome = resolveMoveWithOverwatch(current, {
          unitId: plan.unitId,
          destination: plan.destination,
        });
        if (outcome.accepted) {
          setPresentationBusy(true);
          setBattle({
            ...current,
            units: current.units.map((unit) =>
              unit.id === plan.unitId
                ? { ...unit, activity: "moving" }
                : unit,
            ),
          });
          setMovePresentation({
            unitId: plan.unitId,
            path: outcome.path,
            reactions: outcome.reactions,
            finalState: outcome.state,
          });
          return;
        }
      } else if (plan.action === "shoot") {
        const outcome = resolveShoot(current, {
          shooterId: plan.unitId,
          targetId: plan.targetId,
        });
        if (outcome.accepted) {
          setPresentationBusy(true);
          setBattle({
            ...current,
            units: current.units.map((unit) => {
              if (unit.id === plan.unitId) {
                return { ...unit, activity: "shooting" };
              }
              if (unit.id === plan.targetId && outcome.hit) {
                return { ...unit, activity: "taking-damage" };
              }
              return unit;
            }),
          });
          setShotPresentation({
            shooterId: plan.unitId,
            targetId: plan.targetId,
            hit: outcome.hit,
            damage: outcome.damage,
            finalState: outcome.state,
          });
          return;
        }
      } else if (plan.action === "overwatch") {
        const outcome = resolveEnemyOverwatch(current, plan);
        if (outcome.accepted) {
          playSound("overwatch");
          setBattle(outcome.state);
          return;
        }
      }

      setBattle(dispatchBattleCommand(current, {
          type: "RELINQUISH_ACTIVE_ENEMY",
        }).state);
      setEnemyIntent(null);
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [battle, e2eScenario, loadState.status, playSound, presentationBusy]);

  const scenePortal = useMemo(() => {
    if (!contentLayer) {
      return null;
    }

    return createPortal(
      <GameScene
        battle={battle}
        committedOverwatchPreviews={committedOverwatchPreviews}
        enemyIntent={enemyIntent}
        failNextPresentation={failNextPresentation}
        inputEnabled={!portraitBlocked}
        movePresentation={movePresentation}
        movementDestinations={movementDestinations}
        onCellSelect={handleCellSelect}
        onLoadingChange={handleLoadingChange}
        onMoveComplete={handleMoveComplete}
        onMoveStep={handleMoveStep}
        onPresentationSettled={handlePresentationSettled}
        onProjectedHudPositions={handleHudPositions}
        onReactionFeedback={handleReactionFeedback}
        onSelectionChange={handleSelectionChange}
        onShotComplete={handleShotComplete}
        overwatchPreview={overwatchPreview}
        selectedUnitId={selectedUnitId}
        shotPresentation={shotPresentation}
      />,
      contentLayer,
    );
  }, [battle, committedOverwatchPreviews, contentLayer, enemyIntent, failNextPresentation, handleCellSelect, handleHudPositions, handleLoadingChange, handleMoveComplete, handleMoveStep, handlePresentationSettled, handleReactionFeedback, handleSelectionChange, handleShotComplete, movePresentation, movementDestinations, overwatchPreview, portraitBlocked, selectedUnitId, shotPresentation]);

  useEffect(() => {
    const uiLayer = document.getElementById("ui_layer");
    const syncUiMargin = () => {
      const bounds = uiLayer?.getBoundingClientRect();
      if (!bounds?.width || !bounds?.height) {
        return;
      }

      uiLayer.style.setProperty("--ui-margin-x", `${(uiMarginPixels / bounds.width) * 100}%`);
      uiLayer.style.setProperty("--ui-margin-y", `${(uiMarginPixels / bounds.height) * 100}%`);
    };

    syncUiMargin();
    window.addEventListener("resize", syncUiMargin);
    return () => window.removeEventListener("resize", syncUiMargin);
  }, []);

  useEffect(() => {
    localStorage.setItem(fullscreenStorageKey, fullscreenPreferred ? "true" : "false");
  }, [fullscreenPreferred]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setFullscreenPreferred(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      } else {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {
      setFullscreenPreferred(false);
    }
  };

  return (
    <>
      {scenePortal}
      <div className="hud-root">
        <div className="corner corner_top_left">
          <div id="project_title" className="corner_body">Zero Company</div>
        </div>

        <div className="corner corner_top_right">
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View the repository on GitHub"
            title="GitHub repository"
            tabIndex={-1}
          >
            <GitFork size={20} />
          </a>
        </div>

        <div className="turn-banner">
          {battle.phase === "enemy" ? "ENEMY TURN" : battle.phase === "result" ? "BATTLE OVER" : "PLAYER TURN"}
        </div>
        {battle.phase === "enemy" && enemyIntent ? (
          <div className="enemy-intent" role="status">
            {battleUnits.get(enemyIntent.unitId)?.label ?? "Enemy"}: {enemyIntent.action.toUpperCase()}
            {enemyIntent.cost > 0 ? ` (${enemyIntent.cost} AP)` : ""}
          </div>
        ) : null}
        <InspectionPanel unit={selectedUnit} />

        <div className="world-hud" aria-hidden={loadState.status !== "ready"}>
          {hudPositions.map((projectedUnit) => {
            const battleUnit = battleUnits.get(projectedUnit.id);
            if (!battleUnit) {
              return null;
            }

            return (
              <UnitHud
                key={projectedUnit.id}
                active={battle.activeUnitId === projectedUnit.id}
                attackPreview={attackPreviews.get(projectedUnit.id)}
                onSelect={(unitId) => handleSelectionChange(battleUnits.get(unitId))}
                selected={selectedUnitId === projectedUnit.id}
                unit={{
                  ...projectedUnit,
                  ...battleUnit,
                  status: getUnitInspection(battle, projectedUnit.id).status,
                  overwatch: battleUnit.overwatch,
                }}
              />
            );
          })}
        </div>

        <nav className="action-bar" aria-label="Tactical actions">
          {actionControls.map(({ id, label, Icon }) => {
            const enabled = id === "end-turn"
              ? battle.phase === "player" && battle.result === null && battle.pendingConfirmation === null && !presentationBusy
              : selectedActions.has(id);
            const active = battle.pendingAction?.action === id;
            const displayLabel = id === "shoot" && selectedUnit
              ? `${label} ${WEAPON_DEFINITIONS[selectedUnit.weaponId]?.apCost ?? 0} AP`
              : id === "overwatch" && selectedUnit
                ? `${label} ${selectedUnit.actionPoints} AP`
              : label;

            return (
              <button
                key={id}
                type="button"
                className={`action-button${active ? " action-button_active" : ""}`}
                aria-disabled={!enabled}
                aria-pressed={active}
                disabled={!enabled}
                data-action={id}
                title={enabled ? displayLabel : `${displayLabel} unavailable`}
                onClick={() => {
                  if (id === "end-turn") {
                    applyCommand({ type: "REQUEST_END_TURN" });
                  } else if (
                    id === "overwatch" &&
                    battle.pendingAction?.action === "overwatch" &&
                    battle.pendingAction?.unitId === selectedUnit?.id
                  ) {
                    playSound("overwatch");
                    applyCommand({
                      type: "CONFIRM_OVERWATCH",
                      unitId: selectedUnit.id,
                    });
                  } else {
                    beginAction(id);
                  }
                }}
              >
                <Icon size={27} strokeWidth={2} />
                <span>{displayLabel}</span>
              </button>
            );
          })}
        </nav>

        <div className="corner corner_bottom_left">
          <section id="settings" aria-labelledby="settings_title">
            <div id="settings_title" className="corner_title">Settings</div>
            <button
              id="fullscreen_toggle"
              className="corner_body settings_option"
              type="button"
              aria-pressed={fullscreenPreferred}
              tabIndex={-1}
              onClick={toggleFullscreen}
            >
              <Maximize size={14} />
              <span>Fullscreen</span>
              {fullscreenPreferred ? <CheckSquare2 size={14} /> : <Square size={14} />}
            </button>
            <button
              id="mute_toggle"
              className="corner_body settings_option"
              type="button"
              aria-pressed={muted}
              tabIndex={-1}
              onClick={() => {
                setMuted(audioRef.current.setMuted(!muted));
              }}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>Mute</span>
              {muted ? <CheckSquare2 size={14} /> : <Square size={14} />}
            </button>
          </section>
        </div>

        <div className="corner corner_bottom_right">
          <span id="version" className="corner_body">v{versionNumber}</span>
        </div>

        {loadState.status === "loading" ? (
          <div className="scene-state" role="status">Preparing battlefield</div>
        ) : null}
        {loadState.status === "error" ? (
          <div className="scene-state scene-state_error" role="alert">
            <RotateCcw size={22} />
            <strong>Battlefield unavailable</strong>
            <span>{loadState.error}</span>
          </div>
        ) : null}

        {battle.pendingConfirmation === "end-turn" ? (
          <div className="confirmation-backdrop">
            <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="end_turn_title">
              <strong id="end_turn_title">Are you sure?</strong>
              <span>Your squad still has action points remaining.</span>
              <div className="confirmation-actions">
                <button type="button" onClick={() => applyCommand({ type: "CANCEL_END_TURN" })}>
                  Cancel
                </button>
                <button type="button" className="confirmation-primary" onClick={() => applyCommand({ type: "CONFIRM_END_TURN" })}>
                  End Turn
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {battle.result ? (
          <div className="confirmation-backdrop result-backdrop">
            <section
              className="confirmation-dialog result-dialog"
              role="dialog"
              aria-labelledby="battle_result_title"
            >
              <strong id="battle_result_title">
                {battle.result === "victory" ? "Victory" : "Defeat"}
              </strong>
              <span>
                {battle.result === "victory"
                  ? "All enemies have been eliminated."
                  : "Your squad has been eliminated."}
              </span>
              <div className="confirmation-actions">
                <button type="button" className="confirmation-primary" onClick={restartBattle}>
                  <RotateCcw size={16} />
                  Restart
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {portraitBlocked ? (
          <div className="orientation-blocker" role="dialog" aria-modal="true">
            <RotateCcw size={34} />
            <strong>Rotate device</strong>
            <span>Zero Company plays in landscape.</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
