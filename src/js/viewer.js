const PAN_STEP = 12;
const PITCH_STEP = 8;

export function createPanoramaViewer(container) {
  let currentScene = null;
  let view = { yaw: 0, pitch: 0 };

  function showScene(scene, basePath) {
    currentScene = scene;
    view = {
      yaw: scene.initialView?.yaw ?? 0,
      pitch: scene.initialView?.pitch ?? 0
    };

    container.textContent = "";
    container.style.backgroundImage = `url("${basePath}/${scene.image}")`;
    container.classList.add("is-ready");
    container.setAttribute("aria-label", `${scene.title} panorama viewer`);
    renderView();
  }

  function pan(direction) {
    if (!currentScene) {
      return;
    }

    if (direction === "left") {
      view.yaw -= PAN_STEP;
    }
    if (direction === "right") {
      view.yaw += PAN_STEP;
    }
    if (direction === "up") {
      view.pitch = Math.min(90, view.pitch + PITCH_STEP);
    }
    if (direction === "down") {
      view.pitch = Math.max(-90, view.pitch - PITCH_STEP);
    }

    view.yaw = wrapYaw(view.yaw);
    renderView();
  }

  function bindKeyboard() {
    container.addEventListener("keydown", (event) => {
      const keyMap = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
      };
      const direction = keyMap[event.key];

      if (direction) {
        event.preventDefault();
        pan(direction);
      }
    });
  }

  function renderView() {
    const x = 50 + (view.yaw / 360) * 100;
    const y = 50 - (view.pitch / 180) * 100;
    container.style.backgroundPosition = `${x}% ${y}%`;
  }

  bindKeyboard();

  return { showScene, pan };
}

function wrapYaw(value) {
  if (value > 180) {
    return value - 360;
  }
  if (value < -180) {
    return value + 360;
  }
  return value;
}
