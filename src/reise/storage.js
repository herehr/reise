// src/reise/storage.js

import { createDefaultState, DEFAULT_VERSION } from "./state.js";

const KEY = "travel_reise_state_v1";

function isAppState(x) {
  return (
    x &&
    x.version === DEFAULT_VERSION &&
    x.settings &&
    x.settings.baseCountry === "AT" &&
    Array.isArray(x.users) &&
    Array.isArray(x.trips)
  );
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    if (!isAppState(parsed)) return createDefaultState();
    return parsed;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}