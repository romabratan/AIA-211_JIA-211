# JIA-211 Graduation Gallery 2026

Premium dark-mode, black & gold digital memory archive for the JIA-211 graduating class (2022–2026). Pure HTML / CSS / vanilla JS — no framework, no backend. Deploys as-is on Vercel (or any static host).

## Structure

```
├── index.html          # Single-page app shell (sidebar + all sections)
├── css/style.css        # Design tokens, layout, components, responsive rules
├── js/main.js            # Data loading, rendering, filters, lightbox, downloads
├── data/photos.json      # 1169-photo dataset (categories, people, metadata)
├── gen_data.js            # Node script that generated photos.json (edit + rerun to reshape data)
├── photos/  thumbs/  downloads/  avatars/   # Drop real assets here (see below)
└── vercel.json           # Static deploy config
```

## Using your real photos

`gen_data.js` scans your actual folders and builds `data/photos.json` automatically — nothing is hardcoded.

Expected layout:

```
photos/
  ROMA/
    ROMA_001.webp
    ROMA_002.webp
  AKBAIAN/
    AKBAIAN_001.webp
  AKERKE K/
    ...
thumbs/
  ROMA/
    ROMA_001.webp        # same filenames as photos/, thumbnail-sized
  AKBAIAN/
    ...
```

- Each folder under `photos/` = one student. The folder name becomes their display name (e.g. `AKERKE K` → "Akerke K") and their slug.
- Filenames are read directly from disk — any naming scheme works (`.webp`, `.jpg`, `.jpeg`, `.png`), nothing is hardcoded.
- If a matching thumb is missing for a given photo, that photo automatically falls back to the full-size file so nothing breaks.
- Photo `date` and `sizeMb` are read from the real file's mtime/size on disk.
- Categories (Обши мания, Обши свободный, etc.) are still assigned per photo, deterministically, purely to keep the Categories/filter UI working — the folder structure itself doesn't carry category info.

To (re)build the dataset:

```bash
node gen_data.js
```

This overwrites `data/photos.json` from whatever is currently in `photos/` + `thumbs/`. Re-run it any time you add/remove/rename student folders or photos.

Optional: pre-zip category/person archives into `downloads/` and point the download buttons at them instead of the in-browser JSZip generator (see `js/main.js` → `downloadZip`).

## Features implemented

- Sidebar navigation with active-section highlighting, mobile drawer, bottom nav on mobile
- Hero with cinematic overlay, count-up stats, CTA
- Category cards (6 categories) with hover zoom + photo counts
- Full gallery: search, category filter, person filter, sort (recent / popular / random), infinite scroll, lazy-loaded images
- People directory (19 people) with avatar + count, click-to-filter
- Lightbox: keyboard nav, prev/next, slideshow mode, fullscreen, per-photo download
- Downloads: "all photos" + per-category + per-person ZIP generation (client-side via JSZip, no backend), single-photo download
- Toast notifications, glassmorphism cards, reduced-motion support, focus-visible states

## Local preview

Any static server works, e.g.:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy on Vercel

Push this folder to a Git repo and import it in Vercel as a static project (no build command needed), or run:

```bash
vercel --prod
```
