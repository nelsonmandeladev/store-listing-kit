# Store specs

Limits change; if a console rejects something, trust the console and update this file.

## Google Play — main store listing (per language)

| Field | Limit |
|---|---|
| App name | 30 chars |
| Short description | 80 chars |
| Full description | 4,000 chars |
| Release notes ("What's new") | 500 chars per language |

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG (32-bit, alpha ok), ≤ 1 MB |
| Feature graphic | 1024×500 PNG or JPEG (no alpha), ≤ 15 MB. Keep text away from edges; it may be cropped or overlaid |
| Phone screenshots | 2–8, PNG or JPEG, ≤ 8 MB each, 16:9 or 9:16, each side 320–3,840 px. 1080×1920 is the safe default. At least 4 at ≥ 1080 px for promotion eligibility |
| 7" / 10" tablet, Chromebook | optional unless you target them |

Also required before review: privacy policy URL, app access instructions (if login), ads
declaration, content rating questionnaire, target audience, data safety form, category,
contact email. New personal developer accounts must run a closed test (12+ testers, 14 days)
before production access.

## Apple App Store — per localization

| Field | Limit |
|---|---|
| Name | 30 chars |
| Subtitle | 30 chars |
| Promotional text | 170 chars (editable without a new build) |
| Description | 4,000 chars |
| Keywords | 100 chars, comma-separated, no spaces after commas; don't repeat words from the name |
| What's New | 4,000 chars (not shown for the first version) |
| Support URL | required, must be a real support page |
| Marketing URL | optional |
| Privacy policy URL | required |

| Asset | Spec |
|---|---|
| iPhone screenshots | 1–10. 6.9" display: 1320×2868 or 1290×2796 (portrait). Smaller sizes are scaled from it |
| iPad screenshots | required if the app runs on iPad: 13" 2064×2752 or 2048×2732 |
| App icon | from the build (1024×1024, no alpha) |

Also: App Privacy ("nutrition label"), age rating questionnaire, category, copyright,
export compliance.
