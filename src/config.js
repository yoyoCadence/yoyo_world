import * as THREE from 'three';

// ---- 世界尺寸 ----
export const CHUNK = 16;          // 区块边长
export const WORLD_H = 112;       // 世界高度
export const SEA = 32;            // 海平面(方块)
export const WATER_Y = 31.72;     // 水面渲染高度
export const RENDER_RADIUS = 9;   // 渲染半径(区块)
export const GEN_RADIUS = RENDER_RADIUS + 1;

// ---- 永恒落日 ----
// 太阳方向(指向太阳)。低悬于海面之上。
export const SUN_DIR = new THREE.Vector3(0.8, 0.155, -0.6).normalize();
export const SUN_AZIMUTH = new THREE.Vector3(0.8, 0, -0.6).normalize();

// 调色板(THREE.Color 自动转入线性工作空间)
export const PALETTE = {
  sunLight: new THREE.Color(0xffa24d),   // 直射阳光
  ambientSky: new THREE.Color(0xa06a9a), // 天光(粉紫)
  ambientGround: new THREE.Color(0x4a3424),
  fogSun: new THREE.Color(0xffb273),     // 朝阳方向雾色(金)
  fogAway: new THREE.Color(0xc98ba4),    // 背阳方向雾色(粉紫)
  waterDeep: new THREE.Color(0x0d2e36),  // 深海
  sunCore: new THREE.Color(0xffba70),    // 海面镜面反射用
};

export const FOG_DENSITY = 0.006;

// 玩家
export const PLAYER = {
  halfW: 0.3,
  height: 1.8,
  eye: 1.62,
  walkSpeed: 5.6,
  sprintSpeed: 8.6,
  jumpVel: 8.6,
  gravity: 27,
  reach: 6,
};
