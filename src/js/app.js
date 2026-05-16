import { loadTour } from "./tourLoader.js";
import { ensureDefaultRoute, getTourIdFromLocation } from "./router.js";
import { createPanoramaViewer } from "./viewer.js";

const strings = {
  loadError: "The tour could not be loaded.",
  noDescription: "No description provided yet.",
  sceneCount: (count) => `${count} ${count === 1 ? "scene" : "scenes"}`,
  localTourTitle: "Local Insta360 tour",
  localTourDescription: "Browser-only draft from uploaded equirectangular 360 degree photos.",
  noUpload: "Choose one or more stitched Insta360 equirectangular photos to build a local tour.",
  uploadReady: (count) => `${count} local ${count === 1 ? "panorama" : "panoramas"} ready. Add connections as hotspots from the current view.`,
  connectionReady: (source, target) => `Connected ${source} to ${target}.`,
  needsTarget: "Choose another panorama before adding a connection.",
  unsupportedHotspot: "This hotspot type is not interactive in the MVP yet."
};

const elements = {
  viewer: document.querySelector("#viewer"),
  title: document.querySelector("#tour-title"),
  description: document.querySelector("#tour-description"),
  sceneCount: document.querySelector("#scene-count"),
  sceneList: document.querySelector("#scene-list"),
  status: document.querySelector("#status"),
  controls: document.querySelectorAll("[data-pan]"),
  uploadInput: document.querySelector("#panorama-upload"),
  connectTarget: document.querySelector("#connect-target"),
  connectButton: document.querySelector("#connect-button"),
  connectionHint: document.querySelector("#connection-hint")
};

const viewer = createPanoramaViewer(elements.viewer, { onHotspotActivate: handleHotspotActivate });
let activeTour = null;
let activeBasePath = "";
let activeSceneId = "";
let localSceneCounter = 0;

ensureDefaultRoute();
await renderCurrentTour();
window.addEventListener("hashchange", renderCurrentTour);

window.addEventListener("beforeunload", () => viewer.destroy());

elements.controls.forEach((button) => {
  button.addEventListener("click", () => viewer.pan(button.dataset.pan));
});

elements.uploadInput.addEventListener("change", () => {
  const files = [...elements.uploadInput.files].filter((file) => file.type.startsWith("image/"));
  if (files.length === 0) {
    renderStatus(strings.noUpload);
    return;
  }

  const scenes = files.map(createLocalSceneFromFile);
  activeTour = {
    id: "local-upload",
    title: strings.localTourTitle,
    description: strings.localTourDescription,
    scenes
  };
  activeBasePath = "";
  renderTour(activeTour, activeBasePath, scenes[0].id);
  renderStatus(strings.uploadReady(scenes.length));
});

elements.connectButton.addEventListener("click", () => {
  const sourceScene = findActiveScene();
  const targetScene = activeTour?.scenes.find((scene) => scene.id === elements.connectTarget.value);

  if (!sourceScene || !targetScene || sourceScene.id === targetScene.id) {
    renderStatus(strings.needsTarget);
    return;
  }

  const currentView = viewer.getView();
  sourceScene.hotspots = Array.isArray(sourceScene.hotspots) ? sourceScene.hotspots : [];
  sourceScene.hotspots.push({
    id: `to-${targetScene.id}-${Date.now()}`,
    type: "scene",
    label: `Go to ${targetScene.title}`,
    yaw: Math.round(currentView.yaw),
    pitch: Math.round(currentView.pitch),
    targetSceneId: targetScene.id
  });

  viewer.showScene(sourceScene, activeBasePath);
  renderStatus(strings.connectionReady(sourceScene.title, targetScene.title));
});

async function renderCurrentTour() {
  const tourId = getTourIdFromLocation();

  try {
    activeTour = await loadTour(tourId);
    renderTour(activeTour, `public/tours/${activeTour.id}`, activeTour.scenes[0].id);
  } catch (error) {
    renderError(error);
  }
}

