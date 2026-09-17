import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const baseUrl = process.env.ZERO_COMPANY_URL ?? "http://127.0.0.1:5176/babylon-lite-zero-company/";
const evidenceDirectory = fileURLToPath(new URL("../../.playwright-cli/evidence/", import.meta.url));
const desktopScreenshot = fileURLToPath(new URL("../documentation/screenshot01.png", import.meta.url));

await mkdir(evidenceDirectory, { recursive: true });

function monitorPage(page) {
  const problems = [];
  const externalRequests = [];
  const audioRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.includes("/assets/audio/")) {
      audioRequests.push(requestUrl.pathname);
    }
    if (requestUrl.protocol !== "data:" && requestUrl.hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
  });

  return { problems, externalRequests, audioRequests };
}

async function blockExternalOrigins(context) {
  const allowedOrigin = new URL(baseUrl).origin;
  await context.route("**/*", (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.protocol === "data:" || requestUrl.origin === allowedOrigin) {
      return route.continue();
    }
    return route.abort("blockedbyclient");
  });
}

async function waitForScene(page) {
  await page.locator('#game_canvas[data-scene-status="ready"]').waitFor({ timeout: 20_000 });
  await page.locator(".scene-state").waitFor({ state: "detached", timeout: 5_000 });
  await page.waitForTimeout(250);
}

async function cameraState(page) {
  const value = await page.locator("#game_canvas").getAttribute("data-camera-state");
  assert.ok(value, "camera state must be observable after scene readiness");
  return JSON.parse(value);
}

async function canvasPixelStats(page) {
  return page.locator("#game_canvas").evaluate((canvas) => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const buckets = new Set();
        let visibleSamples = 0;
        let sum = 0;
        let squaredSum = 0;
        let samples = 0;
        const stride = Math.max(1, Math.floor((width * height) / 30_000));

        for (let pixel = 0; pixel < width * height; pixel += stride) {
          const index = pixel * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
          if (alpha > 0 && red + green + blue > 12) {
            visibleSamples += 1;
          }
          buckets.add(`${red >> 5}-${green >> 5}-${blue >> 5}`);
          sum += luminance;
          squaredSum += luminance * luminance;
          samples += 1;
        }

        const mean = sum / samples;
        resolve({
          width,
          height,
          visibleSamples,
          colorBuckets: buckets.size,
          variance: squaredSum / samples - mean * mean,
        });
      });
    });
  });
}

async function selectUnit(page, unitId) {
  await page.locator(`[data-unit-id="${unitId}"]`).click();
  await page.waitForFunction((expectedUnitId) => {
    return document.querySelector("#game_canvas").dataset.selectedUnit === expectedUnitId;
  }, unitId);
}

async function focusUnitOnCanvas(page, unitId) {
  const projected = await page.locator(`[data-unit-id="${unitId}"]`).evaluate((element) => ({
    x: Number.parseFloat(element.style.left),
    y: Number.parseFloat(element.style.top),
  }));
  for (const yOffset of [22, 36, 50, 64]) {
    await page.locator("#game_canvas").evaluate((canvas, point) => {
      const bounds = canvas.getBoundingClientRect();
      const fire = (type, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 77,
        pointerType: "mouse",
        button: 0,
        buttons,
        clientX: bounds.left + point.x,
        clientY: bounds.top + point.y,
      }));
      fire("pointerdown", 1);
      fire("pointerup", 0);
    }, { x: projected.x, y: projected.y + yOffset });
    await page.waitForTimeout(80);
    if (await page.locator("#game_canvas").getAttribute("data-selected-unit") === unitId) {
      return;
    }
  }
  assert.fail(`could not focus ${unitId} from its projected battlefield anchor`);
}

async function verifyHudAlignment(page) {
  const frame = await page.locator("#content_layer").boundingBox();
  const huds = await page.locator(".unit-hud").evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        id: element.dataset.unitId,
        label: element.getAttribute("aria-label"),
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
      };
    }),
  );
  assert.equal(huds.length, 6);
  assert.equal(new Set(huds.map((hud) => hud.id)).size, 6);
  for (const hud of huds) {
    assert.match(hud.label, /^Inspect /);
    assert.ok(hud.left >= frame.x - 1 && hud.right <= frame.x + frame.width + 1);
    assert.ok(hud.top >= frame.y - 1 && hud.bottom <= frame.y + frame.height + 1);
  }
  const actionBar = await page.locator(".action-bar").boundingBox();
  assert.ok(actionBar.x >= frame.x && actionBar.x + actionBar.width <= frame.x + frame.width);
  assert.ok(actionBar.y >= frame.y && actionBar.y + actionBar.height <= frame.y + frame.height);
}

async function verifyOperationConfirmation(page) {
  const confirm = await page.getByRole("button", { name: "Confirm?" }).boundingBox();
  const cancel = await page.getByRole("button", { name: "Cancel" }).boundingBox();
  const actions = await page.locator(".action-button").evaluateAll((buttons) => (
    buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        height: bounds.height,
      };
    })
  ));
  assert.equal(actions.length, 4);
  assert.ok(Math.abs(confirm.x - actions[0].left) < 1);
  assert.ok(Math.abs(cancel.x + cancel.width - actions.at(-1).right) < 1);
  assert.ok(Math.abs(confirm.height - actions[0].height) < 1);
  assert.ok(Math.abs(cancel.height - actions[0].height) < 1);
  assert.ok(confirm.y + confirm.height < actions[0].top);
  assert.ok(cancel.y + cancel.height < actions[0].top);
}

