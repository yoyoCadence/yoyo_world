import * as THREE from 'three';
import { SUN_DIR } from './config.js';

// 天穹: 完整晚霞渐变 + 清晰橙色日轮(HDR, 供 bloom) + 卷云
export function createSky() {
  const uniforms = {
    uSunDir: { value: SUN_DIR.clone() },
    uTime: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uSunDir;
      uniform float uTime;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
          mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.13 + 7.3; a *= 0.5; }
        return s;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 az = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
        vec3 dAz = normalize(vec3(dir.x, 0.0, dir.z) + 1e-5);
        float sunAz = dot(dAz, az) * 0.5 + 0.5;
        float sunAmt = pow(sunAz, 3.0);

        // 晚霞渐变: 朝阳金橙 / 背阳粉紫 / 天顶深紫蓝
        vec3 zenith  = vec3(0.085, 0.075, 0.24);
        vec3 midSun  = vec3(0.78, 0.34, 0.20);
        vec3 midAway = vec3(0.42, 0.20, 0.40);
        vec3 horSun  = vec3(1.30, 0.55, 0.18);
        vec3 horAway = vec3(0.82, 0.36, 0.44);

        vec3 hor = mix(horAway, horSun, sunAmt);
        vec3 mid = mix(midAway, midSun, sunAmt);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zenith, smoothstep(0.10, 0.62, h));
        // 地平线下: 保持地平线雾色, 与海面雾无缝衔接
        col = mix(col, hor * 0.92, smoothstep(0.0, -0.12, h));

        // 卷云(只在天上, 被晚霞染色)
        if (h > 0.015) {
          vec2 cp = dir.xz / (h + 0.18);
          float n = fbm(cp * vec2(0.55, 1.6) + vec2(uTime * 0.004, 0.0));
          float cloud = smoothstep(0.52, 0.78, n) * smoothstep(0.55, 0.10, h) * smoothstep(0.015, 0.06, h);
          vec3 cloudCol = mix(vec3(0.95, 0.50, 0.58), vec3(1.45, 0.78, 0.42), sunAmt);
          col = mix(col, cloudCol, cloud * 0.5);
        }

        // 太阳: 清晰日轮 + 光晕 (HDR 强度, 交给 bloom)
        float d = dot(dir, uSunDir);
        float ang = acos(clamp(d, -1.0, 1.0));
        float disc = 1.0 - smoothstep(0.042, 0.047, ang);
        col += vec3(3.0, 0.95, 0.20) * disc;
        col += vec3(1.10, 0.38, 0.08) * pow(max(d, 0.0), 48.0) * 0.55;
        col += vec3(0.80, 0.30, 0.11) * pow(max(d, 0.0), 7.0) * 0.26;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), material);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  return { sky, uniforms };
}
