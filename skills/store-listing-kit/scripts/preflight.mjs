#!/usr/bin/env node
// Checks the starting condition of the skill: the app is running on a
// connected device (Android phone/emulator via adb, or a booted iOS simulator).
//
//   node preflight.mjs [--android <package>] [--ios <bundle-id>]
//
// Prints what it found. Exit code 0 = ready to capture, 1 = not ready (the
// output says what the user has to start).

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const androidPackage = flag("--android");
const iosBundle = flag("--ios");

function run(cmd, cmdArgs) {
  try {
    return execFileSync(cmd, cmdArgs, { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

const adb = process.env.ADB ?? "adb";
const found = [];

// Android
const adbOut = run(adb, ["devices", "-l"]);
if (adbOut !== null) {
  for (const line of adbOut.split("\n").slice(1)) {
    const [serial, state] = line.trim().split(/\s+/);
    if (!serial || state !== "device") continue;
    const model = /model:(\S+)/.exec(line)?.[1] ?? "unknown";
    const size = run(adb, ["-s", serial, "shell", "wm", "size"])?.match(/(\d+x\d+)/g)?.pop();
    const focus = run(adb, ["-s", serial, "shell", "dumpsys", "window"]) ?? "";
    const foreground = /mCurrentFocus=.*?\s([\w.]+)\//.exec(focus)?.[1] ?? "unknown";
    const installed = androidPackage
      ? (run(adb, ["-s", serial, "shell", "pm", "list", "packages", androidPackage]) ?? "").includes(`package:${androidPackage}`)
      : null;
    found.push({ platform: "android", id: serial, model, size, foreground, installed,
      running: androidPackage ? foreground === androidPackage : null });
  }
}

// iOS simulator (macOS only)
const simOut = process.platform === "darwin" ? run("xcrun", ["simctl", "list", "devices", "booted", "-j"]) : null;
if (simOut) {
  for (const list of Object.values(JSON.parse(simOut).devices)) {
    for (const d of list) {
      if (d.state !== "Booted") continue;
      const installed = iosBundle ? run("xcrun", ["simctl", "get_app_container", d.udid, iosBundle]) !== null : null;
      found.push({ platform: "ios", id: d.udid, model: d.name, installed, running: null });
    }
  }
}

if (adbOut === null) console.log("adb: not found on PATH (set ADB=/path/to/adb if Android is the target)");
for (const d of found) {
  console.log(`${d.platform}  ${d.id}  ${d.model}${d.size ? `  ${d.size}` : ""}` +
    (d.foreground ? `  foreground: ${d.foreground}` : "") +
    (d.installed === null ? "" : `  installed: ${d.installed ? "yes" : "NO"}`) +
    (d.running === null ? "" : `  app on screen: ${d.running ? "yes" : "no"}`));
}

const ready = found.filter((d) => d.installed !== false);
if (!ready.length) {
  console.log(`
NOT READY. Before the store screenshots can be made, please:
  1. Connect a device: an Android phone with USB debugging on, an Android
     emulator, or a booted iOS simulator.
  2. Start the app on it the way you normally do (dev server + dev build, or
     an installed release/preview build).
  3. Leave the app open, then ask again.`);
  process.exit(1);
}

// iOS can't report the foreground app; Android can when the package is given.
const onScreen = ready.filter((d) => d.running !== false);
if (!onScreen.length) {
  console.log(`
NOT READY. The app is installed but not open. Please open it on the device
(start the dev server first if it is a development build), then ask again.`);
  process.exit(1);
}
if (!androidPackage && !iosBundle) {
  console.log("\nTip: pass --android <package> / --ios <bundle-id> to confirm the app is installed and open.");
}
if (onScreen.length > 1) console.log("\nSeveral devices: pass the id to capture.mjs with --device.");
console.log("\nREADY.");
