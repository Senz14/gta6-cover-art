// Cover Studio editor: wires the controls panel to the cover renderer.
// Photos live only in this page (object URLs / bundled samples) — nothing is uploaded.
import { drawCover, exportCover, panelRects, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');

export const state = {
  layout: 'grid9',
  panels: [], // per layout slot: { img, zoom, ox, oy }
  title: 'Vice Heat',
  subtitle: 'welcome back to Leonida',
  stars: 4,
  badge: true,
  grade: 1,
  selected: 0,
};

export const photos = []; // { id, name, img, url }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function slotCount() {
  return LAYOUTS[state.layout].panels;
}

function ensureSlots() {
  while (state.panels.length < slotCount()) state.panels.push({ img: null, zoom: 1, ox: 0.5, oy: 0.5 });
  if (state.selected >= slotCount()) state.selected = 0;
}

export function redraw() {
  ensureSlots();
  drawCover(canvas, state);
  document.querySelectorAll('.tray-item').forEach((el) => {
    el.classList.toggle('in-use', state.panels.some((p) => p.img === photos[Number(el.dataset.idx)]?.img));
  });
  const sel = $('selLabel');
  if (sel) sel.textContent = `Panel ${state.selected + 1} of ${slotCount()}`;
}

export function addPhoto(name, img) {
  photos.push({ name, img });
  renderTray();
  // Fill the first empty panel so a fresh photo shows up immediately.
  const empty = state.panels.findIndex((p) => !p.img);
  if (empty >= 0) {
    state.panels[empty].img = img;
    state.selected = empty;
    syncPanelControls();
  }
  redraw();
  return photos.length - 1;
}

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tray-item';
    btn.dataset.idx = String(i);
    btn.title = `${photo.name} — click to put it in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    btn.appendChild(thumb);
    const label = document.createElement('span');
    label.textContent = photo.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.panels[state.selected].img = photo.img;
      redraw();
    });
    tray.appendChild(btn);
  });
  if (!photos.length) {
    const p = document.createElement('p');
    p.className = 'tray-empty';
    p.textContent = 'No photos yet — add files, drop them anywhere, or use the samples.';
    tray.appendChild(p);
  }
}

function syncPanelControls() {
  const slot = state.panels[state.selected];
  if (!slot) return;
  $('zoom').value = String(slot.zoom ?? 1);
  $('offX').value = String(slot.ox ?? 0.5);
  $('offY').value = String(slot.oy ?? 0.5);
}

function setLayout(layout) {
  state.layout = layout;
  ensureSlots();
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  syncPanelControls();
  redraw();
}

// ---- Controls wiring -------------------------------------------------------

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

$('files').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    addPhoto(file.name, await loadImage(URL.createObjectURL(file)));
  }
  e.target.value = '';
  setStatus(`${photos.length} photo(s) in the tray. Click a panel, then a photo, to place it.`);
});

$('sampleBoulevard').addEventListener('click', async () => addPhoto('Boulevard (sample)', await loadImage('samples/boulevard.jpg')));
$('samplePier').addEventListener('click', async () => addPhoto('Pier (sample)', await loadImage('samples/pier.jpg')));

for (const evt of ['dragover', 'dragenter']) {
  document.addEventListener(evt, (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
}
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    addPhoto(file.name, await loadImage(URL.createObjectURL(file)));
  }
});

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('stars').addEventListener('input', (e) => { state.stars = Number(e.target.value); $('starsVal').textContent = String(state.stars); redraw(); });
$('badge').addEventListener('change', (e) => { state.badge = e.target.checked; redraw(); });
$('grade').addEventListener('input', (e) => { state.grade = Number(e.target.value); redraw(); });

$('zoom').addEventListener('input', (e) => { state.panels[state.selected].zoom = Number(e.target.value); redraw(); });
$('offX').addEventListener('input', (e) => { state.panels[state.selected].ox = Number(e.target.value); redraw(); });
$('offY').addEventListener('input', (e) => { state.panels[state.selected].oy = Number(e.target.value); redraw(); });

// Click a panel on the canvas to select it; drag on the canvas to re-crop it.
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPos(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const idx = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (idx >= 0) {
    state.selected = idx;
    syncPanelControls();
    const slot = state.panels[idx];
    drag = { startX: e.clientX, startY: e.clientY, ox: slot.ox ?? 0.5, oy: slot.oy ?? 0.5, rect: rects[idx] };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const slot = state.panels[state.selected];
  const r = canvas.getBoundingClientRect();
  const dx = ((e.clientX - drag.startX) / r.width) * canvas.width;
  const dy = ((e.clientY - drag.startY) / r.height) * canvas.height;
  // Dragging shifts the crop window: right reveals more of the photo's left side.
  slot.ox = clamp01(drag.ox + dx / drag.rect.w);
  slot.oy = clamp01(drag.oy + dy / drag.rect.h);
  $('offX').value = String(slot.ox);
  $('offY').value = String(slot.oy);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function setStatus(msg) { $('status').textContent = msg; }

$('exportSquare').addEventListener('click', () => { exportCover(state, 1080, 1080, 'cover-1080x1080.png'); setStatus('Saved cover-1080x1080.png'); });
$('exportPortrait').addEventListener('click', () => { exportCover(state, 1080, 1350, 'cover-1080x1350.png'); setStatus('Saved cover-1080x1350.png'); });

// ---- Boot -------------------------------------------------------------------

async function boot() {
  ensureSlots();
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShot(params, { state, addPhoto, loadImage, redraw, setLayout });
    return;
  }
  // Default scene: both samples spread across the grid so the studio opens alive.
  const boulevard = await loadImage('samples/boulevard.jpg');
  const pier = await loadImage('samples/pier.jpg');
  addPhoto('Boulevard (sample)', boulevard);
  addPhoto('Pier (sample)', pier);
  const order = [boulevard, pier, pier, boulevard, boulevard, pier, boulevard, pier, boulevard];
  state.panels.forEach((slot, i) => { slot.img = order[i % order.length]; });
  state.selected = 0;
  syncPanelControls();
  redraw();
}

boot();
