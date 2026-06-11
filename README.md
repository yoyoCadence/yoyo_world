# YOYO 世界 · 永恆落日

語言：繁體中文 | [English](README.en.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

一個 three.js 體素世界：永遠停留在日落時分的 Minecraft 風格克隆。

## 執行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產物在 dist/
```

## 玩法

出生在海岸線上空，預設滑翔，俯瞰世界緩緩下降；落地（或入海）後切換為步行 / 游泳。

| 操作 | 按鍵 |
| --- | --- |
| 視角 / 移動 | 滑鼠 / WASD，Shift 疾跑 |
| 跳躍 | 空白鍵（空中再按一次 → 展開滑翔） |
| 火箭起飛 | F（任意時刻衝天再滑翔） |
| 破壞 / 放置 | 左鍵 / 右鍵（長按連續） |
| 選擇方塊 | 1–9 或滾輪 |

## 結構

- `src/terrain.js` — simplex 雜訊地形：大陸 / 丘陵 / 山脈 / 森林，大海與海岸線
- `src/world.js` + `src/mesher.js` — 區塊串流載入、面剔除網格化、逐頂點 AO
- `src/sky.js` — 天穹著色器：晚霞漸層、HDR 橙色日輪、卷雲
- `src/water.js` — 海面著色器：波紋法線、菲涅爾反射、通向地平線的日光路
- `src/materials.js` — 給標準材質注入方向性霧效（朝陽金 / 背陽粉紫）
- `src/main.js` — 裝配 + 後處理（UnrealBloom、調色暗角、ACES）
- `test/` — puppeteer 無頭自檢腳本（截圖 + 互動測試），`node test/shot.mjs`

貼圖全部由 canvas 程序化生成，沒有外部素材。
