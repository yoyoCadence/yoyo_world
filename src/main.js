import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  SEA, WATER_Y, SUN_DIR, SUN_AZIMUTH, PALETTE, FOG_DENSITY, GEN_RADIUS, CHUNK,
} from './config.js';
import { buildAtlas, GRASS, DIRT, STONE, SAND, LOG, PLANKS, LEAVES, GLOW, SNOW } from './blocks.js';
import { createMaterials } from './materials.js';
import { heightAt } from './terrain.js';
import { World } from './world.js';
import { createSky } from './sky.js';
import { createWater } from './water.js';
import { Player, MODE } from './player.js';
import { Controls } from './controls.js';
import { Interact } from './interact.js';
import { Hand } from './hand.js';
import { UI } from './ui.js';

const TEST_MODE = location.search.includes('test');

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PALETTE.fogSun.clone().lerp(PALETTE.fogAway, 0.5), FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3200);
camera.rotation.order = 'YXZ';
scene.add(camera);

// ---------- 光照: 永恒落日 ----------
const sunLight = new THREE.DirectionalLight(PALETTE.sunLight, 2.7);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 700;
sunLight.shadow.camera.left = -110;
sunLight.shadow.camera.right = 110;
sunLight.shadow.camera.top = 110;
sunLight.shadow.camera.bottom = -110;
sunLight.shadow.bias = -0.0006;
sunLight.shadow.normalBias = 0.6;
scene.add(sunLight, sunLight.target);

const hemi = new THREE.HemisphereLight(PALETTE.ambientSky, PALETTE.ambientGround, 0.62);
scene.add(hemi);

// ---------- 世界 ----------
const { texture: atlasTexture, canvas: atlasCanvas } = buildAtlas();
const materials = createMaterials(atlasTexture);
const world = new World(scene, materials);

const { sky, uniforms: skyU } = createSky();
scene.add(sky);
const { water, uniforms: waterU } = createWater();
scene.add(water);

// ---------- 出生点: 海岸线上空, 面朝大海与落日 ----------
function findSpawn() {
  const az = SUN_AZIMUTH;
  for (const lateral of [0, 60, -60, 130, -130, 220, -220, 320, -320]) {
    const lx = -az.z * lateral, lz = az.x * lateral;
    let prevLand = false;
    for (let d = 60; d < 3600; d += 8) {
      const x = Math.round(az.x * d + lx), z = Math.round(az.z * d + lz);
      const h = heightAt(x, z);
      const isLand = h > SEA + 1;
      if (prevLand && !isLand) {
        // 海岸! 检查前方是开阔海面
        let open = true;
        for (const dd of [180, 420, 750]) {
          if (heightAt(Math.round(az.x * (d + dd) + lx), Math.round(az.z * (d + dd) + lz)) > SEA - 2) { open = false; break; }
        }
        if (open) {
          const bx = Math.round(az.x * (d - 70) + lx), bz = Math.round(az.z * (d - 70) + lz);
          return new THREE.Vector3(bx + 0.5, 0, bz + 0.5);
        }
      }
      prevLand = isLand;
    }
  }
  return new THREE.Vector3(0.5, 0, 0.5);
}

const spawn = findSpawn();
const player = new Player(world);
player.pos.set(spawn.x, 132, spawn.z);
player.yaw = Math.atan2(-SUN_AZIMUTH.x, -SUN_AZIMUTH.z);
player.pitch = -0.12;
player.vel.copy(SUN_DIR).setY(0).normalize().multiplyScalar(15);

// ---------- 交互 / UI ----------
const controls = new Controls(renderer.domElement);
controls.testMode = TEST_MODE;
const interact = new Interact(world, player, camera, scene);
// 手持方块: 不受光材质 + 烘焙面着色, 带落日暖色调
const handMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, vertexColors: true });
const hand = new Hand(camera, handMaterial);

const HOTBAR = [GRASS, DIRT, STONE, SAND, LOG, PLANKS, LEAVES, GLOW, SNOW];
const ui = new UI(HOTBAR, atlasCanvas);
interact.selected = HOTBAR[0];

controls.onWheel = (dir) => {
  const i = (ui.selectedIndex + dir + HOTBAR.length) % HOTBAR.length;
  interact.selected = ui.select(i);
  hand.setBlock(interact.selected);
};
controls.onKey = (code) => {
  if (code.startsWith('Digit')) {
    const i = Number(code.slice(5)) - 1;
    if (i >= 0 && i < HOTBAR.length) {
      interact.selected = ui.select(i);
      hand.setBlock(interact.selected);
    }
  }
  if (code === 'KeyF' && started) player.launch();
};
interact.onPlaceOrBreak = () => hand.swing();
controls.onLockChange = (locked) => {
  if (!locked && started && !TEST_MODE) ui.showOverlay();
  else if (locked) ui.hideOverlay();
};

