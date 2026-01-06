// src/reise/rates.js
import inlandJson from "../data/perdiem_at_inland.json";
import abroadJson from "../data/perdiem_abroad_at.json";

export function getDailyRate(countryCode, variant) {
  if (countryCode === "AT") {
    return inlandJson.inland.dailyRate;
  }

  const c = abroadJson.countries[countryCode];
  if (!c) throw new Error(`Unknown country: ${countryCode}`);

  if (variant && c.variants && c.variants[variant]) {
    return c.variants[variant].day;
  }

  return c.default.day;
}

export function getLodgingRate(countryCode, variant) {
  if (countryCode === "AT") return null; // we use invoice (Variante A)
  const c = abroadJson.countries[countryCode];
  if (!c) return null;
  if (variant && c.variants && c.variants[variant]) return c.variants[variant].night ?? null;
  return c.default.night ?? null;
}

export function getDiffOptional(countryCode, variant) {
  const c = abroadJson.countries[countryCode];
  if (!c) return null;
  if (variant && c.variants && c.variants[variant]) return c.variants[variant].diff ?? null;
  return c.default.diff ?? null;
}

export function listCountries() {
  return [
    { code: "AT", label: "Österreich" },
    ...Object.entries(abroadJson.countries).map(([code, c]) => ({ code, label: c.label }))
  ];
}

export function listVariants(countryCode) {
  const c = abroadJson.countries[countryCode];
  if (!c?.variants) return [];
  return Object.keys(c.variants);
}