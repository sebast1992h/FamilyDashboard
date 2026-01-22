import { useEffect, useState, useRef } from "react";
import { fetchNotes, saveNote, deleteNote, fetchTodos, saveTodo, deleteTodo, fetchMealPlan, saveMealPlan, deleteMealPlan, fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from "./api";
import { fetchVersion } from "./versionApi";
import ConfigPage from "./ConfigPage";
import MealPlanPage from "./MealPlanPage";
import CalendarEventPage from "./CalendarEventPage";

// Helper: Konvertiere ein Date zu YYYY-MM-DD String (lokale Zeit, nicht UTC)
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Hook to detect mobile viewport using matchMedia
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    setIsMobile(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosError, setTodosError] = useState("");
  const [editTodo, setEditTodo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("dashboardAuth") === "1");
  
  // URL-basiertes Routing
  const currentPath = window.location.pathname;
  const [error, setError] = useState("");
  const [version, setVersion] = useState("");
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [editNote, setEditNote] = useState(null);
  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [birthdayText, setBirthdayText] = useState("");
  const [upcomingText, setUpcomingText] = useState("");
  const [config, setConfig] = useState(null);
  const [family, setFamily] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bannerOverflowing, setBannerOverflowing] = useState(false);
  const [marqueeDuration, setMarqueeDuration] = useState(10);
  const bannerOuterRef = useRef(null);
  const bannerInnerRef = useRef(null);
  const notesRef = useRef(null);
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const meals = ["Morgens", "Mittags", "Abends"];

  // Events nach Familienmitglied zuordnen; Unbekannt -> "Sonstiges"
  const normalizedFamily = (family || []).map(name => (name || "").trim()).filter(Boolean);
  const familyWithOther = [...normalizedFamily, "Sonstiges"];

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

  // Berechne den Montag der aktuellen Woche
  const getMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sonntag, 1=Montag, ..., 6=Samstag
    const monday = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Tage seit Montag
    monday.setDate(today.getDate() - daysFromMonday);
    return monday;
  };

  // Prüfe ob ein Datum heute ist
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isMobile = useIsMobile(768);

  // Konfiguration aus DB laden
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          console.log("Config loaded:", data);
          setConfig(data);
          // Family ist Array von Objekten: [{name: "...", birthday: "..."}]
          const familyNames = (data.family || []).map(member => typeof member === 'string' ? member : member.name);
          console.log("Family names extracted:", familyNames);
          setFamily(familyNames);
          setBirthdays(data.birthdays || []);
        } else {
          console.error("Config API failed:", res.status);
        }
      } catch (e) {
        console.error("Error loading config:", e);
      }
    }
    
    // Initiales Laden
    loadConfig();
    
    // Auto-Refresh alle 30 Sekunden
    const configInterval = setInterval(loadConfig, 30000);
    
    return () => clearInterval(configInterval);
  }, []);

  // Kalenderdaten aus DB laden
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
    
    // Initiales Laden
    loadCalendarEvents();
    
    // Auto-Refresh alle 60 Sekunden
    const calendarInterval = setInterval(loadCalendarEvents, 30000);
    
    return () => clearInterval(calendarInterval);
  }, []);

  // Essensplan aus DB laden
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
    
    // Initiales Laden
    loadMealPlan();
    
    // Auto-Refresh alle 30 Sekunden
    const mealPlanInterval = setInterval(loadMealPlan, 30000);
    
    return () => clearInterval(mealPlanInterval);
  }, []);

  function handleLogin(password) {
    if (password === "admin") {
      localStorage.setItem("dashboardAuth", "1");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  console.log("App rendering, currentPath:", currentPath);

  if (currentPath === "/config") {
    console.log("Rendering ConfigPage");
    return <ConfigPage isAuthenticated={isAuthenticated} onLogin={handleLogin} onBack={() => window.location.href = "/"} />;
  }

  if (currentPath === "/planung") {
    console.log("Rendering MealPlanPage");
    return <MealPlanPage onBack={() => window.location.href = "/"} />;
  }

  if (currentPath === "/kalender-planung") {
    console.log("Rendering CalendarEventPage");
    return <CalendarEventPage onBack={() => window.location.href = "/"} />;
  }

  console.log("Rendering Dashboard, family:", family, "calendarLoading:", calendarLoading);

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--accent)' }}>Family Dashboard</h1>
          <p>Familie: {family ? family.length : 0} Mitglieder</p>
        </div>
        <button 
          onClick={() => window.location.href = "/planung"}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 whitespace-nowrap ml-2"
        >
          🍽 Planung
        </button>
        <button 
          onClick={() => window.location.href = "/kalender-planung"}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap ml-2"
        >
          📅 Kalender
        </button>
      </div>

      {/* Kalender */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🗓 Wochenkalender</h2>
        <div className="overflow-x-auto card">
          {calendarLoading ? (
            <div className="p-4">Lade Kalender...</div>
          ) : calendarError ? (
            <div className="text-red-500 p-4">{calendarError}</div>
          ) : (
            <>
              {(familyWithOther && familyWithOther.length > 0) ? (
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-slate-100" style={{ backgroundColor: '#f1f5f9' }}>Person</th>
                      {Array.from({ length: 7 }, (_, i) => {
                        const monday = getMonday();
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
                    {familyWithOther.map((memberName, memberIndex) => (
                      <tr key={memberIndex}>
                        <td className="border p-2 font-semibold bg-slate-50" style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>{memberName}</td>
                        {Array.from({ length: 7 }, (_, dayIndex) => {
                          const monday = getMonday();
                          const date = new Date(monday);
                          date.setDate(monday.getDate() + dayIndex);
                          const dateStr = date.toISOString().split('T')[0];
                          
                          const dayEvents = classifiedEvents.filter(ev => {
                            const evDate = new Date(ev.start);
                            const evDateStr = evDate.toISOString().split('T')[0];
                            return evDateStr === dateStr && ev.owner === memberName;
                          });
                          
                          return (
                            <td key={dayIndex} className="border p-1 align-top h-24" style={{ backgroundColor: isToday(date) ? '#2d2416' : '#232526', color: isToday(date) ? '#d97706' : 'inherit' }}>
                              <div className="text-xs space-y-1">
                                {dayEvents.map(ev => (
                                  <div key={ev.id} className="p-2 rounded text-xs border-l-2" style={{ backgroundColor: '#bae6fd', borderColor: '#0284c7', color: '#0c4a6e' }}>
                                    <div className="truncate">
                                      {ev.uid && ev.start ? `${new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} ` : ''}
                                      {ev.summary.replace(memberName + ':', '').trim()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 p-4">
                  <p className="text-gray-500">Keine Familienmitglieder konfiguriert.</p>
                  <p className="text-gray-400 text-sm mt-2">Gehen Sie zu /config um Familienmitglieder hinzuzufügen.</p>
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2 px-2">💡 Klicke auf "📅 Kalender" oben, um Termine zu bearbeiten.</p>
      </div>

      {/* Essensplan */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🍽 Essensplan</h2>
        <div className="overflow-x-auto card">
          {mealPlanLoading ? (
            <div className="p-4">Lade Essensplan...</div>
          ) : mealPlanError ? (
            <div className="text-red-500 p-4">{mealPlanError}</div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-slate-100" style={{ backgroundColor: '#f1f5f9' }}>Mahlzeit</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const monday = getMonday();
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
                {meals.map((mealTime, mealIndex) => (
                  <tr key={mealIndex}>
                    <td className="border p-2 font-semibold bg-slate-50" style={{ backgroundColor: '#334155', color: '#f1f5f9' }}>{mealTime}</td>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const monday = getMonday();
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
                            return false;
                          }
                        })
                        .reduce((highest, current) => (!highest || current.id > highest.id) ? current : highest, null);
                      
                      return (
                        <td key={dayIndex} className="border p-1 align-top h-24 text-center" style={{ backgroundColor: isToday(date) ? '#2d2416' : '#232526', color: isToday(date) ? '#d97706' : 'inherit' }}>
                          <div className="text-sm">
                            {dayMeal ? (
                              <div className="p-2 rounded text-xs border-l-2 h-full flex items-center justify-center" style={{ backgroundColor: '#bae6fd', borderColor: '#0284c7', color: '#0c4a6e' }}>
                                {dayMeal.recipeUrl ? (
                                  <a href={dayMeal.recipeUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                                    {dayMeal.meal}
                                  </a>
                                ) : (
                                  <span className="font-semibold">{dayMeal.meal}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}