// 传送到内陆, 验证陆地景观: 长影/树林/草地
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const exe = EDGE_PATHS.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?test', { waitUntil: 'load', timeout: 20000 });
await page.waitForFunction('window.__READY === true', { timeout: 30000 });

// 内陆点 = 出生点向背阳方向退 180 格, 面朝太阳
await page.evaluate(() => {
  const az = { x: 0.8, z: -0.6 };
  const p = window.__game.player.pos;
  const yaw = Math.atan2(-az.x, -az.z);
  window.__tp(p.x - az.x * 180, p.z - az.z * 180, yaw, -0.05);
});
await new Promise((r) => setTimeout(r, 8000)); // 等区块加载
await page.screenshot({ path: 'test/shot-land.png' });

const info = await page.evaluate(() => ({
  pos: window.__game.player.pos.toArray().map((v) => Math.round(v)),
  mode: window.__game.player.mode,
  chunks: window.__game.world.chunks.size,
}));
console.log('INFO', JSON.stringify(info));
console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'NO_ERRORS');
await browser.close();
