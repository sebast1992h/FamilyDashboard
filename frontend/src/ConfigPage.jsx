import { useState, useEffect } from "react";
import { fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent, fetchMealPlan, saveMealPlan, deleteMealPlan, fetchNotes, saveNote, deleteNote } from "./api";

// Emoji-Picker für Activity Icons
const commonEmojis = [
  // Haus & Räume
  "🏠", "🍳", "🛋️", "🛏️", "🚿", "🚽", "🧹", "🧺", "💡", "🪟", "🔑", "🪴",
  "🛁", "🧻", "🔧", "🪜", "🧰", "⚡", "🔌", "🌡️", "🖼️", "📺", "🧼", "🏢",
  // Kindergarten & Schule
  "🏫", "🎒", "📚", "📖", "✏️", "🖊️", "✂️", "📝", "📄", "🎓", "👨‍🎓", "👩‍🎓",
  "👨‍🏫", "👩‍🏫", "🧮", "📐", "📏", "🔬", "🧪", "🔭", "🧬", "🎨", "🖌️", "🖍️",
  "🎭", "🎪", "🎯", "🏆", "⭐", "🌟", "📕", "📗", "📘", "📙",
  // Work & Office
  "💼", "💻", "📱", "🖥️", "⌨️", "🖱️", "📋", "📊", "📈", "📉", "🖨️", "📞",
  // Aktivitäten & Sport
  "🏃", "💪", "⚽", "🏀", "🎾", "🏊", "🧗", "🚴", "⛷️", "🎿", "🧘", "🤸",
  // Hobbies & Freizeit
  "🎮", "🎬", "🎵", "🎨", "🎹", "🎸", "🎤", "📻", "🎭", "📸", "📷", "🧩",
  // Transport
  "🚗", "✈️", "🚀", "🚁", "🚂", "🚢", "🚲", "🛴", "🛵", "🏍️", "🚙", "🚕",
  // Natur & Orte
  "🏖️", "🏔️", "🏕️", "🗻", "🌋", "⛰️", "🏜️", "🏝️", "🌊", "⛱️", "🌳", "🌲"
];


const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const meals = ["Morgens", "Mittags", "Abends"];

