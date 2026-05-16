const PAN_STEP = 12;
const PITCH_STEP = 8;
const FIELD_OF_VIEW = 85;
const HOTSPOT_VISIBILITY_LIMIT = 95;
const DRAG_SENSITIVITY = 0.22;

export function createPanoramaViewer(container, options = {}) {
  const canvas = document.createElement("canvas");
  const hotspotLayer = document.createElement("div");
  const status = document.createElement("p");
  const renderer = createSphereRenderer(canvas);
  const localTextureUrls = new Set();
  let resizeObserver = null;
  let currentScene = null;
  let currentImageUrl = "";
  let currentHotspots = [];
  let view = { yaw: 0, pitch: 0 };
  let activePointer = null;
  let lastPointer = null;

  canvas.className = "panorama-canvas";
  canvas.setAttribute("aria-hidden", "true");
  hotspotLayer.className = "hotspot-layer";
  status.className = "viewer-message";

  container.textContent = "";
  container.append(canvas, hotspotLayer, status);

  function showScene(scene, basePath = "") {
    ensureSurface();
    currentScene = scene;
    currentHotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    view = {
      yaw: scene.initialView?.yaw ?? 0,
      pitch: scene.initialView?.pitch ?? 0
    };

    const nextImageUrl = resolveSceneImage(scene, basePath);
    currentImageUrl = nextImageUrl;
    status.textContent = "Loading panorama…";
    container.classList.add("is-ready");
    container.setAttribute("aria-label", `${scene.title} 360 degree panorama viewer`);

    renderer.loadTexture(nextImageUrl).then(
      () => {
        if (currentImageUrl !== nextImageUrl) {
          return;
        }
        status.textContent = "";
        renderView();
      },
      () => {
        if (currentImageUrl !== nextImageUrl) {
          return;
        }
        status.textContent = "The panorama image could not be loaded.";
      }
    );

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
      view.pitch = clampPitch(view.pitch + PITCH_STEP);
    }
    if (direction === "down") {
      view.pitch = clampPitch(view.pitch - PITCH_STEP);
    }

    view.yaw = wrapYaw(view.yaw);
    renderView();
  }

  function getView() {
    return { ...view };
  }

  function registerLocalImageUrl(url) {
    localTextureUrls.add(url);
  }

  function destroy() {
    resizeObserver?.disconnect();
    localTextureUrls.forEach((url) => URL.revokeObjectURL(url));
    renderer.destroy();
  }

  function ensureSurface() {
    if (canvas.parentElement !== container || hotspotLayer.parentElement !== container || status.parentElement !== container) {
      container.textContent = "";
      container.append(canvas, hotspotLayer, status);
    }
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

  function bindPointerNavigation() {
    container.addEventListener("pointerdown", (event) => {
      if (!currentScene || event.target.closest(".hotspot-button")) {
        return;
      }

      activePointer = event.pointerId;
      lastPointer = { x: event.clientX, y: event.clientY };
      container.setPointerCapture(event.pointerId);
      container.classList.add("is-dragging");
    });

    container.addEventListener("pointermove", (event) => {
      if (activePointer !== event.pointerId || !lastPointer) {
        return;
      }

      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      view.yaw = wrapYaw(view.yaw - deltaX * DRAG_SENSITIVITY);
      view.pitch = clampPitch(view.pitch + deltaY * DRAG_SENSITIVITY);
      renderView();
    });

    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
  }

  function endDrag(event) {
    if (activePointer !== event.pointerId) {
      return;
    }

    activePointer = null;
    lastPointer = null;
    container.releasePointerCapture(event.pointerId);
    container.classList.remove("is-dragging");
  }

  function bindResize() {
    resizeObserver = new ResizeObserver(renderView);
    resizeObserver.observe(container);
  }

  function renderView() {
    renderer.render(view);
    renderHotspots();
    options.onViewChange?.(getView());
  }

  function renderHotspots() {
    hotspotLayer.textContent = "";

    currentHotspots.forEach((hotspot) => {
      const position = projectHotspot(hotspot, view, container.clientWidth, container.clientHeight);
      if (!position.visible) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "hotspot-button";
      button.textContent = hotspot.label;
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      button.addEventListener("click", () => options.onHotspotActivate?.(hotspot));
      hotspotLayer.append(button);
    });
  }

  bindKeyboard();
  bindPointerNavigation();
  bindResize();

  return { showScene, pan, getView, registerLocalImageUrl, destroy };
}

