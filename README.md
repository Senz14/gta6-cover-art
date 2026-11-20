# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Senz14/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Senz14/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Cover Studio** — a cover-art editor that runs entirely in your browser, offline. I built it around the thing that makes a GTA cover a GTA cover: the collage. Instead of stamping one photo into a fixed frame, Cover Studio lets you compose a real multi-panel poster — a full-bleed hero shot, a 2×2 four-panel grid, a hero-and-three arrangement, or the classic 3×3 nine-panel grid with its own title block at the foot — with thin dark gutters between panels that are filled edge-to-edge, just like the box art.

Every photo you add (by file picker, by dragging files onto the page, or from the two bundled samples) lands in a tray. Click any panel on the poster to select it, click a tray photo to place it there, then fine-tune the crop with the zoom and offset sliders — or just drag directly on the poster. Each panel gets a saturation and contrast pop, and the whole poster is graded with a Vice City neon-sunset treatment drawn on canvas: teal-cyan shadows, an orange mid-tone wash, hot pink rising from the foot, a glowing sun band, and a vignette, with a slider to dial the intensity up or down.

The lettering is set in two vendored display fonts (Anton for the heavy stacked title, Pacifico for the script accent line, both under the SIL Open Font License and shipped as local files in `app/fonts/`, so the app makes zero network requests). Add a 0–5 wanted-stars row and a toggleable Vice City badge — a circular badge on most layouts, an angled ribbon across the title block on the nine-panel grid — and export a finished PNG at 1080×1080 or 1080×1350, rendered offscreen at full resolution so the download is always print-sharp. Your photos never leave the page.

## Run it

```sh
node main.ts
```

That copies the app and screenshots into the output directory and writes `dossier.json`, the summary the make.fun judge reads. To try the cover studio itself:

```sh
node serve.ts
```

then open http://localhost:8080 — upload photos (or use the two bundled samples), choose a layout, edit the caption, and export your cover.

---
<sub>Entered on [make.fun](https://make.fun/?ref=jkmc4mts&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
