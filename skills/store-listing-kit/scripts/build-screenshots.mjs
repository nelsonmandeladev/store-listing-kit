#!/usr/bin/env node
// Composes store screenshots and a Google Play feature graphic from raw device
// captures. No npm dependencies: each image is an HTML page rendered by headless
// Chrome/Chromium/Edge.
//
//   node build-screenshots.mjs <config.json> [lang]
//
// Paths inside the config are relative to the config file. See
// ../assets/screenshots.config.example.json for every option.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [configArg, onlyLang] = process.argv.slice(2);
if (!configArg) {
  console.error("usage: node build-screenshots.mjs <config.json> [lang]");
  process.exit(1);
}

const configPath = resolve(configArg);
const base = dirname(configPath);
const config = JSON.parse(readFileSync(configPath, "utf8"));
const at = (p) => resolve(base, p);
const url = (p) => pathToFileURL(at(p)).href;

const theme = {
  background: "#f5f7f6",
  tintA: "#b5f5d0",
  tintB: "#d9fbe7",
  accent: "#35d579",
  accentDeep: "#11843b",
  text: "#020403",
  muted: "#3f4d45",
  ...config.theme,
};
const canvas = { width: 1080, height: 1920, ...config.canvas };
const raw = { width: 1080, height: 2160, ...config.rawSize };
const device = config.device ?? "android"; // "android" | "iphone"
const languages = onlyLang ? [onlyLang] : config.languages;
const rawDir = config.rawDir ?? "raw";
const outDir = config.outDir ?? "out";

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    console.error("No Chrome/Chromium found. Set CHROME_PATH.");
    process.exit(1);
  }
  return found;
}

const chrome = findChrome();
const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fontFace = config.font
  ? `@font-face { font-family: Brand; src: url("${url(config.font)}"); font-weight: 100 900; }`
  : "";
const fontStack = `${config.font ? "Brand, " : ""}"Segoe UI", -apple-system, system-ui, sans-serif`;
const marker = `<svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M6 26 C 90 12, 220 10, 394 20" stroke="${theme.accent}" stroke-width="16" stroke-linecap="round" fill="none"/></svg>`;

const headline = (lines) =>
  `<h1><span class="a">${escape(lines[0])}</span><br><span class="b">${escape(lines[1])}${marker}</span></h1>`;

// Shrinks the headline until each line fits `max` px.
const fitScript = (max, min) => `<script>
document.fonts.ready.then(() => {
  const h1 = document.querySelector("h1");
  let size = parseFloat(getComputedStyle(h1).fontSize);
  for (const el of h1.children) {
    while (el.getBoundingClientRect().width > ${max} && size > ${min}) { size -= 1; h1.style.fontSize = size + "px"; }
  }
  const sub = document.querySelector(".fit");
  if (sub) { let s = parseFloat(getComputedStyle(sub).fontSize);
    while (sub.scrollWidth > ${max} && s > 12) { s -= 1; sub.style.fontSize = s + "px"; } }
});
</script>`;

// Device frame around a screen of width `sw` showing `image`.
function phone(image, sw, k) {
  const sh = (sw * raw.height) / raw.width;
  const bezel = 22 * k;
  const notch =
    device === "iphone"
      ? `<i class="island" style="width:${sw * 0.3}px;height:${34 * k}px;top:${14 * k}px;margin-left:-${sw * 0.15}px;border-radius:${20 * k}px"></i>`
      : `<i class="hole" style="width:${30 * k}px;height:${30 * k}px;top:${18 * k}px;margin-left:-${15 * k}px"></i>`;
  return {
    width: sw + bezel * 2,
    height: sh + bezel * 2,
    html: `<div class="frame" style="padding:${bezel}px;border-radius:${66 * k}px">
      <div class="screen" style="width:${sw}px;height:${sh}px;border-radius:${44 * k}px;background-image:url('${image}')">${notch}</div>
    </div>`,
  };
}

const sharedCss = (W, H) => `
${fontFace}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { position: relative; font-family: ${fontStack}; color: ${theme.text}; background: ${theme.background}; }
h1 { line-height: 1.04; letter-spacing: -0.01em; word-spacing: 0.08em; white-space: nowrap; }
h1 .a { display: inline-block; font-weight: 500; }
.fit { display: inline-block; }
h1 .b { display: inline-block; font-weight: 700; position: relative; z-index: 0; }
h1 .b svg { position: absolute; left: -2%; width: 104%; bottom: -0.12em; height: 0.36em; z-index: -1; }
.frame { position: absolute; background: linear-gradient(145deg, #2b3530, #0b0f0d 60%);
  box-shadow: 0 0 0 3px #3d4943 inset, 0 60px 120px rgba(0,0,0,.22), 0 20px 40px rgba(0,0,0,.14); }
.screen { position: relative; overflow: hidden; background: center / cover no-repeat; }
.screen i { position: absolute; left: 50%; background: #050706; }
.hole { border-radius: 50%; }
`;

