#!/usr/bin/env node
// Saves the current screen of the connected device as a PNG, at native
// resolution. Inspect every capture before using it.
//
//   node capture.mjs <out.png> [--device <id>] [--platform android|ios]
//
// Android uses `adb exec-out screencap -p`; iOS uses
// `xcrun simctl io <udid> screenshot`. Prints the size of the saved image.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const device = flag("--device");
let platform = flag("--platform");
const out = args[0] && resolve(args[0]);

if (!out) {
  console.error("usage: node capture.mjs <out.png> [--device <id>] [--platform android|ios]");
  process.exit(1);
}

const adb = process.env.ADB ?? "adb";
const quiet = { stdio: ["ignore", "pipe", "ignore"], timeout: 30000 };

if (!platform) {
  try {
    const list = execFileSync(adb, ["devices"], { ...quiet, encoding: "utf8" });
    platform = /\tdevice/.test(list) ? "android" : "ios";
  } catch {
    platform = "ios";
  }
}

mkdirSync(dirname(out), { recursive: true });

if (platform === "android") {
  const png = execFileSync(adb, [...(device ? ["-s", device] : []), "exec-out", "screencap", "-p"], {
    ...quiet,
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(out, png);
} else {
  execFileSync("xcrun", ["simctl", "io", device ?? "booted", "screenshot", out], quiet);
}

const buf = readFileSync(out);
if (buf.readUInt32BE(0) !== 0x89504e47) {
  console.error("Capture failed: the device did not return a PNG.");
  process.exit(1);
}
console.log(`${out}  ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
