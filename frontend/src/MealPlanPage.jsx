import { useState, useEffect } from "react";
import { fetchMealPlan, saveMealPlan, deleteMealPlan } from "./api";

const meals = ["Morgens", "Mittags", "Abends"];

// Helper: Konvertiere ein Date zu YYYY-MM-DD String (lokale Zeit, nicht UTC)
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Stelle http:// voran, falls kein Protokoll vorhanden ist
function ensureProtocol(url) {
  if (!url) return url;
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  return url;
}

// Helper: Prüfe ob eine Woche komplett in der Vergangenheit liegt
function isWeekInPast(weekStart) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return weekEnd < today;
}

// Helper: Berechne den Montag der Vorwoche
function getPreviousMonday(weekStart) {
  const prev = new Date(weekStart);
  prev.setDate(weekStart.getDate() - 7);
  return prev;
}

export default function MealPlanPage({ onBack }) {
  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");
  const [editMeal, setEditMeal] = useState(null);
  const [showCopyLastWeek, setShowCopyLastWeek] = useState(false);
  
  // Zentrale Config für Sichtbarkeit der Mahlzeitentypen
  const [config, setConfig] = useState(null);
  const mealVisibility = (config && config.mealVisibility) ? config.mealVisibility : { "Morgens": true, "Mittags": true, "Abends": true };
  // Wochenstart (Montag) für Navigation in der Planungsansicht
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=So,1=Mo,...
    const monday = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setHours(0,0,0,0);
    monday.setDate(today.getDate() - daysFromMonday);
    return monday;
  });
  const getCurrentMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setHours(0,0,0,0);
    monday.setDate(today.getDate() - daysFromMonday);
    return monday;
  };
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  useEffect(() => {
    async function loadMealPlan() {
      setMealPlanLoading(true);
      try {
        const data = await fetchMealPlan();
        setMealPlan(data);
        setMealPlanError("");
      } catch (e) {
        setMealPlanError("Fehler beim Laden des Essensplans");
      } finally {
        setMealPlanLoading(false);
      }
    }
    
    // Zentrale Config laden
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig({
            ...data,
            mealVisibility: data.mealVisibility || { "Morgens": true, "Mittags": true, "Abends": true }
          });
        }
      } catch (e) {
        // Fallback auf Defaults
      }
    }

    // Activity Icons laden
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

    // Activity Icons laden
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

    loadMealPlan();
    loadConfig();
    const interval = setInterval(loadMealPlan, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleMealPlanSave(meal) {
    try {
      console.log("handleMealPlanSave:", meal);
      // Stelle http:// voran falls nötig
      const mealWithUrl = { ...meal, recipeUrl: ensureProtocol(meal.recipeUrl) };
      let savedMeal;
      if (meal.id) {
        savedMeal = await saveMealPlan(meal.id, mealWithUrl);
        console.log("Updated meal:", savedMeal);
        setMealPlan(list => list.map(m => m.id === meal.id ? savedMeal : m));
      } else {
        savedMeal = await saveMealPlan(null, mealWithUrl);
        console.log("Created meal:", savedMeal);
        if (savedMeal && savedMeal.id) {
          setMealPlan(list => [...list, savedMeal]);
        } else {
          console.warn("Saved meal missing ID:", savedMeal);
          throw new Error("Server hat keine ID für die neue Mahlzeit zurückgegeben");
        }
      }
      setEditMeal(null);
      setMealPlanError("");
    } catch (e) {
      console.error("Save error:", e);
      setMealPlanError(e.message || "Fehler beim Speichern des Essensplans");
    }
  }

  async function handleMealPlanDelete(id) {
    try {
      await deleteMealPlan(id);
      setMealPlan(list => list.filter(m => m.id !== id));
    } catch (e) {
      setMealPlanError("Fehler beim Löschen des Essensplans");
    }
  }

  // Helper: Hole alle Mahlzeiten der letzten Woche - intelligente Filterung
  const getPreviousWeekMeals = () => {
    if (!editMeal || editMeal.id) return []; // Nur für neue Mahlzeiten
    
    const prevMonday = getPreviousMonday(weekStart);
    const prevEnd = new Date(prevMonday);
    prevEnd.setDate(prevMonday.getDate() + 6);
    
    const mealTypeMap = { "Morgens": 0, "Mittags": 1, "Abends": 2 };
    const currentMealTypeNum = mealTypeMap[editMeal.mealType];
    
    // Intelligente Filterung:
    // - Morgens: nur Morgens
    // - Mittags: Mittags und Abends
    // - Abends: Mittags und Abends
    let allowedMealTypes = [currentMealTypeNum];
    if (currentMealTypeNum === 1) { // Mittags
      allowedMealTypes = [1, 2]; // Mittags + Abends
    } else if (currentMealTypeNum === 2) { // Abends
      allowedMealTypes = [1, 2]; // Mittags + Abends
    }
    
    return (mealPlan || []).filter(meal => {
      try {
        const mealDate = new Date(meal.date);
        const mealDateStr = getLocalDateString(mealDate);
        
        const prevMondayStr = getLocalDateString(prevMonday);
        const prevEndStr = getLocalDateString(prevEnd);
        
        return mealDateStr >= prevMondayStr && 
               mealDateStr <= prevEndStr && 
               allowedMealTypes.includes(meal.mealType);
      } catch (e) {
        console.error("Error filtering previous week meals:", e);
        return false;
      }
    });
  };

  console.log("MealPlanPage rendered, mealPlanLoading:", mealPlanLoading, "mealPlan length:", mealPlan.length);

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Zurück zum Dashboard
        </button>
        <h1 className="text-3xl font-bold mt-4" style={{ color: 'var(--accent)' }}>📋 Essensplan Planung</h1>
      </div>

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

      {/* Sichtbarkeit wird zentral in /config gepflegt */}

      <div className="overflow-x-auto card">
        {mealPlanLoading ? (
          <div className="p-4">Lade Essensplan...</div>
        ) : mealPlanError ? (
          <div className="text-red-500 p-4">{mealPlanError}</div>
        ) : (
          <>
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-slate-100" style={{ backgroundColor: '#f1f5f9' }}>Mahlzeit</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const monday = weekStart;
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    const todayBg = isToday(date) ? '#78350f' : '#f1f5f9';
                    return (
                      <th key={i} className="border p-2 bg-slate-100 min-w-32" style={{ backgroundColor: todayBg }}>
                        <div>{['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()]}</div>
                        <div className="text-xs">{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {meals.filter(mealTime => mealVisibility[mealTime]).map((mealTime, mealIndex) => (
                  <tr key={mealIndex}>
                    <td className="border p-2 font-semibold bg-slate-50" style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>{mealTime}</td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const monday = weekStart;
                      const date = new Date(monday);
                      date.setDate(monday.getDate() + dayIndex);
                      const dateStr = getLocalDateString(date);
                      
                      const mealTypeMap = { "Morgens": 0, "Mittags": 1, "Abends": 2 };
                      const mealTypeNum = mealTypeMap[mealTime];
                      
                      const dayMeal = (mealPlan || [])
                        .filter(meal => {
                          try {
                            const mealDateStr = getLocalDateString(new Date(meal.date));
                            return mealDateStr === dateStr && meal.mealType === mealTypeNum;
                          } catch (e) {
                            console.error("Error comparing meal date:", e);
                            return false;
                          }
                        })
                        .reduce((highest, current) => (!highest || current.id > highest.id) ? current : highest, null);
                      
                      const isPastWeek = isWeekInPast(weekStart);
                      
                      return (
                        <td key={dayIndex} className="border p-1 align-top h-24" style={{ backgroundColor: isToday(date) ? '#2d2416' : '#232526', color: isToday(date) ? '#d97706' : 'inherit', opacity: isPastWeek ? 0.6 : 1 }}>
                          <div className="text-xs">
                            {dayMeal ? (
                              <div className="p-1 rounded text-xs border-l-2 h-full flex flex-col justify-between" style={{ backgroundColor: '#1f2937', borderColor: '#475569', color: '#e2e8f0' }}>
                                <div>
                                  <div className="font-semibold truncate">{dayMeal.meal}</div>
                                  {isPastWeek ? (
                                    <div title="Vergangene Woche – schreibgeschützt" style={{ cursor: 'not-allowed', color: '#9ca3af' }}>
                                      🔒 Schreibgeschützt
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setEditMeal(dayMeal)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      ✏️ Edit
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                {isPastWeek ? (
                                  <div className="text-gray-500 py-6 text-xs">
                                    🔒 Vergangene Woche
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setEditMeal({ 
                                      meal: "", 
                                      date: dateStr, 
                                      mealType: mealTime 
                                    })}
                                    className="w-full text-xs text-gray-400 hover:text-gray-600 py-6"
                                    title="Mahlzeit hinzufügen"
                                  >
                                    +
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {editMeal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm shadow-lg max-h-[90vh] overflow-y-auto">
                  <h3 className="font-semibold mb-4 text-lg text-slate-100">Mahlzeit bearbeiten</h3>
                  {isWeekInPast(weekStart) && (
                    <div className="mb-3 p-2 bg-red-900 text-red-100 rounded text-sm">
                      🔒 Diese Woche liegt in der Vergangenheit und kann nicht bearbeitet werden.
                    </div>
                  )}
                  
                  {/* Copy from last week section - only for new meals */}
                  {!editMeal.id && !showCopyLastWeek && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowCopyLastWeek(true)}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      >
                        📋 Aus letzter Woche übernehmen
                      </button>
                    </div>
                  )}
                  
                  {showCopyLastWeek && !editMeal.id && (
                    <div className="mb-3 p-3 bg-slate-700 rounded border border-slate-600">
                      <label className="block text-sm font-semibold mb-2 text-slate-100">Mahlzeit aus letzter Woche:</label>
                      {getPreviousWeekMeals().length > 0 ? (
                        <div className="space-y-1">
                          {getPreviousWeekMeals().map((meal) => {
                            const mealTypeLabels = { 0: "Morgens", 1: "Mittags", 2: "Abends" };
                            return (
                              <button
                                key={meal.id}
                                onClick={() => {
                                  setEditMeal({ 
                                    ...editMeal, 
                                    meal: meal.meal,
                                    recipeUrl: meal.recipeUrl
                                  });
                                  setShowCopyLastWeek(false);
                                }}
                                className="w-full text-left px-2 py-1 bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded text-sm transition text-slate-100"
                              >
                                <span className="text-slate-400 text-xs">[{mealTypeLabels[meal.mealType]}]</span> {meal.meal} {meal.recipeUrl && '🔗'}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Keine Mahlzeiten aus der letzten Woche vorhanden</p>
                      )}
                      <button
                        onClick={() => setShowCopyLastWeek(false)}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-300"
                      >
                        ← Zurück
                      </button>
                    </div>
                  )}
                  
                  <input 
                    className="w-full mb-2 p-2 border rounded bg-slate-700 text-slate-100 border-slate-600" 
                    placeholder="Mahlzeit (z.B. Spaghetti Bolognese)" 
                    value={editMeal.meal || ""} 
                    onChange={e => setEditMeal({ ...editMeal, meal: e.target.value })}
                    disabled={isWeekInPast(weekStart)}
                  />
                  <input 
                    className="w-full mb-2 p-2 border rounded bg-slate-700 text-slate-100 border-slate-600" 
                    placeholder="Rezept-Link (z.B. https://...)" 
                    value={editMeal.recipeUrl || ""}
                    onChange={e => setEditMeal({ ...editMeal, recipeUrl: e.target.value })}
                    disabled={isWeekInPast(weekStart)}
                  />
                  <div className="mb-4">
                    <span className="text-sm text-slate-400">
                      {editMeal.mealType} am {new Date(editMeal.date).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      className="flex-1 min-w-20 px-2 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={() => {
                        handleMealPlanSave(editMeal);
                        setShowCopyLastWeek(false);
                      }}
                      disabled={isWeekInPast(weekStart)}
                    >
                      💾 Speichern
                    </button>
                    <button 
                      className="flex-1 min-w-20 px-2 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600" 
                      onClick={() => {
                        setEditMeal(null);
                        setShowCopyLastWeek(false);
                      }}
                    >
                      ❌ Abbrechen
                    </button>
                    {editMeal.id && (
                      <button 
                        className="flex-1 min-w-20 px-2 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                        onClick={() => {
                          handleMealPlanDelete(editMeal.id);
                          setEditMeal(null);
                        }}
                        disabled={isWeekInPast(weekStart)}
                      >
                        🗑️ Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
