import { validateTour } from "./tourSchema.js";

export async function loadTour(tourId) {
  const safeTourId = normalizeTourId(tourId);
  const response = await fetch(`public/tours/${safeTourId}/tour.json`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Could not load tour "${safeTourId}" (${response.status}).`);
  }

  const tour = await response.json();
  const result = validateTour(tour);

  if (!result.valid) {
    throw new Error(`Tour "${safeTourId}" is invalid: ${result.errors.join(" ")}`);
  }

  return tour;
}

export function normalizeTourId(value) {
  const fallback = "demo";

  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return normalized || fallback;
}
