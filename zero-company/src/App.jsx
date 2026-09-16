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
} from "lucide-react";
import versionText from "../../version.txt?raw";
import {
  createZeroCompanyScene,
  presentationDescriptors,
} from "./game/index.js";

const fullscreenStorageKey = "babylon-lite-zero-company.fullscreen";
const repositoryUrl = "https://github.com/SamuelAsherRivello/babylon-lite-zero-company";
const portraitQuery = "(orientation: portrait) and (pointer: coarse)";
const uiMarginPixels = 20;

const actionControls = [
  { id: "move", label: "Move", Icon: Move },
  { id: "shoot", label: "Shoot", Icon: Crosshair },
  { id: "overwatch", label: "Overwatch", Icon: Eye },
  { id: "end-turn", label: "End Turn", Icon: SkipForward },
];

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

function GameScene({ inputEnabled, onLoadingChange, onProjectedHudPositions, onSelectionChange }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const game = createZeroCompanyScene(canvasRef.current, {
      onLoadingChange: (state) => {
        canvas.dataset.sceneStatus = state.status;
        onLoadingChange(state);
      },
      onError: (error) => onLoadingChange({ status: "error", error }),
      onReady: ({ descriptors, scene }) => {
        canvas.dataset.unitCount = String(descriptors.units.length);
        canvas.dataset.coverCount = String(descriptors.covers.length);
        canvas.dataset.presentationMeshCount = String(scene.meshes.length);
      },
      onProjectedHudPositions,
      onSelectionChange: (unit) => {
        canvas.dataset.selectedUnit = unit.id;
        onSelectionChange(unit);
      },
      onCameraChange: (cameraState) => {
        canvas.dataset.cameraState = JSON.stringify(cameraState);
      },
    });
    gameRef.current = game;

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [onLoadingChange, onProjectedHudPositions, onSelectionChange]);

  useEffect(() => {
    gameRef.current?.setInputEnabled(inputEnabled);
  }, [inputEnabled]);

  return (
    <canvas
      ref={canvasRef}
      id="game_canvas"
      aria-label="Zero Company tactical battlefield"
    />
  );
}

function UnitHud({ unit }) {
  if (!unit.visible) {
    return null;
  }

  const isPlayer = unit.team === "player";

  return (
    <div
      className={`unit-hud unit-hud_${unit.team}`}
      data-unit-id={unit.id}
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
          {unit.overwatch ? <Eye aria-label="Overwatch" size={14} /> : null}
        </div>
      ) : null}
    </div>
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
        <div><dt>Health</dt><dd>{unit.health}/10</dd></div>
        <div><dt>Weapon</dt><dd>{unit.weapon}</dd></div>
        <div><dt>AP</dt><dd>{unit.actionPoints}</dd></div>
        <div><dt>Overwatch</dt><dd>{unit.overwatch ? "Ready" : "No"}</dd></div>
      </dl>
    </section>
  );
}

export function App() {
  const [fullscreenPreferred, setFullscreenPreferred] = useState(() => {
    return localStorage.getItem(fullscreenStorageKey) === "true";
  });
  const [loadState, setLoadState] = useState({ status: "loading", error: null });
  const [hudPositions, setHudPositions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(() => {
    return presentationDescriptors.units.find(
      (unit) => unit.id === presentationDescriptors.feedback.selectedUnitId,
    );
  });
  const portraitBlocked = usePortraitBlocker();
  const versionNumber = versionText.trim().replace(/^version=/, "").replace(/^v/, "");
  const contentLayer = document.getElementById("content_layer");

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
    setSelectedUnit(unit);
  }, []);

  const scenePortal = useMemo(() => {
    if (!contentLayer) {
      return null;
    }

    return createPortal(
      <GameScene
        inputEnabled={!portraitBlocked}
        onLoadingChange={handleLoadingChange}
        onProjectedHudPositions={handleHudPositions}
        onSelectionChange={handleSelectionChange}
      />,
      contentLayer,
    );
  }, [contentLayer, handleHudPositions, handleLoadingChange, handleSelectionChange, portraitBlocked]);

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

  const ignorePresentationAction = () => {};

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

        <div className="turn-banner">PLAYER TURN</div>
        <InspectionPanel unit={selectedUnit} />

        <div className="world-hud" aria-hidden={loadState.status !== "ready"}>
          {hudPositions.map((unit) => <UnitHud key={unit.id} unit={unit} />)}
        </div>

        <nav className="action-bar" aria-label="Tactical actions">
          {actionControls.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="action-button"
              aria-disabled="true"
              data-action={id}
              title={`${label} is available in the gameplay milestone`}
              onClick={ignorePresentationAction}
            >
              <Icon size={27} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
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
