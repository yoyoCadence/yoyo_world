import * as THREE from 'three';
import { CHUNK, WORLD_H } from './config.js';
import { AIR, LEAVES, GLOW, isOpaque, isSolid, faceTile, tileUV } from './blocks.js';
import { hash2 } from './terrain.js';

// 6 个面: 法线 n、切线 u/v (u×v=n)，侧面 v 朝上保证贴图直立
const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },   // +x
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },   // -x
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },   // +y
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },   // -y
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },    // +z
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },  // -z
];
// 四角 (s,t)∈{-1,1}: c0(-,-) c1(+,-) c2(+,+) c3(-,+)
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO_CURVE = [0.42, 0.62, 0.82, 1.0];

/**
 * 构建一个区块的网格。getBlock 为全局坐标取方块函数。
 * 返回 THREE.Mesh 或 null。materials = [地形材质, 自发光材质]
 */
export function buildChunkMesh(cx, cz, getBlock, materials) {
  const groups = [
    { pos: [], nrm: [], uv: [], col: [], idx: [] }, // 不透明
    { pos: [], nrm: [], uv: [], col: [], idx: [] }, // 自发光
  ];

  const bx = cx * CHUNK, bz = cz * CHUNK;

  for (let y = 0; y < WORLD_H; y++) {
    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const id = getBlock(bx + lx, y, bz + lz);
        if (id === AIR) continue;
        const wx = bx + lx, wz = bz + lz;
        const emissive = id === GLOW;
        const g = groups[emissive ? 1 : 0];
        const tint = 0.94 + hash2(wx * 3 + y * 17, wz * 5 - y * 13) * 0.06;

        for (let d = 0; d < 6; d++) {
          const f = FACES[d];
          const nb = getBlock(wx + f.n[0], y + f.n[1], wz + f.n[2]);
          if (isOpaque(nb)) continue;
          if (id === LEAVES && nb === LEAVES) continue;

          const tile = faceTile(id, d);
          const { u0, v0, u1, v1 } = tileUV(tile);
          const uvc = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

          // 面中心 = 方块中心 + n*0.5
          const cxx = wx + 0.5 + f.n[0] * 0.5;
          const cyy = y + 0.5 + f.n[1] * 0.5;
          const czz = wz + 0.5 + f.n[2] * 0.5;

          const base = g.pos.length / 3;
          const ao = [1, 1, 1, 1];

          for (let ci = 0; ci < 4; ci++) {
            const [s, t] = CORNERS[ci];
            g.pos.push(
              cxx + (f.u[0] * s + f.v[0] * t) * 0.5,
              cyy + (f.u[1] * s + f.v[1] * t) * 0.5,
              czz + (f.u[2] * s + f.v[2] * t) * 0.5
            );
            g.nrm.push(f.n[0], f.n[1], f.n[2]);
            g.uv.push(uvc[ci][0], uvc[ci][1]);

            let b = 1;
            if (!emissive) {
              // AO: 检查面外侧 side1/side2/corner 三邻居
              const ox = wx + f.n[0], oy = y + f.n[1], oz = wz + f.n[2];
              const s1 = isSolid(getBlock(ox + f.u[0] * s, oy + f.u[1] * s, oz + f.u[2] * s)) ? 1 : 0;
              const s2 = isSolid(getBlock(ox + f.v[0] * t, oy + f.v[1] * t, oz + f.v[2] * t)) ? 1 : 0;
              const co = isSolid(getBlock(ox + f.u[0] * s + f.v[0] * t, oy + f.u[1] * s + f.v[1] * t, oz + f.u[2] * s + f.v[2] * t)) ? 1 : 0;
              const lvl = (s1 && s2) ? 0 : 3 - (s1 + s2 + co);
              ao[ci] = lvl;
              b = AO_CURVE[lvl] * tint;
            }
            g.col.push(b, b, b);
          }

          // 根据 AO 翻转对角线，避免插值瑕疵
          if (ao[1] + ao[3] > ao[0] + ao[2]) {
            g.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          } else {
            g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
  }

  const total = groups[0].idx.length + groups[1].idx.length;
  if (total === 0) return null;

  // 合并两组，建立材质组
  const vertCount0 = groups[0].pos.length / 3;
  const pos = new Float32Array([...groups[0].pos, ...groups[1].pos]);
  const nrm = new Float32Array([...groups[0].nrm, ...groups[1].nrm]);
  const uv = new Float32Array([...groups[0].uv, ...groups[1].uv]);
  const col = new Float32Array([...groups[0].col, ...groups[1].col]);
  const idx = new Uint32Array(total);
  idx.set(groups[0].idx, 0);
  for (let i = 0; i < groups[1].idx.length; i++) {
    idx[groups[0].idx.length + i] = groups[1].idx[i] + vertCount0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.addGroup(0, groups[0].idx.length, 0);
  if (groups[1].idx.length) geo.addGroup(groups[0].idx.length, groups[1].idx.length, 1);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
