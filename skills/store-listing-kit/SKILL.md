---
name: store-listing-kit
description: Prepare a mobile app's Google Play and Apple App Store listing end to end — evidence-checked store copy per language, a privacy policy, real-device screenshots composed into framed marketing images, a Play feature graphic, and one store.json (Android + iOS sections, per locale) with copy-ready text exports and limit/asset validation. Use when someone asks to "prepare the store listing", "make Play Store / App Store screenshots", "write the store description", "create a feature graphic", "fill the Play Console listing", or "get the app ready to publish". Works for any stack (Expo/React Native, Flutter, native); needs Node 18+ and a Chromium browser for rendering.
license: MIT
---

# Store Listing Kit

Turns a working app into a complete, honest store listing. Five deliverables:

1. **Claims ledger** — every feature the listing mentions, with the file that proves it.
2. **Privacy policy** — written from the app's real data behaviour.
3. **`store.json`** — all listing text and asset paths, Android + iOS, per locale.
4. **Screenshots + feature graphic** — real captures, framed and captioned.
5. **Copy-ready text files** — one per platform and language, for pasting into the consoles.

Scripts live next to this file in `scripts/`; run them with `node <skill-dir>/scripts/<name>.mjs`.
They have no npm dependencies.

## Starting point: the app must be running on a device

The skill does **not** build, install or start the app, and does not start dev servers or
emulators. The user does that the way they normally do. First thing, always:

```sh
node <skill-dir>/scripts/preflight.mjs --android <package> --ios <bundle-id>
```

(Read the package / bundle id from `app.json`, `build.gradle`, `AndroidManifest.xml` or the
Xcode project. If `adb` is not on PATH, set `ADB` to its full path, e.g. the Android SDK's
`platform-tools/adb`.)

- **NOT READY** → stop and tell the user, in plain words, what to start: connect a phone with USB
  debugging on, or open an emulator / iOS simulator; run the app (dev server + dev build, or a
  preview/release build); leave it open; then ask again. Do not try to start it yourself.
  Steps 1–3 below (ledger, policy, copy) need no device, so offer to do those meanwhile.
- **READY** → continue. If several devices are listed, ask which one to use.

Prefer a **development build** when the user has one: demo data can be loaded through code
(step 4) and the app reloads on save. With a release/preview build, demo data must be entered
through the UI or imported, which is slower — say so.

## Ground rules

- **Never claim what the code doesn't do.** Each sentence of store copy must map to a line in
  the claims ledger. If a planned feature is not shipped (sync, AI, accounts, sharing…), it is
  not mentioned — not even as "coming soon" unless the user asks.
- **No invented social proof.** No ratings, review quotes, download or user counts, awards,
  "#1", "best". Stores reject or penalise them, and they are untrue for a new app.
- **Real screens only.** Screenshots are captures of the running app with demo data, never
  mock-ups of screens that don't exist.
- **Ask before anything destructive.** Clearing app data on a device, overwriting a published
  listing or deleting files needs the user's go-ahead unless they already gave it. Back up first.
- Read the project's own docs first (README, product brief, release checklist, contributor
  rules). If the project has a checklist for the release, update it as you finish items.

## Workflow

### 1. Build the claims ledger

Read the product docs, then verify each candidate claim in the code. Record it as
`claim → evidence (file/function)`. Typical checks:

- Core action and how fast it is (the input path, parser, number of taps).
- Offline behaviour: grep for network calls, feature flags that disable cloud features.
- Accounts: is sign-in required, optional, or absent in this build?
- Supported languages (i18n resources), currencies/regions, themes.
- Every permission in the manifest/Info.plist and the user action that triggers it.
- Anything the marketing docs promise — confirm it ships. Remove what doesn't (this step
  catches real mistakes, e.g. "per-category limits" that were designed but never built).

Also note gaps you find (untranslated strings, missing support page) — report them; don't
silently work around them unless they would make a screenshot false.

### 2. Privacy policy

Inventory before writing: what is stored and where; every network destination (none is a valid
answer — prove it); third-party SDKs (analytics, crash reporting, ads); permissions; OS backup
behaviour (on Android read `allowBackup`, `fullBackupContent`, `dataExtractionRules` — libraries
such as secure-storage plugins often restrict backup to a subset); how a user deletes data.
Then write the policy with `references/privacy-policy.md`. It needs a public HTTPS URL that
loads without login before the store will accept it. Use one contact address everywhere.

