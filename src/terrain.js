import { createNoise2D } from 'simplex-noise';
import { CHUNK, WORLD_H, SEA } from './config.js';
import { AIR, GRASS, DIRT, STONE, SAND, LOG, LEAVES, SNOW } from './blocks.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260611;
const nContinent = createNoise2D(mulberry32(SEED));
const nHill = createNoise2D(mulberry32(SEED + 1));
const nMountain = createNoise2D(mulberry32(SEED + 2));
const nForest = createNoise2D(mulberry32(SEED + 3));

function fbm(noise, x, z, octaves, lacunarity = 2.0, gain = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, z * freq);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / norm;
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }

// 整数坐标哈希 → [0,1)
export function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function continentAt(x, z) {
  return fbm(nContinent, x * 0.0013, z * 0.0013, 4);
}

export function heightAt(x, z) {
  const c = continentAt(x, z);
  const land = smoothstep(-0.18, 0.2, c);
  const hill = fbm(nHill, x * 0.008, z * 0.008, 4);
  const mtn = smoothstep(0.25, 0.8, fbm(nMountain, x * 0.0032, z * 0.0032, 3));
  const landH = SEA + 3 + hill * 7 + Math.max(hill, 0) * 6 + mtn * (30 + hill * 9);
  const seaH = SEA - 7 + c * 11 + hill * 2.5;
  const h = Math.floor(lerp(seaH, landH, land));
  return Math.min(WORLD_H - 24, Math.max(8, h));
}

export function forestAt(x, z) {
  return fbm(nForest, x * 0.006, z * 0.006, 3);
}

const BEACH_TOP = SEA + 2;
const SNOW_LINE = SEA + 44;

export function genChunkData(cx, cz) {
  const data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  const idx = (lx, y, lz) => lx + CHUNK * (lz + CHUNK * y);
  const heights = new Int16Array(CHUNK * CHUNK);

  for (let lz = 0; lz < CHUNK; lz++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      const h = heightAt(wx, wz);
      heights[lz * CHUNK + lx] = h;
      const sandy = h <= BEACH_TOP;
      const snowy = h >= SNOW_LINE;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === h) id = sandy ? SAND : (snowy ? SNOW : GRASS);
        else if (y >= h - 3) id = sandy ? SAND : (snowy ? STONE : DIRT);
        else id = STONE;
        data[idx(lx, y, lz)] = id;
      }
    }
  }

  // 树木(树冠半径2，故树干限制在区块内缘，保证不跨区块)
  for (let lz = 2; lz <= 13; lz++) {
    for (let lx = 2; lx <= 13; lx++) {
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      const h = heights[lz * CHUNK + lx];
      if (h <= BEACH_TOP || h >= SNOW_LINE - 6) continue;
      if (data[idx(lx, h, lz)] !== GRASS) continue;
      const f = forestAt(wx, wz);
      if (f < 0.08) continue;
      const p = (f - 0.08) * 0.16;
      if (hash2(wx, wz) >= p) continue;

      const th = 4 + Math.floor(hash2(wx + 7, wz + 3) * 3); // 树干高 4-6
      const topY = h + th;
      if (topY + 2 >= WORLD_H) continue;
      // 树冠
      for (let dy = -2; dy <= 1; dy++) {
        const r = dy <= -1 ? 2 : 1;
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dz * dz > r * r + 1) continue;
            const x = lx + dx, y = topY + dy, z = lz + dz;
            if (data[idx(x, y, z)] === AIR) data[idx(x, y, z)] = LEAVES;
          }
        }
      }
      // 树干
      for (let y = h + 1; y <= topY; y++) data[idx(lx, y, lz)] = LOG;
    }
  }
  return data;
}
