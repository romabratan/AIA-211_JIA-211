/* =========================================================
   JIA-211 GRADUATION GALLERY — DATA GENERATOR
   Scans photos/<STUDENT_FOLDER>/*.webp automatically and
   writes data/photos.json. No filenames are hardcoded —
   run this script any time photos/ or thumbs/ change.

   Usage:  node gen_data.js
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PHOTOS_DIR = path.join(ROOT, 'photos');
const THUMBS_DIR = path.join(ROOT, 'thumbs');
const OUTPUT_FILE = path.join(ROOT, 'data', 'photos.json');

const IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png']);

/* ---------- category taxonomy (cosmetic grouping, UI-only) ----------
   The real folder structure is student-based (no category folders),
   so categories are assigned deterministically per photo so the
   existing category browsing/filtering UI keeps working unchanged. */
const CATEGORIES = [
  { id: 'mania', name: 'Обши мания', icon: '🎓', weight: 0.22 },
  { id: 'free', name: 'Обши свободный', icon: '✨', weight: 0.18 },
  { id: 'girls', name: 'Обши қыздар', icon: '💫', weight: 0.16 },
  { id: 'boys', name: 'Обши балдар', icon: '🔥', weight: 0.16 },
  { id: 'all', name: 'Барлық адамдар', icon: '👥', weight: 0.20 },
  { id: 'group', name: 'Топтық фотолар', icon: '📸', weight: 0.08 },
];

