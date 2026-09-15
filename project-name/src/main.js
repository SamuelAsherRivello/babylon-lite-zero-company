import * as Phaser from "phaser";

const CONTROL_HEIGHT = 58;
const PLAYER_SIZE = 42;
const PLAYER_SPEED = 260;

class PlatformerScene extends Phaser.Scene {
  create() {
    this.movement = { left: false, right: false, up: false, down: false };
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      actionOne: Phaser.Input.Keyboard.KeyCodes.C,
      actionTwo: Phaser.Input.Keyboard.KeyCodes.V,
    });
    this.input.keyboard.on("keydown-C", () => this.triggerAction(1));
    this.input.keyboard.on("keydown-V", () => this.triggerAction(2));

    this.player = this.add.rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE, 0x38bdf8);
    this.player.setStrokeStyle(3, 0xf8fafc, 0.8);
    this.status = this.add
      .text(0, 0, "Move with WASD or arrow keys", {
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
      })
      .setOrigin(0.5);

    this.add
      .text(18, 18, "GAME LAYER", {
        color: "#94a3b8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
      })
      .setAlpha(0.8);

    this.createControls();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  createControls() {
    this.leftButton = this.createHoldButton("←", "left");
    this.rightButton = this.createHoldButton("→", "right");
    this.upButton = this.createHoldButton("↑", "up");
    this.downButton = this.createHoldButton("↓", "down");
    this.actionOneButton = this.createActionButton("Action 1 (c)", () => this.triggerAction(1));
    this.actionTwoButton = this.createActionButton("Action 2 (v)", () => this.triggerAction(2));
  }

  createHoldButton(label, direction) {
    const button = this.add
      .text(0, 0, label, this.buttonStyle(CONTROL_HEIGHT))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const setDirection = (isPressed) => {
      this.movement[direction] = isPressed;
      button.setStyle({ backgroundColor: isPressed ? "#0284c7" : "#1e293b" });
    };

    button.on("pointerdown", () => setDirection(true));
    button.on("pointerup", () => setDirection(false));
    button.on("pointerout", () => setDirection(false));
    return button;
  }

  createActionButton(label, action) {
    const button = this.add
      .text(0, 0, label, this.buttonStyle(CONTROL_HEIGHT, true))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => {
      button.setStyle({ backgroundColor: "#c2410c" });
      action();
    });
    button.on("pointerup", () => button.setStyle({ backgroundColor: "#9a3412" }));
    button.on("pointerout", () => button.setStyle({ backgroundColor: "#9a3412" }));
    return button;
  }

  buttonStyle(height, isAction = false) {
    return {
      align: "center",
      backgroundColor: isAction ? "#9a3412" : "#1e293b",
      color: "#f8fafc",
      fixedHeight: height,
      fixedWidth: isAction ? 132 : height,
      fontFamily: "system-ui, sans-serif",
      fontSize: isAction ? "14px" : "28px",
      fontStyle: "bold",
      padding: { x: 8, y: 0 },
    };
  }

  layout() {
    const { width, height } = this.scale;
    const bottom = height - CONTROL_HEIGHT - 22;
    const dpadX = 30 + CONTROL_HEIGHT / 2;
    const actionStart = width - 30 - 132;

    this.leftButton.setPosition(dpadX, bottom);
    this.rightButton.setPosition(dpadX + CONTROL_HEIGHT * 2, bottom);
    this.upButton.setPosition(dpadX + CONTROL_HEIGHT, bottom - CONTROL_HEIGHT / 2 - 4);
    this.downButton.setPosition(dpadX + CONTROL_HEIGHT, bottom + CONTROL_HEIGHT / 2 + 4);
    this.actionOneButton.setPosition(actionStart - 142, bottom);
    this.actionTwoButton.setPosition(actionStart, bottom);

    this.player.setPosition(width / 2, height / 2);
    this.status.setPosition(width / 2, height / 2 + PLAYER_SIZE + 28);
  }

  triggerAction(number) {
    this.status.setText(`Action ${number} triggered`);
    this.player.setFillStyle(number === 1 ? 0xfbbf24 : 0xfb7185);
    this.tweens.add({
      targets: this.player,
      scale: { from: 1.25, to: 1 },
      duration: 180,
    });
  }

  update(_, delta) {
    const horizontal = Number(this.keys.right.isDown || this.keys.d.isDown || this.movement.right) - Number(this.keys.left.isDown || this.keys.a.isDown || this.movement.left);
    const vertical = Number(this.keys.down.isDown || this.keys.s.isDown || this.movement.down) - Number(this.keys.up.isDown || this.keys.w.isDown || this.movement.up);
    const length = Math.hypot(horizontal, vertical) || 1;
    const distance = (PLAYER_SPEED * delta) / 1000;
    const margin = PLAYER_SIZE / 2;

    this.player.x = Phaser.Math.Clamp(this.player.x + (horizontal / length) * distance, margin, this.scale.width - margin);
    this.player.y = Phaser.Math.Clamp(this.player.y + (vertical / length) * distance, margin + 35, this.scale.height - CONTROL_HEIGHT * 2 - margin);
    this.status.setPosition(this.player.x, this.player.y + PLAYER_SIZE + 28);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "content_layer",
  backgroundColor: "#0f172a",
  scene: PlatformerScene,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
  },
});
