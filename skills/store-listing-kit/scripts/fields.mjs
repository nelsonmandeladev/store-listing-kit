// Store text fields: [store.json key, console label, character limit].
// Keep in step with ../references/store-specs.md.
export const FIELDS = {
  android: [
    ["title", "App name", 30],
    ["shortDescription", "Short description", 80],
    ["fullDescription", "Full description", 4000],
    ["releaseNotes", "Release notes", 500],
  ],
  ios: [
    ["name", "Name", 30],
    ["subtitle", "Subtitle", 30],
    ["promotionalText", "Promotional text", 170],
    ["description", "Description", 4000],
    ["keywords", "Keywords", 100],
    ["whatsNew", "What's New", 4000],
  ],
};
