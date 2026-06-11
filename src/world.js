import { CHUNK, WORLD_H, RENDER_RADIUS, GEN_RADIUS } from './config.js';
import { genChunkData } from './terrain.js';
import { buildChunkMesh } from './mesher.js';
import { STONE, AIR } from './blocks.js';

const key = (cx, cz) => cx + ',' + cz;

// 预排序的螺旋偏移(按距离)
function sortedOffsets(r) {
  const list = [];
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dz * dz <= (r + 0.5) * (r + 0.5)) list.push([dx, dz, dx * dx + dz * dz]);
  list.sort((a, b) => a[2] - b[2]);
  return list;
}
const GEN_OFFSETS = sortedOffsets(GEN_RADIUS);
const MESH_OFFSETS = sortedOffsets(RENDER_RADIUS);

export class World {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials; // [terrainMat, glowMat]
    this.chunks = new Map();    // key -> { cx, cz, data, mesh, dirty }
    this.getBlock = this.getBlock.bind(this);
  }

  chunkAt(cx, cz) { return this.chunks.get(key(cx, cz)); }

  ensureData(cx, cz) {
    let c = this.chunks.get(key(cx, cz));
    if (!c) {
      c = { cx, cz, data: genChunkData(cx, cz), mesh: null, dirty: true };
      this.chunks.set(key(cx, cz), c);
    }
    return c;
  }

  getBlock(x, y, z) {
    if (y < 0) return STONE;
    if (y >= WORLD_H) return AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(key(cx, cz));
    if (!c) return AIR;
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    return c.data[lx + CHUNK * (lz + CHUNK * y)];
  }

  setBlock(x, y, z, id) {
    if (y < 1 || y >= WORLD_H) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.ensureData(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    c.data[lx + CHUNK * (lz + CHUNK * y)] = id;
    // 受影响区块(含 AO 跨界)立即重建
    const dirty = new Set([key(cx, cz)]);
    if (lx <= 0) dirty.add(key(cx - 1, cz));
    if (lx >= CHUNK - 1) dirty.add(key(cx + 1, cz));
    if (lz <= 0) dirty.add(key(cx, cz - 1));
    if (lz >= CHUNK - 1) dirty.add(key(cx, cz + 1));
    if (lx <= 0 && lz <= 0) dirty.add(key(cx - 1, cz - 1));
    if (lx <= 0 && lz >= CHUNK - 1) dirty.add(key(cx - 1, cz + 1));
    if (lx >= CHUNK - 1 && lz <= 0) dirty.add(key(cx + 1, cz - 1));
    if (lx >= CHUNK - 1 && lz >= CHUNK - 1) dirty.add(key(cx + 1, cz + 1));
    for (const k of dirty) {
      const cc = this.chunks.get(k);
      if (cc && cc.mesh !== undefined) this.remesh(cc);
    }
  }

  neighborsReady(cx, cz) {
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++)
        if (!this.chunks.has(key(cx + dx, cz + dz))) return false;
    return true;
  }

  remesh(c) {
    if (c.mesh) {
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
    }
    c.mesh = buildChunkMesh(c.cx, c.cz, this.getBlock, this.materials);
    if (c.mesh) this.scene.add(c.mesh);
    c.dirty = false;
  }

  /** 每帧流式加载。返回是否仍有待处理任务 */
  update(px, pz, genBudget = 5, meshBudget = 3) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    let busy = false;

    // 玩家脚下的区块必须同步存在(碰撞安全)
    this.ensureData(pcx, pcz);

    for (const [dx, dz] of GEN_OFFSETS) {
      if (genBudget <= 0) { busy = true; break; }
      if (!this.chunks.has(key(pcx + dx, pcz + dz))) {
        this.ensureData(pcx + dx, pcz + dz);
        genBudget--;
      }
    }

    for (const [dx, dz] of MESH_OFFSETS) {
      if (meshBudget <= 0) { busy = true; break; }
      const c = this.chunks.get(key(pcx + dx, pcz + dz));
      if (c && c.dirty && this.neighborsReady(c.cx, c.cz)) {
        this.remesh(c);
        meshBudget--;
      }
    }

    // 卸载远区块
    const limit = GEN_RADIUS + 3;
    for (const [k, c] of this.chunks) {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > limit * limit) {
        if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); }
        this.chunks.delete(k);
      }
    }
    return busy;
  }
}
