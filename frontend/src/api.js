

function getApiUrl() {
  // Im lokalen Netz: IP des Hosts automatisch verwenden
  const { hostname } = window.location;
  // Wenn localhost oder 127.0.0.1, dann wie gehabt
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/config";
  }
  // Sonst: IP-Adresse des Hosts verwenden
  return `http://${hostname}:4000/api/config`;
}

const API_URL = getApiUrl();

export async function fetchDashboardConfig() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Fehler beim Laden der Dashboard-Daten");
  return await res.json();
}

export async function saveDashboardConfig(config) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error("Fehler beim Speichern der Dashboard-Daten");
  return await res.json();
}


// iCal-Termine vom Backend holen
function getCalendarApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/calendar";
  }
  return `http://${hostname}:4000/api/calendar`;
}

export async function fetchIcalEvents() {
  const res = await fetch(getCalendarApiUrl());
  if (!res.ok) throw new Error("Fehler beim Laden der Kalender-Termine");
  return await res.json(); // Erwartet: Array[7] mit Events pro Tag
}
