# YOYO World · Eternal Sunset

Language: [繁體中文](README.md) | English | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

A three.js voxel world: a Minecraft-style clone forever suspended at sunset.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
```

## Gameplay

You spawn above the coastline, gliding by default as the world slowly opens below you. After landing, or entering the sea, movement switches to walking or swimming.

| Action | Key |
| --- | --- |
| Look / move | Mouse / WASD, Shift to sprint |
| Jump | Space (press again in the air → deploy glide) |
| Rocket launch | F (boost upward anytime, then glide) |
| Break / place | Left click / right click (hold for repeat) |
| Select block | 1–9 or mouse wheel |

## Structure

- `src/terrain.js` — simplex-noise terrain: continents, hills, mountains, forests, ocean, and coastline
- `src/world.js` + `src/mesher.js` — streaming chunk loading, face-culling mesh generation, per-vertex AO
- `src/sky.js` — sky-dome shader: sunset gradient, HDR orange sun disk, cirrus clouds
- `src/water.js` — ocean shader: wave normals, Fresnel reflection, sun path toward the horizon
- `src/materials.js` — injects directional fog into standard materials (gold toward the sun / pink-purple away from it)
- `src/main.js` — assembly + post-processing (UnrealBloom, color grading vignette, ACES)
- `test/` — puppeteer headless self-check scripts (screenshots + interaction tests), `node test/shot.mjs`

All textures are generated procedurally with canvas. No external assets are required.
