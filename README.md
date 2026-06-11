# YOYO 世界 · 永恒落日

一个 three.js 体素世界：永远停留在日落时分的 Minecraft 风格克隆。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

## 玩法

出生在海岸线上空，默认滑翔，俯瞰世界缓缓下降；落地（或入海）后切换步行/游泳。

| 操作 | 按键 |
| --- | --- |
| 视角 / 移动 | 鼠标 / WASD，Shift 疾跑 |
| 跳跃 | 空格（空中再按一次 → 展开滑翔） |
| 火箭起飞 | F（任意时刻冲天再滑翔） |
| 破坏 / 放置 | 左键 / 右键（长按连续） |
| 选择方块 | 1–9 或滚轮 |

## 结构

- `src/terrain.js` — simplex 噪声地形：大陆/丘陵/山脉/森林，大海与海岸线
- `src/world.js` + `src/mesher.js` — 区块流式加载、面剔除网格化、逐顶点 AO
- `src/sky.js` — 天穹着色器：晚霞渐变、HDR 橙色日轮、卷云
- `src/water.js` — 海面着色器：波纹法线、菲涅尔反射、通向地平线的日光路
- `src/materials.js` — 给标准材质注入方向性雾（朝阳金 / 背阳粉紫）
- `src/main.js` — 装配 + 后处理（UnrealBloom、调色暗角、ACES）
- `test/` — puppeteer 无头自检脚本（截图 + 交互测试），`node test/shot.mjs`

贴图全部由 canvas 程序化生成，无外部素材。
