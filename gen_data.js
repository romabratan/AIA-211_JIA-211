/**
 * gen_data.js
 * Scans photos/<STUDENT_FOLDER>/*.webp (and thumbs/<STUDENT_FOLDER>/*.webp)
 * and builds data/photos.json automatically. No filenames or student names
 * are hardcoded — everything is discovered from disk.
 *
 * Expected layout:
 *   photos/ROMA/ROMA_001.webp ...
 *   thumbs/ROMA/ROMA_001.webp ...
 *
 * Run with: node gen_data.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PHOTOS_DIR = path.join(ROOT, 'photos');
const THUMBS_DIR = path.join(ROOT, 'thumbs');
const OUT_FILE = path.join(ROOT, 'data', 'photos.json');

const IMG_EXT = /\.(webp|jpg|jpeg|png)$/i;

// Categories are kept as a browsing/filter feature of the gallery UI.
// Since the new folder structure only encodes "who" (student folder), not
// "what kind of shot", each photo is assigned to one of these buckets
// deterministically (stable across re-runs) so Categories keeps working.
const CATEGORY_DEFS = [
  ['Обши мания', 'obshi-mania'],
  ['Обши свободный', 'obshi-svobodny'],
  ['Обши қыздар', 'obshi-qyzdar'],
  ['Обши балдар', 'obshi-baldar'],
  ['Барлық адамдар', 'barlyq-adamdar'],
  ['Сахна', 'sahna'],
];
const CATEGORY_WEIGHTS = [0.22, 0.16, 0.14, 0.14, 0.24, 0.10];

/* ---------------------------------------------------------------------
   helpers
   --------------------------------------------------------------------- */
function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// "AKERKE K" -> "Akerke K", "AKBAIAN" -> "Akbaian"
function toDisplayName(folder) {
  return folder
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// URL-safe relative path (handles spaces in folder names, e.g. "AKERKE K")
function encodePath(...parts) {
  return parts.map(encodeURIComponent).join('/');
}

// deterministic string -> [0,1) pseudo-random, so re-running the script
// always yields the same category/views assignment for the same file
function hash01(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (h % 100000) / 100000;
}

function pickCategory(id) {
  const r = hash01(id + '::cat');
  let acc = 0;
  for (let i = 0; i < CATEGORY_WEIGHTS.length; i++) {
    acc += CATEGORY_WEIGHTS[i];
    if (r <= acc) return CATEGORY_DEFS[i];
  }
  return CATEGORY_DEFS[CATEGORY_DEFS.length - 1];
}

/* ---------------------------------------------------------------------
   scan
   --------------------------------------------------------------------- */
if (!fs.existsSync(PHOTOS_DIR)) {
  console.error('❌ photos/ қалтасы табылмады:', PHOTOS_DIR);
  process.exit(1);
}

const studentFolders = safeReadDir(PHOTOS_DIR)
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort(naturalSort);

if (studentFolders.length === 0) {
  console.error('❌ photos/ ішінен студент қалталары табылмады.');
  process.exit(1);
}

const photos = [];
const people = [];

for (const folder of studentFolders) {
  const folderPath = path.join(PHOTOS_DIR, folder);
  const thumbFolderPath = path.join(THUMBS_DIR, folder);

  const filenames = safeReadDir(folderPath)
    .filter((f) => f.isFile() && IMG_EXT.test(f.name))
    .map((f) => f.name)
    .sort(naturalSort);

  if (filenames.length === 0) continue; // skip empty/invalid folders

  const slug = slugify(folder);
  const displayName = toDisplayName(folder);
  const personPhotoIds = [];

  filenames.forEach((filename, i) => {
    const basename = filename.replace(IMG_EXT, '');
    const id = `${slug}-${slugify(basename)}`;

    const fullPath = path.join(folderPath, filename);
    let sizeMb = 0;
    let mtime = new Date();
    try {
      const stat = fs.statSync(fullPath);
      sizeMb = +(stat.size / (1024 * 1024)).toFixed(2);
      mtime = stat.mtime;
    } catch (e) {
      /* file disappeared mid-scan, keep defaults */
    }

    // fall back to the full-size photo if a matching thumb wasn't generated
    const hasThumb = fs.existsSync(path.join(thumbFolderPath, filename));
    const [categoryName, categorySlug] = pickCategory(id);

    photos.push({
      id,
      title: `${displayName} #${i + 1}`,
      folder,
      filename,
      src: encodePath('photos', folder, filename),
      thumb: hasThumb ? encodePath('thumbs', folder, filename) : encodePath('photos', folder, filename),
      category: categorySlug,
      categoryName,
      people: [slug],
      date: mtime.toISOString().slice(0, 10),
      views: Math.floor(hash01(id + '::views') * 500),
      sizeMb,
    });

    personPhotoIds.push(id);
  });

  const firstPhoto = photos[photos.length - personPhotoIds.length];

  people.push({
    slug,
    name: displayName,
    folder,
    photoCount: personPhotoIds.length,
    thumbnail: firstPhoto ? firstPhoto.thumb : '',
    avatar: firstPhoto ? firstPhoto.thumb : '',
    photos: personPhotoIds,
  });
}

// chronological order (uses real file mtime)
photos.sort((a, b) => new Date(a.date) - new Date(b.date));

const categories = CATEGORY_DEFS.map(([name, slug]) => {
  const catPhotos = photos.filter((p) => p.category === slug);
  return {
    slug,
    name,
    cover: catPhotos[0] ? catPhotos[0].thumb : '',
    photoCount: catPhotos.length,
  };
});

const totalSizeGb = +(photos.reduce((sum, p) => sum + p.sizeMb, 0) / 1024).toFixed(2);
const years = (() => {
  if (photos.length === 0) return '2022-2026';
  const yrs = photos.map((p) => new Date(p.date).getFullYear());
  return `${Math.min(...yrs)}-${Math.max(...yrs)}`;
})();

const data = {
  meta: {
    totalPhotos: photos.length,
    totalPeople: people.length,
    totalCategories: categories.length,
    years,
    approxSizeGb: totalSizeGb,
    generatedAt: new Date().toISOString(),
  },
  people,
  categories,
  photos,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(data));

console.log(`✅ Generated ${photos.length} photos across ${people.length} students, ${categories.length} categories.`);
console.log(people.map((p) => `${p.name} (${p.folder}): ${p.photoCount}`).join('\n'));
console.log('Total size: ~' + totalSizeGb + ' GB');
