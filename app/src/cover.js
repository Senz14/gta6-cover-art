// Cover Studio rendering engine: draws a GTA-style multi-panel cover onto any 2D canvas.
//
// A cover is a collage of photo panels over a dark ground, graded with a Vice City
// neon-sunset wash (hot pink low, orange mid, teal shadows, a sun band and a glow),
// lettered with a heavy display title plus a script accent line, and decorated with a
// wanted-stars row and a badge ribbon. The same draw routine paints the live preview
// and the full-resolution export, so what you see is exactly what you download.

export const LAYOUTS = {
  hero: { label: 'Full-bleed hero', panels: 1 },
  grid4: { label: 'Four-panel grid', panels: 4 },
  hero3: { label: 'Hero + three', panels: 4 },
  grid9: { label: 'Nine-panel grid', panels: 9 },
};

export const TITLE_FONT = "'Anton', 'Arial Black', Impact, sans-serif";
export const SCRIPT_FONT = "'Pacifico', 'Brush Script MT', cursive";

/** Panel rectangles (fractions of the poster) for a layout. grid9 reserves a title block at the foot. */
export function panelRects(layout, w, h) {
  const g = Math.max(4, w * 0.008); // thin dark gutter between panels
  switch (layout) {
    case 'grid4': {
      const pw = (w - g * 3) / 2, ph = (h - g * 3) / 2;
      return [
        { x: g, y: g, w: pw, h: ph }, { x: g * 2 + pw, y: g, w: pw, h: ph },
        { x: g, y: g * 2 + ph, w: pw, h: ph }, { x: g * 2 + pw, y: g * 2 + ph, w: pw, h: ph },
      ];
    }
    case 'hero3': {
      const heroW = w * 0.62, sideW = w - heroW - g * 3, sideH = (h - g * 4) / 3;
      const rects = [{ x: g, y: g, w: heroW, h: h - g * 2 }];
      for (let i = 0; i < 3; i++) rects.push({ x: g * 2 + heroW, y: g + i * (sideH + g), w: sideW, h: sideH });
      return rects;
    }
    case 'grid9': {
      const titleH = h * 0.24, gridH = h - titleH;
      const pw = (w - g * 4) / 3, ph = (gridH - g * 4) / 3;
      const rects = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        rects.push({ x: g + c * (pw + g), y: g + r * (ph + g), w: pw, h: ph });
      }
      return rects;
    }
    default: // hero
      return [{ x: 0, y: 0, w, h }];
  }
}

function drawPanelPhoto(ctx, rect, slot) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = '#241430';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const img = slot?.img;
  if (img) {
    const zoom = slot.zoom ?? 1;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale, ph = img.naturalHeight * scale;
    const ox = (slot.ox ?? 0.5) * (rect.w - pw), oy = (slot.oy ?? 0.5) * (rect.h - ph);
    // Saturation / contrast pop so photos feel printed, not pasted.
    ctx.filter = 'saturate(1.35) contrast(1.12)';
    ctx.drawImage(img, rect.x + ox, rect.y + oy, pw, ph);
    ctx.filter = 'none';
  } else {
    // Empty panel: a dusk gradient placeholder with a palm silhouette feel.
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, '#3a1c5c');
    grad.addColorStop(0.55, '#8a2a6b');
    grad.addColorStop(1, '#e86a3c');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

