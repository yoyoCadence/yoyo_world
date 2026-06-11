import * as THREE from 'three';
import { faceTile, tileUV } from './blocks.js';

// 第一人称手持方块: 走路摆动 + 使用挥动
export class Hand {
  constructor(camera, material) {
    this.camera = camera;
    this.material = material;
    this.mesh = null;
    this.swingT = 1;
    this.bobPhase = 0;
    this.blockId = 1;
    this.basePos = new THREE.Vector3(0.4, -0.38, -0.8);
    this.setBlock(1);
  }

  setBlock(id) {
    this.blockId = id;
    if (this.mesh) { this.camera.remove(this.mesh); this.mesh.geometry.dispose(); }
    const geo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    // BoxGeometry 面序: +x -x +y -y +z -z, 每面4顶点
    const uvAttr = geo.getAttribute('uv');
    for (let f = 0; f < 6; f++) {
      const { u0, v0, u1, v1 } = tileUV(faceTile(id, f));
      const corners = [[u0, v1], [u1, v1], [u0, v0], [u1, v0]];
      for (let i = 0; i < 4; i++) {
        uvAttr.setXY(f * 4 + i, corners[i][0], corners[i][1]);
      }
    }
    uvAttr.needsUpdate = true;
    // 烘焙 MC 式面着色(材质不受光, 永不全黑): +x -x +y -y +z -z
    const shades = [0.80, 0.80, 1.0, 0.55, 0.92, 0.64];
    const count = geo.getAttribute('position').count;
    const col = new Float32Array(count * 3);
    for (let f = 0; f < 6; f++)
      for (let i = 0; i < 4; i++)
        col.set([shades[f] * 0.95, shades[f] * 0.88, shades[f] * 0.85], (f * 4 + i) * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.set(0.18, Math.PI / 5, 0.05);
    this.mesh.position.copy(this.basePos);
    this.mesh.renderOrder = 10;
    this.camera.add(this.mesh);
  }

  swing() { this.swingT = 0; }

  update(dt, moveSpeed, onGround) {
    if (!this.mesh) return;
    // 走路上下摆
    if (onGround && moveSpeed > 0.5) this.bobPhase += dt * moveSpeed * 1.6;
    const bob = Math.sin(this.bobPhase) * 0.014;
    const bob2 = Math.abs(Math.cos(this.bobPhase)) * 0.012;

    // 挥动动画
    this.swingT = Math.min(1, this.swingT + dt * 3.2);
    const s = Math.sin(this.swingT * Math.PI);
    this.mesh.position.set(
      this.basePos.x + bob - s * 0.12,
      this.basePos.y - bob2 - s * 0.18,
      this.basePos.z - s * 0.16
    );
    this.mesh.rotation.set(0.18 - s * 1.1, Math.PI / 5 - s * 0.5, 0.05);
  }
}
