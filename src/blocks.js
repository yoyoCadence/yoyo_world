import * as THREE from 'three';

// ---- 方块定义 ----
export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const SAND = 4;
export const LOG = 5;
export const LEAVES = 6;
export const PLANKS = 7;
export const GLOW = 8;
export const SNOW = 9;

// 贴图集: 4x4 个 16px 瓦片
export const TILE_N = 4;
const T = {
  grassTop: 0, grassSide: 1, dirt: 2, stone: 3,
  sand: 4, logSide: 5, logTop: 6, leaves: 7,
  planks: 8, glow: 9, snow: 10, snowSide: 11,
};

export const BLOCKS = {
  [GRASS]: { name: '草方块', top: T.grassTop, side: T.grassSide, bottom: T.dirt, opaque: true },
  [DIRT]: { name: '泥土', top: T.dirt, side: T.dirt, bottom: T.dirt, opaque: true },
  [STONE]: { name: '石头', top: T.stone, side: T.stone, bottom: T.stone, opaque: true },
  [SAND]: { name: '沙子', top: T.sand, side: T.sand, bottom: T.sand, opaque: true },
  [LOG]: { name: '橡木原木', top: T.logTop, side: T.logSide, bottom: T.logTop, opaque: true },
  [LEAVES]: { name: '橡树树叶', top: T.leaves, side: T.leaves, bottom: T.leaves, opaque: false },
  [PLANKS]: { name: '橡木木板', top: T.planks, side: T.planks, bottom: T.planks, opaque: true },
  [GLOW]: { name: '萤石', top: T.glow, side: T.glow, bottom: T.glow, opaque: true, emissive: true },
  [SNOW]: { name: '雪块', top: T.snow, side: T.snowSide, bottom: T.dirt, opaque: true },
};

export function isOpaque(id) { return id !== AIR && id !== LEAVES; }
export function isSolid(id) { return id !== AIR; }

// dir: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
export function faceTile(id, dir) {
  const b = BLOCKS[id];
  if (dir === 2) return b.top;
  if (dir === 3) return b.bottom;
  return b.side;
}

// ---- 程序化贴图集 ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = 16; // 瓦片像素

function paintTile(ctx, tx, ty, painter) {
  const img = ctx.createImageData(S, S);
  const rnd = mulberry32(tx * 71 + ty * 313 + 9);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const [r, g, b, a] = painter(x, y, rnd);
      const i = (y * S + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a === undefined ? 255 : a;
    }
  }
  ctx.putImageData(img, tx * S, ty * S);
}

function speckle(base, vary, rnd) {
  const v = (rnd() - 0.5) * 2 * vary;
  return [base[0] + v, base[1] + v, base[2] + v];
}

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_N * S; canvas.height = TILE_N * S;
  const ctx = canvas.getContext('2d');

  const painters = {
    [T.grassTop]: (x, y, rnd) => {
      const [r, g, b] = speckle([96, 142, 62], 14, rnd);
      // 落日下的草带点暖意
      return [r + 12, g, b];
    },
    [T.grassSide]: (x, y, rnd) => {
      const edge = 3 + (Math.floor(mulberry32(x * 7 + 3)() * 2));
      if (y < edge) { const [r, g, b] = speckle([100, 144, 64], 14, rnd); return [r + 10, g, b]; }
      const [r, g, b] = speckle([122, 88, 60], 12, rnd); return [r, g, b];
    },
    [T.dirt]: (x, y, rnd) => speckle([122, 88, 60], 13, rnd),
    [T.stone]: (x, y, rnd) => {
      let [r, g, b] = speckle([128, 126, 130], 11, rnd);
      if (rnd() < 0.06) { r -= 26; g -= 26; b -= 26; }
      return [r, g, b];
    },
    [T.sand]: (x, y, rnd) => speckle([222, 203, 153], 10, rnd),
    [T.logSide]: (x, y, rnd) => {
      const streak = Math.sin(x * 2.1 + 0.8) * 9;
      const [r, g, b] = speckle([104, 78, 48], 7, rnd);
      return [r + streak, g + streak * 0.8, b + streak * 0.5];
    },
    [T.logTop]: (x, y, rnd) => {
      const dx = x - 7.5, dy = y - 7.5;
      const ring = Math.sin(Math.sqrt(dx * dx + dy * dy) * 2.4) * 12;
      const [r, g, b] = speckle([150, 117, 75], 6, rnd);
      return [r + ring, g + ring * 0.8, b + ring * 0.5];
    },
    [T.leaves]: (x, y, rnd) => {
      if (rnd() < 0.18) return [0, 0, 0, 0]; // 透光孔
      const [r, g, b] = speckle([52, 96, 38], 18, rnd);
      return [r + 10, g, b];
    },
    [T.planks]: (x, y, rnd) => {
      const board = (y % 4 === 0) ? -20 : 0;
      const grain = Math.sin(x * 1.7 + (y >> 2) * 5.0) * 6;
      const [r, g, b] = speckle([168, 132, 84], 7, rnd);
      return [r + board + grain, g + board * 0.9 + grain * 0.8, b + board * 0.8 + grain * 0.5];
    },
    [T.glow]: (x, y, rnd) => {
      const blob = Math.sin(x * 1.4) * Math.sin(y * 1.4) * 30;
      const [r, g, b] = speckle([248, 196, 110], 16, rnd);
      return [r + blob * 0.3, g + blob * 0.5, b + blob];
    },
    [T.snow]: (x, y, rnd) => speckle([238, 242, 248], 7, rnd),
    [T.snowSide]: (x, y, rnd) => {
      if (y < 5) return speckle([238, 242, 248], 7, rnd);
      return speckle([122, 88, 60], 12, rnd);
    },
  };

  for (const key of Object.keys(painters)) {
    const idx = Number(key);
    paintTile(ctx, idx % TILE_N, Math.floor(idx / TILE_N), painters[key]);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return { texture, canvas };
}

// 瓦片 UV (含半像素内缩防渗色)
const INSET = 0.5 / (TILE_N * S);
export function tileUV(tile) {
  const tx = tile % TILE_N, ty = Math.floor(tile / TILE_N);
  const u0 = tx / TILE_N + INSET, v1 = 1 - ty / TILE_N - INSET;
  const u1 = (tx + 1) / TILE_N - INSET, v0 = 1 - (ty + 1) / TILE_N + INSET;
  return { u0, v0, u1, v1 };
}
