/* ==========================================================================
   JIA-211 GRADUATION GALLERY — APP LOGIC
   Pure vanilla JS. No build step, no framework.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     STATE
     --------------------------------------------------------------------- */
  const state = {
    data: null,
    photos: [],
    filtered: [],
    renderedCount: 0,
    pageSize: 24,
    sort: 'recent',
    category: 'all',
    person: 'all',
    query: '',
    lightboxIndex: -1,
    slideshowTimer: null,
    isSlideshow: false,
  };

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------------------------------------------------------------------
     DATA LOADING
     --------------------------------------------------------------------- */
  async function loadData() {
    try {
      const res = await fetch('data/photos.json');
      if (!res.ok) throw new Error('fetch failed');
      state.data = await res.json();
    } catch (err) {
      console.error('Дерек жүктелмеді:', err);
      toast('Деректерді жүктеу мүмкін болмады');
      state.data = { meta: {}, people: [], categories: [], photos: [] };
    }
    state.photos = state.data.photos || [];
    state.filtered = state.photos.slice();
    init();
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */
  function init() {
    renderCategoryGrid();
    renderPeopleGrid();
    renderDownloads();
    populateFilterSelects();
    applyFiltersAndSort(true);
    bindNav();
    bindSidebarDrawer();
    bindSearch();
    bindFilters();
    bindInfiniteScroll();
    bindLightbox();
    bindSlideshowToggle();
    animateCounts();
    setHeroImage();
  }

  function setHeroImage() {
    // pick a "mania"/stage-ish photo for hero if available
    const heroImg = $('#heroImg');
    const candidate = state.photos.find((p) => p.category === 'sahna') || state.photos[0];
    if (candidate && heroImg) heroImg.src = candidate.src;
  }

  /* ---------------------------------------------------------------------
     STAT COUNT-UP ANIMATION
     --------------------------------------------------------------------- */
  function animateCounts() {
    const els = $$('[data-count]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const duration = 1200;
          const start = performance.now();
          function tick(now) {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(eased * target).toLocaleString('ru-RU');
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------------
     CATEGORY GRID
     --------------------------------------------------------------------- */
  function renderCategoryGrid() {
    const grid = $('#categoryGrid');
    if (!state.data.categories) return;
    grid.innerHTML = state.data.categories
      .map(
        (c) => `
      <article class="category-card" data-category="${c.slug}" tabindex="0" role="button" aria-label="${c.name} санатын ашу">
        <img src="${c.cover}" alt="${c.name}" loading="lazy">
        <span class="category-card-badge">→</span>
        <div class="category-card-body">
          <p class="category-card-title">${c.name}</p>
          <p class="category-card-count">${c.photoCount.toLocaleString('ru-RU')} фото</p>
        </div>
      </article>`
      )
      .join('');

    $$('.category-card', grid).forEach((card) => {
      const go = () => {
        state.category = card.dataset.category;
        $('#categoryFilter').value = state.category;
        applyFiltersAndSort(true);
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
  }

  /* ---------------------------------------------------------------------
     PEOPLE GRID
     --------------------------------------------------------------------- */
  function renderPeopleGrid() {
    const grid = $('#peopleGrid');
    if (!state.data.people) return;
    grid.innerHTML = state.data.people
      .map(
        (p) => `
      <article class="person-card" data-person="${p.slug}" tabindex="0" role="button" aria-label="${p.name} фотолары">
        <div class="person-avatar"><img src="${p.avatar}" alt="${p.name}" loading="lazy"></div>
        <p class="person-name">${p.name}</p>
        <p class="person-count">${p.photoCount.toLocaleString('ru-RU')} фото</p>
      </article>`
      )
      .join('');

    $$('.person-card', grid).forEach((card) => {
      const go = () => {
        state.person = card.dataset.person;
        $('#peopleFilter').value = state.person;
        applyFiltersAndSort(true);
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
  }

  /* ---------------------------------------------------------------------
     FILTER SELECTS
     --------------------------------------------------------------------- */
  function populateFilterSelects() {
    const catSel = $('#categoryFilter');
    const perSel = $('#peopleFilter');
    (state.data.categories || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = `${c.name} (${c.photoCount})`;
      catSel.appendChild(opt);
    });
    (state.data.people || []).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = `${p.name} (${p.photoCount})`;
      perSel.appendChild(opt);
    });
  }

  function bindFilters() {
    $('#categoryFilter').addEventListener('change', (e) => {
      state.category = e.target.value;
      applyFiltersAndSort(true);
    });
    $('#peopleFilter').addEventListener('change', (e) => {
      state.person = e.target.value;
      applyFiltersAndSort(true);
    });
    $('#resetFilters').addEventListener('click', () => {
      state.category = 'all';
      state.person = 'all';
      state.query = '';
      state.sort = 'recent';
      $('#categoryFilter').value = 'all';
      $('#peopleFilter').value = 'all';
      $('#searchInput').value = '';
      $$('.chip', $('#sortChips')).forEach((c) => c.classList.toggle('is-active', c.dataset.sort === 'recent'));
      applyFiltersAndSort(true);
    });
    $$('.chip', $('#sortChips')).forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('.chip', $('#sortChips')).forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.sort = chip.dataset.sort;
        applyFiltersAndSort(true);
      });
    });
  }

  function bindSearch() {
    let t;
    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.query = e.target.value.trim().toLowerCase();
        applyFiltersAndSort(true);
      }, 220);
    });
  }

  /* ---------------------------------------------------------------------
     FILTER + SORT PIPELINE
     --------------------------------------------------------------------- */
  function applyFiltersAndSort(reset) {
    let list = state.photos.slice();

    if (state.category !== 'all') list = list.filter((p) => p.category === state.category);
    if (state.person !== 'all') list = list.filter((p) => p.people.includes(state.person));
    if (state.query) {
      const q = state.query;
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.people.some((slug) => nameFor(slug).toLowerCase().includes(q))
      );
    }

    if (state.sort === 'recent') list.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (state.sort === 'popular') list.sort((a, b) => b.views - a.views);
    else if (state.sort === 'random') list.sort(() => Math.random() - 0.5);

    state.filtered = list;
    if (reset) {
      state.renderedCount = 0;
      $('#photoGrid').innerHTML = '';
    }
    $('#resultsCount').textContent = `${state.filtered.length.toLocaleString('ru-RU')} фото табылды`;
    renderNextPage();
  }

  function nameFor(slug) {
    const p = (state.data.people || []).find((p) => p.slug === slug);
    return p ? p.name : slug;
  }

  /* ---------------------------------------------------------------------
     PHOTO GRID RENDER (paged / infinite scroll + lazy images)
     --------------------------------------------------------------------- */
  let lazyObserver;
  function getLazyObserver() {
    if (lazyObserver) return lazyObserver;
    lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          lazyObserver.unobserve(img);
        });
      },
      { rootMargin: '200px 0px' }
    );
    return lazyObserver;
  }

  function renderNextPage() {
    const grid = $('#photoGrid');
    const loader = $('#gridLoader');
    const start = state.renderedCount;
    const end = Math.min(state.filtered.length, start + state.pageSize);
    const slice = state.filtered.slice(start, end);

    if (slice.length === 0 && start === 0) {
      grid.innerHTML = `<p style="color:var(--ink-faint); grid-column:1/-1; font-family:var(--font-mono); font-size:13px;">Нәтиже табылмады. Сүзгіні тазалап көріңіз.</p>`;
      loader.classList.remove('is-visible');
      return;
    }

    const frag = document.createDocumentFragment();
    slice.forEach((photo, i) => {
      const idx = start + i;
      const el = document.createElement('article');
      el.className = 'photo-card';
      el.style.animationDelay = (i % state.pageSize) * 25 + 'ms';
      el.dataset.index = idx;
      el.innerHTML = `
        <img data-src="${photo.thumb}" alt="${photo.title}" loading="lazy">
        <button class="photo-card-dl" title="Жүктеп алу" data-download="${photo.id}">⇩</button>
        <div class="photo-card-overlay">
          <div class="photo-card-meta">
            <span class="photo-card-title">${photo.categoryName}</span>
            <span class="photo-card-views">◎ ${photo.views}</span>
          </div>
        </div>`;
      frag.appendChild(el);
    });
    grid.appendChild(frag);

    // observe new lazy images
    $$('img[data-src]', grid).forEach((img) => getLazyObserver().observe(img));

    // bind open lightbox + download btn
    $$('.photo-card', grid).forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.photo-card-dl')) return;
        openLightbox(parseInt(card.dataset.index, 10));
      });
    });
    $$('.photo-card-dl', grid).forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photo = state.filtered.find((p) => p.id === btn.dataset.download);
        if (photo) downloadSinglePhoto(photo);
      });
    });

    state.renderedCount = end;
    loader.classList.toggle('is-visible', state.renderedCount < state.filtered.length);
  }

  function bindInfiniteScroll() {
    const sentinel = $('#gridSentinel');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && state.renderedCount < state.filtered.length) {
            renderNextPage();
          }
        });
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(sentinel);
  }

  /* ---------------------------------------------------------------------
     LIGHTBOX
     --------------------------------------------------------------------- */
  function bindLightbox() {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lightboxBackdrop').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => stepLightbox(-1));
    $('#lbNext').addEventListener('click', () => stepLightbox(1));
    $('#lbDownload').addEventListener('click', () => {
      const photo = state.filtered[state.lightboxIndex];
      if (photo) downloadSinglePhoto(photo);
    });
    $('#lbFullscreen').addEventListener('click', toggleFullscreen);
    $('#lbSlideshow').addEventListener('click', toggleSlideshowFromLightbox);

    document.addEventListener('keydown', (e) => {
      if (!$('#lightbox').classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  function openLightbox(index) {
    state.lightboxIndex = index;
    renderLightbox();
    $('#lightbox').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    $('#lightbox').classList.remove('is-open');
    document.body.style.overflow = '';
    stopSlideshow();
  }
  function stepLightbox(dir) {
    const len = state.filtered.length;
    state.lightboxIndex = (state.lightboxIndex + dir + len) % len;
    renderLightbox();
  }
  function renderLightbox() {
    const photo = state.filtered[state.lightboxIndex];
    if (!photo) return;
    $('#lbImage').src = photo.src;
    $('#lbImage').alt = photo.title;
    $('#lbTitle').textContent = photo.title;
    $('#lbDate').textContent = photo.date;
    $('#lbCounter').textContent = `${state.lightboxIndex + 1} / ${state.filtered.length}`;
    $('#lbPeople').innerHTML = photo.people.map((slug) => `<span>${nameFor(slug)}</span>`).join('');
  }

  function toggleFullscreen() {
    const el = $('.lightbox-inner');
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => toast('Толық экран режимі қолжетімсіз'));
    } else {
      document.exitFullscreen?.();
    }
  }

  function bindSlideshowToggle() {
    $('#slideshowBtn').addEventListener('click', () => {
      if (state.filtered.length === 0) return;
      openLightbox(0);
      startSlideshow();
    });
  }
  function toggleSlideshowFromLightbox() {
    if (state.isSlideshow) stopSlideshow();
    else startSlideshow();
  }
  function startSlideshow() {
    state.isSlideshow = true;
    $('#lbSlideshow').style.color = 'var(--gold)';
    state.slideshowTimer = setInterval(() => stepLightbox(1), 2600);
    toast('Слайдшоу режимі қосылды');
  }
  function stopSlideshow() {
    state.isSlideshow = false;
    if ($('#lbSlideshow')) $('#lbSlideshow').style.color = '';
    clearInterval(state.slideshowTimer);
  }

  /* ---------------------------------------------------------------------
     NAV (sidebar + bottom nav active state, smooth section highlighting)
     --------------------------------------------------------------------- */
  function bindNav() {
    const links = $$('[data-nav]');
    links.forEach((link) => {
      link.addEventListener('click', () => {
        links.forEach((l) => l.classList.remove('is-active'));
        $$(`[data-nav="${link.dataset.nav}"]`).forEach((l) => l.classList.add('is-active'));
        closeSidebarDrawer();
      });
    });

    const sections = ['home', 'gallery', 'people', 'categories', 'downloads', 'about']
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            links.forEach((l) => l.classList.toggle('is-active', l.dataset.nav === id));
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------------------------------------------------------------------
     MOBILE SIDEBAR DRAWER
     --------------------------------------------------------------------- */
  function bindSidebarDrawer() {
    $('#menuBtn').addEventListener('click', () => {
      $('#sidebar').classList.add('is-open');
      $('#scrim').classList.add('is-visible');
    });
    $('#scrim').addEventListener('click', closeSidebarDrawer);
  }
  function closeSidebarDrawer() {
    $('#sidebar').classList.remove('is-open');
    $('#scrim').classList.remove('is-visible');
  }

  /* ---------------------------------------------------------------------
     DOWNLOADS
     --------------------------------------------------------------------- */
  function renderDownloads() {
    const grid = $('#downloadGrid');
    const cats = state.data.categories || [];
    const cards = [
      {
        icon: '✦',
        title: 'Барлық фотолар',
        sub: `${state.photos.length.toLocaleString('ru-RU')} фото · ~${state.data.meta.approxSizeGb || 17} GB`,
        primary: true,
        filter: () => state.photos,
        zipName: 'JIA-211-Barlyk-Fotolar.zip',
      },
      ...cats.map((c) => ({
        icon: '◈',
        title: c.name,
        sub: `${c.photoCount.toLocaleString('ru-RU')} фото`,
        filter: () => state.photos.filter((p) => p.category === c.slug),
        zipName: `JIA-211-${c.slug}.zip`,
      })),
    ];

    grid.innerHTML = cards
      .map(
        (c, i) => `
      <div class="download-card ${c.primary ? 'is-primary' : ''}" data-dl-idx="${i}">
        <span class="dl-card-icon">${c.icon}</span>
        <div>
          <p class="dl-card-title">${c.title}</p>
          <p class="dl-card-sub">${c.sub}</p>
        </div>
        <button class="dl-card-btn" data-dl-trigger="${i}">ZIP жүктеу <span>⇩</span></button>
        <div class="dl-progress" id="dlProgress${i}"><div class="dl-progress-bar" id="dlProgressBar${i}"></div></div>
      </div>`
      )
      .join('');

    $$('[data-dl-trigger]', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.dlTrigger, 10);
        const cfg = cards[idx];
        downloadZip(cfg.filter(), cfg.zipName, idx);
      });
    });

    // per-person
    const peopleList = $('#downloadPeopleList');
    peopleList.innerHTML = (state.data.people || [])
      .map(
        (p, i) => `
      <div class="dl-person-row">
        <img src="${p.avatar}" alt="${p.name}">
        <div class="dl-person-row-info">
          <p class="dl-person-row-name">${p.name}</p>
          <p class="dl-person-row-count">${p.photoCount} фото</p>
        </div>
        <button class="dl-person-row-btn" data-dl-person="${p.slug}" title="ZIP жүктеу">⇩</button>
      </div>`
      )
      .join('');

    $$('[data-dl-person]', peopleList).forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.dlPerson;
        const person = state.data.people.find((p) => p.slug === slug);
        const photos = state.photos.filter((p) => p.people.includes(slug));
        downloadZip(photos, `JIA-211-${slug}.zip`);
      });
    });
  }

  function downloadSinglePhoto(photo) {
    toast(`Жүктелуде: ${photo.title}`);
    fetch(photo.src)
      .then((r) => r.blob())
      .then((blob) => triggerBlobDownload(blob, `${photo.id}.jpg`))
      .catch(() => {
        // fallback: open in new tab
        window.open(photo.src, '_blank');
      });
  }

  async function downloadZip(photos, zipName, cardIdx) {
    if (!window.JSZip) {
      toast('ZIP кітапханасы жүктелмеді');
      return;
    }
    if (photos.length === 0) {
      toast('Бұл жинақта фото жоқ');
      return;
    }
    const progressWrap = cardIdx !== undefined ? $('#dlProgress' + cardIdx) : null;
    const progressBar = cardIdx !== undefined ? $('#dlProgressBar' + cardIdx) : null;
    if (progressWrap) progressWrap.classList.add('is-active');

    // cap to keep client-side demo responsive on very large sets
    const cap = 120;
    const subset = photos.length > cap ? photos.slice(0, cap) : photos;
    toast(`ZIP дайындалуда: ${subset.length} фото…`);

    const zip = new JSZip();
    let done = 0;
    await Promise.all(
      subset.map(async (photo) => {
        try {
          const res = await fetch(photo.thumb);
          const blob = await res.blob();
          zip.file(`${photo.id}.jpg`, blob);
        } catch (e) {
          /* skip failed fetch */
        } finally {
          done++;
          const pct = Math.round((done / subset.length) * 100);
          if (progressBar) progressBar.style.width = pct + '%';
        }
      })
    );

    const content = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(content, zipName);
    if (progressWrap) setTimeout(() => progressWrap.classList.remove('is-active'), 600);
    toast(
      photos.length > cap
        ? `Дайын! (демо: алғашқы ${cap} фото)`
        : 'ZIP архиві дайын болды'
    );
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------------------------------------------------------------------
     TOASTS
     --------------------------------------------------------------------- */
  function toast(msg) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  /* ---------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', loadData);
})();