function slidePage(slide, lang) {
  const W = canvas.width;
  const H = canvas.height;
  const k = W / 1080;
  const copy = slide.copy[lang];
  const left = (slide.tilt ?? -3) < 0;
  const device_ = phone(url(join(rawDir, lang, `${slide.raw}.png`)), W * 0.685, k);
  const [x1, y1, x2, y2] = slide.cardByLang?.[lang] ?? slide.card ?? [];
  const cardScale = (0.9 * W) / raw.width;
  const cardImage = url(join(rawDir, lang, `${slide.cardRaw ?? slide.raw}.png`));
  const sticker = slide.sticker;

  const card = slide.card
    ? `<div class="card" style="top:${(slide.cardTop ?? 1100) * k}px;width:${(x2 - x1) * cardScale}px;height:${(y2 - y1) * cardScale}px;margin-left:-${((x2 - x1) * cardScale) / 2}px;
        background:url('${cardImage}') -${x1 * cardScale}px -${y1 * cardScale}px / ${raw.width * cardScale}px auto no-repeat;
        transform:rotate(${left ? 1.5 : -1.5}deg)"></div>`
    : "";

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
${sharedCss(W, H)}
body { background:
  radial-gradient(${900 * k}px ${700 * k}px at ${left ? "110%" : "-10%"} 75%, ${theme.tintA} 0%, transparent 70%),
  radial-gradient(${700 * k}px ${500 * k}px at ${left ? "-5%" : "105%"} 20%, ${theme.tintB} 0%, transparent 70%),
  ${theme.background}; }
.head { position: absolute; top: ${120 * k}px; left: ${72 * k}px; right: ${72 * k}px; text-align: center; }
h1 { font-size: ${112 * k}px; }
.sub { margin-top: ${42 * k}px; font-size: ${40 * k}px; line-height: 1.3; font-weight: 500; color: ${theme.muted}; word-spacing: 0.06em; }
.frame { left: 50%; top: ${580 * k}px; margin-left: -${device_.width / 2}px; transform: rotate(${slide.tilt ?? -3}deg); }
.card { position: absolute; left: 50%; border-radius: ${46 * k}px; overflow: hidden;
  box-shadow: 0 ${40 * k}px ${80 * k}px rgba(0,0,0,.2), 0 ${10 * k}px ${24 * k}px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.05); }
.sticker { position: absolute; width: ${150 * k}px; height: ${150 * k}px; border-radius: ${42 * k}px;
  display: grid; place-items: center; font-size: ${76 * k}px;
  background: linear-gradient(150deg, ${theme.accent}, ${theme.accentDeep});
  box-shadow: 0 ${30 * k}px ${60 * k}px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.35);
  font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }
</style></head><body>
<div class="head">${headline(copy.lines)}<p class="sub fit">${escape(copy.sub ?? "")}</p></div>
${device_.html}
${card}
${sticker ? `<div class="sticker" style="top:${sticker.top * k}px;${sticker.side ?? "right"}:${40 * k}px;transform:rotate(${(sticker.side ?? "right") === "right" ? 10 : -10}deg)">${sticker.emoji}</div>` : ""}
${fitScript(W - 144 * k, 48 * k)}
</body></html>`;
}

function featurePage(lang) {
  const f = config.featureGraphic;
  const copy = f.lines?.[lang] ?? config.slides[f.headlineFromSlide ?? 0].copy[lang].lines;
  const [front, back] = f.screens;
  const shot = (name) => url(join(rawDir, lang, `${name}.png`));
  const p1 = phone(shot(front), 240, 0.5);
  const p2 = back ? phone(shot(back), 240, 0.5) : null;

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
${sharedCss(1024, 500)}
body { background:
  radial-gradient(520px 420px at 82% 70%, ${theme.tintA} 0%, transparent 70%),
  radial-gradient(420px 320px at 0% 0%, ${theme.tintB} 0%, transparent 70%), ${theme.background}; }
.text { position: absolute; left: 64px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 34px; margin-bottom: 26px; }
.brand img { width: 52px; height: 52px; border-radius: 14px; }
h1 { font-size: 60px; }
.tag { align-self: flex-start; margin-top: 26px; font-size: 21px; font-weight: 500; color: ${theme.muted}; word-spacing: 0.06em; white-space: nowrap; }
.f1 { left: 600px; top: 50px; transform: rotate(-4deg); z-index: 2; }
.f2 { left: 760px; top: 90px; transform: rotate(6deg); }
</style></head><body>
<div class="text">
  <div class="brand">${f.logo ? `<img src="${url(f.logo)}" alt="">` : ""}${escape(f.brandName ?? "")}</div>
  ${headline(copy)}
  <p class="tag fit">${escape(f.tagline?.[lang] ?? "")}</p>
</div>
${p2 ? p2.html.replace('class="frame"', 'class="frame f2"') : ""}
${p1.html.replace('class="frame"', 'class="frame f1"')}
${fitScript(500, 32)}
</body></html>`;
}

const tmp = join(tmpdir(), `store-shots-${process.pid}`);
mkdirSync(tmp, { recursive: true });

function render(html, name, png, width, height) {
  const file = join(tmp, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--allow-file-access-from-files", "--force-device-scale-factor=1",
    "--virtual-time-budget=4000", `--window-size=${width},${height}`,
    `--screenshot=${png}`, pathToFileURL(file).href,
  ], { stdio: "ignore" });
  console.log(png);
}

try {
  for (const lang of languages) {
    const dir = at(join(outDir, lang));
    mkdirSync(dir, { recursive: true });

    for (const slide of config.slides) {
      const needed = [slide.raw, slide.cardRaw ?? slide.raw];
      const missing = needed.filter((n) => !existsSync(at(join(rawDir, lang, `${n}.png`))));
      if (missing.length) {
        console.warn(`skip ${lang}/${slide.id}: missing ${missing.join(", ")}.png`);
        continue;
      }
      if (!slide.copy?.[lang]) {
        console.warn(`skip ${lang}/${slide.id}: no copy for "${lang}"`);
        continue;
      }
      render(slidePage(slide, lang), `${lang}-${slide.id}`, join(dir, `${slide.id}.png`), canvas.width, canvas.height);
    }

    if (config.featureGraphic) {
      render(featurePage(lang), `${lang}-feature`, join(dir, "feature-graphic.png"), 1024, 500);
    }
  }
} finally {
  rmSync(tmp, { force: true, recursive: true });
}
