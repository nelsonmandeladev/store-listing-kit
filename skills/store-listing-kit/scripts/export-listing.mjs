#!/usr/bin/env node
// Writes one plain-text file per platform and locale from store.json, every
// field under a labelled heading with its character count, so the copy can be
// pasted into Play Console / App Store Connect without JSON escapes. Adds a
// `textFile` reference to each listing in store.json.
//
//   node export-listing.mjs <store.json>
//
// Output: <store dir>/listing/<platform>/<locale>.txt

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { FIELDS } from "./fields.mjs";

const storeArg = process.argv[2];
if (!storeArg) {
  console.error("usage: node export-listing.mjs <store.json>");
  process.exit(1);
}

const storePath = resolve(storeArg);
const store = JSON.parse(readFileSync(storePath, "utf8"));
const out = join(dirname(storePath), "listing");
// textFile paths are written relative to `store.root` when given (e.g. the app dir).
const root = store.root ? resolve(dirname(storePath), store.root) : dirname(storePath);
const errors = [];

rmSync(out, { force: true, recursive: true });

for (const [platform, fields] of Object.entries(FIELDS)) {
  const listings = store[platform]?.listings ?? {};
  for (const [locale, listing] of Object.entries(listings)) {
    const sections = [];
    for (const [key, label, limit] of fields) {
      const text = listing[key];
      if (text == null || text === "") continue;
      if (text.length > limit) errors.push(`${platform}/${locale} ${key}: ${text.length} > ${limit}`);
      sections.push(`===== ${label} (${text.length}/${limit}) =====\n${text}\n`);
    }
    const dir = join(out, platform);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${locale}.txt`);
    writeFileSync(file, sections.join("\n"));
    listing.textFile = relative(root, file).replace(/\\/g, "/");
    console.log(listing.textFile);
  }
}

writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`);

if (errors.length) {
  console.error(`\nOver the limit:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
