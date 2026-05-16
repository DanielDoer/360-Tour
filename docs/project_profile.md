# Project Profile: tour360

## Current Architecture

| Datum | Bereich | Beschreibung |
|-------|---------|--------------|
| 2026-05-16 | Static app shell | `index.html` loads a vanilla ES module app from `src/js/app.js` and links `src/css/styles.css`. The current app is viewer-only and uses hash routes in the form `#/tour/<tour-id>`. |
| 2026-05-16 | Tour loading | `src/js/router.js` extracts the tour id, `src/js/tourLoader.js` fetches `public/tours/<tour-id>/tour.json`, and `src/js/tourSchema.js` validates the JSON before rendering. |
| 2026-05-16 | Viewer state | `src/js/viewer.js` owns the lightweight panorama state (`yaw`, `pitch`) and exposes `showScene` plus `pan`. This keeps the current CSS-based placeholder renderer replaceable by Pannellum later. |
| 2026-05-16 | Demo data | `public/tours/demo/tour.json` defines the first sample tour with two scenes and cross-linked scene hotspots. SVG panorama placeholders live in `public/tours/demo/images/`. |
| 2026-05-16 | Tests | `tests/tourSchema.test.js` uses Node's built-in test runner to cover schema validation without adding test dependencies yet. |

## Data Flow

1. Browser opens `index.html`.
2. `ensureDefaultRoute()` sets `#/tour/demo` when no route is present.
3. `loadTour()` fetches and validates `public/tours/<tour-id>/tour.json`.
4. `app.js` writes tour metadata and scene buttons using `textContent`/created elements only.
5. `viewer.js` renders the selected scene image as an interactive placeholder panorama and updates yaw/pitch on button or keyboard input.

## Patterns

- User-controlled strings from tour JSON are never assigned via `innerHTML`.
- Tour ids are normalized to alphanumeric, underscore and dash before a fetch path is built.
- External viewer dependencies are not bundled yet; the current viewer module is the seam for a later Pannellum adapter.