function renderTour(tour, basePath, sceneId) {
  const scene = tour.scenes.find((candidate) => candidate.id === sceneId) ?? tour.scenes[0];

  activeTour = tour;
  activeBasePath = basePath;
  activeSceneId = scene.id;
  elements.title.textContent = tour.title;
  elements.description.textContent = tour.description || strings.noDescription;
  elements.sceneCount.textContent = strings.sceneCount(tour.scenes.length);
  renderSceneList(tour, basePath, scene.id);
  renderConnectTargets(tour, scene.id);
  viewer.showScene(scene, basePath);
}

function renderSceneList(tour, basePath, selectedSceneId) {
  elements.sceneList.textContent = "";

  tour.scenes.forEach((scene) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-button";
    button.textContent = scene.title;
    button.setAttribute("aria-pressed", String(scene.id === selectedSceneId));
    button.addEventListener("click", () => selectScene(scene.id, basePath));
    elements.sceneList.append(button);
  });
}

function renderConnectTargets(tour, selectedSceneId) {
  elements.connectTarget.textContent = "";

  tour.scenes
    .filter((scene) => scene.id !== selectedSceneId)
    .forEach((scene) => {
      const option = document.createElement("option");
      option.value = scene.id;
      option.textContent = scene.title;
      elements.connectTarget.append(option);
    });

  const hasTarget = elements.connectTarget.options.length > 0;
  elements.connectTarget.disabled = !hasTarget;
  elements.connectButton.disabled = !hasTarget;
  elements.connectionHint.textContent = hasTarget
    ? "Look toward the doorway or transition point, then connect the current view to another panorama."
    : "Upload at least two panoramas to create a connection.";
}

function selectScene(sceneId, basePath = activeBasePath) {
  const scene = activeTour.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    return;
  }

  activeSceneId = scene.id;
  viewer.showScene(scene, basePath);
  updateActiveSceneButton(scene.id);
  renderConnectTargets(activeTour, scene.id);
}

function handleHotspotActivate(hotspot) {
  if (hotspot.type === "scene") {
    selectScene(hotspot.targetSceneId);
    return;
  }

  if (hotspot.type === "link") {
    window.open(hotspot.url, "_blank", "noopener,noreferrer");
    return;
  }

  renderStatus(hotspot.body || strings.unsupportedHotspot);
}

function updateActiveSceneButton(sceneId) {
  [...elements.sceneList.querySelectorAll(".scene-button")].forEach((button, index) => {
    button.setAttribute("aria-pressed", String(activeTour.scenes[index].id === sceneId));
  });
}

function createLocalSceneFromFile(file) {
  localSceneCounter += 1;
  const imageUrl = URL.createObjectURL(file);
  viewer.registerLocalImageUrl(imageUrl);

  return {
    id: `local-${localSceneCounter}`,
    title: file.name.replace(/\.[^.]+$/, "") || `Panorama ${localSceneCounter}`,
    image: file.name,
    imageUrl,
    initialView: { yaw: 0, pitch: 0 },
    hotspots: []
  };
}

function findActiveScene() {
  return activeTour?.scenes.find((scene) => scene.id === activeSceneId);
}

function renderStatus(message) {
  elements.status.textContent = message;
}

function renderError(error) {
  elements.title.textContent = strings.loadError;
  elements.description.textContent = "Check the tour id in the URL and the JSON file in public/tours.";
  elements.sceneCount.textContent = "Tour error";
  elements.sceneList.textContent = "";
  elements.connectTarget.textContent = "";
  elements.connectTarget.disabled = true;
  elements.connectButton.disabled = true;
  elements.connectionHint.textContent = "Load a tour or upload panoramas to create connections.";
  elements.status.textContent = error.message;
  elements.viewer.textContent = strings.loadError;
  elements.viewer.classList.remove("is-ready");
}
