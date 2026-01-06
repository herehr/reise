// src/reise/state.js

export const DEFAULT_VERSION = 1;

export const COUNTRY_CODES = ["AT", "DE", "CZ", "SK", "CH"];

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function createDefaultUser(name = "User 1") {
  return { id: uid("user"), name };
}

export function toLocalISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function createDefaultTrip(userId) {
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return {
    id: uid("trip"),
    userId,
    startISO: toLocalISO(now),
    endISO: toLocalISO(in2h),

    // destination (AT = inland)
    country: "AT",
    variant: null, // e.g. "Grenzort", "Bratislava", ...

    purpose: "",
    applyDiff: false, // optional "Differenz-Aufwendungen"
    lodgingAmount: 0, // Variante A: invoice amount

    isOk: false,
    createdAtISO: new Date().toISOString(),
  };
}

export function createDefaultState() {
  const u1 = createDefaultUser("User 1");
  return {
    version: DEFAULT_VERSION,
    settings: { baseCountry: "AT" },
    users: [u1],
    trips: [],
  };
}