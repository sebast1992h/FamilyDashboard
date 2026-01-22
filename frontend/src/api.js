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

// iCal Sync-API
function getSyncIcalApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/calendar-events/sync-ical";
  }
  return `http://${hostname}:4000/api/calendar-events/sync-ical`;
}

export async function syncIcalEvents() {
  const res = await fetch(getSyncIcalApiUrl(), { method: "POST" });
  if (!res.ok) throw new Error("Fehler beim Synchronisieren der iCal-Events");
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

// Notizen-API
function getNotesApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/notes";
  }
  return `http://${hostname}:4000/api/notes`;
}

export async function fetchNotes() {
  const res = await fetch(getNotesApiUrl());
  if (!res.ok) throw new Error("Fehler beim Laden der Notizen");
  return await res.json();
}

export async function saveNote({ id, title, content }) {
  const res = await fetch(getNotesApiUrl() + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content })
  });
  if (!res.ok) throw new Error("Fehler beim Speichern der Notiz");
  return await res.json();
}

export async function deleteNote(id) {
  const res = await fetch(getNotesApiUrl() + `/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Fehler beim Löschen der Notiz");
  return await res.json();
}

// To-do-API
function getTodosApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/todos";
  }
  return `http://${hostname}:4000/api/todos`;
}

export async function fetchTodos() {
  const res = await fetch(getTodosApiUrl());
  if (!res.ok) throw new Error("Fehler beim Laden der To-dos");
  return await res.json();
}

export async function saveTodo({ id, text, done, doneAt, dueDate }) {
  const res = await fetch(getTodosApiUrl() + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, done, doneAt, dueDate })
  });
  if (!res.ok) throw new Error("Fehler beim Speichern des To-dos");
  return await res.json();
}

export async function deleteTodo(id) {
  const res = await fetch(getTodosApiUrl() + `/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Fehler beim Löschen des To-dos");
  return await res.json();
}

// Essensplan-API
function getMealPlanApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/mealplan";
  }
  return `http://${hostname}:4000/api/mealplan`;
}

export async function fetchMealPlan() {
  const res = await fetch(getMealPlanApiUrl());
  if (!res.ok) throw new Error("Fehler beim Laden des Essensplans");
  return await res.json();
}

export async function saveMealPlan(id, meal) {
  // Konvertiere mealType String zu Int (0=Morgens, 1=Mittags, 2=Abends)
  const mealTypeMap = { "Morgens": 0, "Mittags": 1, "Abends": 2 };
  const mealTypeNum = mealTypeMap[meal.mealType] ?? 0;
  
  const payload = { date: meal.date, mealType: mealTypeNum, meal: meal.meal, recipeUrl: meal.recipeUrl || null };
  console.log("Saving meal:", { id, payload });
  
  const res = await fetch(getMealPlanApiUrl() + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  console.log("Save response:", { status: res.status, data });
  
  if (!res.ok) {
    throw new Error(data.error || `Fehler beim Speichern des Essensplans (${res.status})`);
  }
  return data;
}

export async function deleteMealPlan(id) {
  const res = await fetch(getMealPlanApiUrl() + `/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Fehler beim Löschen des Essensplans");
  return await res.json();
}

// Kalender-API
function getCalendarEventsApiUrl() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000/api/calendar-events";
  }
  return `http://${hostname}:4000/api/calendar-events`;
}

export async function fetchCalendarEvents({ day } = {}) {
  let url = getCalendarEventsApiUrl();
  if (day) url += `?day=${encodeURIComponent(day)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fehler beim Laden der Kalendereinträge");
  return await res.json();
}

export async function saveCalendarEvent({ id, summary, location, start, end, allDay, uid }) {
  const res = await fetch(getCalendarEventsApiUrl() + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary, location, start, end, allDay, uid })
  });
  if (!res.ok) throw new Error("Fehler beim Speichern des Kalendereintrags");
  return await res.json();
}

export async function deleteCalendarEvent(id) {
  const res = await fetch(getCalendarEventsApiUrl() + `/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Fehler beim Löschen des Kalendereintrags");
  return await res.json();
}
