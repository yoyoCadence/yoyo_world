// 输入: 指针锁定 + 键鼠状态
export class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.onMouseButton = null; // (button) => void
    this.onWheel = null;       // (dir) => void
    this.onKey = null;         // (code) => void
    this.buttons = { left: false, right: false };

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (this.onKey) this.onKey(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.buttons.left = this.buttons.right = false; });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.active()) return;
      if (e.button === 0) this.buttons.left = true;
      if (e.button === 2) this.buttons.right = true;
      if (this.onMouseButton) this.onMouseButton(e.button);
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.buttons.left = false;
      if (e.button === 2) this.buttons.right = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => {
      if (this.active() && this.onWheel) this.onWheel(Math.sign(e.deltaY));
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  // 无指针锁定时(测试模式)也允许游戏运行
  active() { return this.locked || this.testMode; }

  lock() {
    this.canvas.requestPointerLock?.();
  }

  consumeMouse() {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = 0; this.dy = 0;
    return d;
  }
}
