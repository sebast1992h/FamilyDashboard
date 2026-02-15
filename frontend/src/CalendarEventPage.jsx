import { useState, useEffect, useMemo } from "react";
// Hilfsfunktion für Bild-URLs (wie in ConfigPage/DnDIconPlan)
function getBackendImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  const backendUrl = window.location.origin.includes(':3000')
    ? window.location.origin.replace(':3000', ':4000')
    : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000');
  if (url.startsWith('/uploads/')) return backendUrl + url;
  return url;
}
import { fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from "./api";
import { normalizeSvgForFont } from "./iconUtils_fixed";

// Helper: lokale YYYY-MM-DD Darstellung ohne UTC-Shift
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarEventPage({ onBack }) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [editEvent, setEditEvent] = useState(null);
  const [family, setFamily] = useState([]);
  const [config, setConfig] = useState(null);
  const [activityIcons, setActivityIcons] = useState([]);
  const [selectedIcons, setSelectedIcons] = useState({}); // {dateStr: {personName: [iconIds]}}
  const [dayActivityIcons, setDayActivityIcons] = useState({}); // {dateStr: {personName: [iconIds]}}
  // Wochenstart (Montag) für Navigation
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    const diff = dow === 0 ? 6 : dow - 1;
    monday.setHours(0,0,0,0);
    monday.setDate(today.getDate() - diff);
    return monday;
  });
  const getCurrentMonday = () => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    const diff = dow === 0 ? 6 : dow - 1;
    monday.setHours(0,0,0,0);
    monday.setDate(today.getDate() - diff);
    return monday;
  };
  // Familienliste normalisieren und "Sonstiges" ergänzen
  const normalizedFamily = useMemo(() => 
    (family || []).map(name => (name || "").trim()).filter(Boolean),
    [family]
  );
  const familyWithOther = useMemo(() => 
    [...normalizedFamily, "Sonstiges"],
    [normalizedFamily]
  );
  const resolveOwner = (ev) => {
    const summaryLower = (ev.summary || "").toLowerCase();
    const locationLower = (ev.location || "").toLowerCase();
    for (const name of normalizedFamily) {
      const nameLower = name.toLowerCase();
      const startsWithName = summaryLower.startsWith(nameLower + ":") || summaryLower.startsWith(nameLower + " -") || summaryLower.startsWith(nameLower + " ");
      const containsInLocation = locationLower.includes(nameLower);
      if (startsWithName || containsInLocation) return name;
    }
    return "Sonstiges";
  };
  const classifiedEvents = (calendarEvents || []).map(ev => ({ ...ev, owner: resolveOwner(ev) }));
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  const isPastDay = (date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const t = new Date();
    t.setHours(0,0,0,0);
    return d < t;
  };
  const isIcalEvent = (ev) => Boolean(ev && ev.uid);

  // Konfiguration laden
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          const familyNames = (data.family || []).map(member => typeof member === 'string' ? member : member.name);
          setFamily(familyNames);
        }
      } catch (e) {
        console.error("Error loading config:", e);
      }
    }
    loadConfig();
  }, []);

  // Activity Icons laden
  useEffect(() => {
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
    loadActivityIcons();
  }, []);

  // Day Activity Icons synchronisieren, wenn editEvent oder dayActivityIcons sich ändern
  useEffect(() => {
    if (editEvent && editEvent.start) {
      const dateStr = getLocalDateString(new Date(editEvent.start));
      const owner = resolveOwner(editEvent);
      const personIcons = dayActivityIcons[dateStr]?.[owner] || [];
      setSelectedIcons({ [dateStr]: { [owner]: personIcons } });
    }
  }, [editEvent, dayActivityIcons]);

  useEffect(() => {
    async function loadCalendarEvents() {
      setCalendarLoading(true);
      try {
        const data = await fetchCalendarEvents();
        setCalendarEvents(data);
        setCalendarError("");
      } catch (e) {
        setCalendarError("Fehler beim Laden der Kalendereinträge");
      } finally {
        setCalendarLoading(false);
      }
    }
    
    loadCalendarEvents();
    const interval = setInterval(loadCalendarEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-jump zur aktuellen Woche bei Wochenwechsel (z.B. Sonntag -> Montag)
  useEffect(() => {
    const checkWeekChange = () => {
      const currentMonday = getCurrentMonday();
      
      if (weekStart.getTime() !== currentMonday.getTime()) {
        console.log("📅 Woche gewechselt, springe zur aktuellen Woche");
        setWeekStart(currentMonday);
      }
    };

    // Prüfe alle 10 Sekunden
    const interval = setInterval(checkWeekChange, 10000);
    
    return () => clearInterval(interval);
  }, [weekStart]);

  // Lade alle Day Activity Icons für diese Woche pro Person
  useEffect(() => {
    async function loadWeekDayIcons() {
      try {
        const icons = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          const dateStr = getLocalDateString(date);
          icons[dateStr] = {};
          
          for (const person of familyWithOther) {
            const res = await fetch(`/api/day-activity-icons/${dateStr}/${encodeURIComponent(person)}`);
            if (res.ok) {
              const dayIcons = await res.json();
              icons[dateStr][person] = dayIcons.map(icon => icon.activityIconId);
            } else {
              icons[dateStr][person] = [];
            }
          }
        }
        setDayActivityIcons(icons);
      } catch (e) {
        console.error("Error loading week day icons:", e);
      }
    }
    loadWeekDayIcons();
  }, [weekStart, familyWithOther]);

  async function handleCalendarEventSave(event) {
    try {
      const dateStr = getLocalDateString(new Date(event.start));
      const owner = resolveOwner(event);
      const iconIds = selectedIcons[dateStr]?.[owner] || [];
      
      // Prüfen ob der Event Text hat (abzüglich des Präfixes "Name:")
      const eventText = event.summary.replace(owner + ':', '').trim();
      const hasText = eventText.length > 0;
      
      // Nur Event speichern, wenn Text vorhanden ist
      let saved = null;
      if (hasText) {
        saved = await saveCalendarEvent(event);
        setCalendarEvents(list => {
          const idx = list.findIndex(e => e.id === saved.id);
          if (idx >= 0) {
            const copy = [...list]; 
            copy[idx] = saved; 
            return copy;
          } else {
            return [...list, saved];
          }
        });
      } else if (event.id) {
        // Wenn kein Text aber Event existiert schon, lösche es
        await deleteCalendarEvent(event.id);
        setCalendarEvents(list => list.filter(e => e.id !== event.id));
      }
      
      // Icons immer speichern (auch ohne Text)
      await fetch(`/api/day-activity-icons/${dateStr}/${encodeURIComponent(owner)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityIconIds: iconIds })
      });
      
      // Update dayActivityIcons state
      setDayActivityIcons(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [owner]: iconIds
        }
      }));
      
      setEditEvent(null);
      setCalendarError("");
    } catch (e) {
      console.error("Save error:", e);
      setCalendarError(e.message || "Fehler beim Speichern des Kalendereintrags");
    }
  }

  async function handleCalendarEventDelete(id) {
    try {
      await deleteCalendarEvent(id);
      setCalendarEvents(list => list.filter(e => e.id !== id));
      setCalendarError("");
    } catch (e) {
      console.error("Delete error:", e);
      setCalendarError(e.message || "Fehler beim Löschen des Kalendereintrags");
    }
  }

  function addEventForMemberDay(memberName, date) {
    const dateStr = getLocalDateString(new Date(date));
    const startIso = `${dateStr}T09:00:00`;
    const endIso = `${dateStr}T10:00:00`;
    setEditEvent({
      summary: `${memberName}: `,
      start: startIso,
      end: endIso
    });
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Zurück zum Dashboard
          </button>
          <h1 className="text-3xl font-bold mt-4" style={{ color: 'var(--accent)' }}>📅 Terminplanung</h1>
        </div>
      </div>

      {calendarError && (
        <div className="text-red-500 p-4 bg-red-50 rounded mb-4">{calendarError}</div>
      )}

      {/* Wochen-Navigation */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() - 7); return d; })}
          className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
          aria-label="Vorherige Woche"
        >
          ←
        </button>
        <div className="text-sm text-gray-300">
          {(() => {
            const start = new Date(weekStart);
            const end = new Date(weekStart);
            end.setDate(start.getDate() + 6);
            const fmt = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            return `${fmt(start)} – ${fmt(end)}`;
          })()}
        </div>
        <button
          onClick={() => setWeekStart(getCurrentMonday())}
          className="px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-600"
        >
          Heute
        </button>
        <button
          onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() + 7); return d; })}
          className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
          aria-label="Nächste Woche"
        >
          →
        </button>
      </div>

      <div className="card">
        {calendarLoading ? (
          <div className="p-4">Lade Kalendereinträge...</div>
        ) : familyWithOther.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Keine Familienmitglieder konfiguriert.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-slate-100" style={{ backgroundColor: '#f1f5f9' }}>Person</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const monday = weekStart;
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    const dateStr = getLocalDateString(date);
                    const todayBg = isToday(date) ? '#78350f' : '#f1f5f9';
                    // ...existing code...
                    return (
                      <th key={i} className="border p-2 bg-slate-100 min-w-40" style={{ backgroundColor: todayBg }}>
                        <div>{['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()]}</div>
                        <div className="text-xs">{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {familyWithOther.map((memberName, memberIndex) => (
                  <tr key={memberIndex}>
                    <td className="border p-2 font-semibold bg-slate-50 min-w-32" style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>{memberName}</td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const monday = weekStart;
                      const date = new Date(monday);
                      date.setDate(monday.getDate() + dayIndex);
                      const dateStr = getLocalDateString(date);
                      
                      const dayEvents = (classifiedEvents || []).filter(ev => {
                        const evStart = new Date(ev.start);
                        const evStartStr = getLocalDateString(evStart);
                        
                        // Für mehrtägige All-Day-Events: prüfe ob der Tag im Zeitraum liegt
                        if (ev.end && ev.allDay) {
                          const evEnd = new Date(ev.end);
                          const checkDate = new Date(date);
                          checkDate.setHours(0, 0, 0, 0);
                          const startDate = new Date(evStart);
                          startDate.setHours(0, 0, 0, 0);
                          const endDate = new Date(evEnd);
                          endDate.setHours(0, 0, 0, 0);
                          
                          return checkDate >= startDate && checkDate < endDate && ev.owner === memberName;
                        }
                        
                        // Für normale Events: nur am Starttag anzeigen
                        return evStartStr === dateStr && ev.owner === memberName;
                      });
                      
                      return (
                        <td key={dayIndex} className="border p-1 align-top min-h-32 relative" style={{ backgroundColor: isToday(date) ? '#2d2416' : '#232526', color: isToday(date) ? '#d97706' : 'inherit' }}>
                          <div className="text-xs space-y-1 pb-6">
                            {/* Activity Icons für diese Person an diesem Tag */}
                            {(dayActivityIcons[dateStr]?.[memberName] || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {dayActivityIcons[dateStr][memberName].map((iconId) => {
                                  const icon = activityIcons.find(a => a.id === iconId);
                                  if (!icon) return null;
                                  // Prefer iconSvg if present (DB SVG string)
                                  if (icon.iconSvg && icon.iconSvg.trim().startsWith('<svg')) {
                                    return (
                                      <span
                                        key={iconId}
                                        title={icon.activity}
                                        className="text-5xl inline-block align-middle"
                                        style={{ verticalAlign: 'middle' }}
                                        dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(icon.iconSvg) }}
                                      />
                                    );
                                  } else if (icon.iconType === 'image' && icon.iconValue) {
                                    const imageUrl = getBackendImageUrl(icon.iconValue);
                                    return (
                                      <img
                                        key={iconId}
                                        src={imageUrl}
                                        alt={icon.activity}
                                        title={icon.activity}
                                        className="w-10 h-10 object-contain rounded border border-slate-500 align-middle inline-block"
                                        style={{ verticalAlign: 'middle' }}
                                      />
                                    );
                                  } else if (icon.iconType === 'icon' && icon.iconValue) {
                                    // Fallback: render iconValue as SVG string if present
                                    return (
                                      <span
                                        key={iconId}
                                        title={icon.activity}
                                        className="text-5xl inline-block align-middle"
                                        style={{ verticalAlign: 'middle' }}
                                        dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(icon.iconValue) }}
                                      />
                                    );
                                  } else if (icon.iconType === 'emoji' && icon.icon) {
                                    return (
                                      <span key={iconId} title={icon.activity} className="text-5xl align-middle" style={{ verticalAlign: 'middle' }}>
                                        {icon.icon}
                                      </span>
                                    );
                                  } else {
                                    // Fallback: show nothing
                                    return null;
                                  }
                                })}
                              </div>
                            )}
                            {dayEvents.filter(ev => {
                              // Nur Events mit Text anzeigen (nicht nur Icons)
                              const text = ev.summary.replace(memberName + ':', '').trim();
                              return text.length > 0;
                            }).map(ev => {
                              const isIcal = isIcalEvent(ev);
                              const readOnly = isIcal || isPastDay(date);
                              const commonStyle = { backgroundColor: '#1f2937', borderColor: '#475569', color: '#e2e8f0' };
                              const baseClass = "p-1 rounded text-xs border-l-2";
                              const interactivity = readOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:opacity-90";
                              return (
                                <div
                                  key={ev.id}
                                  className={`${baseClass} ${interactivity}`}
                                  style={commonStyle}
                                  onClick={readOnly ? undefined : () => setEditEvent(ev)}
                                  title={readOnly ? (isIcal ? "iCal Ereignis - schreibgeschützt" : "Vergangener Tag - schreibgeschützt") : "Eintrag bearbeiten"}
                                >
                                  <div className="flex items-center gap-1">
                                    <div className="truncate">{ev.summary.replace(memberName + ':', '').trim()}</div>
                                    {isIcal && <span className="text-sm" title="iCal Ereignis">📅</span>}
                                  </div>
                                  {isIcal && <div className="text-[10px] text-amber-300">iCal (read-only)</div>}
                                  {(!isIcal && isPastDay(date)) && <div className="text-[10px] text-gray-400">Vergangener Tag</div>}
                                </div>
                              );
                            })}
                          </div>
                          {!isPastDay(date) ? (
                            <button 
                              onClick={() => addEventForMemberDay(memberName, date)}
                              className="absolute bottom-1 left-1 text-gray-400 hover:text-gray-600 text-lg font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                              title="Eintrag hinzufügen"
                            >
                              +
                            </button>
                          ) : (
                            <div className="absolute bottom-1 left-1 text-gray-500 text-xs" title="Vergangener Tag - schreibgeschützt">🔒</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-lg text-slate-100">Eintrag bearbeiten</h3>
            <div className="space-y-4">
              <input 
                className="w-full p-2 border rounded bg-slate-700 text-slate-100 border-slate-600" 
                placeholder="Titel" 
                value={editEvent.summary} 
                onChange={e => setEditEvent({ ...editEvent, summary: e.target.value })} 
              />
            </div>

            {/* Activity Icons für diesen Tag und Person */}
            <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-600 mt-4">
              <label className="block text-sm font-semibold mb-2 text-slate-100">🎯 Tätigkeits-Icons für {resolveOwner(editEvent)}:</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {activityIcons.map((activity) => {
                  const eventDateStr = getLocalDateString(new Date(editEvent.start || new Date()));
                  const owner = resolveOwner(editEvent);
                  const isSelected = (selectedIcons[eventDateStr]?.[owner] || []).includes(activity.id);
                  return (
                    <button
                      key={activity.id}
                      onClick={() => {
                        const current = selectedIcons[eventDateStr]?.[owner] || [];
                        const updated = isSelected 
                          ? current.filter(id => id !== activity.id)
                          : [...current, activity.id];
                        setSelectedIcons({ 
                          ...selectedIcons, 
                          [eventDateStr]: {
                            ...selectedIcons[eventDateStr],
                            [owner]: updated
                          }
                        });
                      }}
                      className={`px-3 py-2 rounded text-lg border-2 transition flex items-center justify-center ${
                        isSelected 
                          ? 'bg-green-600 border-green-500' 
                          : 'bg-slate-600 border-slate-500 hover:bg-slate-500'
                      }`}
                      title={activity.activity}
                    >
                      {/* SVG aus iconSvg bevorzugen */}
                      {activity.iconSvg && activity.iconSvg.trim().startsWith('<svg') ? (
                        <span
                          className="text-2xl inline-block align-middle"
                          style={{ verticalAlign: 'middle' }}
                          dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(activity.iconSvg) }}
                        />
                      ) : activity.iconType === 'image' && activity.iconValue ? (
                        <img
                          src={getBackendImageUrl(activity.iconValue)}
                          alt={activity.activity}
                          title={activity.activity}
                          className="w-6 h-6 object-contain rounded border border-slate-500 align-middle inline-block"
                          style={{ verticalAlign: 'middle' }}
                        />
                      ) : activity.iconType === 'icon' && activity.iconValue ? (
                        <span
                          className="text-2xl inline-block align-middle"
                          style={{ verticalAlign: 'middle' }}
                          dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(activity.iconValue) }}
                        />
                      ) : activity.iconType === 'emoji' && activity.icon ? (
                        <span className="align-middle text-2xl" style={{ verticalAlign: 'middle' }}>{activity.icon}</span>
                      ) : (
                        <span className="align-middle text-2xl" style={{ verticalAlign: 'middle' }}></span>
                      )}
                    </button>
                  );
                })}
              </div>
              {(selectedIcons[getLocalDateString(new Date(editEvent.start || new Date()))] || []).length > 0 && (
                <div className="text-xs text-slate-400">
                  {(selectedIcons[getLocalDateString(new Date(editEvent.start || new Date()))] || []).length} Icon(s) ausgewählt
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6 flex-wrap">
              <button 
                className="flex-1 min-w-24 px-2 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" 
                onClick={() => handleCalendarEventSave(editEvent)}
              >
                💾 Speichern
              </button>
              {editEvent.id && (
                <button 
                  className="flex-1 min-w-24 px-2 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700" 
                  onClick={() => {
                    handleCalendarEventDelete(editEvent.id);
                    setEditEvent(null);
                  }}
                >
                  🗑️ Löschen
                </button>
              )}
              <button 
                className="flex-1 min-w-24 px-2 py-2 text-sm bg-gray-400 text-white rounded hover:bg-gray-500" 
                onClick={() => setEditEvent(null)}
              >
                ❌ Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