// ---------- 后处理: bloom + 调色/暗角 ----------
const size = new THREE.Vector2();
renderer.getSize(size);
const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), {
  type: THREE.HalfFloatType,
  samples: 4,
});
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(size.clone(), 0.5, 0.85, 1.0);
composer.addPass(bloom);

const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float l = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
      col.rgb = mix(vec3(l), col.rgb, 1.12);          // 轻微提饱和
      col.rgb *= vec3(1.03, 0.99, 0.97);              // 暖色倾向
      vec2 q = vUv - 0.5;
      col.rgb *= 1.0 - dot(q, q) * 0.5;               // 暗角
      gl_FragColor = col;
    }
  `,
};
composer.addPass(new ShaderPass(GradeShader));
composer.addPass(new OutputPass());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 预生成世界 ----------
let started = false;
const targetChunks = Math.PI * GEN_RADIUS * GEN_RADIUS;

function pregen() {
  const busy = world.update(player.pos.x, player.pos.z, 20, 8);
  ui.setProgress(Math.min(1, world.chunks.size / targetChunks));
  if (busy || world.chunks.size < targetChunks * 0.95) {
    requestAnimationFrame(pregen);
  } else {
    ui.setReady(() => {
      if (!started) startGame();
      else controls.lock();
    });
    if (TEST_MODE) startGame();
  }
}

function startGame() {
  started = true;
  ui.hideOverlay();
  if (!TEST_MODE) controls.lock();
  window.__READY = true;
}

// ---------- 主循环 ----------
const clock = new THREE.Clock();
const SENS = 0.0023;
const camOffset = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  skyU.uTime.value = t;
  waterU.uTime.value = t;

  if (started) {
    // 视角
    const { dx, dy } = controls.consumeMouse();
    player.yaw -= dx * SENS;
    player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * SENS));

    player.update(dt, controls);
    interact.update(dt, controls);
  }

  // 流式加载
  world.update(player.pos.x, player.pos.z, 4, 3);

  // 摄像机跟随
  const eye = player.eyePos;
  camera.position.copy(eye);
  camera.rotation.set(player.pitch, player.yaw, 0);

  // 滑翔时视野随速度扩张
  const speed = player.vel.length();
  const targetFov = player.mode === MODE.GLIDE ? 75 + Math.min(speed / 48, 1) * 16 : 75;
  camera.fov += (targetFov - camera.fov) * Math.min(dt * 5, 1);
  camera.updateProjectionMatrix();

  // 太阳与天空海面跟随玩家
  sky.position.copy(camera.position);
  water.position.x = camera.position.x;
  water.position.z = camera.position.z;

  camOffset.copy(SUN_DIR).multiplyScalar(300);
  sunLight.position.copy(player.pos).add(camOffset);
  sunLight.position.x = Math.round(sunLight.position.x / 4) * 4;
  sunLight.position.y = Math.round(sunLight.position.y / 4) * 4;
  sunLight.position.z = Math.round(sunLight.position.z / 4) * 4;
  sunLight.target.position.copy(player.pos);

  // 手持方块
  const hSpeed = Math.hypot(player.vel.x, player.vel.z);
  hand.update(dt, hSpeed, player.onGround);

  // HUD
  if (started) {
    if (player.mode === MODE.GLIDE) {
      ui.setMode(`✦ 滑翔中 ${Math.round(speed * 3.6)} km/h ✦`);
    } else if (player.inWater()) {
      ui.setMode('~ 游泳中 · 空格上浮 ~');
    } else {
      ui.setMode('');
    }
    ui.setUnderwater(camera.position.y < WATER_Y);
  }

  composer.render();
}

pregen();
animate();

// 测试钩子
window.__game = { player, world, camera, interact };
window.__tp = (x, z, yaw = player.yaw, pitch = -0.1) => {
  world.ensureData(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  let y = 100;
  while (y > 1 && world.getBlock(Math.floor(x), y - 1, Math.floor(z)) === 0) y--;
  player.pos.set(x, y + 0.5, z);
  player.vel.set(0, 0, 0);
  player.mode = MODE.WALK;
  player.yaw = yaw;
  player.pitch = pitch;
};