function createSphereRenderer(canvas) {
  let gl = canvas.getContext("webgl", { antialias: true, alpha: false });
  let program = null;
  let positionBuffer = null;
  let texture = null;
  let textureImage = null;

  if (gl) {
    try {
      program = createProgram(gl);
      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (error) {
      console.warn("WebGL panorama renderer unavailable; falling back to flat panorama panning.", error);
      gl = null;
    }
  }

  function loadTexture(url) {
    if (!gl || !program) {
      canvas.style.backgroundImage = `url("${url}")`;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        textureImage = image;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        resolve();
      };
      image.onerror = reject;
      image.src = url;
    });
  }

  function render(view) {
    resizeCanvas(canvas);

    if (!gl || !program || !textureImage) {
      canvas.style.backgroundPosition = `${50 + (view.yaw / 360) * 100}% ${50 - (view.pitch / 180) * 100}%`;
      return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.12, 0.16, 0.22, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(gl.getUniformLocation(program, "u_yaw"), toRadians(view.yaw));
    gl.uniform1f(gl.getUniformLocation(program, "u_pitch"), toRadians(view.pitch));
    gl.uniform1f(gl.getUniformLocation(program, "u_fov"), toRadians(FIELD_OF_VIEW));
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_panorama"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function destroy() {
    if (!gl) {
      return;
    }
    gl.deleteTexture(texture);
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
  }

  return { loadTexture, render, destroy };
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 a_position;
    varying vec2 v_position;

    void main() {
      v_position = a_position;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `);

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;

    uniform sampler2D u_panorama;
    uniform vec2 u_resolution;
    uniform float u_yaw;
    uniform float u_pitch;
    uniform float u_fov;
    varying vec2 v_position;

    mat3 rotateX(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
    }

    mat3 rotateY(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
    }

    void main() {
      float aspect = u_resolution.x / u_resolution.y;
      float scale = tan(u_fov * 0.5);
      vec3 direction = normalize(vec3(v_position.x * aspect * scale, v_position.y * scale, -1.0));
      direction = rotateY(u_yaw) * rotateX(u_pitch) * direction;

      float longitude = atan(direction.x, -direction.z);
      float latitude = asin(clamp(direction.y, -1.0, 1.0));
      vec2 uv = vec2(0.5 + longitude / 6.28318530718, 0.5 - latitude / 3.14159265359);
      gl_FragColor = texture2D(u_panorama, uv);
    }
  `);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

function resizeCanvas(canvas) {
  const displayWidth = Math.max(1, canvas.clientWidth);
  const displayHeight = Math.max(1, canvas.clientHeight);
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(displayWidth * scale);
  const height = Math.round(displayHeight * scale);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function projectHotspot(hotspot, view, width, height) {
  if (!width || !height) {
    return { visible: false, x: 0, y: 0 };
  }

  const yawDelta = shortestAngle(hotspot.yaw - view.yaw);
  const pitchDelta = hotspot.pitch - view.pitch;

  if (Math.abs(yawDelta) > HOTSPOT_VISIBILITY_LIMIT || Math.abs(pitchDelta) > HOTSPOT_VISIBILITY_LIMIT) {
    return { visible: false, x: 0, y: 0 };
  }

  const aspect = width / height;
  const horizontalFov = FIELD_OF_VIEW * aspect;
  const x = 50 + (yawDelta / horizontalFov) * 100;
  const y = 50 - (pitchDelta / FIELD_OF_VIEW) * 100;

  return {
    visible: x >= -10 && x <= 110 && y >= -10 && y <= 110,
    x,
    y
  };
}

function resolveSceneImage(scene, basePath) {
  if (scene.imageUrl) {
    return scene.imageUrl;
  }

  return `${basePath}/${scene.image}`;
}

function shortestAngle(value) {
  return wrapYaw(value);
}

function wrapYaw(value) {
  let wrapped = value;
  while (wrapped > 180) {
    wrapped -= 360;
  }
  while (wrapped < -180) {
    wrapped += 360;
  }
  return wrapped;
}

function clampPitch(value) {
  return Math.max(-89, Math.min(89, value));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
