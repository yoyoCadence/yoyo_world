// 无头浏览器自检: 收集控制台错误 + 截图
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const exe = EDGE_PATHS.find((p) => fs.existsSync(p));
if (!exe) { console.error('NO_BROWSER'); process.exit(1); }

const waitSec = Number(process.argv[2] || 6);
const out = process.argv[3] || 'test/shot.png';

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--window-size=1280,720', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto('http://localhost:5173/?test', { waitUntil: 'load', timeout: 20000 });
try {
  await page.waitForFunction('window.__READY === true', { timeout: 30000 });
} catch {
  errors.push('[timeout] __READY 未置位 (预生成或启动卡住)');
}
await new Promise((r) => setTimeout(r, waitSec * 1000));

const state = await page.evaluate(() => ({
  ready: window.__READY === true,
  webgl: !!document.querySelector('canvas'),
}));
console.log('STATE', JSON.stringify(state));
await page.screenshot({ path: out });
console.log('SHOT_SAVED', out);
if (errors.length) { console.log('ERRORS:'); for (const e of [...new Set(errors)].slice(0, 20)) console.log(e); }
else console.log('NO_ERRORS');
await browser.close();
