# JIA-211 Graduation Gallery 2026

A premium, dark-mode, black & gold digital memory archive for a university
graduating class. Pure HTML / CSS / vanilla JavaScript — no frameworks, no
build step, no backend, no database. Deploys to Vercel (or any static host)
as-is.

## Structure

```
index.html          Page markup (sidebar, hero, sections, lightbox)
css/style.css        Full design system (dark/gold glass theme, responsive)
js/main.js            App logic: data loading, filters, search, lightbox,
                       slideshow, infinite scroll, mobile drawer
js/placeholder.js     Canvas-based fallback image generator (used only if a
                       real photo/thumb/avatar file is missing)
gen_data.js            Scans photos/ and writes data/photos.json — no
                       filenames are ever hardcoded
data/photos.json       Generated dataset: meta, categories, people, photos
photos/<FOLDER>/       Full-resolution photos, one folder per student
thumbs/<FOLDER>/       Matching thumbnails, same folder/filename convention
downloads/              Pre-zipped archives (see downloads/README.md)
vercel.json             Static hosting + cache headers
```

## Folder convention

```
photos/
  ROMA/
    ROMA_001.webp
    ROMA_002.webp
  AKBAIAN/
    AKBAIAN_001.webp
    ...
thumbs/
  ROMA/
    ROMA_001.webp        <- thumbnail for photos/ROMA/ROMA_001.webp
  AKBAIAN/
    ...
```

Each top-level folder under `photos/` is treated as one student. The folder
name becomes the student's display name (title-cased) and their `id` (a
slugified version, e.g. `AKERKE I` → `akerke-i`). Every file inside is
automatically picked up — any filename, any count, any order.

## Regenerating the data

Whenever photos/thumbs change (added, removed, renamed, new student folder,
etc.), just run:

```bash
node gen_data.js
```

This rewrites `data/photos.json` with:

- `meta` — total photos/people/categories, real scanned size, year range
- `categories` — 6 cosmetic categories used for the category browsing UI
  (the real folder structure is student-based, so each photo is assigned a
  category deterministically so filtering/browsing by category still works)
- `people` — one object per student: `{ id, name, folder, count, thumbnail, photos }`
  — `photos` is the full filename list for that student
- `photos` — one record per photo: `{ id, folder, file, person, cat, date, views }`

## Running locally

No build step required:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Image loading & fallbacks

- Grid thumbnails load from `thumbs/{folder}/{file}`
- Lightbox / downloads load full-resolution from `photos/{folder}/{file}`
- If a real file 404s, the UI automatically falls back: thumb → full photo →
  generated gold/black placeholder — so the site never shows a broken image,
  even before all real media has been uploaded.

## Adding ZIP downloads

Drop archives into `downloads/` using the filenames listed in
`downloads/README.md`. Download buttons check file existence (HTTP HEAD)
before triggering a download, so archives can be added incrementally.

## Sample content

The `photos/` and `thumbs/` folders currently contain small generated
demo images (19 sample students) purely so the site is browsable out of the
box. Replace these folders with your real photos/thumbnails — matching the
same convention — and re-run `node gen_data.js`.

## Features

- Search (photos / people / category / folder / date)
- Filter by category and by person (backed by precomputed lookup indices
  for fast filtering as the archive grows)
- Sort: Соңғысы (recent) · Көп қаралған (most viewed) · Кездейсоқ (random)
- Masonry photo grid with hover zoom + per-photo download
- Lazy loading + infinite scroll (IntersectionObserver)
- Lightbox with keyboard navigation, fullscreen mode, and slideshow with
  progress bar
- Category and per-person ZIP download cards (existence-checked)
- Responsive layout: desktop sidebar ↔ mobile drawer + bottom nav bar
- Animated hero counters synced to the real scanned dataset
