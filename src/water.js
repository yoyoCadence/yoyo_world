import * as THREE from 'three';
import { SUN_DIR, PALETTE, FOG_DENSITY, WATER_Y } from './config.js';

// 海面: 动态波纹法线 + 菲涅尔天空反射 + 通向地平线的日光路(HDR 高光)
export function createWater() {
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: SUN_DIR.clone() },
    uSunColor: { value: PALETTE.sunCore.clone() },
    uDeep: { value: PALETTE.waterDeep.clone() },
    uFogSun: { value: PALETTE.fogSun.clone() },
    uFogAway: { value: PALETTE.fogAway.clone() },
    uFogDensity: { value: FOG_DENSITY },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform vec3 uSunDir, uSunColor, uDeep, uFogSun, uFogAway;
      uniform float uFogDensity;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 19.19);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
          mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
      }
      float waveH(vec2 p) {
        float t = uTime;
        return vnoise(p * 0.11 + vec2(t * 0.05, t * 0.018))
             + 0.55 * vnoise(p * 0.27 + vec2(-t * 0.035, t * 0.06))
             + 0.28 * vnoise(p * 0.71 + vec2(t * 0.09, -t * 0.05));
      }

      void main() {
        vec3 toCam = cameraPosition - vWorldPos;
        float dist = length(toCam);
        vec3 V = toCam / dist;

        // 数值梯度求波纹法线; 远处衰减 → 地平线趋于镜面
        vec2 p = vWorldPos.xz;
        float e = 0.7;
        float amp = 0.42 / (1.0 + dist * 0.005);
        float gx = (waveH(p + vec2(e, 0.0)) - waveH(p - vec2(e, 0.0))) / (2.0 * e);
        float gz = (waveH(p + vec2(0.0, e)) - waveH(p - vec2(0.0, e))) / (2.0 * e);
        vec3 N = normalize(vec3(-gx * amp, 1.0, -gz * amp));
        if (cameraPosition.y < vWorldPos.y) N = -N;

        vec3 R = reflect(-V, N);
        R.y = abs(R.y);

        // 天空反射近似(与天穹同调色)
        vec3 az = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
        float razSun = pow(max(dot(normalize(vec3(R.x, 0.0, R.z) + 1e-5), az), 0.0) * 0.5 + 0.5, 3.0);
        vec3 skyHor = mix(vec3(0.82, 0.36, 0.44), vec3(1.30, 0.55, 0.18), razSun);
        vec3 skyUp = vec3(0.16, 0.13, 0.32);
        vec3 skyRef = mix(skyHor, skyUp, smoothstep(0.0, 0.55, R.y));

        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(V, N), 0.0), 5.0);
        vec3 col = mix(uDeep, skyRef, clamp(fres * 1.25, 0.0, 1.0));

        // 方向性雾: 朝阳金 / 背阳粉
        vec3 vd = -V;
        float fs = pow(max(dot(vd, uSunDir), 0.0), 3.0);
        float fog = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        col = mix(col, mix(uFogAway, uFogSun, fs), fog);

        // 日光路: 锐利核心 + 宽幅闪烁带 (HDR → bloom), 雾后叠加保住地平线光路
        float rs = max(dot(R, uSunDir), 0.0);
        float spec = pow(rs, 500.0) * 4.5 + pow(rs, 80.0) * 1.1 + pow(rs, 16.0) * 0.2;
        col += uSunColor * spec * (1.0 - fog * 0.75);

        float alpha = mix(0.78, 1.0, clamp(fres * 1.5 + fog, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const geo = new THREE.PlaneGeometry(4000, 4000);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, material);
  water.position.y = WATER_Y;
  water.renderOrder = 2;
  return { water, uniforms };
}