export default function ConfigPage({ isAuthenticated, onLogin, onBack }) {
  // States für Datenbankdaten
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [editNote, setEditNote] = useState(null);
  
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [editCalendarEvent, setEditCalendarEvent] = useState(null);
  
  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");
  const [editMeal, setEditMeal] = useState(null);

  // States für Konfiguration (lokale Speicherung)
  const [family, setFamily] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [standardItems, setStandardItems] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [config, setConfig] = useState(null);
  const [localConfig, setLocalConfig] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Activity Icons
  const [activityIcons, setActivityIcons] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [newActivity, setNewActivity] = useState("");
  const [newIcon, setNewIcon] = useState("💼");

  // Weekly Icon Copy Configuration
  const [weeklyIconCopyDay, setWeeklyIconCopyDay] = useState(1); // 0=Sonntag, 1=Montag, etc
  const [weeklyIconCopyHour, setWeeklyIconCopyHour] = useState(9);
  const [savingWeeklyConfig, setSavingWeeklyConfig] = useState(false);

  // iCal Sync Configuration
  const [icalSyncIntervalMinutes, setIcalSyncIntervalMinutes] = useState(60);

  // Wetter-Konfiguration
  const [openWeatherApiKey, setOpenWeatherApiKey] = useState("");
  const [weatherLat, setWeatherLat] = useState("53.865");
  const [weatherLon, setWeatherLon] = useState("10.686");
  const [showWeatherKey, setShowWeatherKey] = useState(false);

  // Geburtstags-Vorschau (Tage)
  const [birthdayLookaheadDays, setBirthdayLookaheadDays] = useState(30);

  // Login-Logik
  const [password, setPassword] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [importingIcal, setImportingIcal] = useState(false);
  const [showIcalUrl, setShowIcalUrl] = useState(false);

  const defaultData = {
    "family": [],
    "birthdays": [],
    "grocery": { "standardItems": [] },
    "refreshInterval": 15,
    // Zentrale Sichtbarkeit der Mahlzeitentypen
    "mealVisibility": { "Morgens": true, "Mittags": true, "Abends": true },
    // Todos: wie lange erledigte Todos sichtbar bleiben (in Tagen)
    "todoDaysVisible": 10,
    // Geburtstags-Vorschau (Tage in Zukunft für Banner)
    "birthdayLookaheadDays": 30,
    // Wetter
    "openWeatherApiKey": "",
    "weatherLat": "53.865",
    "weatherLon": "10.686"
  };

  // Daten laden wenn authentifiziert
  useEffect(() => {
    // Immer laden, auch wenn nicht authentifiziert (für Test)
    loadConfigData();
    loadDatabaseData();
    loadActivityIcons();
    loadWeeklyIconCopyConfig();
  }, []);

  async function loadConfigData() {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // Stelle Standardwerte sicher (insbesondere mealVisibility)
        setLocalConfig({
          ...data,
          mealVisibility: data.mealVisibility || { "Morgens": true, "Mittags": true, "Abends": true },
          birthdayLookaheadDays: Number(data.birthdayLookaheadDays ?? defaultData.birthdayLookaheadDays) || defaultData.birthdayLookaheadDays
        });
        setFamily(data.family || []);
        setBirthdays(data.birthdays || []);
        setStandardItems(data.grocery?.standardItems || []);
        setRefreshInterval(data.refreshInterval || 15);
        setIcalUrl(data.icalUrl || "");
        setOpenWeatherApiKey(data.openWeatherApiKey || "");
        setWeatherLat(data.weatherLat || "53.865");
        setWeatherLon(data.weatherLon || "10.686");
        setBirthdayLookaheadDays(
          Number(data.birthdayLookaheadDays ?? defaultData.birthdayLookaheadDays) || defaultData.birthdayLookaheadDays
        );
      } else {
        console.warn("Config not found, using defaults");
        setConfig({ ...defaultData });
        setLocalConfig({ ...defaultData });
        setFamily(defaultData.family);
        setBirthdays(defaultData.birthdays);
        setStandardItems(defaultData.grocery.standardItems);
        setRefreshInterval(defaultData.refreshInterval);
        setOpenWeatherApiKey(defaultData.openWeatherApiKey);
        setWeatherLat(defaultData.weatherLat);
        setWeatherLon(defaultData.weatherLon);
        setBirthdayLookaheadDays(defaultData.birthdayLookaheadDays);
      }
    } catch (e) {
      console.error("Error loading config:", e);
      setConfig({ ...defaultData });
      setLocalConfig({ ...defaultData });
      setOpenWeatherApiKey(defaultData.openWeatherApiKey);
      setWeatherLat(defaultData.weatherLat);
      setWeatherLon(defaultData.weatherLon);
      setBirthdayLookaheadDays(defaultData.birthdayLookaheadDays);
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabaseData() {
    // Notizen laden
    try {
      setNotesLoading(true);
      const notes = await fetchNotes();
      setNotesList(notes);
    } catch (e) {
      setNotesError("Fehler beim Laden der Notizen");
    } finally {
      setNotesLoading(false);
    }

    // Essensplan laden
    try {
      setMealPlanLoading(true);
      const meals = await fetchMealPlan();
      setMealPlan(meals);
    } catch (e) {
      setMealPlanError("Fehler beim Laden des Essensplans");
    } finally {
      setMealPlanLoading(false);
    }

    // Kalender laden
    try {
      setCalendarLoading(true);
      const events = await fetchCalendarEvents();
      setCalendarEvents(events);
    } catch (e) {
      setCalendarError("Fehler beim Laden der Kalendereinträge");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function loadActivityIcons() {
    try {
      const res = await fetch("/api/activity-icons");
      if (res.ok) {
        const icons = await res.json();
        setActivityIcons(icons);
      }
    } catch (e) {
      console.error("Error loading activity icons:", e);
    }
  }

  async function handleAddActivityIcon(e) {
    e.preventDefault();
    if (!newActivity.trim()) {
      alert("Bitte gib eine Tätigkeit ein");
      return;
    }

    try {
      const res = await fetch("/api/activity-icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: newActivity.trim(), icon: newIcon })
      });

      if (res.ok) {
        const icon = await res.json();
        setActivityIcons([...activityIcons, icon]);
        setNewActivity("");
        setNewIcon("💼");
      } else {
        alert("Fehler beim Speichern");
      }
    } catch (e) {
      console.error("Error saving activity icon:", e);
      alert("Fehler: " + e.message);
    }
  }

  async function handleDeleteActivityIcon(id) {
    if (!confirm("Wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/activity-icons/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setActivityIcons(activityIcons.filter(a => a.id !== id));
      } else {
        alert("Fehler beim Löschen");
      }
    } catch (e) {
      console.error("Error deleting activity icon:", e);
      alert("Fehler: " + e.message);
    }
  }

  async function loadWeeklyIconCopyConfig() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        if (data.weeklyIconCopyConfig) {
          const config = typeof data.weeklyIconCopyConfig === 'string' ? JSON.parse(data.weeklyIconCopyConfig) : data.weeklyIconCopyConfig;
          setWeeklyIconCopyDay(Number(config.day) || 1);
          setWeeklyIconCopyHour(Number(config.hour) || 9);
        }
        if (data.icalSyncIntervalMinutes) {
          const minutes = typeof data.icalSyncIntervalMinutes === 'string' ? Number(JSON.parse(data.icalSyncIntervalMinutes)) : Number(data.icalSyncIntervalMinutes);
          setIcalSyncIntervalMinutes(minutes || 60);
        }
      }
    } catch (e) {
      console.error("Error loading weekly icon copy config:", e);
    }
  }



  async function onSaveConfig(newConfig) {
    setLoading(true);
    try {
      // Weekly icon copy config und iCal sync interval hinzufügen
      const configWithExtras = {
        ...newConfig,
        refreshInterval: Number(refreshInterval) || 30,
        weeklyIconCopyConfig: JSON.stringify({ day: Number(weeklyIconCopyDay), hour: Number(weeklyIconCopyHour) }),
        icalSyncIntervalMinutes: Number(icalSyncIntervalMinutes),
        birthdayLookaheadDays: Math.min(365, Math.max(1, Number(birthdayLookaheadDays) || defaultData.birthdayLookaheadDays)),
        openWeatherApiKey,
        weatherLat,
        weatherLon
      };
      
      console.log("Saving config:", JSON.stringify(configWithExtras, null, 2));
      const bodyString = JSON.stringify(configWithExtras);
      console.log("Body string length:", bodyString.length);
      console.log("Body string:", bodyString);
      
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyString
      });
      console.log("Response status:", res.status);
      const responseText = await res.text();
      console.log("Response text:", responseText);
      
      if (res.ok) {
        setConfig(configWithExtras);
        setLocalConfig({ ...configWithExtras });
        // Daten neuladen im Hintergrund (nicht warten)
        loadConfigData().catch(e => console.error("Error reloading config:", e));
        // Flag für Dashboard-Toast setzen
        try { localStorage.setItem('configUpdated', String(Date.now())); } catch {}
        alert("Konfiguration gespeichert!");
      } else {
        alert(`Fehler beim Speichern der Konfiguration: ${res.status} - ${responseText}`);
      }
    } catch (e) {
      console.error("Save config error:", e);
      alert("Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteIcalEvents() {
    if (!confirm("Alle iCal-importierten Events löschen? (Events ohne uid bleiben erhalten)")) {
      return;
    }

    setImportingIcal(true);
    try {
      const res = await fetch("/api/calendar-events/ical", {
        method: "DELETE"
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        alert(`${data.deleted || 0} iCal-Events gelöscht! Jetzt kannst du neu importieren.`);
      } else {
        const text = await res.text();
        alert(`Fehler beim Löschen: ${text}`);
      }
    } catch (e) {
      console.error("Error deleting iCal events:", e);
      alert("Fehler: " + e.message);
    } finally {
      setImportingIcal(false);
    }
  }

  async function handleImportIcal() {
    if (!icalUrl.trim()) {
      alert("Bitte gib eine iCal-URL ein");
      return;
    }

    setImportingIcal(true);
    try {
      const res = await fetch("/api/calendar-events/import-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl: icalUrl.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${data.imported} Events importiert!`);
        // Speichere iCal-URL in Config
        const updatedConfig = { ...localConfig, icalUrl: icalUrl.trim() };
        setLocalConfig(updatedConfig);
        await onSaveConfig(updatedConfig);
      } else {
        alert(`Fehler beim Import: ${data.error}`);
      }
    } catch (e) {
      console.error("Error importing iCal:", e);
      alert("Fehler: " + e.message);
    } finally {
      setImportingIcal(false);
    }
  }

  // Datenbankfunktionen
  async function handleNoteSave(note) {
    try {
      const saved = await saveNote(note);
      setEditNote(null);
      setNotesList(list => {
        const idx = list.findIndex(n => n.id === saved.id);
        if (idx >= 0) {
          const copy = [...list]; copy[idx] = saved; return copy;
        } else {
          return [...list, saved];
        }
      });
    } catch (e) {
      setNotesError("Fehler beim Speichern der Notiz");
    }
  }

  async function handleNoteDelete(id) {
    try {
      await deleteNote(id);
      setNotesList(list => list.filter(n => n.id !== id));
    } catch (e) {
      setNotesError("Fehler beim Löschen der Notiz");
    }
  }

  async function handleMealSave(meal) {
    try {
      const saved = await saveMealPlan(meal);
      setEditMeal(null);
      setMealPlan(list => {
        const idx = list.findIndex(m => m.id === saved.id);
        if (idx >= 0) {
          const copy = [...list]; copy[idx] = saved; return copy;
        } else {
          return [...list, saved];
        }
      });
    } catch (e) {
      setMealPlanError("Fehler beim Speichern des Essensplans");
    }
  }

  async function handleMealDelete(id) {
    try {
      await deleteMealPlan(id);
      setMealPlan(list => list.filter(m => m.id !== id));
    } catch (e) {
      setMealPlanError("Fehler beim Löschen des Essensplans");
    }
  }

  // Konfigurationsfunktionen
  function addFamilyMember() {
    const newMember = { name: "", birthday: "" };
    const updatedFamily = [...family, newMember];
    setFamily(updatedFamily);
    setLocalConfig(prev => ({ ...prev, family: updatedFamily }));
  }

  function updateFamilyMember(index, field, value) {
    const updatedFamily = [...family];
    updatedFamily[index][field] = value;
    setFamily(updatedFamily);
    setLocalConfig(prev => {
      const newConfig = { ...prev, family: updatedFamily };
      console.log("Updated localConfig:", JSON.stringify(newConfig, null, 2));
      return newConfig;
    });
  }

  function deleteFamilyMember(index) {
    const updatedFamily = family.filter((_, i) => i !== index);
    setFamily(updatedFamily);
    setLocalConfig(prev => ({ ...prev, family: updatedFamily }));
  }

  function renderBirthdayPopup() {
    if (editMode !== "birthday") return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-bold mb-4">Geburtstag bearbeiten</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Name:</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editData?.name || ""}
                onChange={e => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block mb-1">Geburtsdatum:</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editData?.date || ""}
                onChange={e => setEditData({ ...editData, date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                const newBirthdays = editData.isNew
                  ? [...birthdays, { name: editData.name, date: editData.date }]
                  : birthdays.map((b, i) => i === editData.index ? { name: editData.name, date: editData.date } : b);
                setBirthdays(newBirthdays);
                setLocalConfig(prev => ({ ...prev, birthdays: newBirthdays }));
                setEditMode(null);
                setEditData(null);
              }}
            >
              Speichern
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => {
                setEditMode(null);
                setEditData(null);
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMealEditPopup() {
    if (!editMeal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-bold mb-4">Gericht bearbeiten</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Tag: {days[editMeal.day]}</label>
            </div>
            <div>
              <label className="block mb-1">Zeit: {meals[editMeal.mealType]}</label>
            </div>
            <div>
              <label className="block mb-1">Gericht:</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editMeal.meal}
                onChange={e => setEditMeal({ ...editMeal, meal: e.target.value })}
                placeholder="z.B. Spaghetti Bolognese"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => handleMealSave(editMeal)}
            >
              Speichern
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => setEditMeal(null)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    if (onLogin(password)) {
      setPassword("");
    } else {
      alert("Falsches Passwort");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="p-8 rounded-lg shadow" style={{ background: 'var(--bg-card)' }}>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>Konfiguration</h1>
          <form onSubmit={handleLoginSubmit}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
              onFocus={e => e.target.style.backgroundColor = '#ffffff'}
              onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
            />
            <button
              type="submit"
              className="w-full p-3 rounded text-white"
              style={{ background: 'var(--accent)' }}
            >
              Anmelden
            </button>
          </form>
          <button
            onClick={onBack}
            className="w-full mt-4 p-3 rounded"
            style={{ background: 'var(--accent2)', color: 'var(--text-main)' }}
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  // Für Testzwecke: Zeige direkt die Konfiguration ohne Authentifizierung
  return (
    <>
      <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>⚙️ Konfiguration - NEUE VERSION!</h1>
          <div className="flex gap-2">
            <button
              onClick={() => onSaveConfig(localConfig)}
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Speichere...' : '💾 Alle Änderungen speichern'}
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded"
              style={{ background: 'var(--accent2)', color: 'var(--text-main)' }}
            >
              Zurück zum Dashboard
            </button>
          </div>
        </div>

        {/* Google iCal */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>📅 Google iCal Kalender</h2>
          <p className="text-sm text-gray-600 mb-3">Gib die URL zu einem öffentlichen Google iCal Kalender ein. Die Events werden automatisch importiert.</p>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm mb-1 font-semibold">iCal URL:</label>
                <input
                  type={showIcalUrl ? "text" : "password"}
                  value={icalUrl}
                  onChange={e => setIcalUrl(e.target.value)}
                  onCopy={e => e.preventDefault()}
                  onContextMenu={e => e.preventDefault()}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="w-full border p-2 rounded"
                  style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                  onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                  onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                />
              </div>
              <button
                onClick={() => setShowIcalUrl(!showIcalUrl)}
                className="px-3 py-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                title={showIcalUrl ? "Verbergen" : "Anzeigen"}
              >
                {showIcalUrl ? "👁️" : "👁️‍🗨️"}
              </button>
              <button
                onClick={handleDeleteIcalEvents}
                disabled={importingIcal}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                title="Alle iCal-Events löschen (zum Neuimport mit korrigierten Zeiten)"
              >
                {importingIcal ? "..." : "🗑️ iCal Events löschen"}
              </button>
              <button
                onClick={handleImportIcal}
                disabled={importingIcal || !icalUrl.trim()}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {importingIcal ? "Importiere..." : "📥 Importieren"}
              </button>
            </div>
          </div>

          {/* iCal Sync Intervall */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>🔄 Auto-Synchronisierung</h3>
            <p className="text-sm text-gray-600 mb-3">
              Der iCal-Kalender wird automatisch synchronisiert. Gib an, wie oft die Synchronisierung stattfinden soll.
            </p>
            <div>
              <label className="block text-sm mb-1 font-semibold">Sync-Intervall (Minuten):</label>
              <input
                type="number"
                min="1"
                max="120"
                value={icalSyncIntervalMinutes}
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= 120) {
                    setIcalSyncIntervalMinutes(val);
                  }
                }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => {
                  const val = Number(e.target.value);
                  if (val < 1) {
                    setIcalSyncIntervalMinutes(1);
                    e.target.value = 1;
                  } else if (val > 120) {
                    setIcalSyncIntervalMinutes(120);
                    e.target.value = 120;
                  }
                  e.target.style.backgroundColor = '#f8fafc';
                }}
                className="w-full border p-2 rounded"
                style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Zulässig: 1-120 Minuten (Standard: 60 Minuten). Wird beim Speichern der Konfiguration übernommen.
              </p>
            </div>
          </div>

          {/* Wetter Konfiguration */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>🌦 Wetter</h3>
            <p className="text-sm text-gray-600 mb-3">OpenWeather API-Key und Koordinaten hinterlegen.</p>
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm mb-1 font-semibold">OpenWeather API Key:</label>
                  <input
                    type={showWeatherKey ? "text" : "password"}
                    value={openWeatherApiKey}
                    onChange={(e) => {
                      setOpenWeatherApiKey(e.target.value);
                      setLocalConfig(prev => ({ ...prev, openWeatherApiKey: e.target.value }));
                    }}
                    placeholder="API Key"
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
                <button
                  onClick={() => setShowWeatherKey(!showWeatherKey)}
                  className="px-3 py-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                  title={showWeatherKey ? "Verbergen" : "Anzeigen"}
                >
                  {showWeatherKey ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1 font-semibold">Breitengrad (lat):</label>
                  <input
                    type="text"
                    value={weatherLat}
                    onChange={(e) => {
                      setWeatherLat(e.target.value);
                      setLocalConfig(prev => ({ ...prev, weatherLat: e.target.value }));
                    }}
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-semibold">Längengrad (lon):</label>
                  <input
                    type="text"
                    value={weatherLon}
                    onChange={(e) => {
                      setWeatherLon(e.target.value);
                      setLocalConfig(prev => ({ ...prev, weatherLon: e.target.value }));
                    }}
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Wenn kein Key gesetzt ist, liefert die Wetter-API einen Fehler.</p>
            </div>
          </div>
        </div>

        {/* Dashboard Auto-Refresh Einstellung */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🔄 Dashboard Auto-Refresh</h2>
          <p className="text-sm text-gray-600 mb-3">Wie oft sollen Daten automatisch aktualisiert werden? (in Sekunden)</p>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-semibold">Aktualisierungsintervall:</label>
            <input
              type="number"
              min="5"
              max="300"
              step="5"
              value={refreshInterval}
              onChange={(e) => {
                const value = Math.max(5, parseInt(e.target.value) || 30);
                setRefreshInterval(value);
                setLocalConfig(prev => ({ ...prev, refreshInterval: value }));
              }}
              className="w-20 px-3 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
            <span className="text-sm text-gray-400">Sekunden</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Der Dashboard wird diese Werte alle X Sekunden aktualisieren. Mindestwert: 5 Sekunden, Höchstwert: 300 Sekunden.</p>
        </div>

        {/* Familienmitglieder */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>👨‍👩‍👧‍👦 Familienmitglieder</h2>
          <div className="mb-4">
            <p>Debug: family array length: {family.length}</p>
          </div>
          {family.map((member, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                placeholder="Name"
                value={member.name}
                onChange={e => updateFamilyMember(index, "name", e.target.value)}
                className="border p-2 rounded flex-1"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <input
                type="date"
                value={member.birthday || ""}
                onChange={e => updateFamilyMember(index, "birthday", e.target.value)}
                className="border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <button
                onClick={() => deleteFamilyMember(index)}
                className="bg-red-600 text-white px-3 py-2 rounded"
              >
                Löschen
              </button>
            </div>
          ))}
          <button
            onClick={addFamilyMember}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
          >
            + Familienmitglied hinzufügen
          </button>
        </div>

        {/* Geburtstage */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🎂 Geburtstage</h2>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Vorschau-Tage für Geburtstage (Newsbanner)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={birthdayLookaheadDays}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setBirthdayLookaheadDays(value);
                  setLocalConfig(prev => ({ ...prev, birthdayLookaheadDays: value }));
                }}
                className="border p-2 rounded w-full"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <p className="text-xs text-gray-500 mt-1">Zeitraum 1-365 Tage in die Zukunft, der später im Newsbanner genutzt wird.</p>
            </div>
          </div>
          <div className="mb-4">
            <p>Debug: birthdays array length: {birthdays.length}</p>
          </div>
          <div className="space-y-2 mb-4">
            {birthdays.map((birthday, index) => (
              <div key={index} className="flex justify-between items-center border p-2 rounded">
                <span>{birthday.name} - {birthday.date}</span>
                <div>
                  <button
                    onClick={() => {
                      setEditMode("birthday");
                      setEditData({ ...birthday, index, isNew: false });
                    }}
                    className="text-blue-600 mr-2"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      const newBirthdays = birthdays.filter((_, i) => i !== index);
                      setBirthdays(newBirthdays);
                      setLocalConfig(prev => ({ ...prev, birthdays: newBirthdays }));
                    }}
                    className="text-red-600"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setEditMode("birthday");
              setEditData({ name: "", date: "", isNew: true });
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + Geburtstag hinzufügen
          </button>
        </div>

        {/* Standard-Einkaufsartikel */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🛒 Standard-Einkaufsartikel</h2>
          <div className="mb-4">
            <p>Debug: standardItems array length: {standardItems.length}</p>
          </div>
          {standardItems.length === 0 && (
            <p className="text-gray-500 mb-4">Noch keine Standard-Artikel definiert.</p>
          )}
          {standardItems.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                value={item}
                onChange={e => {
                  const newItems = [...standardItems];
                  newItems[index] = e.target.value;
                  setStandardItems(newItems);
                  setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
                }}
                className="border p-2 rounded flex-1"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <button
                onClick={() => {
                  const newItems = standardItems.filter((_, i) => i !== index);
                  setStandardItems(newItems);
                  setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
                }}
                className="bg-red-600 text-white px-3 py-2 rounded"
              >
                Löschen
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newItems = [...standardItems, ""];
              setStandardItems(newItems);
              setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + Artikel hinzufügen
          </button>
        </div>

        {/* Essensplan Sichtbarkeit */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>🍽 Essensplan – Sichtbarkeit</h2>
          <p className="text-sm text-gray-600 mb-3">Steuere, welche Mahlzeitentypen (Zeilen) in Dashboard und Planungsseite angezeigt werden.</p>
          <div className="flex gap-6">
            {["Morgens", "Mittags", "Abends"].map((mealType) => (
              <label key={mealType} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(localConfig?.mealVisibility?.[mealType])}
                  onChange={() => {
                    const current = localConfig?.mealVisibility || { "Morgens": true, "Mittags": true, "Abends": true };
                    const updated = { ...current, [mealType]: !current[mealType] };
                    setLocalConfig(prev => ({ ...prev, mealVisibility: updated }));
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{mealType}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Änderungen werden mit "Alle Änderungen speichern" übernommen.</p>
        </div>

        {/* Todos Konfiguration */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>✅ Todos – Sichtbarkeitsdauer</h2>
          <p className="text-sm text-gray-600 mb-3">Wie lange sollen erledigte Todos sichtbar bleiben?</p>
          <div className="flex items-center gap-3">
            <label className="text-sm">Tage:</label>
            <input
              type="number"
              min="1"
              max="365"
              value={localConfig?.todoDaysVisible ?? 10}
              onChange={(e) => {
                const value = Math.max(1, parseInt(e.target.value) || 10);
                setLocalConfig(prev => ({ ...prev, todoDaysVisible: value }));
              }}
              className="w-16 px-3 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Erledigte Todos werden diese Anzahl an Tagen mit grünem Häkchen und durchgestrichenem Text angezeigt.</p>
        </div>

        {/* Activity Icons Konfiguration */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🎯 Tätigkeits-Icons</h2>
          <p className="text-sm text-gray-600 mb-4">Ordne Icons/Emojis den Tätigkeiten zu (z.B. 💻 = Büro)</p>

          {/* Formulär zum Hinzufügen */}
          <form onSubmit={handleAddActivityIcon} className="mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(showEmojiPicker === 'main' ? null : 'main')}
                className="text-2xl bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded border-2 border-slate-500 min-w-12 h-12 flex items-center justify-center"
              >
                {newIcon}
              </button>
              <input
                type="text"
                placeholder="z.B. Büro, Schule, Sport..."
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-slate-600 text-slate-100 border border-slate-500 placeholder-slate-400"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold"
              >
                Hinzufügen
              </button>
            </div>

            {/* Emoji-Picker */}
            {showEmojiPicker === 'main' && (
              <div className="bg-slate-600 p-3 rounded-lg grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewIcon(emoji);
                      setShowEmojiPicker(null);
                    }}
                    className="text-2xl hover:bg-slate-500 p-2 rounded cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Liste der Activity Icons */}
          <div className="space-y-2">
            {activityIcons.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Icons hinzugefügt</p>
            ) : (
              activityIcons.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-semibold text-slate-100">{item.activity}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteActivityIcon(item.id)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Löschen
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Wöchentliches Icon-Kopieren konfigurieren */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>⏰ Icons wöchentlich kopieren</h2>
          <p className="text-sm text-gray-300 mb-4">Konfiguriere einen Wochentag und Uhrzeit, um Icons aus der vergangenen Woche automatisch in die nächste Woche zu kopieren.</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Wochentag */}
              <div>
                <label className="block text-sm font-semibold mb-2">Wochentag</label>
                <select
                  value={weeklyIconCopyDay}
                  onChange={(e) => setWeeklyIconCopyDay(parseInt(e.target.value))}
                  className="w-full p-2 bg-slate-700 text-white rounded border border-slate-600"
                >
                  <option value={0}>Sonntag</option>
                  <option value={1}>Montag</option>
                  <option value={2}>Dienstag</option>
                  <option value={3}>Mittwoch</option>
                  <option value={4}>Donnerstag</option>
                  <option value={5}>Freitag</option>
                  <option value={6}>Samstag</option>
                </select>
              </div>

              {/* Stunde */}
              <div>
                <label className="block text-sm font-semibold mb-2">Uhrzeit (Stunde)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={weeklyIconCopyHour}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) val = 0;
                    if (val < 0) val = 0;
                    if (val > 23) val = 23;
                    setWeeklyIconCopyHour(val);
                  }}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0 || val > 23) {
                      setWeeklyIconCopyHour(Math.max(0, Math.min(23, val || 0)));
                    }
                  }}
                  className="w-full p-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
              <p>✓ Kopiert jeden <strong>{["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][weeklyIconCopyDay]}</strong> um <strong>{String(weeklyIconCopyHour).padStart(2, '0')}:00 Uhr</strong></p>
            </div>
          </div>
        </div>

        {/* Test Sektion */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🔧 Test-Bereich</h2>
          <div className="space-y-2">
            <div>Loading: {loading ? 'true' : 'false'}</div>
            <div>IsAuthenticated: {isAuthenticated ? 'true' : 'false'}</div>
            <div>LocalConfig: {localConfig ? 'vorhanden' : 'null'}</div>
            <div>Family length: {family ? family.length : 'undefined'}</div>
            <div>Birthdays length: {birthdays ? birthdays.length : 'undefined'}</div>
            <div>StandardItems length: {standardItems ? standardItems.length : 'undefined'}</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Modals */}
    {renderBirthdayPopup()}
    {renderMealEditPopup()}
    </>
  );
}