/* ---------- helpers ---------- */
function isImageFile(name) {
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

function listFolders(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && isImageFile(d.name))
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function toDisplayName(folder) {
  return folder
    .trim()
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ---------- folder -> full display name ----------
   Folder names / slugs are NEVER changed — they're used as-is for file
   paths (photos/{folder}/..., thumbs/{folder}/...). This map only
   controls what name is *shown* in the UI (people list, filters, photo
   cards, lightbox, search results, downloads, etc.). Any folder not
   listed here automatically falls back to a title-cased version of the
   folder name, so new/unmapped student folders never break the build. */
const FULL_NAME_MAP = {
  'ROMA': 'Turganbayev Ramazan Talgatuly',
  'BALNUR ZH': 'Zhumabay Balnur Kalzhigitqyzy',
  'ULZHAN': 'Kassymbekova Ulzhan Maratkyzy',
  'NURDAULET': 'Beysenbay Nurdaulet Pirzhanuly',
  'AKERKE I': 'Ilessova Akerke Gazizkyzy',
  'BALNUR A': 'Alimkhan Balnur Almaskhankyzy',
  'ASEM K': 'Asem Kairbekqyzy',
  'DIAS': 'Bulegen Dias Begaliuly',
  'DINARA': 'Arshabai Dinara Ualikhanqyzy',
  'OLZHAS': 'Kalzhan Olzhas Bauyrzhanuly',
  'TOKTASOV NURDAULET': 'Toktasov Nurdaulet Shyngysuly',
  'AKERKE K': 'Kalmanbai Akerke Nurbekqyzy',
  'ASLZAT': 'Bakirova Assylzat Arystanqyzy',
  'ASEM T': 'Tolegen Assem Armanqyzy',
  'MADINA': 'Andassova Madina Dunenbayqyzy',
  'SHAMSAYA': 'Mussabek Shamsaya Bakytzhankyzy',
  'ASEMAI': 'Makhanbet Asemai',
  'MAHDI': 'Mohammad Mahdi Mohammadi',
  'AKBAIAN': 'Utkerbek Akbaian',
  'ALMAS': 'Kassymbekov Almasbek',
  'NURGISA': 'Kundebay Nurgisa Kaumetuly',
  'OBSHI': 'Group Photos',
  'THE BOYS': 'Boys Group',
  'THE GIRL': 'Girls Group',
};

function fullNameFor(folder) {
  const key = folder.trim().toUpperCase();
  return FULL_NAME_MAP[key] || toDisplayName(folder);
}

function slugify(str) {
  return (
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'p'
  );
}

// small seeded PRNG so re-running the generator without file changes
// produces stable, reproducible cosmetic metadata (category/date/views)
function makeRng(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  return function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pickCategory(rand) {
  const r = rand();
  let acc = 0;
  for (const c of CATEGORIES) {
    acc += c.weight;
    if (r <= acc) return c.id;
  }
  return CATEGORIES[CATEGORIES.length - 1].id;
}

const YEARS = [2022, 2023, 2024, 2025, 2026];
function pickDate(rand) {
  const year = YEARS[Math.floor(rand() * YEARS.length)];
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ---------- main scan ---------- */
function generate() {
  const folders = listFolders(PHOTOS_DIR);

  if (folders.length === 0) {
    console.warn('No student folders found under photos/. Nothing to generate.');
  }

  const people = [];
  const photos = [];
  const usedIds = new Set();

  folders.forEach(folder => {
    const files = listImages(path.join(PHOTOS_DIR, folder));
    if (files.length === 0) return; // skip empty folders

    const rand = makeRng(folder);
    const personId = uniqueId(slugify(folder), usedIds);
    const thumbFolderDir = path.join(THUMBS_DIR, folder);
    const hasThumbFolder = fs.existsSync(thumbFolderDir);

    const photoFiles = files.map(file => {
      const id = uniqueId(slugify(path.basename(file, path.extname(file))), usedIds);
      const thumbExists = hasThumbFolder && fs.existsSync(path.join(thumbFolderDir, file));
      const entry = {
        id,
        folder,
        file,
        person: personId,
        cat: pickCategory(rand),
        date: pickDate(rand),
        views: Math.round(Math.pow(rand(), 2.2) * 4200),
        hasThumb: thumbExists,
      };
      photos.push(entry);
      return file;
    });

    people.push({
      id: personId,
      name: fullNameFor(folder),
      folder,
      count: photoFiles.length,
      thumbnail: `thumbs/${folder}/${photoFiles[0]}`,
      photos: photoFiles,
    });
  });

  // sort recent-first by default (matches previous behaviour)
  photos.sort((a, b) => (a.date < b.date ? 1 : -1));

  // aggregate category counts + a representative cover photo per category
  const catCounts = {};
  const catCover = {};
  CATEGORIES.forEach(c => { catCounts[c.id] = 0; });
  photos.forEach(p => {
    catCounts[p.cat]++;
    if (!catCover[p.cat]) catCover[p.cat] = p;
  });

  const categories = CATEGORIES.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    count: catCounts[c.id],
    cover: catCover[c.id]
      ? `thumbs/${catCover[c.id].folder}/${catCover[c.id].file}`
      : null,
  }));

  const totalSizeBytes = sumFileSizes(PHOTOS_DIR, folders);

  const output = {
    meta: {
      totalPhotos: photos.length,
      totalPeople: people.length,
      totalCategories: categories.length,
      originalSizeBytes: totalSizeBytes,
      originalSizeGB: totalSizeBytes > 0 ? +(totalSizeBytes / 1024 ** 3).toFixed(1) : 17,
      yearsRange: '2022-2026',
      generatedAt: new Date().toISOString(),
    },
    categories,
    people,
    photos,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

  console.log(`Scanned ${folders.length} folders`);
  console.log(`Generated ${photos.length} photo records for ${people.length} students`);
  console.log('Category counts:', catCounts);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
}

function uniqueId(base, usedIds) {
  let id = base;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${base}-${n++}`;
  }
  usedIds.add(id);
  return id;
}

function sumFileSizes(photosDir, folders) {
  let total = 0;
  folders.forEach(folder => {
    const dir = path.join(photosDir, folder);
    listImages(dir).forEach(file => {
      try {
        total += fs.statSync(path.join(dir, file)).size;
      } catch (e) { /* ignore */ }
    });
  });
  return total;
}

generate();
