/* =========================================================
   PLACEHOLDER GENERATOR
   Generates tasteful gold/black gradient placeholder images
   on <canvas>. Used only as a graceful fallback when a real
   file under /photos/{folder}/ or /thumbs/{folder}/ is missing
   or hasn't been added yet — see js/main.js's withFallback().
   ========================================================= */
(function (global) {
  const cache = new Map();

  const CAT_LABELS = {
    mania: 'ОБШИ МАНИЯ',
    free: 'ОБШИ СВОБОДНЫЙ',
    girls: 'ОБШИ ҚЫЗДАР',
    boys: 'ОБШИ БАЛДАР',
    all: 'БАРЛЫҚ АДАМДАР',
    group: 'ТОПТЫҚ ФОТО',
  };

  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function photoPlaceholder({ id, cat, hue, w = 4, h = 3, label }) {
    const key = 'photo:' + id + ':' + w + 'x' + h;
    if (cache.has(key)) return cache.get(key);

    const width = 480;
    const height = Math.round((width * h) / w);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const baseHue = (hue !== undefined ? hue : hashStr(id) % 360);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, `hsl(${baseHue}, 28%, 10%)`);
    g.addColorStop(0.5, `hsl(${(baseHue + 20) % 360}, 22%, 7%)`);
    g.addColorStop(1, `hsl(${(baseHue + 40) % 360}, 30%, 4%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // soft gold vignette glow
    const radial = ctx.createRadialGradient(
      width * (0.3 + 0.4 * ((hashStr(id + 'x') % 100) / 100)),
      height * 0.35, 0,
      width * 0.5, height * 0.5, width * 0.75
    );
    radial.addColorStop(0, 'rgba(212,175,55,0.16)');
    radial.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // faint diagonal texture lines
    ctx.strokeStyle = 'rgba(212,175,55,0.06)';
    ctx.lineWidth = 1;
    for (let i = -height; i < width; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // grain dots
    const grainCount = Math.floor((width * height) / 9000);
    for (let i = 0; i < grainCount; i++) {
      const seed = hashStr(id + i);
      const gx = (seed * 13) % width;
      const gy = (seed * 29) % height;
      ctx.fillStyle = `rgba(255,255,255,${0.015 + (seed % 10) / 800})`;
      ctx.fillRect(gx, gy, 1, 1);
    }

    // center cap glyph watermark
    ctx.globalAlpha = 0.18;
    ctx.font = `${Math.round(width * 0.16)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#D4AF37';
    ctx.fillText('🎓', width / 2, height / 2);
    ctx.globalAlpha = 1;

    // bottom label
    if (label !== false) {
      ctx.font = `600 ${Math.round(width * 0.032)}px Manrope, sans-serif`;
      ctx.fillStyle = 'rgba(243,239,230,0.55)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText((CAT_LABELS[cat] || 'JIA-211') , width * 0.05, height * 0.94);
    }

    const url = canvas.toDataURL('image/jpeg', 0.86);
    cache.set(key, url);
    return url;
  }

  function avatarPlaceholder({ id, name }) {
    const key = 'avatar:' + id;
    if (cache.has(key)) return cache.get(key);

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const hue = hashStr(name) % 360;

    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, `hsl(${hue}, 35%, 16%)`);
    g.addColorStop(1, `hsl(${(hue + 35) % 360}, 30%, 8%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212,175,55,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();

    ctx.font = `700 ${Math.round(size * 0.36)}px Manrope, sans-serif`;
    ctx.fillStyle = '#F3D577';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2 + 3);

    const url = canvas.toDataURL('image/png');
    cache.set(key, url);
    return url;
  }

  function categoryCoverPlaceholder({ id, cat, hue }) {
    return photoPlaceholder({ id: 'cover-' + id, cat, hue, w: 4, h: 3, label: false });
  }

  global.Placeholder = { photoPlaceholder, avatarPlaceholder, categoryCoverPlaceholder };
})(window);
