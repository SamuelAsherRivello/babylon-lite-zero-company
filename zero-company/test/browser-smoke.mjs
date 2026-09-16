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

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.protocol !== "data:" && requestUrl.hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
  });

  return { problems, externalRequests };
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

async function unitScreenPoint(page, unitId) {
  const frame = await page.locator("#content_layer").boundingBox();
  const projected = await page.locator(`[data-unit-id="${unitId}"]`).evaluate((element) => ({
    x: Number.parseFloat(element.style.left),
    y: Number.parseFloat(element.style.top),
  }));
  return { frame, projected };
}

async function selectUnit(page, unitId) {
  const { frame, projected } = await unitScreenPoint(page, unitId);
  for (const yOffset of [22, 36, 50, 64]) {
    await page.mouse.click(frame.x + projected.x, frame.y + projected.y + yOffset);
    await page.waitForTimeout(80);
    if (await page.locator("#game_canvas").getAttribute("data-selected-unit") === unitId) {
      return;
    }
  }
  assert.fail(`could not select ${unitId} from its projected HUD anchor`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const desktop = await desktopContext.newPage();
  const desktopMonitor = monitorPage(desktop);
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForScene(desktop);

  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-unit-count"), "6");
  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-cover-count"), "3");
  assert.equal(await desktop.locator(".unit-hud").count(), 6);
  assert.equal(await desktop.locator(".action-button").count(), 4);

  const desktopFrame = await desktop.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(desktopFrame.width / desktopFrame.height - 16 / 9) < 0.002);
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

  const initialCamera = await cameraState(desktop);
  const actionSnapshot = {
    selected: await desktop.locator("#game_canvas").getAttribute("data-selected-unit"),
    camera: initialCamera,
    inspection: await desktop.locator(".inspection-panel").innerText(),
  };
  for (const label of ["Move", "Shoot", "Overwatch", "End Turn"]) {
    await desktop.getByRole("button", { name: label }).dispatchEvent("click");
  }
  assert.deepEqual(await cameraState(desktop), actionSnapshot.camera);
  assert.equal(await desktop.locator("#game_canvas").getAttribute("data-selected-unit"), actionSnapshot.selected);
  assert.equal(await desktop.locator(".inspection-panel").innerText(), actionSnapshot.inspection);

  await selectUnit(desktop, "enemy-1");
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
  const mobileFrame = await mobile.locator("#content_layer").boundingBox();
  assert.ok(Math.abs(mobileFrame.width / mobileFrame.height - 16 / 9) < 0.002);
  await mobile.screenshot({ path: `${evidenceDirectory}/mobile-landscape-initial.png`, fullPage: true });

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
