import { loadTour } from "./tourLoader.js";
import { ensureDefaultRoute, getTourIdFromLocation } from "./router.js";
import { createPanoramaViewer } from "./viewer.js";

const strings = {
  loadError: "The tour could not be loaded.",
  noDescription: "No description provided yet.",
  sceneCount: (count) => `${count} ${count === 1 ? "scene" : "scenes"}`
};

const elements = {
  viewer: document.querySelector("#viewer"),
  title: document.querySelector("#tour-title"),
  description: document.querySelector("#tour-description"),
  sceneCount: document.querySelector("#scene-count"),
  sceneList: document.querySelector("#scene-list"),
  status: document.querySelector("#status"),
  controls: document.querySelectorAll("[data-pan]")
};

const viewer = createPanoramaViewer(elements.viewer);
let activeTour = null;

ensureDefaultRoute();
await renderCurrentTour();
window.addEventListener("hashchange", renderCurrentTour);

elements.controls.forEach((button) => {
  button.addEventListener("click", () => viewer.pan(button.dataset.pan));
});

async function renderCurrentTour() {
  const tourId = getTourIdFromLocation();

  try {
    activeTour = await loadTour(tourId);
    renderTour(activeTour, `public/tours/${activeTour.id}`);
  } catch (error) {
    renderError(error);
  }
}

function renderTour(tour, basePath) {
  const firstScene = tour.scenes[0];

  elements.title.textContent = tour.title;
  elements.description.textContent = tour.description || strings.noDescription;
  elements.sceneCount.textContent = strings.sceneCount(tour.scenes.length);
  elements.status.textContent = "";
  renderSceneList(tour, basePath, firstScene.id);
  viewer.showScene(firstScene, basePath);
}

function renderSceneList(tour, basePath, activeSceneId) {
  elements.sceneList.textContent = "";

  tour.scenes.forEach((scene) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-button";
    button.textContent = scene.title;
    button.setAttribute("aria-pressed", String(scene.id === activeSceneId));
    button.addEventListener("click", () => {
      viewer.showScene(scene, basePath);
      updateActiveSceneButton(scene.id);
    });
    elements.sceneList.append(button);
  });
}

function updateActiveSceneButton(sceneId) {
  [...elements.sceneList.querySelectorAll(".scene-button")].forEach((button, index) => {
    button.setAttribute("aria-pressed", String(activeTour.scenes[index].id === sceneId));
  });
}

function renderError(error) {
  elements.title.textContent = strings.loadError;
  elements.description.textContent = "Check the tour id in the URL and the JSON file in public/tours.";
  elements.sceneCount.textContent = "Tour error";
  elements.sceneList.textContent = "";
  elements.status.textContent = error.message;
  elements.viewer.textContent = strings.loadError;
  elements.viewer.classList.remove("is-ready");
  elements.viewer.style.backgroundImage = "";
}
