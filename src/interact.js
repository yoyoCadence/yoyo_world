import * as THREE from 'three';
import { PLAYER } from './config.js';
import { AIR, isSolid } from './blocks.js';

// 体素 DDA 射线 (Amanatides & Woo)
export function raycastVoxel(world, origin, dir, maxDist) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = Math.sign(dir.x) || 1, stepY = Math.sign(dir.y) || 1, stepZ = Math.sign(dir.z) || 1;
  const tDeltaX = Math.abs(1 / (dir.x || 1e-10));
  const tDeltaY = Math.abs(1 / (dir.y || 1e-10));
  const tDeltaZ = Math.abs(1 / (dir.z || 1e-10));
  let tMaxX = (dir.x > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX;
  let tMaxY = (dir.y > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY;
  let tMaxZ = (dir.z > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ;
  let nx = 0, ny = 0, nz = 0, t = 0;

  while (t <= maxDist) {
    const id = world.getBlock(x, y, z);
    if (isSolid(id)) return { x, y, z, nx, ny, nz, id };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}

export class Interact {
  constructor(world, player, camera, scene) {
    this.world = world;
    this.player = player;
    this.camera = camera;
    this.cooldown = 0;
    this.selected = 1; // 方块 id
    this.onPlaceOrBreak = null;

    // 选中方块线框
    const box = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(box),
      new THREE.LineBasicMaterial({ color: 0x1a0d08, transparent: true, opacity: 0.7 })
    );
    this.highlight.visible = false;
    scene.add(this.highlight);
    this.hit = null;
  }

  update(dt, controls) {
    this.cooldown -= dt;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.hit = raycastVoxel(this.world, this.player.eyePos, dir, PLAYER.reach);

    if (this.hit) {
      this.highlight.visible = true;
      this.highlight.position.set(this.hit.x + 0.5, this.hit.y + 0.5, this.hit.z + 0.5);
    } else {
      this.highlight.visible = false;
    }

    // 长按连续操作
    if (this.cooldown <= 0) {
      if (controls.buttons.left) this.tryBreak();
      else if (controls.buttons.right) this.tryPlace();
    }
  }

  tryBreak() {
    if (!this.hit) return;
    this.world.setBlock(this.hit.x, this.hit.y, this.hit.z, AIR);
    this.cooldown = 0.24;
    if (this.onPlaceOrBreak) this.onPlaceOrBreak('break');
  }

  tryPlace() {
    if (!this.hit) return;
    const x = this.hit.x + this.hit.nx, y = this.hit.y + this.hit.ny, z = this.hit.z + this.hit.nz;
    if (this.world.getBlock(x, y, z) !== AIR) return;
    // 不能放进玩家身体
    const p = this.player.pos, w = PLAYER.halfW;
    const overlap =
      x + 1 > p.x - w && x < p.x + w &&
      z + 1 > p.z - w && z < p.z + w &&
      y + 1 > p.y && y < p.y + PLAYER.height;
    if (overlap) return;
    this.world.setBlock(x, y, z, this.selected);
    this.cooldown = 0.24;
    if (this.onPlaceOrBreak) this.onPlaceOrBreak('place');
  }
}