async function verifyResultAndRestart(
  browser,
  scenario,
  expectedResult,
  contextOptions = { viewport: { width: 1600, height: 900 } },
) {
  const context = await browser.newContext(contextOptions);
  await blockExternalOrigins(context);
  const page = await context.newPage();
  const monitor = monitorPage(page);
  const url = new URL(baseUrl);
  url.searchParams.set("e2e-result", scenario);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await waitForScene(page);

  if (scenario === "victory") {
    await selectUnit(page, "player-1");
    await page.getByRole("button", { name: /Shoot 1 AP/ }).click();
    await page.locator('[data-unit-id="enemy-1"]').click();
    await page.getByRole("button", { name: "Confirm?" }).click();
  } else {
    await page.getByRole("button", { name: "End Turn" }).click();
    await page.getByRole("button", { name: "Confirm?" }).click();
  }

  const resultName = expectedResult === "victory" ? "Victory" : "Defeat";
  await page.getByRole("dialog", { name: resultName }).waitFor({ timeout: 10_000 });
  const terminal = JSON.parse(await page.locator("#game_canvas").getAttribute("data-battle-state"));
  assert.equal(terminal.phase, "result");
  assert.equal(terminal.result, expectedResult);
  assert.equal(terminal.activeUnitId, null);
  assert.equal(terminal.pendingResolution, null);
  assert.equal(
    terminal.units.find((unit) => unit.id === (scenario === "victory" ? "player-1" : "enemy-1"))
      .actionPoints,
    2,
    "the decisive one-AP shot must be reflected in terminal state",
  );
  assert.equal(await page.locator(".action-button:enabled").count(), 0);
  await page.waitForFunction(() => {
    const states = JSON.parse(document.querySelector("#game_canvas").dataset.unitPresentationStates ?? "[]");
    return states.filter((unit) => unit.status === "dead").length === 3;
  });

  for (const unitId of [
    "player-1",
    "player-2",
    "player-3",
    "enemy-1",
    "enemy-2",
    "enemy-3",
  ]) {
    await selectUnit(page, unitId);
    assert.equal(await page.locator("#game_canvas").getAttribute("data-selected-unit"), unitId);
    const terminalUnit = terminal.units.find((unit) => unit.id === unitId);
    const inspection = await page.locator(".inspection-panel").innerText();
    assert.match(inspection, new RegExp(terminalUnit.label));
    assert.match(inspection, new RegExp(`Health\\s+${terminalUnit.health}/${terminalUnit.maxHealth}`));
    if (terminalUnit.health === 0) {
      assert.match(inspection, /Status\s+Dead/);
      if (terminalUnit.team === "player") {
        assert.match(inspection, /Actions\s+None/);
      }
    }
  }

  if (!contextOptions.hasTouch) {
    const frame = await page.locator("#content_layer").boundingBox();
    const cameraBefore = await cameraState(page);
    await page.mouse.move(frame.x + frame.width * 0.8, frame.y + frame.height * 0.68);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(frame.x + frame.width * 0.86, frame.y + frame.height * 0.72, { steps: 6 });
    await page.mouse.up({ button: "right" });
    await page.mouse.wheel(0, -260);
    await page.waitForTimeout(100);
    const cameraAfter = await cameraState(page);
    assert.notEqual(cameraAfter.alpha, cameraBefore.alpha);
    assert.ok(cameraAfter.radius < cameraBefore.radius);
  }

  await page.waitForTimeout(250);
  assert.deepEqual(
    JSON.parse(await page.locator("#game_canvas").getAttribute("data-battle-state")),
    terminal,
    "terminal result must stop queued actions",
  );

  await page.getByRole("button", { name: "Restart" }).click();
  await page.getByRole("dialog", { name: resultName }).waitFor({ state: "detached" });
  await page.getByText("PLAYER TURN", { exact: true }).waitFor();
  const restarted = JSON.parse(await page.locator("#game_canvas").getAttribute("data-battle-state"));
  assert.equal(restarted.phase, "player");
  assert.equal(restarted.result, null);
  assert.equal(restarted.round, 1);
  assert.equal(restarted.selectedUnitId, "player-2");
  assert.equal(restarted.activeUnitId, null);
  assert.equal(restarted.pendingAction, null);
  assert.equal(restarted.pendingConfirmation, null);
  assert.deepEqual(restarted.enemyActivationOrder, []);
  assert.equal(restarted.enemyActivationIndex, -1);
  assert.deepEqual(restarted.random, restarted.initialRandom);
  assert.deepEqual(
    restarted.units.map((unit) => ({
      id: unit.id,
      cell: unit.cell,
      health: unit.health,
      weaponId: unit.weaponId,
      actionPoints: unit.actionPoints,
      activity: unit.activity,
      overwatch: unit.overwatch,
    })),
    [
      { id: "player-1", cell: { column: 2, row: 1 }, health: 10, weaponId: "short", actionPoints: 3, activity: null, overwatch: null },
      { id: "player-2", cell: { column: 6, row: 1 }, health: 10, weaponId: "balanced", actionPoints: 3, activity: null, overwatch: null },
      { id: "player-3", cell: { column: 10, row: 1 }, health: 10, weaponId: "long", actionPoints: 3, activity: null, overwatch: null },
      { id: "enemy-1", cell: { column: 2, row: 6 }, health: 10, weaponId: "balanced", actionPoints: 0, activity: null, overwatch: null },
      { id: "enemy-2", cell: { column: 6, row: 6 }, health: 10, weaponId: "short", actionPoints: 0, activity: null, overwatch: null },
      { id: "enemy-3", cell: { column: 10, row: 6 }, health: 10, weaponId: "long", actionPoints: 0, activity: null, overwatch: null },
    ],
  );
  await page.locator('#game_canvas[data-selected-unit="player-2"]').waitFor();
  assert.deepEqual(monitor.externalRequests, []);
  assert.deepEqual(monitor.problems, []);
  await context.close();
}

