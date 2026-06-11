import { BLOCKS, faceTile, TILE_N } from './blocks.js';

const CSS = /* css */`
  #hud { position: fixed; inset: 0; pointer-events: none; font-family: "Segoe UI", "Microsoft YaHei", sans-serif; user-select: none; }
  #crosshair { position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; transform: translate(-50%, -50%); opacity: 0.85; }
  #crosshair::before, #crosshair::after { content: ""; position: absolute; background: #fff; mix-blend-mode: difference; }
  #crosshair::before { left: 8px; top: 0; width: 2px; height: 18px; }
  #crosshair::after { left: 0; top: 8px; width: 18px; height: 2px; }

  #hotbar { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; gap: 4px;
    padding: 5px; background: rgba(10, 6, 14, 0.45); border: 1px solid rgba(255, 190, 130, 0.25);
    border-radius: 8px; backdrop-filter: blur(6px); }
  .slot { width: 48px; height: 48px; border: 2px solid rgba(255,255,255,0.18); border-radius: 5px;
    display: flex; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.25); }
  .slot.sel { border-color: #ffc66e; box-shadow: 0 0 12px rgba(255, 170, 80, 0.55); background: rgba(80, 45, 15, 0.4); }
  .slot canvas { image-rendering: pixelated; }
  .slot .num { position: absolute; left: 3px; top: 1px; font-size: 10px; color: rgba(255,255,255,0.6); }

  #mode { position: absolute; left: 50%; bottom: 78px; transform: translateX(-50%); color: rgba(255, 225, 190, 0.92);
    font-size: 13px; letter-spacing: 2px; text-shadow: 0 1px 6px rgba(0,0,0,0.7); }
  #blockname { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); color: rgba(255,255,255,0.85);
    font-size: 14px; text-shadow: 0 1px 6px rgba(0,0,0,0.8); opacity: 0; transition: opacity .4s; }

  #underwater { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(20,70,90,0.35), rgba(8,40,60,0.6)); display: none; }

  #overlay { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(180deg, #2b1646 0%, #6e2950 38%, #c75433 68%, #f29b4f 88%, #ffc97e 100%);
    cursor: pointer; pointer-events: auto; transition: opacity 1.1s; z-index: 10; }
  #overlay.hidden { opacity: 0; pointer-events: none; }
  #overlay .sun { width: 130px; height: 130px; border-radius: 50%; background: radial-gradient(circle, #fff3d0 0%, #ffb347 55%, #ff7a2e 100%);
    box-shadow: 0 0 80px 30px rgba(255, 150, 60, 0.65); margin-bottom: 36px; }
  #overlay h1 { color: #fff6e8; font-size: 44px; margin: 0 0 10px; letter-spacing: 10px; text-shadow: 0 2px 30px rgba(120, 30, 60, 0.8); font-weight: 600; }
  #overlay .sub { color: rgba(255, 240, 220, 0.85); font-size: 15px; margin-bottom: 34px; letter-spacing: 4px; }
  #overlay .controls { color: rgba(255, 245, 230, 0.92); font-size: 14px; line-height: 2.1; text-align: center;
    background: rgba(30, 10, 30, 0.35); padding: 16px 34px; border-radius: 12px; backdrop-filter: blur(4px); }
  #overlay .controls b { color: #ffd9a0; font-weight: 600; }
  #overlay .start { margin-top: 30px; color: #fff; font-size: 18px; letter-spacing: 6px; animation: pulse 1.8s infinite; }
  #overlay .loading { margin-top: 30px; color: rgba(255,255,255,0.9); font-size: 16px; letter-spacing: 4px; }
  @keyframes pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
`;

export class UI {
  constructor(hotbarIds, atlasCanvas) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    this.hud.innerHTML = `
      <div id="underwater"></div>
      <div id="crosshair"></div>
      <div id="blockname"></div>
      <div id="mode"></div>
      <div id="hotbar"></div>
    `;
    document.body.appendChild(this.hud);

    this.overlay = document.createElement('div');
    this.overlay.id = 'overlay';
    this.overlay.innerHTML = `
      <div class="sun"></div>
      <h1>YOYO 世界</h1>
      <div class="sub">—— 永 恒 落 日 ——</div>
      <div class="controls">
        <b>鼠标</b> 视角 · <b>WASD</b> 移动 · <b>Shift</b> 疾跑<br/>
        <b>空格</b> 跳跃 / 空中再按一次展开滑翔 · <b>F</b> 火箭起飞<br/>
        <b>左键</b> 破坏 · <b>右键</b> 放置 · <b>1-9 / 滚轮</b> 选择方块
      </div>
      <div class="loading">正在生成世界…</div>
    `;
    document.body.appendChild(this.overlay);
    this.loadingEl = this.overlay.querySelector('.loading');

    // 物品栏
    this.hotbarIds = hotbarIds;
    this.slots = [];
    const bar = this.hud.querySelector('#hotbar');
    hotbarIds.forEach((id, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.innerHTML = `<span class="num">${i + 1}</span>`;
      slot.appendChild(makeIsoIcon(id, atlasCanvas));
      bar.appendChild(slot);
      this.slots.push(slot);
    });

    this.modeEl = this.hud.querySelector('#mode');
    this.nameEl = this.hud.querySelector('#blockname');
    this.underwaterEl = this.hud.querySelector('#underwater');
    this.nameTimer = null;
    this.select(0);
  }

  setReady(onStart) {
    this.loadingEl.outerHTML = '<div class="start">点 击 进 入 世 界</div>';
    this.overlay.addEventListener('click', onStart);
  }

  setProgress(pct) {
    this.loadingEl.textContent = `正在生成世界… ${Math.round(pct * 100)}%`;
  }

  hideOverlay() { this.overlay.classList.add('hidden'); }
  showOverlay() { this.overlay.classList.remove('hidden'); }

  select(i) {
    this.selectedIndex = i;
    this.slots.forEach((s, j) => s.classList.toggle('sel', i === j));
    const id = this.hotbarIds[i];
    this.nameEl.textContent = BLOCKS[id].name;
    this.nameEl.style.opacity = 1;
    clearTimeout(this.nameTimer);
    this.nameTimer = setTimeout(() => { this.nameEl.style.opacity = 0; }, 1400);
    return id;
  }

  setMode(text) { this.modeEl.textContent = text; }
  setUnderwater(b) { this.underwaterEl.style.display = b ? 'block' : 'none'; }
}

// 等距小方块图标 (顶面 + 左右两侧)
function makeIsoIcon(blockId, atlasCanvas) {
  const S = 16;
  const c = document.createElement('canvas');
  c.width = 40; c.height = 38;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const tileRect = (tile) => [(tile % TILE_N) * S, Math.floor(tile / TILE_N) * S];

  const draw = (tile, transform, shade) => {
    const [sx, sy] = tileRect(tile);
    ctx.save();
    ctx.setTransform(...transform);
    ctx.drawImage(atlasCanvas, sx, sy, S, S, 0, 0, S, S);
    if (shade > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(20, 8, 20, ${shade})`;
      ctx.fillRect(0, 0, S, S);
    }
    ctx.restore();
  };

  // top / left / right (经典等距)
  draw(faceTile(blockId, 2), [1, 0.5, -1, 0.5, 20, 3], 0);
  draw(faceTile(blockId, 0), [1, 0.5, 0, 1, 4, 11], 0.22);
  draw(faceTile(blockId, 4), [1, -0.5, 0, 1, 20, 19], 0.38);
  c.style.width = '40px';
  return c;
}
