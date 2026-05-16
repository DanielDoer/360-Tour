export function getTourIdFromLocation(location = window.location) {
  const match = location.hash.match(/^#\/tour\/([a-zA-Z0-9_-]+)$/);
  return match?.[1] ?? "demo";
}

export function ensureDefaultRoute(location = window.location) {
  if (!location.hash) {
    location.hash = "#/tour/demo";
  }
}
