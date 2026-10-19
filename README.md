# Store Listing Kit

An [Agent Skill](https://agentskills.io) that takes a mobile app from "it works" to a complete,
honest Google Play and App Store listing:

- **Evidence-checked copy**: every claim in the listing is traced to the code that proves it.
- **Privacy policy** written from the app's real data behaviour.
- **Real-device screenshots** composed into framed marketing images: two-weight headline with a
  marker underline, tilted Android or iPhone frame, a real UI element "lifted" out of the
  screen. Per language.
- **Play feature graphic** (1024×500).
- **`store.json`**: Android + iOS sections, per locale, with asset paths. It is validated
  against store limits and exported to copy-ready text files.

Works with any agent that reads `SKILL.md` skills (Claude Code, Codex, Cursor, Gemini CLI,
GitHub Copilot, …) and any app stack (Expo/React Native, Flutter, native).

## Install

With the [`skills`](https://github.com/vercel-labs/skills) CLI:

```sh
npx skills add nelsonmandeladev/store-listing-kit
```

Or copy `skills/store-listing-kit/` into your agent's skills folder, for example
`.claude/skills/` (Claude Code) or `.agents/skills/` (Codex and other agents).

Then **run your app on a device** (a phone, an emulator or the iOS simulator, with your
usual dev server or build) and ask your agent: *"Prepare the Play Store listing for this app"*.
The skill starts by checking that the app is open on a device. If it isn't, it asks you to
start it. It never builds or launches the app itself.

## Requirements

- Node.js 18+ (scripts have no npm dependencies)
- Chrome, Chromium or Edge for rendering (set `CHROME_PATH` if it isn't found)
- For captures: `adb` and a device or emulator (Android), or Xcode's `simctl` (iOS)

## Scripts

You can also use the scripts on their own:

```sh
S=skills/store-listing-kit/scripts

# is the app installed and open on a connected device?
node $S/preflight.mjs --android com.example.app

# save the device screen (Android or iOS simulator)
node $S/capture.mjs screenshots/raw/en/home.png

# framed screenshots + feature graphic from raw captures
node $S/build-screenshots.mjs screenshots/screenshots.config.json [lang]

# check text limits and image specs
node $S/validate-store.mjs store/store.json

# write store/listing/<platform>/<locale>.txt for pasting into the consoles
node $S/export-listing.mjs store/store.json
```

Starting points: `skills/store-listing-kit/assets/store.template.json` and
`skills/store-listing-kit/assets/screenshots.config.example.json`.

## What's inside

```
skills/store-listing-kit/
  SKILL.md                      workflow the agent follows
  scripts/                      preflight, capture, build-screenshots, validate-store, export-listing
  assets/                       store.json + screenshot config templates
  references/
    store-specs.md              Play / App Store limits and asset specs
    capture.md                  adb / simctl recipes and pitfalls
    copy-guide.md               caption and description patterns, banned claims
    privacy-policy.md           policy outline
```

## License

MIT
