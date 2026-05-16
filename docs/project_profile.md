# Project Profile: tour360

## Current Architecture

| Datum | Bereich | Beschreibung |
|-------|---------|--------------|
| 2026-05-16 | Static app shell | `index.html` loads a vanilla ES module app from `src/js/app.js` and links `src/css/styles.css`. The current app is viewer-only and uses hash routes in the form `#/tour/<tour-id>`. |
| 2026-05-16 | Tour loading | `src/js/router.js` extracts the tour id, `src/js/tourLoader.js` fetches `public/tours/<tour-id>/tour.json`, and `src/js/tourSchema.js` validates the JSON before rendering. |
| 2026-05-16 | Viewer state | `src/js/viewer.js` owns the panorama state (`yaw`, `pitch`) and exposes `showScene`, `pan`, `getView` plus local-image URL lifecycle helpers. |
| 2026-05-16 | WebGL panorama renderer | `src/js/viewer.js` renders equirectangular 2:1 panoramas on a WebGL sphere, with pointer drag, keyboard/button pan controls, pitch up/down and hotspot projection. It falls back to CSS background panning when WebGL is unavailable. |
| 2026-05-16 | Local upload draft flow | `index.html` and `src/js/app.js` provide a browser-local upload/editor path for already stitched Insta360-style panoramas. Uploaded files become Object-URL scenes and can be connected with scene hotspots at the current view direction. |
| 2026-05-16 | Tour export | `src/js/tourExport.js` serializes the active tour for download by removing browser-only fields such as local Object URLs while keeping JSON compatible with `src/js/tourSchema.js`. `src/js/app.js` wires the export button to a Blob download. |
| 2026-05-16 | Demo data | `public/tours/demo/tour.json` defines the first sample tour with two scenes and cross-linked scene hotspots. SVG panorama placeholders live in `public/tours/demo/images/`. |
| 2026-05-16 | Tests | `tests/tourSchema.test.js` uses Node's built-in test runner to cover schema validation without adding test dependencies yet. |

## Data Flow

1. Browser opens `index.html`.
2. `ensureDefaultRoute()` sets `#/tour/demo` when no route is present.
3. `loadTour()` fetches and validates `public/tours/<tour-id>/tour.json`.
4. `app.js` writes tour metadata and scene buttons using `textContent`/created elements only.
5. `viewer.js` renders the selected equirectangular scene on a WebGL sphere and updates yaw/pitch from pointer drag, buttons or keyboard input.
6. Local uploads in `app.js` create browser-only scene objects with Object URLs; connection controls append scene hotspots at the current yaw/pitch.
7. `tourExport.js` converts the active tour into shareable JSON and strips browser-only Object URLs before `app.js` triggers a file download.

## Patterns

- User-controlled strings from tour JSON are never assigned via `innerHTML`.
- Tour ids are normalized to alphanumeric, underscore and dash before a fetch path is built.
- External viewer dependencies are not bundled yet; the current viewer module is the seam for a later Pannellum adapter.
