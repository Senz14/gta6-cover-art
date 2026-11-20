// Fixed scenes for screenshots: ?shot=<scene> builds a deterministic cover or editor
// view, waits for the vendored fonts and the sample photos, paints twice, then sets
// window.__shotReady so the capture tool knows the frame is final.
//
// Params: layout (hero|grid4|hero3|grid9), caption (title, use %0A for a second line),
// sub (script accent line), stars (0-5), badge (0|1), grade (0-1.5),
// mix (comma list of b|p choosing the photo per panel, cycled).
import { TITLE_FONT, SCRIPT_FONT } from './cover.js';

const SAMPLES = { b: 'samples/boulevard.jpg', p: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

export async function runShot(params, api) {
  const { state, addPhoto, loadImage, redraw, setLayout } = api;
  const shot = params.get('shot');
  document.body.classList.add(shot === 'editor' ? 'shot-editor' : 'shot-cover');

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`80px ${TITLE_FONT.split(',')[0].replace(/'/g, '')}`),
        document.fonts.load(`40px ${SCRIPT_FONT.split(',')[0].replace(/'/g, '')}`),
      ]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch { /* fallback fonts still paint a valid scene */ }

  const imgs = {};
  for (const key of ['b', 'p']) imgs[key] = await loadImage(SAMPLES[key]);
  addPhoto('Boulevard (sample)', imgs.b);
  addPhoto('Pier (sample)', imgs.p);

  const layout = params.get('layout') ?? (shot === 'cover' ? 'grid9' : 'grid4');
  setLayout(layout);
  state.title = params.get('caption') ?? 'Vice Heat';
  state.subtitle = params.get('sub') ?? 'welcome back to Leonida';
  state.stars = Number(params.get('stars') ?? 4);
  state.badge = params.get('badge') !== '0';
  state.grade = Number(params.get('grade') ?? 1);
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('stars').value = String(state.stars);
  document.getElementById('starsVal').textContent = String(state.stars);
  document.getElementById('badge').checked = state.badge;
  document.getElementById('grade').value = String(state.grade);

  const mix = (params.get('mix') ?? 'b,p,p,b,b,p,b,p,b').split(',');
  const crops = [
    { zoom: 1.15, ox: 0.5, oy: 0.4 }, { zoom: 1.5, ox: 0.3, oy: 0.5 }, { zoom: 1.3, ox: 0.7, oy: 0.35 },
    { zoom: 1.6, ox: 0.6, oy: 0.55 }, { zoom: 1.1, ox: 0.5, oy: 0.5 }, { zoom: 1.45, ox: 0.4, oy: 0.3 },
    { zoom: 1.25, ox: 0.65, oy: 0.6 }, { zoom: 1.55, ox: 0.35, oy: 0.45 }, { zoom: 1.2, ox: 0.5, oy: 0.4 },
  ];
  state.panels.forEach((slot, i) => {
    slot.img = imgs[mix[i % mix.length]] ?? imgs.b;
    Object.assign(slot, crops[i % crops.length]);
  });
  state.selected = shot === 'editor' ? 0 : -1;
  redraw();
  if (shot === 'cover') state.selected = -1;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
