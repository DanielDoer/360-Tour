const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"];
const ALLOWED_HOTSPOT_TYPES = ["scene", "link", "info"];

export function validateTour(candidate) {
  const errors = [];

  if (!isPlainObject(candidate)) {
    return { valid: false, errors: ["Tour data must be an object."] };
  }

  validateText(candidate.id, "id", errors);
  validateText(candidate.title, "title", errors);

  if (candidate.description !== undefined && typeof candidate.description !== "string") {
    errors.push("description must be a string when provided.");
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    errors.push("scenes must contain at least one scene.");
    return { valid: errors.length === 0, errors };
  }

  const sceneIds = new Set();
  candidate.scenes.forEach((scene, index) => {
    const prefix = `scenes[${index}]`;

    if (!isPlainObject(scene)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    validateText(scene.id, `${prefix}.id`, errors);
    validateText(scene.title, `${prefix}.title`, errors);
    validateText(scene.image, `${prefix}.image`, errors);

    if (typeof scene.id === "string") {
      if (sceneIds.has(scene.id)) {
        errors.push(`${prefix}.id must be unique.`);
      }
      sceneIds.add(scene.id);
    }

    if (typeof scene.image === "string" && !hasAllowedImageExtension(scene.image)) {
      errors.push(`${prefix}.image must use an allowed image extension.`);
    }

    if (scene.initialView !== undefined) {
      validateInitialView(scene.initialView, `${prefix}.initialView`, errors);
    }

    if (scene.hotspots !== undefined) {
      validateHotspots(scene.hotspots, `${prefix}.hotspots`, errors);
    }
  });

  candidate.scenes.forEach((scene, sceneIndex) => {
    if (!isPlainObject(scene) || !Array.isArray(scene.hotspots)) {
      return;
    }

    scene.hotspots.forEach((hotspot, hotspotIndex) => {
      if (hotspot.type === "scene" && !sceneIds.has(hotspot.targetSceneId)) {
        errors.push(`scenes[${sceneIndex}].hotspots[${hotspotIndex}].targetSceneId must reference an existing scene.`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

function validateHotspots(hotspots, path, errors) {
  if (!Array.isArray(hotspots)) {
    errors.push(`${path} must be an array when provided.`);
    return;
  }

  hotspots.forEach((hotspot, index) => {
    const prefix = `${path}[${index}]`;

    if (!isPlainObject(hotspot)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    validateText(hotspot.id, `${prefix}.id`, errors);
    validateText(hotspot.label, `${prefix}.label`, errors);

    if (!ALLOWED_HOTSPOT_TYPES.includes(hotspot.type)) {
      errors.push(`${prefix}.type must be one of: ${ALLOWED_HOTSPOT_TYPES.join(", ")}.`);
    }

    validateNumber(hotspot.yaw, `${prefix}.yaw`, errors, -180, 180);
    validateNumber(hotspot.pitch, `${prefix}.pitch`, errors, -90, 90);

    if (hotspot.type === "scene") {
      validateText(hotspot.targetSceneId, `${prefix}.targetSceneId`, errors);
    }

    if (hotspot.type === "link") {
      validateHttpUrl(hotspot.url, `${prefix}.url`, errors);
    }

    if (hotspot.type === "info" && typeof hotspot.body !== "string") {
      errors.push(`${prefix}.body must be a string for info hotspots.`);
    }
  });
}

function validateInitialView(initialView, path, errors) {
  if (!isPlainObject(initialView)) {
    errors.push(`${path} must be an object when provided.`);
    return;
  }

  if (initialView.yaw !== undefined) {
    validateNumber(initialView.yaw, `${path}.yaw`, errors, -180, 180);
  }

  if (initialView.pitch !== undefined) {
    validateNumber(initialView.pitch, `${path}.pitch`, errors, -90, 90);
  }
}

function validateText(value, path, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
  }
}

function validateNumber(value, path, errors, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${path} must be a number between ${min} and ${max}.`);
  }
}

function validateHttpUrl(value, path, errors) {
  if (typeof value !== "string") {
    errors.push(`${path} must be an http(s) URL.`);
    return;
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      errors.push(`${path} must use http or https.`);
    }
  } catch {
    errors.push(`${path} must be a valid URL.`);
  }
}

function hasAllowedImageExtension(path) {
  const cleanPath = path.split(/[?#]/)[0].toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((extension) => cleanPath.endsWith(extension));
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
