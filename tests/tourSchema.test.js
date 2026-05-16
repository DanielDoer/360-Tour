import assert from "node:assert/strict";
import test from "node:test";
import { validateTour } from "../src/js/tourSchema.js";

const validTour = {
  id: "demo",
  title: "Demo",
  description: "A valid tour",
  scenes: [
    {
      id: "a",
      title: "Scene A",
      image: "images/a.jpg",
      initialView: { yaw: 0, pitch: 0 },
      hotspots: [
        {
          id: "to-b",
          type: "scene",
          label: "Go to B",
          yaw: 10,
          pitch: 5,
          targetSceneId: "b"
        }
      ]
    },
    {
      id: "b",
      title: "Scene B",
      image: "images/b.webp"
    }
  ]
};

test("accepts a valid static tour", () => {
  assert.deepEqual(validateTour(validTour), { valid: true, errors: [] });
});

test("rejects scene hotspots that target missing scenes", () => {
  const result = validateTour({
    ...validTour,
    scenes: [
      {
        ...validTour.scenes[0],
        hotspots: [{ ...validTour.scenes[0].hotspots[0], targetSceneId: "missing" }]
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /targetSceneId must reference an existing scene/);
});

test("rejects unsupported image extensions", () => {
  const result = validateTour({
    ...validTour,
    scenes: [{ ...validTour.scenes[0], image: "images/a.gif" }]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /allowed image extension/);
});

test("rejects unsafe link hotspot protocols", () => {
  const result = validateTour({
    ...validTour,
    scenes: [
      {
        ...validTour.scenes[0],
        hotspots: [
          {
            id: "bad-link",
            type: "link",
            label: "Bad link",
            yaw: 0,
            pitch: 0,
            url: "javascript:alert(1)"
          }
        ]
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must use http or https/);
});