/** The neon-sunset grade: per-panel wash plus a whole-poster pass with sun band and vignette. */
function applyGrade(ctx, w, h, intensity) {
  const k = Math.max(0, Math.min(1.5, intensity));
  if (k <= 0) return;
  ctx.save();
  // Teal-cyan shadows from the top.
  let g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  g.addColorStop(0, `rgba(20, 160, 190, ${0.28 * k})`);
  g.addColorStop(1, 'rgba(20, 160, 190, 0)');
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Orange mid-tones.
  g = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.85);
  g.addColorStop(0, 'rgba(255, 140, 40, 0)');
  g.addColorStop(0.55, `rgba(255, 140, 40, ${0.30 * k})`);
  g.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Hot pink / magenta rising from the foot.
  g = ctx.createLinearGradient(0, h * 0.45, 0, h);
  g.addColorStop(0, 'rgba(255, 30, 130, 0)');
  g.addColorStop(1, `rgba(255, 30, 130, ${0.5 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  // Sun band: a bright horizontal glow a little above the foot.
  const sunY = h * 0.68;
  const sun = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, w * 0.75);
  sun.addColorStop(0, `rgba(255, 210, 120, ${0.5 * k})`);
  sun.addColorStop(0.35, `rgba(255, 140, 90, ${0.22 * k})`);
  sun.addColorStop(1, 'rgba(255, 140, 90, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  const band = ctx.createLinearGradient(0, sunY - h * 0.015, 0, sunY + h * 0.015);
  band.addColorStop(0, 'rgba(255, 230, 170, 0)');
  band.addColorStop(0.5, `rgba(255, 230, 170, ${0.35 * k})`);
  band.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  // Vignette to seat the poster.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(10, 4, 24, 0)');
  vig.addColorStop(1, `rgba(10, 4, 24, ${0.42 * k})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStars(ctx, w, h, count, layout) {
  if (!count) return;
  const r = w * 0.026;
  const totalW = count * r * 2.35;
  const inTitleBlock = layout === 'grid9';
  const cy = inTitleBlock ? h * 0.8 : h * 0.075;
  let x = w / 2 - totalW / 2 + r;
  ctx.save();
  for (let i = 0; i < count; i++) {
    starPath(ctx, x, cy, r);
    ctx.fillStyle = '#ffd94d';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = r * 0.35;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = '#7a4d00';
    ctx.stroke();
    x += r * 2.35;
  }
  ctx.restore();
}

function drawBadge(ctx, w, h, layout) {
  ctx.save();
  if (layout === 'grid9') {
    // Angled ribbon across the top-left corner of the title block.
    ctx.translate(w * 0.13, h * 0.795);
    ctx.rotate(-0.1);
    const bw = w * 0.24, bh = h * 0.045;
    ctx.fillStyle = '#ff2e88';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = w * 0.012;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `${bh * 0.52}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VICE CITY', 0, bh * 0.03);
  } else {
    // Circular badge, top-right.
    const cx = w * 0.885, cy = h * 0.115, r = w * 0.075;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#12b5c9';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = w * 0.014;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = r * 0.04;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${r * 0.42}px ${TITLE_FONT}`;
    ctx.fillText('VICE', cx, cy - r * 0.2);
    ctx.fillText('CITY', cx, cy + r * 0.24);
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, fontFor) {
  let size = startSize;
  ctx.font = fontFor(size);
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = fontFor(size);
  }
  return size;
}

function drawCaptions(ctx, w, h, state) {
  const title = (state.title ?? '').trim().toUpperCase();
  const sub = (state.subtitle ?? '').trim();
  const inTitleBlock = state.layout === 'grid9';
  ctx.save();
  ctx.textAlign = 'center';
  if (inTitleBlock) {
    const blockTop = h * 0.76, blockH = h * 0.24;
    ctx.fillStyle = '#12081f';
    ctx.fillRect(0, blockTop, w, blockH);
    // Halftone-ish dot strip along the block's top edge.
    ctx.fillStyle = 'rgba(255, 46, 136, 0.8)';
    const dotR = w * 0.006;
    for (let x = dotR * 2; x < w; x += dotR * 4.4) {
      ctx.beginPath();
      ctx.arc(x, blockTop + dotR * 2.2, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sub) {
      ctx.font = `${h * 0.042}px ${SCRIPT_FONT}`;
      ctx.fillStyle = '#ffb3d9';
      ctx.fillText(sub, w / 2, blockTop + blockH * 0.45);
    }
    if (title) {
      const lines = title.split('\n').map((s) => s.trim()).filter(Boolean);
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
      const size = fitFont(ctx, longest, w * 0.92, h * 0.105, (s) => `${s}px ${TITLE_FONT}`);
      ctx.font = `${size}px ${TITLE_FONT}`;
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => {
        const y = blockTop + blockH * (sub ? 0.72 : 0.55) + (i - (lines.length - 1) / 2) * size * 1.02;
        ctx.lineWidth = size * 0.14;
        ctx.strokeStyle = '#0a0514';
        ctx.strokeText(line, w / 2, y);
        const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, '#ffe9f4');
        grad.addColorStop(1, '#ff9ecb');
        ctx.fillStyle = grad;
        ctx.fillText(line, w / 2, y);
      });
    }
  } else {
    // Lettering over the art, low on the poster with a soft scrim behind it.
    const baseY = h * 0.9;
    const scrim = ctx.createLinearGradient(0, h * 0.62, 0, h);
    scrim.addColorStop(0, 'rgba(8, 3, 18, 0)');
    scrim.addColorStop(1, 'rgba(8, 3, 18, 0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    if (title) {
      const lines = title.split('\n').map((s) => s.trim()).filter(Boolean);
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
      const size = fitFont(ctx, longest, w * 0.92, h * 0.115, (s) => `${s}px ${TITLE_FONT}`);
      ctx.font = `${size}px ${TITLE_FONT}`;
      ctx.textBaseline = 'alphabetic';
      lines.forEach((line, i) => {
        const y = baseY - (lines.length - 1 - i) * size * 1.04 - (sub ? size * 0.52 : 0);
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = size * 0.16;
        ctx.lineWidth = size * 0.16;
        ctx.strokeStyle = '#0a0514';
        ctx.strokeText(line, w / 2, y);
        ctx.shadowBlur = 0;
        const grad = ctx.createLinearGradient(0, y - size, 0, y);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#fff3e0');
        grad.addColorStop(1, '#ffb35c');
        ctx.fillStyle = grad;
        ctx.fillText(line, w / 2, y);
      });
    }
    if (sub) {
      ctx.font = `${h * 0.05}px ${SCRIPT_FONT}`;
      ctx.fillStyle = '#ffd9ec';
      ctx.shadowColor = 'rgba(255, 30, 130, 0.8)';
      ctx.shadowBlur = h * 0.012;
      ctx.fillText(sub, w / 2, baseY + h * 0.045);
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

/**
 * Draws the full cover described by `state` onto `canvas` at the canvas's own size.
 * state: { layout, panels: [{img, zoom, ox, oy}], title, subtitle, stars, badge, grade }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#0d0618';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => drawPanelPhoto(ctx, rect, state.panels[i]));
  // Per-panel grade pass so every photo carries the sunset wash on its own.
  ctx.save();
  rects.forEach((rect) => {
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const g = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.4, rect.x, rect.y + rect.h);
    g.addColorStop(0, 'rgba(255, 46, 136, 0)');
    g.addColorStop(1, `rgba(255, 46, 136, ${0.22 * (state.grade ?? 1)})`);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  ctx.restore();
  applyGrade(ctx, w, h, state.grade ?? 1);
  drawCaptions(ctx, w, h, state);
  if (state.badge) drawBadge(ctx, w, h, state.layout);
  drawStars(ctx, w, h, state.stars ?? 0, state.layout);
  // Selection outline (editor only; export passes selected = -1).
  if (state.selected >= 0 && rects[state.selected]) {
    const r = rects[state.selected];
    ctx.save();
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.strokeStyle = '#22d3ee';
    ctx.setLineDash([w * 0.02, w * 0.012]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}

/** Renders the cover offscreen at an exact size and downloads it as a PNG. */
export function exportCover(state, width, height, filename) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  drawCover(off, { ...state, selected: -1 });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
