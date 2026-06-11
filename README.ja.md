# YOYO World · 永遠の夕暮れ

言語：[繁體中文](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md) | 日本語

three.js で作られたボクセル世界です。夕暮れの時間に永遠にとどまる、Minecraft 風のクローンです。

## 実行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に出力
```

## 遊び方

海岸線の上空から始まり、最初は滑空状態です。世界を見下ろしながらゆっくり降下し、着地するか海に入ると、歩行または水泳に切り替わります。

| 操作 | キー |
| --- | --- |
| 視点 / 移動 | マウス / WASD、Shift でダッシュ |
| ジャンプ | Space（空中でもう一度押す → 滑空を展開） |
| ロケット発射 | F（いつでも上空へ加速し、そのまま滑空） |
| 破壊 / 配置 | 左クリック / 右クリック（長押しで連続） |
| ブロック選択 | 1–9 またはマウスホイール |

## 構成

- `src/terrain.js` — simplex noise による地形：大陸 / 丘陵 / 山脈 / 森林、海と海岸線
- `src/world.js` + `src/mesher.js` — chunk のストリーミング読み込み、面カリングによるメッシュ化、頂点ごとの AO
- `src/sky.js` — スカイドームシェーダー：夕焼けグラデーション、HDR のオレンジ色の太陽、巻雲
- `src/water.js` — 海面シェーダー：波の法線、フレネル反射、地平線へ伸びる太陽光の道
- `src/materials.js` — 標準マテリアルへ方向性フォグを注入（朝日側は金色 / 反対側はピンク紫）
- `src/main.js` — 組み立て + ポストプロセス（UnrealBloom、カラーグレーディングのビネット、ACES）
- `test/` — puppeteer のヘッドレス自己チェック用スクリプト（スクリーンショット + インタラクションテスト）、`node test/shot.mjs`

テクスチャはすべて canvas でプロシージャル生成されており、外部素材は使っていません。
