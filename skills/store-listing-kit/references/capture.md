# Capturing real screens

## Before anything: back up the user's data

Resetting the app wipes whatever the developer had on the device. Save it first.

Android (debuggable builds allow `run-as`):

```sh
adb shell run-as <package> ls -R files databases shared_prefs
adb exec-out run-as <package> cat files/SQLite/app.db > backup/app.db
```

Restore afterwards:

```sh
adb shell pm clear <package>
adb push backup/app.db /data/local/tmp/app.db
adb shell chmod 644 /data/local/tmp/app.db
adb shell run-as <package> mkdir -p files/SQLite
adb shell run-as <package> cp /data/local/tmp/app.db files/SQLite/app.db
adb shell rm /data/local/tmp/app.db
```

iOS simulator: `xcrun simctl get_app_container booted <bundle-id> data` and copy the folder.

## Demo data

Seed through the app's own data layer (store functions, repositories, API), not by writing raw
rows, so derived values stay consistent. Put the seed in a temporary module exporting
`SEED_LANG = "en"` and a `seed(store)` function, and call it from a dev-only hook at startup
(`if (__DEV__ && SEED_LANG) seed(store, SEED_LANG)` or the stack's equivalent). A constant
reloads with the running dev server; an env var would need a server restart. Let it set
language, currency and theme, and skip seeding when data already exists. To switch language:
change the constant, reset the app's data, reload. Make it realistic: amounts in the
target market's currency, varied times (not every record at 12:30), several months of history so
charts have shape, one item in each state the screens show (upcoming, completed, primary…).
Remove the hook after capturing; keep the seed file in the screenshots folder for reruns.

## Clean status bar

Android (System UI demo mode):

```sh
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e mobile show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# afterwards
adb shell am broadcast -a com.android.systemui.demo -e command exit
adb shell settings put global sysui_demo_allowed 0
```

iOS simulator:

```sh
xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
xcrun simctl io booted screenshot shot.png
xcrun simctl status_bar booted clear
```

## Check the starting point

```sh
node <skill-dir>/scripts/preflight.mjs --android <package> --ios <bundle-id>
```

Reload a running app after changing code: Expo/React Native dev builds reload on save; force it
with the dev menu (`adb shell input keyevent 82`) → Reload, or `r` in the dev server terminal if
the user can press it. Restart a closed app: `adb shell monkey -p <package> 1`.

## Capture and drive

```sh
node <skill-dir>/scripts/capture.mjs raw/en/home.png   # Android or iOS, native resolution
adb exec-out screencap -p > raw/en/home.png      # the same, by hand
adb shell input tap X Y                          # device pixels, not screenshot-preview pixels
adb shell input text "Lunch%s3500"               # %s = space
adb shell input keyevent 4                       # back; 123 = move to end, 67 = delete
adb shell wm size                                # resolution, to convert preview coords
```

## Pitfalls seen in practice

- **Inspect every capture.** Downscale and look at it; don't trust that a tap landed.
- **Lazily rendered tabs** show blank on first visit. Open the tab, then capture in a separate
  command; or visit every tab once before capturing.
- **Dev builds** open a developer menu on first launch and may show a floating tools button
  (Expo dev client: turn off "Tools button" in the menu; `adb shell input keyevent 82` reopens
  the menu). A reset (`pm clear`) restores both. Release-like builds avoid this entirely.
- **`adb input text` can't type accented characters**, and may drop the first characters if
  sent before the field has focus — tap, then type in a separate command, then verify.
  Text left in a field survives tab switches; clear it explicitly.
- **Heads-up notifications** from other apps can appear mid-capture — swipe them away and retake.
- **Git Bash on Windows rewrites device paths** (`/data/local/tmp` → `C:/Program Files/Git/...`).
  Prefix commands with `MSYS_NO_PATHCONV=1`.
- **Stopping a background dev server** may leave the node process holding the port; kill it by
  PID before starting another one with different env vars.
- **adb can hang** after long sessions; wrap calls in `timeout` and restart with
  `adb kill-server && adb start-server`.
- `git diff` without `--no-pager` blocks non-interactive shells.
- Translated layouts shift: text wraps differently, so crop boxes need per-language overrides.
