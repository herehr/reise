import "./style.css";

import { loadState, saveState } from "./reise/storage.js";
import { calcTripPerDiem } from "./reise/calc.js";
import { listCountries, listVariants, getDailyRate, getDiffOptional } from "./reise/rates.js";
import { createDefaultTrip, createDefaultUser } from "./reise/state.js";

let state = loadState();
if (!state.users?.length) state.users = [createDefaultUser("User 1")];
if (!state.settings) state.settings = { baseCountry: "AT" };
saveState(state);

// current user selection persisted in localStorage
const UI_KEY = "travel_ui_v1";
function loadUI() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveUI(ui) {
  localStorage.setItem(UI_KEY, JSON.stringify(ui));
}

let ui = loadUI();
let currentUserId =
  ui.currentUserId && state.users.some((u) => u.id === ui.currentUserId)
    ? ui.currentUserId
    : state.users[0].id;

let trip = createDefaultTrip(currentUserId);

function setCurrentUser(userId) {
  currentUserId = userId;
  ui.currentUserId = userId;
  saveUI(ui);
  trip = createDefaultTrip(currentUserId);
  render();
}

function getCurrentUser() {
  return state.users.find((u) => u.id === currentUserId);
}

function toLocalISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function computeTripRow(t) {
  const label = `${t.country}${t.variant ? " – " + t.variant : ""}`;
  const rate = getDailyRate(t.country, t.variant);

  let perDiem = 0;
  try {
    perDiem = calcTripPerDiem(t.startISO, t.endISO, rate).total;
  } catch {
    perDiem = 0;
  }

  const lodg = Number(t.lodgingAmount || 0);
  const diffVal = t.country === "AT" ? null : getDiffOptional(t.country, t.variant);
  const diff = t.applyDiff && diffVal ? diffVal : 0;

  const sum = Math.round((perDiem + lodg + diff) * 100) / 100;

  return { label, start: t.startISO, end: t.endISO, purpose: t.purpose || "", perDiem, lodg, diff, sum };
}

