# YOYO 世界 · 永恒落日

Language: [简体中文](#zh-hans) | [繁體中文](#zh-hant) | [English](#english) | [日本語](#ja)

## <a id="zh-hans"></a>简体中文

一个 three.js 体素世界：永远停留在日落时分的 Minecraft 风格克隆。

### 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

### 玩法

出生在海岸线上空，默认滑翔，俯瞰世界缓缓下降；落地（或入海）后切换步行/游泳。

| 操作 | 按键 |
| --- | --- |
| 视角 / 移动 | 鼠标 / WASD，Shift 疾跑 |
| 跳跃 | 空格（空中再按一次 → 展开滑翔） |
| 火箭起飞 | F（任意时刻冲天再滑翔） |
| 破坏 / 放置 | 左键 / 右键（长按连续） |
| 选择方块 | 1–9 或滚轮 |

### 结构

- `src/terrain.js` — simplex 噪声地形：大陆/丘陵/山脉/森林，大海与海岸线
- `src/world.js` + `src/mesher.js` — 区块流式加载、面剔除网格化、逐顶点 AO
- `src/sky.js` — 天穹着色器：晚霞渐变、HDR 橙色日轮、卷云
- `src/water.js` — 海面着色器：波纹法线、菲涅尔反射、通向地平线的日光路
- `src/materials.js` — 给标准材质注入方向性雾（朝阳金 / 背阳粉紫）
- `src/main.js` — 装配 + 后处理（UnrealBloom、调色暗角、ACES）
- `test/` — puppeteer 无头自检脚本（截图 + 交互测试），`node test/shot.mjs`

贴图全部由 canvas 程序化生成，无外部素材。

## <a id="zh-hant"></a>繁體中文

一個 three.js 體素世界：永遠停留在日落時分的 Minecraft 風格克隆。

### 執行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產物在 dist/
```

### 玩法

出生在海岸線上空，預設滑翔，俯瞰世界緩緩下降；落地（或入海）後切換為步行 / 游泳。

| 操作 | 按鍵 |
| --- | --- |
| 視角 / 移動 | 滑鼠 / WASD，Shift 疾跑 |
| 跳躍 | 空白鍵（空中再按一次 → 展開滑翔） |
| 火箭起飛 | F（任意時刻衝天再滑翔） |
| 破壞 / 放置 | 左鍵 / 右鍵（長按連續） |
| 選擇方塊 | 1–9 或滾輪 |

### 結構

- `src/terrain.js` — simplex 雜訊地形：大陸 / 丘陵 / 山脈 / 森林，大海與海岸線
- `src/world.js` + `src/mesher.js` — 區塊串流載入、面剔除網格化、逐頂點 AO
- `src/sky.js` — 天穹著色器：晚霞漸層、HDR 橙色日輪、卷雲
- `src/water.js` — 海面著色器：波紋法線、菲涅爾反射、通向地平線的日光路
- `src/materials.js` — 給標準材質注入方向性霧效（朝陽金 / 背陽粉紫）
- `src/main.js` — 裝配 + 後處理（UnrealBloom、調色暗角、ACES）
- `test/` — puppeteer 無頭自檢腳本（截圖 + 互動測試），`node test/shot.mjs`

貼圖全部由 canvas 程序化生成，沒有外部素材。

## <a id="english"></a>English

A three.js voxel world: a Minecraft-style clone forever suspended at sunset.

### Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
```

### Gameplay

You spawn above the coastline, gliding by default as the world slowly opens below you. After landing, or entering the sea, movement switches to walking or swimming.

| Action | Key |
| --- | --- |
| Look / move | Mouse / WASD, Shift to sprint |
| Jump | Space (press again in the air → deploy glide) |
| Rocket launch | F (boost upward anytime, then glide) |
| Break / place | Left click / right click (hold for repeat) |
| Select block | 1–9 or mouse wheel |

### Structure

- `src/terrain.js` — simplex-noise terrain: continents, hills, mountains, forests, ocean, and coastline
- `src/world.js` + `src/mesher.js` — streaming chunk loading, face-culling mesh generation, per-vertex AO
- `src/sky.js` — sky-dome shader: sunset gradient, HDR orange sun disk, cirrus clouds
- `src/water.js` — ocean shader: wave normals, Fresnel reflection, sun path toward the horizon
- `src/materials.js` — injects directional fog into standard materials (gold toward the sun / pink-purple away from it)
- `src/main.js` — assembly + post-processing (UnrealBloom, color grading vignette, ACES)
- `test/` — puppeteer headless self-check scripts (screenshots + interaction tests), `node test/shot.mjs`

All textures are generated procedurally with canvas. No external assets are required.

## <a id="ja"></a>日本語

three.js で作られたボクセル世界です。夕暮れの時間に永遠にとどまる、Minecraft 風のクローンです。

### 実行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に出力
```

### 遊び方

海岸線の上空から始まり、最初は滑空状態です。世界を見下ろしながらゆっくり降下し、着地するか海に入ると、歩行または水泳に切り替わります。

| 操作 | キー |
| --- | --- |
| 視点 / 移動 | マウス / WASD、Shift でダッシュ |
| ジャンプ | Space（空中でもう一度押す → 滑空を展開） |
| ロケット発射 | F（いつでも上空へ加速し、そのまま滑空） |
| 破壊 / 配置 | 左クリック / 右クリック（長押しで連続） |
| ブロック選択 | 1–9 またはマウスホイール |

### 構成

- `src/terrain.js` — simplex noise による地形：大陸 / 丘陵 / 山脈 / 森林、海と海岸線
- `src/world.js` + `src/mesher.js` — chunk のストリーミング読み込み、面カリングによるメッシュ化、頂点ごとの AO
- `src/sky.js` — スカイドームシェーダー：夕焼けグラデーション、HDR のオレンジ色の太陽、巻雲
- `src/water.js` — 海面シェーダー：波の法線、フレネル反射、地平線へ伸びる太陽光の道
- `src/materials.js` — 標準マテリアルへ方向性フォグを注入（朝日側は金色 / 反対側はピンク紫）
- `src/main.js` — 組み立て + ポストプロセス（UnrealBloom、カラーグレーディングのビネット、ACES）
- `test/` — puppeteer のヘッドレス自己チェック用スクリプト（スクリーンショット + インタラクションテスト）、`node test/shot.mjs`

テクスチャはすべて canvas でプロシージャル生成されており、外部素材は使っていません。
