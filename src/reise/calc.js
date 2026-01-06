// src/reise/calc.js

const MS_HOUR = 60 * 60 * 1000;
const MS_24H = 24 * MS_HOUR;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function ceilHours(hours) {
  return Math.ceil(hours); // "angefangene Stunde"
}

/**
 * Aliquot per diem:
 * - only if hours > 3
 * - 1/12 per started hour
 * - max dailyRate within a 24h block
 */
export function calcAliquotPerDiem(hours, dailyRate) {
  if (hours <= 3) return 0;

  const startedHours = ceilHours(hours);
  const amount = (startedHours * dailyRate) / 12;

  return round2(Math.min(dailyRate, amount));
}

export function splitInto24hChunks(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date/time input");
  }
  if (end <= start) {
    throw new Error("End must be after start");
  }

  const chunks = [];
  let cursor = start;

  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + MS_24H, end.getTime()));
    const hours = (next.getTime() - cursor.getTime()) / MS_HOUR;
    chunks.push({ start: cursor, end: next, hours: round2(hours) });
    cursor = next;
  }

  return chunks;
}

export function calcTripPerDiem(startISO, endISO, dailyRate) {
  const chunksRaw = splitInto24hChunks(startISO, endISO);

  const chunks = chunksRaw.map((c) => ({
    startISO: c.start.toISOString(),
    endISO: c.end.toISOString(),
    hours: c.hours,
    perDiem: calcAliquotPerDiem(c.hours, dailyRate),
  }));

  const total = round2(chunks.reduce((sum, c) => sum + c.perDiem, 0));
  const totalHours = round2(chunks.reduce((sum, c) => sum + c.hours, 0));

  return { total, totalHours, chunks };
}