function render() {
  const app = document.querySelector("#app");

  const countries = listCountries();
  const variants = trip.country === "AT" ? [] : listVariants(trip.country);

  const dailyRate = getDailyRate(trip.country, trip.variant);
  const diffValue = trip.country === "AT" ? null : getDiffOptional(trip.country, trip.variant);

  let calcResult = null;
  let calcError = null;

  try {
    calcResult = calcTripPerDiem(trip.startISO, trip.endISO, dailyRate);
  } catch (e) {
    calcError = e?.message || String(e);
  }

  const totalPerDiem = calcResult ? calcResult.total : 0;
  const lodging = Number(trip.lodgingAmount || 0);
  const diffApplied = trip.applyDiff && diffValue ? diffValue : 0;
  const grandTotal = Math.round((totalPerDiem + lodging + diffApplied) * 100) / 100;

  const currentUser = getCurrentUser();
  const userTrips = state.trips.filter((t) => t.userId === currentUserId);

  const okTrips = userTrips.filter((t) => t.isOk);
  const okRows = okTrips.map(computeTripRow);
  const okTotal = Math.round(okRows.reduce((a, r) => a + r.sum, 0) * 100) / 100;

  app.innerHTML = `
    <div class="container">
      <h1>Travel – Diäten</h1>

      <div class="card">
        <h2>Reisender</h2>

        <div class="grid">
          <label>
            User auswählen
            <select id="userSelect">
              ${state.users
                .map(
                  (u) =>
                    `<option value="${u.id}" ${u.id === currentUserId ? "selected" : ""}>${escapeHtml(u.name)}</option>`
                )
                .join("")}
            </select>
          </label>

          <label>
            Name bearbeiten
            <input id="userName" type="text" value="${escapeHtml(currentUser?.name || "")}" />
          </label>

          <div class="actions">
            <button id="addUser" ${state.users.length >= 5 ? "disabled" : ""}>+ User hinzufügen</button>
          </div>

          <p class="muted full">Max. 5 User – gespeichert im Browser (LocalStorage).</p>
        </div>
      </div>

      <div class="card">
        <h2>Reise</h2>

        <div class="grid">
          <label>
            Start (Datum/Uhrzeit)
            <input id="startISO" type="datetime-local" step="300" value="${trip.startISO}" />
          </label>

          <label>
            Ende (Datum/Uhrzeit)
            <input id="endISO" type="datetime-local" step="300" value="${trip.endISO}" />
          </label>

          <div class="quick full">
            <button type="button" id="startNow">Start: jetzt</button>
            <button type="button" id="endNow">Ende: jetzt</button>
            <button type="button" id="endPlus1h">Ende: +1h</button>
            <button type="button" id="endPlus8h">Ende: +8h</button>
          </div>

          <label>
            Zielland
            <select id="country">
              ${countries
                .map(
                  (c) =>
                    `<option value="${c.code}" ${c.code === trip.country ? "selected" : ""}>${escapeHtml(c.label)}</option>`
                )
                .join("")}
            </select>
          </label>

          <label>
            Sonderort
            <select id="variant" ${variants.length ? "" : "disabled"}>
              <option value="">(kein)</option>
              ${variants
                .map(
                  (v) =>
                    `<option value="${escapeHtml(v)}" ${v === (trip.variant || "") ? "selected" : ""}>${escapeHtml(
                      v
                    )}</option>`
                )
                .join("")}
            </select>
          </label>

          <label class="full">
            Zweck der Reise
            <input id="purpose" type="text" placeholder="z.B. Kundentermin, Workshop..." value="${escapeHtml(
              trip.purpose || ""
            )}" />
          </label>

          <label>
            Nächtigung (Rechnung, €)
            <input id="lodgingAmount" type="number" step="0.01" min="0" value="${lodging}" />
          </label>

          <label class="checkbox">
            <input id="applyDiff" type="checkbox" ${trip.applyDiff ? "checked" : ""} ${diffValue ? "" : "disabled"} />
            Differenz-Aufwendungen ansetzen ${diffValue ? `( +${diffValue} € )` : "(n/a)"}
          </label>
        </div>

        <div class="info">
          <div><b>User:</b> ${escapeHtml(currentUser?.name || "")}</div>
          <div><b>Tagessatz:</b> ${dailyRate} €</div>
          <div><b>Tagesgeld:</b> ${totalPerDiem.toFixed(2)} €</div>
          <div><b>Nächtigung:</b> ${lodging.toFixed(2)} €</div>
          <div><b>Differenz:</b> ${(diffApplied || 0).toFixed(2)} €</div>
          <div class="total"><b>Summe:</b> ${grandTotal.toFixed(2)} €</div>
        </div>

        ${
          calcError
            ? `<p class="error">⚠️ ${escapeHtml(calcError)}</p>`
            : `<details>
                <summary>Details (Chunks)</summary>
                <pre>${escapeHtml(JSON.stringify(calcResult, null, 2))}</pre>
              </details>`
        }

        <div class="actions">
          <button id="saveTrip" ${calcError ? "disabled" : ""}>Reise speichern</button>
        </div>
      </div>

      <div class="card">
        <h2>Gespeicherte Reisen – ${escapeHtml(currentUser?.name || "")}</h2>
        ${
          userTrips.length
            ? `<ul class="list">
                ${userTrips
                  .slice()
                  .reverse()
                  .map((t) => {
                    const r = computeTripRow(t);

                    return `<li>
                      <div class="row">
                        <div>
                          <div class="line1">
                            <label class="ok">
                              <input type="checkbox" data-ok="${t.id}" ${t.isOk ? "checked" : ""} />
                              <b>${escapeHtml(r.label)}</b>
                            </label>
                            <span class="muted">· ${escapeHtml(t.startISO)} → ${escapeHtml(t.endISO)}</span>
                          </div>

                          <div class="muted">${escapeHtml(t.purpose || "")}</div>
                          <div class="muted">Diäten: ${r.perDiem.toFixed(2)} €</div>
                          <div class="muted">Nächtigung: ${r.lodg.toFixed(2)} €</div>
                          <div class="muted">Differenz: ${(r.diff || 0).toFixed(2)} €</div>
                          <div><b>Summe:</b> ${r.sum.toFixed(2)} €</div>
                        </div>

                        <div class="right">
                          <button class="danger" type="button" data-del="${t.id}">Löschen</button>
                        </div>
                      </div>
                    </li>`;
                  })
                  .join("")}
              </ul>`
            : `<p class="muted">Noch keine Reisen für diesen User gespeichert.</p>`
        }
      </div>

      <div class="card">
        <h2>Endabrechnung – nur OK</h2>

        <div class="actions">
          <button id="exportPdf" ${okRows.length ? "" : "disabled"}>PDF exportieren</button>
        </div>

        ${
          okRows.length
            ? `<div class="tableWrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Land</th>
                      <th>Start</th>
                      <th>Ende</th>
                      <th>Zweck</th>
                      <th class="num">Diäten (€)</th>
                      <th class="num">Nächtigung (€)</th>
                      <th class="num">Diff (€)</th>
                      <th class="num">Summe (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${okRows
                      .map(
                        (r) => `<tr>
                          <td>${escapeHtml(r.label)}</td>
                          <td>${escapeHtml(r.start)}</td>
                          <td>${escapeHtml(r.end)}</td>
                          <td>${escapeHtml(r.purpose)}</td>
                          <td class="num">${r.perDiem.toFixed(2)}</td>
                          <td class="num">${r.lodg.toFixed(2)}</td>
                          <td class="num">${(r.diff || 0).toFixed(2)}</td>
                          <td class="num"><b>${r.sum.toFixed(2)}</b></td>
                        </tr>`
                      )
                      .join("")}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="7" class="num"><b>Gesamt</b></td>
                      <td class="num"><b>${okTotal.toFixed(2)}</b></td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
            : `<p class="muted">Markiere Reisen als OK, dann erscheinen sie hier.</p>`
        }
      </div>
    </div>
  `;

  // ---------- helpers ----------
  const onValue = (selector, fn, { renderOnBlur = true } = {}) => {
    const el = app.querySelector(selector);
    if (!el) return;

    el.addEventListener("input", (e) => {
      fn(e.target);
      saveState(state);
    });

    if (renderOnBlur) {
      el.addEventListener("blur", () => render());
    }
  };

  const onChange = (selector, fn) => {
    const el = app.querySelector(selector);
    if (!el) return;

    el.addEventListener("change", (e) => {
      fn(e.target);
      saveState(state);
      render();
    });
  };

  // ---------- User events ----------
  onChange("#userSelect", (el) => setCurrentUser(el.value));

  onValue("#userName", (el) => {
    const u = getCurrentUser();
    if (!u) return;
    u.name = el.value;
  });

  app.querySelector("#addUser")?.addEventListener("click", () => {
    if (state.users.length >= 5) return;
    const newUser = createDefaultUser(`User ${state.users.length + 1}`);
    state.users.push(newUser);
    saveState(state);
    setCurrentUser(newUser.id);
  });

  // ---------- Trip events ----------
  onChange("#startISO", (el) => {
    trip.startISO = el.value;
  });

  onChange("#endISO", (el) => {
    trip.endISO = el.value;
  });

  onChange("#country", (el) => {
    trip.country = el.value;
    trip.variant = null;
    trip.applyDiff = false;
  });

  onChange("#variant", (el) => {
    trip.variant = el.value || null;
    trip.applyDiff = false;
  });

  onValue("#purpose", (el) => {
    trip.purpose = el.value;
  });

  onValue("#lodgingAmount", (el) => {
    trip.lodgingAmount = Number(el.value || 0);
  });

  onChange("#applyDiff", (el) => {
    trip.applyDiff = el.checked;
  });

  // ---------- Quick time buttons ----------
  const setStart = (d) => {
    trip.startISO = toLocalISO(d);
    saveState(state);
    render();
  };

  const setEnd = (d) => {
    trip.endISO = toLocalISO(d);
    saveState(state);
    render();
  };

  app.querySelector("#startNow")?.addEventListener("click", () => setStart(new Date()));
  app.querySelector("#endNow")?.addEventListener("click", () => setEnd(new Date()));

  app.querySelector("#endPlus1h")?.addEventListener("click", () => {
    const base = new Date(trip.endISO);
    base.setHours(base.getHours() + 1);
    setEnd(base);
  });

  app.querySelector("#endPlus8h")?.addEventListener("click", () => {
    const base = new Date(trip.endISO);
    base.setHours(base.getHours() + 8);
    setEnd(base);
  });

  // ---------- Save trip ----------
  app.querySelector("#saveTrip")?.addEventListener("click", () => {
    state.trips.push({ ...trip, userId: currentUserId });
    saveState(state);
    trip = createDefaultTrip(currentUserId);
    render();
  });

  // ---------- Delete trip ----------
  app.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      state.trips = state.trips.filter((t) => t.id !== id);
      saveState(state);
      render();
    });
  });

  // ---------- OK checkbox ----------
  app.querySelectorAll("[data-ok]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.getAttribute("data-ok");
      const t = state.trips.find((x) => x.id === id);
      if (!t) return;
      t.isOk = cb.checked;
      saveState(state);
      render();
    });
  });

  // ---------- PDF export (print) ----------
  app.querySelector("#exportPdf")?.addEventListener("click", () => {
    const title = "Reisekostenabrechnung";
    const name = escapeHtml(getCurrentUser()?.name || "");
    const today = new Date().toLocaleDateString("de-AT");

    const rowsHtml = okRows
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.label)}</td>
          <td>${escapeHtml(r.start)}</td>
          <td>${escapeHtml(r.end)}</td>
          <td>${escapeHtml(r.purpose)}</td>
          <td style="text-align:right">${r.perDiem.toFixed(2)}</td>
          <td style="text-align:right">${r.lodg.toFixed(2)}</td>
          <td style="text-align:right">${(r.diff || 0).toFixed(2)}</td>
          <td style="text-align:right"><b>${r.sum.toFixed(2)}</b></td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    h2 { margin: 0 0 14px; font-size: 16px; color: #333; font-weight: 600; }
    .meta { color:#555; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background: #f4f4f4; text-align: left; }
    tfoot td { font-weight: 700; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <h2>${name}</h2>
  <div class="meta">Datum: ${today}</div>

  <table>
    <thead>
      <tr>
        <th>Land</th>
        <th>Start</th>
        <th>Ende</th>
        <th>Zweck</th>
        <th style="text-align:right">Diäten (€)</th>
        <th style="text-align:right">Nächtigung (€)</th>
        <th style="text-align:right">Diff (€)</th>
        <th style="text-align:right">Summe (€)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align:right"><b>Gesamt</b></td>
        <td style="text-align:right"><b>${okTotal.toFixed(2)}</b></td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
  });
}

render();