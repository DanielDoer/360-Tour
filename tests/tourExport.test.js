import assert from "node:assert/strict";
import test from "node:test";
import { createExportableTour, createTourJson, createTourJsonFileName } from "../src/js/tourExport.js";
import { validateTour } from "../src/js/tourSchema.js";

const localDraftTour = {
  id: "Local Upload!",
  title: "Local draft",
  description: "A browser-only draft",
  scenes: [
    {
      id: "local-1",
      title: "Entry",
      image: "entry.jpg",
      imageUrl: "blob:http://example.test/entry",
      initialView: { yaw: 0, pitch: 0 },
      hotspots: [
        {
          id: "to-local-2",
          type: "scene",
          label: "Go to Hall",
          yaw: 12,
          pitch: -4,
          targetSceneId: "local-2"
        }
      ]
    },
    {
      id: "local-2",
      title: "Hall",
      image: "hall.webp",
      imageUrl: "blob:http://example.test/hall",
      initialView: { yaw: 0, pitch: 0 },
      hotspots: []
    }
  ]
};

test("exports local draft tours without browser-only object URLs", () => {
  const exportableTour = createExportableTour(localDraftTour);

  assert.equal(exportableTour.scenes[0].imageUrl, undefined);
  assert.equal(exportableTour.scenes[1].imageUrl, undefined);
  assert.deepEqual(validateTour(exportableTour), { valid: true, errors: [] });
});

test("creates stable JSON with a trailing newline", () => {
  const json = createTourJson(localDraftTour);

  assert.equal(json.endsWith("\n"), true);
  assert.equal(JSON.parse(json).scenes[0].hotspots[0].targetSceneId, "local-2");
});

test("creates safe JSON filenames from tour ids", () => {
  assert.equal(createTourJsonFileName(localDraftTour), "local-upload.tour.json");
  assert.equal(createTourJsonFileName({ id: "", title: "Untitled", scenes: [] }), "tour.tour.json");
});
