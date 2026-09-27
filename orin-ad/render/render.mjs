#!/usr/bin/env node
/*
 * Renders index.html frame-by-frame with headless Chromium and encodes an MP4.
 *
 *   node render/render.mjs                 # full 1080×1920 @ 60fps with soundtrack
 *   node render/render.mjs --fps 30        # → out/orin-ad-9x16-30fps.mp4
 *   node render/render.mjs --cues-only     # just export out/cues.json
 *
 * Options:
 *   --fps N         frame rate (default 60)
 *   --scale S       device scale factor, e.g. 2 renders 2160×3840 (default 1)
 *   --from/--to     time range in seconds (default whole ad)
 *   --workers N     parallel browser pages (default 4)
 *   --crf N         x264 quality, lower = better (default 17)
 *   --out FILE      output path (default out/orin-ad-9x16-<fps>fps.mp4)
 *   --no-audio      skip soundtrack generation and muxing
 *   --keep-frames   keep the PNG frames in out/frames
 *
 * Needs: Playwright (Chromium) and ffmpeg with libx264. Set FFMPEG=/path/to/ffmpeg
 * if ffmpeg is not on PATH (pip's imageio-ffmpeg binary is picked up automatically).
 */
import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'out');

function args() {
  const a = process.argv.slice(2);
  const o = { fps: 60, scale: 1, workers: 4, crf: 17, out: null, audio: true, keep: false, cuesOnly: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i], v = a[i + 1];
    if (k === '--fps') { o.fps = +v; i++; }
    else if (k === '--scale') { o.scale = +v; i++; }
    else if (k === '--from') { o.from = +v; i++; }
    else if (k === '--to') { o.to = +v; i++; }
    else if (k === '--workers') { o.workers = +v; i++; }
    else if (k === '--crf') { o.crf = +v; i++; }
    else if (k === '--out') { o.out = path.resolve(v); i++; }
    else if (k === '--no-audio') o.audio = false;
    else if (k === '--keep-frames') o.keep = true;
    else if (k === '--cues-only') o.cuesOnly = true;
    else { console.error('unknown option ' + k); process.exit(1); }
  }
  o.out ??= path.join(OUT_DIR, `orin-ad-9x16-${o.fps}fps.mp4`);
  return o;
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(path.join(globalRoot, 'playwright', 'index.mjs')).href);
}

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const py = spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']);
  if (py.status === 0) return py.stdout.toString().trim();
  throw new Error('ffmpeg not found — install it or `pip install imageio-ffmpeg`, or set FFMPEG');
}

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited with ${code}`))));
  });
}

async function openPage(browser, o) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: o.scale });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?render=1');
  await page.evaluate(() => window.ORIN.ready);
  return page;
}

const o = args();
fs.mkdirSync(OUT_DIR, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();

// 1) cue sheet for the soundtrack
const first = await openPage(browser, o);
const meta = await first.evaluate(() => ({ duration: ORIN.duration, T: ORIN.T, bpm: ORIN.BPM, cues: ORIN.cues }));
const cuesPath = path.join(OUT_DIR, 'cues.json');
fs.writeFileSync(cuesPath, JSON.stringify(meta, null, 1));
console.log(`cues: ${meta.cues.length} events → ${path.relative(ROOT, cuesPath)}`);
if (o.cuesOnly) { await browser.close(); process.exit(0); }

// 2) soundtrack
const wav = path.join(OUT_DIR, 'soundtrack.wav');
if (o.audio) {
  console.log('soundtrack …');
  await run('python3', [path.join(ROOT, 'render', 'soundtrack.py'), cuesPath, wav]);
}

// 3) frames
const from = o.from ?? 0, to = o.to ?? meta.duration;
const n0 = Math.round(from * o.fps), n1 = Math.round(to * o.fps);
const total = n1 - n0;
const framesDir = path.join(OUT_DIR, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const pages = [first];
for (let i = 1; i < o.workers; i++) pages.push(await openPage(browser, o));

let done = 0;
const started = Date.now();
const chunk = Math.ceil(total / pages.length);
await Promise.all(pages.map(async (page, w) => {
  const cdp = await page.context().newCDPSession(page);
  const a = n0 + w * chunk, b = Math.min(n1, a + chunk);
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => ORIN.seek(t), f / o.fps);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(framesDir, `${String(f - n0).padStart(5, '0')}.png`), Buffer.from(data, 'base64'));
    if (++done % 60 === 0 || done === total) {
      const fps = done / ((Date.now() - started) / 1000);
      process.stdout.write(`\rframes ${done}/${total}  (${fps.toFixed(1)} fps)   `);
    }
  }
}));
process.stdout.write('\n');
await browser.close();

// 4) encode (BT.709 matrix so the brand coral stays #FF6B56 in players)
const ffmpeg = findFfmpeg();
const withAudio = o.audio && fs.existsSync(wav);
const ff = ['-y', '-hide_banner', '-loglevel', 'error', '-stats',
  '-framerate', String(o.fps), '-i', path.join(framesDir, '%05d.png')];
if (withAudio) ff.push('-ss', String(from), '-t', String(to - from), '-i', wav);
ff.push(
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(o.crf), '-profile:v', 'high', '-tune', 'animation',
  '-x264-params', 'aq-mode=3:aq-strength=0.9',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart');
if (withAudio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
ff.push(o.out);
console.log('encoding …');
await run(ffmpeg, ff);
if (!o.keep) fs.rmSync(framesDir, { recursive: true, force: true });
console.log(`done → ${path.relative(process.cwd(), o.out)}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
