export function createExportableTour(tour) {
  return {
    id: tour.id,
    title: tour.title,
    ...(tour.description ? { description: tour.description } : {}),
    scenes: tour.scenes.map(createExportableScene)
  };
}

export function createTourJson(tour) {
  return `${JSON.stringify(createExportableTour(tour), null, 2)}\n`;
}

export function createTourJsonFileName(tour) {
  const safeId = String(tour.id || "tour")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tour";

  return `${safeId}.tour.json`;
}

function createExportableScene(scene) {
  return {
    id: scene.id,
    title: scene.title,
    image: scene.image,
    ...(scene.initialView ? { initialView: scene.initialView } : {}),
    ...(Array.isArray(scene.hotspots) && scene.hotspots.length > 0 ? { hotspots: scene.hotspots.map(createExportableHotspot) } : {})
  };
}

function createExportableHotspot(hotspot) {
  const exportableHotspot = {
    id: hotspot.id,
    type: hotspot.type,
    label: hotspot.label,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch
  };

  if (hotspot.type === "scene") {
    exportableHotspot.targetSceneId = hotspot.targetSceneId;
  }

  if (hotspot.type === "link") {
    exportableHotspot.url = hotspot.url;
  }

  if (hotspot.type === "info") {
    exportableHotspot.body = hotspot.body;
  }

  return exportableHotspot;
}