async function verifyBlockedAudioFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = async () => {
      throw new DOMException("Playback blocked", "NotAllowedError");
    };
  });
  const page = await context.newPage();
  const monitor = monitorPage(page);
  const url = new URL(baseUrl);
  url.searchParams.set("e2e-result", "victory");
  await page.goto(url.href, { waitUntil: "networkidle" });
  await waitForScene(page);
  await selectUnit(page, "player-1");
  await page.getByRole("button", { name: /Shoot 1 AP/ }).click();
  await page.locator('[data-unit-id="enemy-1"]').click();
  await page.getByRole("button", { name: "Confirm?" }).click();
  await page.getByRole("dialog", { name: "Victory" }).waitFor({ timeout: 10_000 });
  assert.deepEqual(monitor.problems, []);
  assert.deepEqual(monitor.externalRequests, []);
  await context.close();
}

async function verifyPresentationFailureFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const monitor = monitorPage(page);
  const url = new URL(baseUrl);
  url.searchParams.set("e2e-presentation-failure", "move");
  await page.goto(url.href, { waitUntil: "networkidle" });
  await waitForScene(page);
  await selectUnit(page, "player-2");
  await page.getByRole("button", { name: "Move" }).click();
  await page.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  const targets = JSON.parse(
    await page.locator("#game_canvas").getAttribute("data-movement-destinations"),
  );
  const target = targets.find((candidate) => candidate.cost === 1);
  const frame = await page.locator("#content_layer").boundingBox();
  await page.mouse.click(frame.x + target.x, frame.y + target.y);
  await page.getByRole("button", { name: "Confirm?" }).click();
  await page.waitForFunction(([column, row]) => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    const unit = state.units.find((candidate) => candidate.id === "player-2");
    return unit.actionPoints === 2 && unit.cell.column === column && unit.cell.row === row;
  }, [target.column, target.row]);
  assert.equal(
    await page.locator("#game_canvas").getAttribute("data-presentation-fallback"),
    "move",
  );
  assert.equal(await page.getByRole("button", { name: "Move" }).isEnabled(), true);
  assert.deepEqual(monitor.problems, []);
  assert.deepEqual(monitor.externalRequests, []);
  await context.close();
}

async function verifyReducedMotionPresentation(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const monitor = monitorPage(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForScene(page);
  assert.equal(
    await page.locator("#game_canvas").getAttribute("data-reduced-motion"),
    "true",
  );
  await selectUnit(page, "player-2");
  await page.getByRole("button", { name: "Move" }).click();
  await page.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  const targets = JSON.parse(
    await page.locator("#game_canvas").getAttribute("data-movement-destinations"),
  );
  const target = targets.find((candidate) => candidate.cost === 1 && candidate.steps >= 3);
  const frame = await page.locator("#content_layer").boundingBox();
  await page.mouse.click(frame.x + target.x, frame.y + target.y);
  const startedAt = Date.now();
  await page.getByRole("button", { name: "Confirm?" }).click();
  await page.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.units.find((unit) => unit.id === "player-2").actionPoints === 2;
  });
  assert.ok(Date.now() - startedAt < 900, "reduced-motion move should use shortened timing");
  assert.deepEqual(monitor.problems, []);
  assert.deepEqual(monitor.externalRequests, []);
  await context.close();
}

