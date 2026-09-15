const CONTROL_HEIGHT = 58;
const PLAYER_SIZE = 42;
const PLAYER_SPEED = 260;

const contentLayer = document.getElementById("content_layer");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
contentLayer.append(canvas);

const keys = new Set();
const pointerControls = { left: false, right: false, up: false, down: false };
const player = {
  x: 0,
  y: 0,
  color: "#38bdf8",
  scale: 1,
};

let statusText = "Move with WASD or arrow keys";
let lastTime = performance.now();

const controls = [
  { label: "<", type: "hold", direction: "left", x: 0, y: 0, width: CONTROL_HEIGHT, height: CONTROL_HEIGHT },
  { label: ">", type: "hold", direction: "right", x: 0, y: 0, width: CONTROL_HEIGHT, height: CONTROL_HEIGHT },
  { label: "^", type: "hold", direction: "up", x: 0, y: 0, width: CONTROL_HEIGHT, height: CONTROL_HEIGHT },
  { label: "v", type: "hold", direction: "down", x: 0, y: 0, width: CONTROL_HEIGHT, height: CONTROL_HEIGHT },
  { label: "Action 1 (c)", type: "action", action: 1, x: 0, y: 0, width: 132, height: CONTROL_HEIGHT },
  { label: "Action 2 (v)", type: "action", action: 2, x: 0, y: 0, width: 132, height: CONTROL_HEIGHT },
];

function resize() {
  const { width, height } = contentLayer.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(height * pixelRatio));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (player.x === 0 && player.y === 0) {
    player.x = width / 2;
    player.y = height / 2;
  }

  layoutControls(width, height);
}

function layoutControls(width, height) {
  const bottom = height - CONTROL_HEIGHT - 22;
  const dpadX = 30 + CONTROL_HEIGHT / 2;
  const actionStart = width - 30 - 132;

  positionControl("left", dpadX, bottom);
  positionControl("right", dpadX + CONTROL_HEIGHT * 2, bottom);
  positionControl("up", dpadX + CONTROL_HEIGHT, bottom - CONTROL_HEIGHT / 2 - 4);
  positionControl("down", dpadX + CONTROL_HEIGHT, bottom + CONTROL_HEIGHT / 2 + 4);
  positionControl("Action 1 (c)", actionStart - 142, bottom);
  positionControl("Action 2 (v)", actionStart, bottom);
}

function positionControl(identifier, centerX, centerY) {
  const control = controls.find((candidate) => candidate.direction === identifier || candidate.label === identifier);
  control.x = centerX - control.width / 2;
  control.y = centerY - control.height / 2;
}

function triggerAction(number) {
  statusText = `Action ${number} triggered`;
  player.color = number === 1 ? "#fbbf24" : "#fb7185";
  player.scale = 1.25;
}

function update(delta) {
  const horizontal =
    Number(keys.has("arrowright") || keys.has("d") || pointerControls.right) -
    Number(keys.has("arrowleft") || keys.has("a") || pointerControls.left);
  const vertical =
    Number(keys.has("arrowdown") || keys.has("s") || pointerControls.down) -
    Number(keys.has("arrowup") || keys.has("w") || pointerControls.up);
  const length = Math.hypot(horizontal, vertical) || 1;
  const distance = PLAYER_SPEED * delta;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const margin = PLAYER_SIZE / 2;

  player.x = clamp(player.x + (horizontal / length) * distance, margin, width - margin);
  player.y = clamp(player.y + (vertical / length) * distance, margin + 35, height - CONTROL_HEIGHT * 2 - margin);
  player.scale += (1 - player.scale) * Math.min(1, delta * 12);
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#94a3b8";
  context.globalAlpha = 0.8;
  context.font = "bold 12px system-ui, sans-serif";
  context.fillText("GAME LAYER", 18, 30);
  context.globalAlpha = 1;

  const size = PLAYER_SIZE * player.scale;
  context.fillStyle = player.color;
  context.strokeStyle = "rgba(248, 250, 252, 0.8)";
  context.lineWidth = 3;
  context.fillRect(player.x - size / 2, player.y - size / 2, size, size);
  context.strokeRect(player.x - size / 2, player.y - size / 2, size, size);

  context.fillStyle = "#e2e8f0";
  context.font = "16px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(statusText, player.x, player.y + PLAYER_SIZE + 32);

  for (const control of controls) {
    drawControl(control);
  }
}

function drawControl(control) {
  const isPressed = control.direction ? pointerControls[control.direction] : false;
  context.fillStyle = control.type === "action" ? "#9a3412" : isPressed ? "#0284c7" : "#1e293b";
  context.fillRect(control.x, control.y, control.width, control.height);
  context.fillStyle = "#f8fafc";
  context.font = `bold ${control.type === "action" ? 14 : 28}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(control.label, control.x + control.width / 2, control.y + control.height / 2);
}

function findControl(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return controls.find((control) => x >= control.x && x <= control.x + control.width && y >= control.y && y <= control.y + control.height);
}

function releasePointerControls() {
  for (const direction of Object.keys(pointerControls)) {
    pointerControls[direction] = false;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function frame(now) {
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(delta);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (keys.has("c")) {
    triggerAction(1);
  }
  if (keys.has("v")) {
    triggerAction(2);
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener("pointerdown", (event) => {
  const control = findControl(event);
  if (!control) return;
  canvas.setPointerCapture(event.pointerId);
  if (control.direction) {
    pointerControls[control.direction] = true;
  }
  if (control.action) {
    triggerAction(control.action);
  }
});
canvas.addEventListener("pointerup", releasePointerControls);
canvas.addEventListener("pointercancel", releasePointerControls);
canvas.addEventListener("pointerleave", releasePointerControls);

resize();
requestAnimationFrame(frame);
