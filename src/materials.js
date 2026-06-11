import * as THREE from 'three';
import { SUN_DIR, PALETTE } from './config.js';

// 给标准材质注入"方向性雾": 朝阳金色、背阳粉紫 —— 光影包氛围的关键
function patchDirectionalFog(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirW = { value: SUN_DIR.clone() };
    shader.uniforms.uFogSun = { value: PALETTE.fogSun.clone() };
    shader.uniforms.uFogAway = { value: PALETTE.fogAway.clone() };

    shader.vertexShader = 'varying vec3 vWorldPos;\n' + shader.vertexShader.replace(
      '#include <fog_vertex>',
      '#include <fog_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );
    shader.fragmentShader = (
      'varying vec3 vWorldPos;\nuniform vec3 uSunDirW;\nuniform vec3 uFogSun;\nuniform vec3 uFogAway;\n'
      + shader.fragmentShader.replace(
        '#include <fog_fragment>',
        /* glsl */`
        #ifdef USE_FOG
          vec3 fvDir = normalize(vWorldPos - cameraPosition);
          float fSun = pow(clamp(dot(fvDir, uSunDirW), 0.0, 1.0), 3.0);
          vec3 dirFogColor = mix(uFogAway, uFogSun, fSun);
          #ifdef FOG_EXP2
            float dirFogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float dirFogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.rgb = mix(gl_FragColor.rgb, dirFogColor, dirFogFactor);
        #endif
        `
      )
    );
  };
  material.customProgramCacheKey = () => 'dirfog-' + material.type + '-' + (material.alphaTest > 0 ? 'a' : 'o');
}

export function createMaterials(atlasTexture) {
  // 地形: Lambert + 顶点色 AO + alphaTest(树叶透光孔)
  const terrain = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    vertexColors: true,
    alphaTest: 0.5,
  });
  patchDirectionalFog(terrain);

  // 萤石: 不受光照、HDR 颜色 → bloom 发光
  const glow = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    vertexColors: true,
    color: new THREE.Color(2.6, 2.0, 1.5),
  });
  patchDirectionalFog(glow);

  return [terrain, glow];
}
