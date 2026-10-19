#!/usr/bin/env node
// Checks a store.json against the store rules: text limits per field, and for
// every referenced image its format, dimensions, aspect ratio and file size.
//
//   node validate-store.mjs <store.json>
//
// Image paths are resolved against `store.root` (relative to store.json), or
// the store.json folder when absent. Exit code 1 when anything fails.

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { FIELDS } from "./fields.mjs";

const storeArg = process.argv[2];
if (!storeArg) {
  console.error("usage: node validate-store.mjs <store.json>");
  process.exit(1);
}

const storePath = resolve(storeArg);
const store = JSON.parse(readFileSync(storePath, "utf8"));
const root = store.root ? resolve(dirname(storePath), store.root) : dirname(storePath);
const problems = [];
const ok = [];

// Reads width/height from a PNG or JPEG header.
function imageInfo(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { type: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: [4, 6].includes(buf[25]) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: "jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), alpha: false };
      }
      i += 2 + len;
    }
  }
  return null;
}

function checkImage(label, path, rule) {
  if (!path) return;
  const file = resolve(root, path);
  if (!existsSync(file)) return problems.push(`${label}: missing file ${path}`);
  const info = imageInfo(file);
  if (!info) return problems.push(`${label}: not a PNG/JPEG (${path})`);
  const mb = statSync(file).size / 1e6;
  const issue = rule(info, mb);
  if (issue) problems.push(`${label}: ${issue} (${path}, ${info.width}×${info.height}, ${mb.toFixed(2)} MB)`);
  else ok.push(`${label}: ${info.width}×${info.height}, ${mb.toFixed(2)} MB`);
}

const ratio = (i) => Math.max(i.width, i.height) / Math.min(i.width, i.height);

for (const [platform, fields] of Object.entries(FIELDS)) {
  for (const [locale, listing] of Object.entries(store[platform]?.listings ?? {})) {
    for (const [key, , limit] of fields) {
      const text = listing[key];
      if (text == null || text === "") continue;
      if (text.includes("\\n")) problems.push(`${platform}/${locale} ${key}: contains a literal "\\n"`);
      if (text.length > limit) problems.push(`${platform}/${locale} ${key}: ${text.length}/${limit}`);
      else ok.push(`${platform}/${locale} ${key}: ${text.length}/${limit}`);
    }

    const g = listing.graphics ?? {};
    const tag = `${platform}/${locale}`;
    if (platform === "android") {
      checkImage(`${tag} icon`, g.icon, (i, mb) =>
        i.width !== 512 || i.height !== 512 ? "must be 512×512" : mb > 1 ? "over 1 MB" : null);
      checkImage(`${tag} featureGraphic`, g.featureGraphic, (i, mb) =>
        i.width !== 1024 || i.height !== 500 ? "must be 1024×500" : mb > 15 ? "over 15 MB" : null);
      const shots = g.phoneScreenshots ?? [];
      if (shots.length && (shots.length < 2 || shots.length > 8)) problems.push(`${tag}: ${shots.length} phone screenshots (need 2–8)`);
      shots.forEach((s, n) => checkImage(`${tag} phone #${n + 1}`, s, (i, mb) => {
        if (mb > 8) return "over 8 MB";
        if (Math.min(i.width, i.height) < 320 || Math.max(i.width, i.height) > 3840) return "sides must be 320–3840 px";
        if (Math.abs(ratio(i) - 16 / 9) > 0.01) return "must be 16:9 or 9:16";
        return null;
      }));
    }
    if (platform === "ios") {
      const iphone = [[1320, 2868], [1290, 2796], [1284, 2778], [1242, 2688]];
      const ipad = [[2064, 2752], [2048, 2732]];
      const fits = (sizes) => (i) =>
        sizes.some(([w, h]) => (i.width === w && i.height === h) || (i.width === h && i.height === w))
          ? null : `expected one of ${sizes.map(([w, h]) => `${w}×${h}`).join(", ")}`;
      const shots = listing.screenshots ?? {};
      (shots.iphone69 ?? []).forEach((s, n) => checkImage(`${tag} iPhone #${n + 1}`, s, fits(iphone)));
      (shots.ipad13 ?? []).forEach((s, n) => checkImage(`${tag} iPad #${n + 1}`, s, fits(ipad)));
    }
  }
}

console.log(ok.map((line) => `  ok   ${line}`).join("\n"));
if (problems.length) {
  console.error(problems.map((line) => `  FAIL ${line}`).join("\n"));
  process.exit(1);
}
console.log("\nAll checks passed.");
