// 功能自检: 破坏 / 放置方块
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const exe = EDGE_PATHS.find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({
  executablePath: exe, headless: 'new',
  args: ['--enable-unsafe-swiftshader'], defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?test', { waitUntil: 'load', timeout: 20000 });
await page.waitForFunction('window.__READY === true', { timeout: 30000 });

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const az = { x: 0.8, z: -0.6 };
  const g = window.__game;
  const p = g.player.pos;
  window.__tp(p.x - az.x * 180, p.z - az.z * 180, 0, -1.3); // 内陆, 看脚下
  await sleep(800);

  const fx = Math.floor(g.player.pos.x), fz = Math.floor(g.player.pos.z);
  const groundY = Math.floor(g.player.pos.y) - 1;
  const before = g.world.getBlock(fx, fz === undefined ? 0 : groundY, fz);

  // 等射线命中后破坏
  await sleep(300);
  const hit1 = g.interact.hit ? { ...g.interact.hit } : null;
  g.interact.tryBreak();
  const afterBreak = hit1 ? g.world.getBlock(hit1.x, hit1.y, hit1.z) : -1;

  // 放置
  await sleep(300);
  g.interact.cooldown = 0;
  const hit2 = g.interact.hit ? { ...g.interact.hit } : null;
  let placed = -1, px, py, pz;
  if (hit2) {
    px = hit2.x + hit2.nx; py = hit2.y + hit2.ny; pz = hit2.z + hit2.nz;
    g.interact.tryPlace();
    placed = g.world.getBlock(px, py, pz);
  }
  return { before, hit1: !!hit1, afterBreak, hit2: !!hit2, placed, selected: g.interact.selected, mode: g.player.mode };
});
console.log('RESULT', JSON.stringify(result));
console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'NO_ERRORS');
await browser.close();