### 3. Listing copy and `store.json`

Copy `assets/store.template.json` into the app (suggested: `<app>/store/store.json`) and fill
it. Asset paths resolve against `root` (relative to the JSON file; `".."` = the app folder). Limits and asset specs: `references/store-specs.md`. Writing guidance:
`references/copy-guide.md`.

- One listing per locale per platform. Title the default-language listing in that language.
- Platform differences: iOS has subtitle, promotional text and keywords; Play has a short
  description and feature graphic. Remove Android-only instructions ("clear storage") from iOS.
- Verify any example input shown in copy (e.g. `"Lunch 6000"`) actually works in the app.

Validate and export:

```sh
node <skill-dir>/scripts/validate-store.mjs path/to/store.json   # text limits + image specs
node <skill-dir>/scripts/export-listing.mjs path/to/store.json   # writes listing/<platform>/<locale>.txt
```

Tell the user to paste from the `.txt` files, never from the JSON (JSON escapes line breaks as
`\n`). The export adds a `textFile` reference to each listing in `store.json`.

### 4. Capture real screens (on the running app)

Follow `references/capture.md` (Android via adb, iOS via simctl). In short:

1. **Back up** the app's data on the device. Ask before resetting it.
2. **Load demo data** through the app's own store/API: a temporary seed module plus a dev-only
   call at startup. Guard it with a constant in the seed module, not an env var, so the running
   dev server picks it up on reload without a restart. The seed sets language and theme too.
   Reset the app's data, reload, check the data shows. Keep a copy of the seed outside the app
   for reruns; remove the hook afterwards.
3. **Clean status bar** (Android demo mode / iOS `simctl status_bar override`); hide dev overlays.
4. **Capture** each screen with
   `node <skill-dir>/scripts/capture.mjs <raw>/<lang>/<name>.png [--device <id>]`, then look at
   the image. Tabs that render lazily, keyboards, notifications and dev menus ruin shots.
   Switch language (seed constant or in-app setting) and repeat for each language.
5. **Restore** the user's data, exit demo mode, remove the seed hook, confirm the project's
   typecheck/tests still pass.

Pick at most 5–8 screens, one idea each, ordered by what convinces fastest: the core action,
then the main feature, insights/value, the trust promise (offline/privacy), the differentiator.

### 5. Compose screenshots and the feature graphic

Create a config from `assets/screenshots.config.example.json` (brand colours, font, device
style, per-slide headline/subtitle per language, crop box of the "lifted" card), then:

```sh
node <skill-dir>/scripts/build-screenshots.mjs path/to/screenshots.config.json [lang]
```

Outputs `<outDir>/<lang>/<slide>.png` and `<outDir>/<lang>/feature-graphic.png` (1024×500).
Layout: two-weight headline with a marker underline, a slightly tilted device frame (Android
punch-hole or iPhone Dynamic Island) holding the capture, one real UI element "lifted" out of the
screen, and a small sticker. Headlines auto-shrink to fit.

Review every output image yourself (render a contact sheet) before handing over: headline
fits, crop shows exactly one clean element, nothing personal or untranslated in the lifted card,
status bar not clipped. Crops differ per language when text wraps — use `cardByLang`.

### 6. Hand over

Report: where each console field's content lives (a table field → file), what was verified,
what remains for the user (accounts, uploads, approvals, URLs going live), and gaps found in the
app. Keep `store.json`, the config and the raw captures in the repo so the set can be rebuilt.

## Files

- `scripts/preflight.mjs` — is the app installed and open on a connected device?
- `scripts/capture.mjs` — save the device screen as a native-resolution PNG
- `scripts/build-screenshots.mjs` — framed screenshots + feature graphic via headless Chrome
- `scripts/export-listing.mjs` — `store.json` → copy-ready text per platform/locale
- `scripts/validate-store.mjs` — field limits, image dimensions, ratios and file sizes
- `assets/store.template.json` — `store.json` skeleton
- `assets/screenshots.config.example.json` — screenshot config skeleton
- `references/store-specs.md` — Play / App Store field limits and asset specs
- `references/capture.md` — device capture recipes and pitfalls
- `references/copy-guide.md` — listing and screenshot copy patterns
- `references/privacy-policy.md` — privacy policy outline
