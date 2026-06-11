import * as THREE from 'three';
import { PLAYER, WATER_Y, WORLD_H } from './config.js';
import { isSolid } from './blocks.js';

export const MODE = { GLIDE: 'glide', WALK: 'walk' };

const _fwd = new THREE.Vector3();
const _target = new THREE.Vector3();

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 150, 0); // 脚底位置
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.mode = MODE.GLIDE;
    this.onGround = false;
    this.boostT = 0;
    this.airTime = 0;
    this.spaceWasDown = false;
  }

  get eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + PLAYER.eye, this.pos.z);
  }

  forward(out) {
    const cp = Math.cos(this.pitch);
    out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    return out;
  }

  inWater() {
    return this.pos.y + 0.9 < WATER_Y;
  }

  /** 火箭起飞: 任意时刻冲天展翼 */
  launch() {
    this.mode = MODE.GLIDE;
    this.onGround = false;
    this.boostT = 1.15;
    this.vel.set(this.vel.x * 0.4, Math.max(this.vel.y, 0) + 21, this.vel.z * 0.4);
    this.forward(_fwd);
    this.vel.addScaledVector(_fwd, 5);
  }

  update(dt, input) {
    if (this.mode === MODE.GLIDE) this.updateGlide(dt, input);
    else this.updateWalk(dt, input);

    // 安全边界
    if (this.pos.y < -10) { this.pos.y = WORLD_H + 40; this.vel.set(0, 0, 0); this.mode = MODE.GLIDE; }
    if (this.pos.y > WORLD_H + 160) { this.pos.y = WORLD_H + 160; this.vel.y = Math.min(this.vel.y, 0); }
  }

  updateGlide(dt, input) {
    this.forward(_fwd);
    let speed = this.vel.length();

    // 速度向视线方向收敛(转向手感)
    const k = 1 - Math.exp(-dt * 3.2);
    _target.copy(_fwd).multiplyScalar(Math.max(speed, 0.01));
    this.vel.lerp(_target, k);
    speed = this.vel.length();

    // 俯冲加速 / 拉升耗速, 向巡航速度松弛
    speed += (-_fwd.y) * 24 * dt;
    speed -= (speed - 13) * 0.22 * dt;

    // 火箭推进
    if (this.boostT > 0) {
      this.boostT -= dt;
      speed += 42 * dt;
      this.vel.y += 26 * dt;
    }
    speed = Math.min(48, Math.max(7.5, speed));
    this.vel.setLength(speed);

    // 基础下沉 → 缓缓下降的滑翔
    const sink = 2.6 - Math.min(speed / 42, 1) * 1.4;
    this.vel.y -= sink * dt * 2.2;

    // A/D 侧滑
    let strafe = 0;
    if (input.keys['KeyA']) strafe -= 1;
    if (input.keys['KeyD']) strafe += 1;
    if (strafe !== 0) {
      this.vel.x += Math.cos(this.yaw) * strafe * 14 * dt;
      this.vel.z += -Math.sin(this.yaw) * strafe * 14 * dt;
    }

    this.moveAndCollide(dt);

    // 落地或触水收翼
    if (this.onGround || this.pos.y + 0.8 < WATER_Y) {
      this.mode = MODE.WALK;
      this.vel.multiplyScalar(0.25);
      this.boostT = 0;
    }
  }

  updateWalk(dt, input) {
    const water = this.inWater();
    const gravity = water ? 7 : PLAYER.gravity;
    this.vel.y -= gravity * dt;

    // 期望水平速度
    let fx = 0, fz = 0;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    if (input.keys['KeyW']) { fx -= sy; fz -= cy; }
    if (input.keys['KeyS']) { fx += sy; fz += cy; }
    if (input.keys['KeyA']) { fx -= cy; fz += sy; }
    if (input.keys['KeyD']) { fx += cy; fz -= sy; }
    const len = Math.hypot(fx, fz);
    const sprint = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const top = (water ? 3.4 : (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed));
    if (len > 0) { fx = fx / len * top; fz = fz / len * top; }

    const accel = this.onGround ? 14 : (water ? 6 : 3.2);
    const t = 1 - Math.exp(-accel * dt);
    this.vel.x += (fx - this.vel.x) * t;
    this.vel.z += (fz - this.vel.z) * t;

    const space = !!input.keys['Space'];
    if (water) {
      this.vel.y *= 1 - Math.min(2.4 * dt, 0.9); // 水阻
      // 浮力: 自动浮到头部略高于水面
      const depth = WATER_Y - (this.pos.y + 1.0);
      if (depth > 0) this.vel.y += Math.min(depth, 2) * 16 * dt;
      if (space) this.vel.y = Math.min(this.vel.y + 22 * dt, 4.5);
    } else if (space && this.onGround) {
      this.vel.y = PLAYER.jumpVel;
      this.onGround = false;
    }

    // 空中再按一次空格 → 展开滑翔
    if (!this.onGround && !water) {
      this.airTime += dt;
      if (space && !this.spaceWasDown && this.airTime > 0.25 && this.vel.y < 2) {
        this.mode = MODE.GLIDE;
        const hSpeed = Math.hypot(this.vel.x, this.vel.z);
        if (hSpeed < 8) {
          this.forward(_fwd);
          this.vel.x += _fwd.x * (8 - hSpeed);
          this.vel.z += _fwd.z * (8 - hSpeed);
        }
      }
    } else {
      this.airTime = 0;
    }
    this.spaceWasDown = space;

    this.moveAndCollide(dt);
  }

  collides(px, py, pz) {
    const w = PLAYER.halfW, h = PLAYER.height;
    const x0 = Math.floor(px - w), x1 = Math.floor(px + w);
    const y0 = Math.floor(py), y1 = Math.floor(py + h - 0.001);
    const z0 = Math.floor(pz - w), z1 = Math.floor(pz + w);
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++)
          if (isSolid(this.world.getBlock(x, y, z))) return true;
    return false;
  }

  moveAndCollide(dt) {
    const p = this.pos, v = this.vel;
    this.onGround = false;
    const w = PLAYER.halfW;

    // X
    let nx = p.x + v.x * dt;
    if (this.collides(nx, p.y, p.z)) {
      if (v.x > 0) nx = Math.floor(nx + w) - w - 0.001;
      else nx = Math.floor(nx - w) + 1 + w + 0.001;
      if (this.collides(nx, p.y, p.z)) nx = p.x;
      v.x = 0;
    }
    p.x = nx;

    // Z
    let nz = p.z + v.z * dt;
    if (this.collides(p.x, p.y, nz)) {
      if (v.z > 0) nz = Math.floor(nz + w) - w - 0.001;
      else nz = Math.floor(nz - w) + 1 + w + 0.001;
      if (this.collides(p.x, p.y, nz)) nz = p.z;
      v.z = 0;
    }
    p.z = nz;

    // Y
    let ny = p.y + v.y * dt;
    if (this.collides(p.x, ny, p.z)) {
      if (v.y < 0) {
        ny = Math.floor(ny) + 1 + 0.001;
        this.onGround = true;
      } else {
        ny = Math.floor(ny + PLAYER.height) - PLAYER.height - 0.001;
      }
      if (this.collides(p.x, ny, p.z)) ny = p.y;
      v.y = 0;
    }
    p.y = ny;
  }
}