async function verifyReactionPresentation(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const monitor = monitorPage(page);
  const url = new URL(baseUrl);
  url.searchParams.set("e2e-result", "reaction");
  await page.goto(url.href, { waitUntil: "networkidle" });
  await waitForScene(page);
  await page.waitForFunction(() => {
    const history = JSON.parse(
      document.querySelector("#game_canvas").dataset.reactionFeedbackHistory ?? "[]",
    );
    return history.length > 0;
  }, null, { timeout: 12_000 });
  const reactionHistory = JSON.parse(
    await page.locator("#game_canvas").getAttribute("data-reaction-feedback-history"),
  );
  const presentedReaction = reactionHistory[0];
  assert.equal(presentedReaction.reactorId, "player-1");
  assert.equal(presentedReaction.moverId, "enemy-1");
  assert.ok(Number.isInteger(presentedReaction.completedCell?.column));
  assert.ok(Number.isInteger(presentedReaction.completedCell?.row));
  await page.waitForFunction(() => {
    const events = JSON.parse(
      document.querySelector("#game_canvas").dataset.presentationEvents ?? "[]",
    );
    return events.some((event) => event.type === "shot-complete" && event.reaction === true);
  });
  const presentationEvents = JSON.parse(
    await page.locator("#game_canvas").getAttribute("data-presentation-events"),
  );
  const stepCompleteIndex = presentationEvents.findIndex((event) => (
    event.type === "move-step-complete" &&
    event.unitId === presentedReaction.moverId &&
    event.cell?.column === presentedReaction.completedCell.column &&
    event.cell?.row === presentedReaction.completedCell.row
  ));
  const reactionFacingIndex = presentationEvents.findIndex((event, index) => (
    index > stepCompleteIndex &&
    event.type === "shot-facing" &&
    event.reaction === true &&
    event.shooterId === presentedReaction.reactorId &&
    event.targetId === presentedReaction.moverId
  ));
  const reactionCompleteIndex = presentationEvents.findIndex((event, index) => (
    index > reactionFacingIndex &&
    event.type === "shot-complete" &&
    event.reaction === true &&
    event.shooterId === presentedReaction.reactorId &&
    event.targetId === presentedReaction.moverId
  ));
  const nextMoveIndex = presentationEvents.findIndex((event, index) => (
    index > reactionFacingIndex &&
    event.type === "move-step-started" &&
    event.unitId === presentedReaction.moverId
  ));
  assert.ok(stepCompleteIndex >= 0 && reactionFacingIndex > stepCompleteIndex);
  assert.ok(reactionCompleteIndex > reactionFacingIndex);
  assert.ok(nextMoveIndex === -1 || nextMoveIndex > reactionCompleteIndex);
  assert.deepEqual(monitor.problems, []);
  assert.deepEqual(monitor.externalRequests, []);
  await context.close();
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const desktop = await desktopContext.newPage();
  const desktopMonitor = monitorPage(desktop);
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForScene(desktop);

  const muteToggle = desktop.locator("#mute_toggle");
  assert.equal(await muteToggle.getAttribute("aria-pressed"), "false");
  await muteToggle.click();
  assert.equal(await muteToggle.getAttribute("aria-pressed"), "true");
  await desktop.reload({ waitUntil: "networkidle" });
  await waitForScene(desktop);
  assert.equal(await desktop.locator("#mute_toggle").getAttribute("aria-pressed"), "true");
  await desktop.getByRole("button", { name: "Move" }).click();
  await desktop.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  const mutedMoveTargets = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-movement-destinations"),
  );
  const mutedMoveTarget = mutedMoveTargets.find((target) => target.cost === 1);
  const mutedMoveFrame = await desktop.locator("#content_layer").boundingBox();
  await desktop.mouse.click(
    mutedMoveFrame.x + mutedMoveTarget.x,
    mutedMoveFrame.y + mutedMoveTarget.y,
  );
  await desktop.locator("#operation_confirmation").waitFor();
  assert.equal(await desktop.getByRole("button", { name: "Confirm?" }).count(), 1);
  assert.equal(await desktop.getByRole("button", { name: "Cancel" }).count(), 1);
  await verifyOperationConfirmation(desktop);
  const stagedMutedMove = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(stagedMutedMove.units.find((unit) => unit.id === "player-2").actionPoints, 3);
  assert.deepEqual(stagedMutedMove.pendingAction.targetCell, {
    column: mutedMoveTarget.column,
    row: mutedMoveTarget.row,
  });
  await desktop.screenshot({
    path: `${evidenceDirectory}/confirmation-desktop.png`,
    fullPage: true,
  });
  await desktop.getByRole("button", { name: "Confirm?" }).click();
  await desktop.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.units.find((unit) => unit.id === "player-2").actionPoints === 2;
  });
  await desktop.reload({ waitUntil: "networkidle" });
  await waitForScene(desktop);
  assert.equal(await desktop.locator("#mute_toggle").getAttribute("aria-pressed"), "true");
  await desktop.locator("#mute_toggle").click();
  assert.equal(await desktop.locator("#mute_toggle").getAttribute("aria-pressed"), "false");

  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-unit-count"), "6");
  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-cover-count"), "3");
  assert.equal(await desktop.locator(".unit-hud").count(), 6);
  assert.equal(await desktop.locator(".action-button").count(), 4);

  const desktopFrame = await desktop.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(desktopFrame.width / desktopFrame.height - 16 / 9) < 0.002);
  await verifyHudAlignment(desktop);
  const pixels = await canvasPixelStats(desktop);
  assert.ok(pixels.visibleSamples > 2_000, `canvas visible samples were ${pixels.visibleSamples}`);
  assert.ok(pixels.colorBuckets > 12, `canvas color buckets were ${pixels.colorBuckets}`);
  assert.ok(pixels.variance > 40, `canvas luminance variance was ${pixels.variance}`);
  await desktop.screenshot({ path: desktopScreenshot, fullPage: true });

  await desktop.setViewportSize({ width: 1920, height: 900 });
  const wideFrame = await desktop.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(wideFrame.width / wideFrame.height - 16 / 9) < 0.002);
  assert.ok(wideFrame.x > 0 && wideFrame.y === 0);
  await desktop.screenshot({ path: `${evidenceDirectory}/desktop-wide.png`, fullPage: true });

  await desktop.setViewportSize({ width: 1200, height: 900 });
  const shortFrame = await desktop.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(shortFrame.width / shortFrame.height - 16 / 9) < 0.002);
  assert.ok(shortFrame.x === 0 && shortFrame.y > 0);
  await desktop.screenshot({ path: `${evidenceDirectory}/desktop-short.png`, fullPage: true });
  await desktop.setViewportSize({ width: 1600, height: 900 });
  await desktop.waitForTimeout(120);
  await verifyHudAlignment(desktop);

  assert.equal(await desktop.locator('.unit-hud[data-unit-status="Idle"]').count(), 6);
  await desktop.waitForFunction(() => {
    const states = JSON.parse(document.querySelector("#game_canvas").dataset.unitPresentationStates ?? "[]");
    return states.length === 6 && states.every((unit) => unit.status === "idle");
  });
  for (const unitId of ["player-1", "player-2", "player-3"]) {
    await selectUnit(desktop, unitId);
    await desktop.locator(".inspection-panel").getByText("Idle", { exact: true }).waitFor();
    assert.equal(await desktop.locator('.action-button:not([data-action="end-turn"]):enabled').count(), 3);
  }
  for (const unitId of ["enemy-1", "enemy-2", "enemy-3"]) {
    await selectUnit(desktop, unitId);
    await desktop.locator(".inspection-panel").getByText("Idle", { exact: true }).waitFor();
    assert.equal(await desktop.locator('.action-button:not([data-action="end-turn"]):enabled').count(), 0);
  }
  await selectUnit(desktop, "player-2");

  await desktop.getByRole("button", { name: "Move" }).click();
  await desktop.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  const movementTargets = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-movement-destinations"),
  );
  const oneApTarget = movementTargets.find(
    (target) => target.column === 9 && target.row === 0,
  );
  assert.ok(oneApTarget?.steps >= 3, "Move targeting must expose a multi-step one-AP destination.");
  const movementFrame = await desktop.locator("#content_layer").boundingBox();
  const alternateMoveTarget = movementTargets.find((target) => (
    target.cost === 1 &&
    (target.column !== oneApTarget.column || target.row !== oneApTarget.row)
  ));
  assert.ok(alternateMoveTarget, "Move targeting must expose a retargeting alternative.");
  await desktop.mouse.click(
    movementFrame.x + alternateMoveTarget.x,
    movementFrame.y + alternateMoveTarget.y,
  );
  await desktop.waitForFunction(([column, row]) => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.pendingAction?.targetCell?.column === column &&
      state.pendingAction?.targetCell?.row === row;
  }, [alternateMoveTarget.column, alternateMoveTarget.row]);
  await desktop.mouse.click(movementFrame.x + oneApTarget.x, movementFrame.y + oneApTarget.y);
  await desktop.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(desktop);
  const stagedMove = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(stagedMove.units.find((unit) => unit.id === "player-2").actionPoints, 3);
  assert.deepEqual(stagedMove.pendingAction.targetCell, {
    column: oneApTarget.column,
    row: oneApTarget.row,
  });
  assert.equal(await desktop.locator(".action-button:enabled").count(), 0);
  await desktop.getByRole("button", { name: "Confirm?" }).click();
  await desktop.locator('#game_canvas[data-movement-destination-count="0"]').waitFor();
  await desktop.waitForFunction(() => {
    const states = JSON.parse(document.querySelector("#game_canvas").dataset.unitPresentationStates ?? "[]");
    return states.find((unit) => unit.id === "player-2")?.status === "moving";
  });
  await desktop.locator('[data-unit-id="player-2"] .unit-status-line').getByText("2 AP", { exact: true }).waitFor();
  assert.match(await desktop.locator(".inspection-panel").innerText(), /AP\s+2/);
  await desktop.waitForFunction(() => !document.querySelector('[data-action="move"]').disabled);
  const visitedMoveCells = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-move-visited-cells"),
  );
  assert.equal(visitedMoveCells.length, oneApTarget.steps);
  assert.deepEqual(visitedMoveCells.at(-1), {
    column: oneApTarget.column,
    row: oneApTarget.row,
  });

  await desktop.getByRole("button", { name: /Shoot 1 AP/ }).click();
  await desktop.locator('.unit-hud[data-valid-target="true"]').first().waitFor();
  await desktop.locator(".attack-preview_blocked").first().waitFor();
  const validShootTargetIds = await desktop
    .locator('.unit-hud[data-valid-target="true"]')
    .evaluateAll((targets) => targets.map((target) => target.dataset.unitId));
  let shootTargetId = validShootTargetIds[0];
  await desktop.locator(`[data-unit-id="${shootTargetId}"]`).click();
  if (validShootTargetIds.length > 1) {
    shootTargetId = validShootTargetIds[1];
    await desktop.locator(`[data-unit-id="${shootTargetId}"]`).click();
  }
  await desktop.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(desktop);
  const stagedShot = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(stagedShot.pendingAction.targetId, shootTargetId);
  assert.equal(stagedShot.units.find((unit) => unit.id === "player-2").actionPoints, 2);
  assert.equal(stagedShot.units.find((unit) => unit.id === shootTargetId).health, 10);
  await desktop.getByRole("button", { name: "Confirm?" }).click();
  await desktop.waitForFunction(() => Boolean(document.querySelector("#game_canvas").dataset.lastShot));
  let shotEvidence = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-last-shot"),
  );
  assert.equal(
    await desktop.locator('[data-unit-id="player-2"]').getAttribute("data-unit-status"),
    "Shooting",
  );
  await desktop.waitForFunction(() =>
    Number(document.querySelector("#game_canvas").dataset.shotParticleCount) > 0,
  );
  if (shotEvidence.hit) {
    assert.equal(
      await desktop.locator(`[data-unit-id="${shootTargetId}"]`).getAttribute("data-unit-status"),
      "Taking Damage",
    );
  }
  const alternateTargetId = shootTargetId === "enemy-3" ? "enemy-2" : "enemy-3";
  await selectUnit(desktop, alternateTargetId);
  assert.equal(
    JSON.parse(await desktop.locator("#game_canvas").getAttribute("data-last-shot")).targetId,
    shootTargetId,
  );
  await desktop.locator('#game_canvas[data-shot-status="complete"]').waitFor();
  const postShotBattle = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(postShotBattle.units.find((unit) => unit.id === "player-2").actionPoints, 1);
  shotEvidence = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-last-shot"),
  );
  assert.equal(shotEvidence.shooterId, "player-2");
  assert.equal(shotEvidence.targetId, shootTargetId);
  assert.ok(typeof shotEvidence.hit === "boolean");
  assert.ok(shotEvidence.damage >= 0);
  assert.equal(postShotBattle.units.find((unit) => unit.id === "player-2").activity, null);
  assert.equal(postShotBattle.units.find((unit) => unit.id === shootTargetId).activity, null);
  await selectUnit(desktop, "player-3");

  const beforeSelectionCancel = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  await desktop.getByRole("button", { name: "Move" }).click();
  await desktop.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  await selectUnit(desktop, "player-2");
  await desktop.locator('#game_canvas[data-movement-destination-count="0"]').waitFor();
  const afterSelectionCancel = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(afterSelectionCancel.pendingAction, null);
  assert.deepEqual(afterSelectionCancel.units, beforeSelectionCancel.units);
  assert.equal(afterSelectionCancel.phase, beforeSelectionCancel.phase);
  assert.deepEqual(afterSelectionCancel.random, beforeSelectionCancel.random);

  await selectUnit(desktop, "player-3");
  await desktop.getByRole("button", { name: "Move" }).click();
  const beforeActionSwitch = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  await desktop.getByRole("button", { name: /Shoot 2 AP/ }).click();
  const afterActionSwitch = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(afterActionSwitch.pendingAction.action, "shoot");
  assert.deepEqual(afterActionSwitch.units, beforeActionSwitch.units);

  await desktop.getByRole("button", { name: /Overwatch 3 AP/ }).click();
  await desktop.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.pendingAction?.action === "overwatch";
  });
  const overwatchAimPoints = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-overwatch-aim-points"),
  );
  const overwatchFrame = await desktop.locator("#content_layer").boundingBox();
  await desktop.locator("#game_canvas").evaluate((canvas, points) => {
    let currentPoint = points[0];
    const fire = (type, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 91,
      pointerType: "mouse",
      button: 0,
      buttons,
      clientX: currentPoint.x,
      clientY: currentPoint.y,
    }));
    for (const point of points) {
      currentPoint = point;
      fire("pointerdown", 1);
      fire("pointerup", 0);
    }
  }, [
    ...overwatchAimPoints.filter((point) => !(point.column === 6 && point.row === 7)),
    overwatchAimPoints.find((point) => point.column === 6 && point.row === 7),
  ].map((point) => ({
    x: overwatchFrame.x + point.x,
    y: overwatchFrame.y + point.y,
  })));
  await desktop.waitForFunction(() => Boolean(document.querySelector("#game_canvas").dataset.lastWorldPick));
  await desktop.waitForFunction(() => document.querySelector("#game_canvas").dataset.overwatchPreview !== "null");
  await desktop.waitForFunction(() => document.querySelector("#game_canvas").dataset.renderedOverwatchTip !== "null");
  const coneOrigin = JSON.parse(await desktop.locator("#game_canvas").getAttribute("data-overwatch-origin-point"));
  const coneTarget = JSON.parse(await desktop.locator("#game_canvas").getAttribute("data-overwatch-target-point"));
  const coneTip = JSON.parse(await desktop.locator("#game_canvas").getAttribute("data-rendered-overwatch-tip"));
  const targetVector = { x: coneTarget.x - coneOrigin.x, y: coneTarget.y - coneOrigin.y };
  const tipVector = { x: coneTip.x - coneOrigin.x, y: coneTip.y - coneOrigin.y };
  const coneDirectionCosine =
    (targetVector.x * tipVector.x + targetVector.y * tipVector.y) /
    (Math.hypot(targetVector.x, targetVector.y) * Math.hypot(tipVector.x, tipVector.y));
  assert.ok(coneDirectionCosine > 0.8, `rendered cone direction cosine was ${coneDirectionCosine}`);
  const aimedBattle = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(aimedBattle.units.find((unit) => unit.id === "player-3").actionPoints, 3);
  await desktop.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(desktop);
  assert.equal(await desktop.getByRole("button", { name: /Overwatch 3 AP/ }).isDisabled(), true);
  await desktop.getByRole("button", { name: "Confirm?" }).click();
  await desktop.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.units.find((unit) => unit.id === "player-3").overwatch?.shotsRemaining === 3;
  });
  const committedBattle = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(committedBattle.units.find((unit) => unit.id === "player-3").actionPoints, 0);
  assert.equal(
    await desktop.locator('[data-unit-id="player-3"]').getAttribute("data-unit-status"),
    "Overwatch",
  );
  await desktop.locator('#game_canvas[data-overwatch-cone-count="1"]').waitFor();
  await desktop.waitForFunction(() => {
    const states = JSON.parse(document.querySelector("#game_canvas").dataset.unitPresentationStates ?? "[]");
    return states.find((unit) => unit.id === "player-3")?.status === "overwatch";
  });
  await selectUnit(desktop, "player-1");

  const initialCamera = await cameraState(desktop);
  const actionSnapshot = {
    selected: await desktop.locator("#game_canvas").getAttribute("data-selected-unit"),
    camera: initialCamera,
    inspection: await desktop.locator(".inspection-panel").innerText(),
  };
  for (const label of ["Move", "Shoot", "Overwatch"]) {
    await desktop.getByRole("button", { name: label }).dispatchEvent("click");
  }
  assert.deepEqual(await cameraState(desktop), actionSnapshot.camera);
  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-selected-unit"), actionSnapshot.selected);
  assert.equal(await desktop.locator(".inspection-panel").innerText(), actionSnapshot.inspection);
  const pendingActionBeforeEndTurn = await desktop.locator(".action-button_active").getAttribute("data-action");
  assert.equal(pendingActionBeforeEndTurn, "overwatch");

  await desktop.getByRole("button", { name: "End Turn" }).click();
  await desktop.locator("#operation_confirmation").waitFor();
  await desktop.getByRole("button", { name: "Cancel" }).click();
  await desktop.locator("#operation_confirmation").waitFor({ state: "detached" });
  await desktop.getByText("PLAYER TURN", { exact: true }).waitFor();
  assert.equal(await desktop.locator(".action-button_active").count(), 0);

  await desktop.getByRole("button", { name: "End Turn" }).click();
  await desktop.locator("#operation_confirmation").waitFor();
  await desktop.getByRole("button", { name: "Confirm?" }).click();
  await desktop.getByText("ENEMY TURN", { exact: true }).waitFor();
  await desktop.locator('.unit-hud_active[data-unit-id="enemy-1"]').waitFor();
  assert.equal(await desktop.locator(".action-button:enabled").count(), 0);
  await selectUnit(desktop, "player-1");
  await desktop.getByText("Vanguard", { exact: true }).waitFor();
  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-selected-unit"), "player-1");
  assert.equal(await desktop.locator(".action-button:enabled").count(), 0);
  await desktop.getByText("ENEMY TURN", { exact: true }).waitFor();
  await desktop.getByRole("button", { name: "Move" }).dispatchEvent("click");
  assert.equal(await desktop.locator(".action-button_active").count(), 0);
  await desktop.locator('.unit-hud_active[data-unit-id="enemy-2"]').waitFor({ timeout: 12_000 });
  await desktop.locator('.unit-hud_active[data-unit-id="enemy-3"]').waitFor({ timeout: 12_000 });
  await desktop.getByText("PLAYER TURN", { exact: true }).waitFor({ timeout: 12_000 });
  await desktop.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.phase === "player" &&
      state.units
        .filter((unit) => unit.team === "player" && unit.health > 0)
        .every((unit) => unit.actionPoints === 3);
  });
  const enemyIntentHistory = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-enemy-intent-history"),
  );
  assert.deepEqual(
    [...new Set(enemyIntentHistory.map((intent) => intent.unitId))],
    ["enemy-1", "enemy-2", "enemy-3"],
  );
  assert.ok(
    enemyIntentHistory.some((intent) => ["move", "shoot", "overwatch"].includes(intent.action)),
  );
  const refreshedBattle = JSON.parse(
    await desktop.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  const refreshedPlayerThree = refreshedBattle.units.find((unit) => unit.id === "player-3");
  assert.equal(refreshedPlayerThree.overwatch, null);
  assert.equal(refreshedPlayerThree.actionPoints, refreshedPlayerThree.health > 0 ? 3 : 0);
  assert.ok(
    refreshedBattle.units
      .filter((unit) => unit.team === "player" && unit.health > 0)
      .every((unit) => unit.actionPoints === 3),
  );
  await focusUnitOnCanvas(desktop, "enemy-1");
  const focusedCamera = await cameraState(desktop);
  assert.equal(focusedCamera.alpha, initialCamera.alpha);
  assert.equal(focusedCamera.beta, initialCamera.beta);
  assert.equal(focusedCamera.radius, initialCamera.radius);
  assert.notDeepEqual(focusedCamera.target, initialCamera.target);
  await desktop.getByText("Enemy Rifleman", { exact: true }).waitFor();

  await desktop.mouse.move(desktopFrame.x + desktopFrame.width / 2, desktopFrame.y + desktopFrame.height / 2);
  await desktop.mouse.down({ button: "right" });
  await desktop.mouse.move(desktopFrame.x + desktopFrame.width / 2 + 130, desktopFrame.y + desktopFrame.height / 2 + 35, { steps: 8 });
  await desktop.mouse.up({ button: "right" });
  const orbitedCamera = await cameraState(desktop);
  assert.notEqual(orbitedCamera.alpha, focusedCamera.alpha);
  assert.notEqual(orbitedCamera.beta, focusedCamera.beta);

  await desktop.mouse.wheel(0, -320);
  await desktop.waitForTimeout(80);
  const zoomedCamera = await cameraState(desktop);
  assert.ok(zoomedCamera.radius < orbitedCamera.radius);

  const contextMenuCancelled = await desktop.locator("#game_canvas").evaluate((canvas) => {
    return !canvas.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  });
  assert.equal(contextMenuCancelled, true);

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const mobile = await mobileContext.newPage();
  await mobile.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, get: () => 5 });
  });
  const mobileMonitor = monitorPage(mobile);
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForScene(mobile);
  await mobile.getByText("Rotate device", { exact: true }).waitFor();
  const portraitCamera = await cameraState(mobile);
  await mobile.locator("#game_canvas").dispatchEvent("wheel", { deltaY: -300 });
  assert.deepEqual(await cameraState(mobile), portraitCamera);
  await mobile.screenshot({ path: `${evidenceDirectory}/mobile-portrait.png`, fullPage: true });

  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByText("Rotate device", { exact: true }).waitFor({ state: "detached" });
  await mobile.waitForTimeout(120);
  let mobileFrame = await mobile.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(mobileFrame.width / mobileFrame.height - 16 / 9) < 0.002);
  await verifyHudAlignment(mobile);
  await mobile.screenshot({ path: `${evidenceDirectory}/mobile-landscape-initial.png`, fullPage: true });

  await mobile.locator('[data-unit-id="player-1"]').tap();
  await mobile.waitForFunction(() => {
    return document.querySelector("#game_canvas").dataset.selectedUnit === "player-1";
  });
  await mobile.getByRole("button", { name: "Move" }).tap();
  await mobile.locator('#game_canvas:not([data-movement-destination-count="0"])').waitFor();
  const pendingMobileMove = JSON.parse(
    await mobile.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(pendingMobileMove.pendingAction?.action, "move");

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.getByText("Rotate device", { exact: true }).waitFor();
  assert.deepEqual(
    JSON.parse(await mobile.locator("#game_canvas").getAttribute("data-battle-state")),
    pendingMobileMove,
  );
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByText("Rotate device", { exact: true }).waitFor({ state: "detached" });
  await mobile.waitForTimeout(120);
  mobileFrame = await mobile.locator("#content_layer").boundingBox();

  const cameraBeforeTargetingGesture = await cameraState(mobile);
  await mobile.locator("#game_canvas").evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    const fire = (type, pointerId, x, y, buttons) => {
      canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: "touch",
        isPrimary: pointerId === 1,
        button: 0,
        buttons,
        clientX: bounds.left + x,
        clientY: bounds.top + y,
      }));
    };
    fire("pointerdown", 1, 250, 155, 1);
    fire("pointerdown", 2, 510, 225, 1);
    fire("pointermove", 1, 215, 170, 1);
    fire("pointermove", 2, 565, 215, 1);
    fire("pointerup", 1, 215, 170, 0);
    fire("pointerup", 2, 565, 215, 0);
  });
  await mobile.waitForTimeout(120);
  const cameraAfterTargetingGesture = await cameraState(mobile);
  assert.notEqual(cameraAfterTargetingGesture.alpha, cameraBeforeTargetingGesture.alpha);
  const afterTargetingGesture = JSON.parse(
    await mobile.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.deepEqual(afterTargetingGesture.pendingAction, pendingMobileMove.pendingAction);
  assert.equal(afterTargetingGesture.selectedUnitId, pendingMobileMove.selectedUnitId);

  const mobileMoveTargets = JSON.parse(
    await mobile.locator("#game_canvas").getAttribute("data-movement-destinations"),
  );
  const mobileMoveTarget = await mobile.evaluate((targets) => {
    const frame = document.querySelector("#content_layer").getBoundingClientRect();
    return targets.find((target) => {
      if (target.cost !== 1) {
        return false;
      }
      const element = document.elementFromPoint(frame.left + target.x, frame.top + target.y);
      return element?.id === "game_canvas";
    });
  }, mobileMoveTargets);
  assert.ok(mobileMoveTarget, "mobile targeting must expose a one-AP destination");
  await mobile.touchscreen.tap(
    mobileFrame.x + mobileMoveTarget.x,
    mobileFrame.y + mobileMoveTarget.y,
  );
  await mobile.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(mobile);
  const stagedMobileMove = JSON.parse(
    await mobile.locator("#game_canvas").getAttribute("data-battle-state"),
  );
  assert.equal(stagedMobileMove.units.find((unit) => unit.id === "player-1").actionPoints, 3);
  await mobile.screenshot({
    path: `${evidenceDirectory}/confirmation-mobile.png`,
    fullPage: true,
  });
  await mobile.getByRole("button", { name: "Confirm?" }).tap();
  await mobile.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.units.find((unit) => unit.id === "player-1").actionPoints === 2;
  });
  await mobile.waitForFunction(() => !document.querySelector('[data-action="move"]').disabled);

  await mobile.locator('[data-unit-id="player-2"]').tap();
  await mobile.getByRole("button", { name: /Shoot 1 AP/ }).tap();
  const mobileShootTarget = mobile.locator('.unit-hud[data-valid-target="true"]').first();
  await mobileShootTarget.waitFor();
  await mobileShootTarget.tap();
  await mobile.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(mobile);
  await mobile.getByRole("button", { name: "Confirm?" }).tap();
  await mobile.locator('#game_canvas[data-shot-status="complete"]').waitFor();

  await mobile.locator('[data-unit-id="player-3"]').tap();
  await mobile.getByRole("button", { name: /Overwatch 3 AP/ }).tap();
  const mobileAimPoints = JSON.parse(
    await mobile.locator("#game_canvas").getAttribute("data-overwatch-aim-points"),
  );
  const mobileAimPoint = await mobile.evaluate((points) => {
    const frame = document.querySelector("#content_layer").getBoundingClientRect();
    return points.find((point) => {
      const element = document.elementFromPoint(frame.left + point.x, frame.top + point.y);
      return element?.id === "game_canvas";
    });
  }, mobileAimPoints);
  assert.ok(mobileAimPoint, "mobile Overwatch must expose an unobstructed projected aim point");
  await mobile.touchscreen.tap(
    mobileFrame.x + mobileAimPoint.x,
    mobileFrame.y + mobileAimPoint.y,
  );
  await mobile.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.pendingAction?.action === "overwatch" && state.pendingAction.targetCell;
  });
  await mobile.locator("#operation_confirmation").waitFor();
  await verifyOperationConfirmation(mobile);
  await mobile.getByRole("button", { name: "Confirm?" }).tap();
  await mobile.waitForFunction(() => {
    const state = JSON.parse(document.querySelector("#game_canvas").dataset.battleState);
    return state.units.find((unit) => unit.id === "player-3").overwatch?.shotsRemaining === 3;
  });

  const beforeTouch = await cameraState(mobile);
  await mobile.locator("#game_canvas").evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    const fire = (type, pointerId, x, y, buttons) => {
      canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: "touch",
        isPrimary: pointerId === 1,
        button: 0,
        buttons,
        clientX: bounds.left + x,
        clientY: bounds.top + y,
      }));
    };
    fire("pointerdown", 1, 240, 150, 1);
    fire("pointerdown", 2, 520, 230, 1);
    fire("pointermove", 1, 205, 165, 1);
    fire("pointermove", 2, 580, 220, 1);
    fire("pointerup", 1, 205, 165, 0);
    fire("pointerup", 2, 580, 220, 0);
  });
  await mobile.waitForTimeout(120);
  const afterTouch = await cameraState(mobile);
  assert.notEqual(afterTouch.alpha, beforeTouch.alpha);
  assert.notEqual(afterTouch.radius, beforeTouch.radius);
  const mobilePixels = await canvasPixelStats(mobile);
  assert.ok(mobilePixels.visibleSamples > 2_000);
  assert.ok(mobilePixels.colorBuckets > 12);
  await mobile.screenshot({ path: `${evidenceDirectory}/mobile-landscape.png`, fullPage: true });
  await mobileContext.close();

  await verifyResultAndRestart(browser, "victory", "victory");
  await verifyResultAndRestart(browser, "defeat", "defeat");
  await verifyResultAndRestart(browser, "victory", "victory", {
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await verifyBlockedAudioFallback(browser);
  await verifyPresentationFailureFallback(browser);
  await verifyReducedMotionPresentation(browser);
  await verifyReactionPresentation(browser);

  const failureContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await failureContext.route("**/assets/models/character.glb", (route) => {
    return route.fulfill({ status: 404, contentType: "application/octet-stream", body: "" });
  });
  const failurePage = await failureContext.newPage();
  await failurePage.goto(baseUrl, { waitUntil: "networkidle" });
  await failurePage.getByRole("alert").waitFor({ timeout: 10_000 });
  assert.equal(await failurePage.locator("#game_canvas").getAttribute("data-scene-status"), "error");
  assert.equal(await failurePage.locator(".unit-hud").count(), 0);
  await failurePage.getByRole("button", { name: "Move" }).dispatchEvent("click");
  assert.equal(await failurePage.locator("#game_canvas").getAttribute("data-selected-unit"), null);
  await failurePage.screenshot({ path: `${evidenceDirectory}/asset-error.png`, fullPage: true });
  await failureContext.close();

  assert.deepEqual(desktopMonitor.externalRequests, []);
  assert.deepEqual(mobileMonitor.externalRequests, []);
  assert.deepEqual(desktopMonitor.problems, []);
  assert.deepEqual(mobileMonitor.problems, []);
  assert.ok(desktopMonitor.audioRequests.some((url) => url.endsWith("/step.wav")));
  assert.ok(desktopMonitor.audioRequests.some((url) => url.endsWith("/shot.wav")));
  assert.ok(desktopMonitor.audioRequests.some((url) => url.endsWith("/overwatch.wav")));
  if (shotEvidence.hit) {
    assert.ok(desktopMonitor.audioRequests.some((url) => url.endsWith("/impact.wav")));
  }

  console.log(JSON.stringify({
    baseUrl,
    desktop: { frame: desktopFrame, pixels },
    mobile: { frame: mobileFrame, pixels: mobilePixels },
    externalRequests: 0,
    consoleProblems: 0,
  }, null, 2));
} finally {
  await browser.close();
}
