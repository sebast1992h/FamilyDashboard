import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  fetchNotes,
  saveNote,
  deleteNote,
  fetchTodos,
  saveTodo,
  deleteTodo,
  fetchMealPlan,
  fetchCalendarEvents,
} from "./api";
import ConfigPage, { svgIcons } from "./ConfigPage.jsx";
import { normalizeSvgForFont } from "./iconUtils_fixed";
import MealPlanPage from "./MealPlanPage";
import CalendarEventPage from "./CalendarEventPage";

// Format date to YYYY-MM-DD in local time
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Add protocol if missing
function ensureProtocol(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "http://" + trimmed;
}

// Detect mobile breakpoint
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    setIsMobile(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [breakpoint]);

  return isMobile;
}

// Monday of the current week
function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Check if date is today
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default function App() {
  const marqueeCss = `
    @keyframes banner-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .banner-marquee {
      animation: banner-marquee 20s linear infinite;
    }
    .banner-marquee:hover {
      animation-play-state: paused;
    }
  `;

  const [todos, setTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosError, setTodosError] = useState("");
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [editTodo, setEditTodo] = useState(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");

  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesEditMode, setNotesEditMode] = useState(true);
  const [notesModalText, setNotesModalText] = useState("");

  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");

  const [config, setConfig] = useState(null);
  const [family, setFamily] = useState([]);
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const [rollingCenter, setRollingCenter] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [activityIcons, setActivityIcons] = useState([]);
  const [dayActivityIcons, setDayActivityIcons] = useState({});

  const [isAuthenticated, setIsAuthenticated] = useState(
    typeof localStorage !== "undefined" && localStorage.getItem("dashboardAuth") === "1"
  );

  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname;
    }
    return "/";
  });

  const currentPath = currentPage;
  const isMobile = useIsMobile(768);

  const days = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];
  const meals = ["Morgens", "Mittags", "Abends"];

  const calendarViewMode = config?.calendarViewMode || "week";
  const viewDays = 7;
  const viewStartDate = (() => {
    if (calendarViewMode === "rolling") {
      const d = new Date(rollingCenter);
      d.setDate(d.getDate() - 3);
      return d;
    }
    return weekStart;
  })();
  const viewRangeKey = `${calendarViewMode}:${getLocalDateString(viewStartDate)}`;
  
  // Extract refresh interval from config (in milliseconds)
  const refreshIntervalMs = config && config.refreshInterval ? Math.max(5000, Math.min(300000, config.refreshInterval * 1000)) : 30000;

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        setCurrentPage(window.location.pathname);
      }
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Load config
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          const familyNames = (data.family || []).map((m) =>
            typeof m === "string" ? m : m.name
          );
          setFamily(familyNames);
        }
      } catch (e) {
        console.error("Error loading config", e);
      }
    }

    loadConfig();
    const id = setInterval(loadConfig, 30000);
    return () => clearInterval(id);
  }, []);

  // Load activity icons
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

  // Load day activity icons for this week (person-based)
  useEffect(() => {
    async function loadWeekDayIcons() {
      try {
        const icons = {};
        const familyWithOther = [...family, "Andere"];
        const baseDate = new Date(viewStartDate);

        for (let i = 0; i < viewDays; i++) {
          const date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
          const dateStr = getLocalDateString(date);
          icons[dateStr] = {};
          
          // Load icons for each person on this day
          for (const person of familyWithOther) {
            try {
              const res = await fetch(`/api/day-activity-icons/${dateStr}/${encodeURIComponent(person)}`);
              if (res.ok) {
                const dayIcons = await res.json();
                icons[dateStr][person] = dayIcons.map(icon => icon.activityIconId);
              } else if (res.status === 404) {
                icons[dateStr][person] = [];
              }
            } catch (err) {
              console.error(`Error loading icons for ${person} on ${dateStr}:`, err);
              icons[dateStr][person] = [];
            }
          }
        }
        
        setDayActivityIcons(icons);
      } catch (e) {
        console.error("Error loading week day icons:", e);
      }
    }
    
    if (family.length > 0) {
      loadWeekDayIcons();
    }
  }, [viewRangeKey, family]);

  // Load todos
  useEffect(() => {
    let isInitialLoad = true;
    async function loadTodos() {
      if (isInitialLoad) {
        setTodosLoading(true);
      }
      try {
        const data = await fetchTodos();
        setTodos(data || []);
        setTodosError("");
      } catch (e) {
        setTodosError("Fehler beim Laden der To-dos");
      } finally {
        if (isInitialLoad) {
          setTodosLoading(false);
          isInitialLoad = false;
        }
      }
    }
    loadTodos();
    const id = setInterval(loadTodos, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  // Load notes
  useEffect(() => {
    let isInitialLoad = true;
    async function loadNotes() {
      if (isInitialLoad) {
        setNotesLoading(true);
      }
      try {
        const data = await fetchNotes();
        setNotesList(data || []);
        setNotesError("");
      } catch (e) {
        setNotesError("Fehler beim Laden der Notizen");
      } finally {
        if (isInitialLoad) {
          setNotesLoading(false);
          isInitialLoad = false;
        }
      }
    }
    loadNotes();
    const id = setInterval(loadNotes, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  // Load calendar events
  useEffect(() => {
    let isInitialLoad = true;
    async function loadCalendarEvents() {
      if (isInitialLoad) {
        setCalendarLoading(true);
      }
      try {
        const data = await fetchCalendarEvents();
        setCalendarEvents(data || []);
        setCalendarError("");
      } catch (e) {
        setCalendarError("Fehler beim Laden der Kalendereinträge");
      } finally {
        if (isInitialLoad) {
          setCalendarLoading(false);
          isInitialLoad = false;
        }
      }
    }
    loadCalendarEvents();
    const id = setInterval(loadCalendarEvents, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  // Load meal plan
  useEffect(() => {
    let isInitialLoad = true;
    async function loadMealPlan() {
      if (isInitialLoad) {
        setMealPlanLoading(true);
      }
      try {
        const data = await fetchMealPlan();
        setMealPlan(data || []);
        setMealPlanError("");
      } catch (e) {
        setMealPlanError("Fehler beim Laden des Essensplans");
      } finally {
        if (isInitialLoad) {
          setMealPlanLoading(false);
          isInitialLoad = false;
        }
      }
    }
    loadMealPlan();
    const id = setInterval(loadMealPlan, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  const todoDaysVisible = config?.todoDaysVisible || 10;

  const isRecentlyDone = (todo) => {
    if (!todo?.done) return false;
    if (!todo.doneAt) return true;
    const doneAt = new Date(todo.doneAt);
    if (Number.isNaN(doneAt.getTime())) return true;
    const diffDays = (Date.now() - doneAt.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= todoDaysVisible;
  };

  const visibleTodos = (todos || [])
    .filter((t) => !t.done || isRecentlyDone(t))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      // offene Todos: nach Fälligkeitsdatum, dann ID
      if (!a.done) {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return (a.id || 0) - (b.id || 0);
      }
      // erledigte: wie bisher nach doneAt
      const aTime = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const bTime = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });

  async function handleAddTodo() {
    const text = (newTodoText || "").trim();
    if (!text) return;
    const dueDate = newTodoDueDate ? new Date(newTodoDueDate).toISOString() : null;
    try {
      const created = await saveTodo({ text, done: false, doneAt: null, dueDate });
      setTodos((prev) => [...prev, created]);
      setNewTodoText("");
      setNewTodoDueDate("");
      setShowAddTodoModal(false);
      setToast({ visible: true, message: "To-do hinzugefügt" });
      setTimeout(() => setToast({ visible: false, message: "" }), 2000);
    } catch (e) {
      setTodosError("Fehler beim Anlegen des To-dos");
    }
  }

  async function handleToggleTodo(todo) {
    const nextDone = !todo.done;
    const payload = {
      id: todo.id,
      text: todo.text,
      done: nextDone,
      doneAt: nextDone ? new Date().toISOString() : null,
      dueDate: todo.dueDate || null,
    };
    try {
      const updated = await saveTodo(payload);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setTodosError("Fehler beim Aktualisieren des To-dos");
    }
  }

  async function handleDeleteTodo(todo) {
    try {
      await deleteTodo(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (e) {
      setTodosError("Fehler beim Löschen des To-dos");
    }
  }

  async function handleAddNote(title = "", content = "") {
    if (!content.trim()) return;
    const newNote = { title: title.trim(), content: content.trim() };
    try {
      const created = await saveNote(newNote);
      setNotesList((prev) => [...prev, created]);
      setNotesError("");
    } catch (e) {
      setNotesError("Fehler beim Hinzufügen der Notiz");
    }
  }

  async function handleSaveNote(note, field, value) {
    const updated = { ...note, [field]: value };
    try {
      const saved = await saveNote(updated);
      setNotesList((prev) => prev.map((n) => (n.id === note.id ? saved : n)));
      setNotesError("");
    } catch (e) {
      setNotesError("Fehler beim Speichern der Notiz");
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote(noteId);
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      setNotesError("");
    } catch (e) {
      setNotesError("Fehler beim Löschen der Notiz");
    }
  }

  function handleLogin(password) {
    if (password === "admin") {
      localStorage.setItem("dashboardAuth", "1");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  const normalizedFamily = (family || [])
    .map((name) => (name || "").trim())
    .filter(Boolean);
  const familyWithOther = [...normalizedFamily, "Sonstiges"];

  const resolveOwner = (ev) => {
    const summaryLower = (ev.summary || "").toLowerCase();
    const locationLower = (ev.location || "").toLowerCase();
    for (const name of normalizedFamily) {
      const nameLower = name.toLowerCase();
      const startsWithName =
        summaryLower.startsWith(nameLower + ":") ||
        summaryLower.startsWith(nameLower + " -") ||
        summaryLower.startsWith(nameLower + " ");
      const containsInLocation = locationLower.includes(nameLower);
      if (startsWithName || containsInLocation) return name;
    }
    return "Sonstiges";
  };

  const classifiedEvents = (calendarEvents || []).map((ev) => {
    const owner = ev.owner || resolveOwner(ev);
    return { ...ev, owner };
  });

  const mealVisibility =
    config && config.mealVisibility
      ? config.mealVisibility
      : { Morgens: true, Mittags: true, Abends: true };
  // Uhrzeit-State für Newsbanner
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [todaysBirthdays, setTodaysBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [bannerShouldScroll, setBannerShouldScroll] = useState(false);
  const bannerContainerRef = useRef(null);
  const bannerContentRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 500); // Update every half second

    return () => clearInterval(timer);
  }, []);

  // Wetter laden (nutzt /api/weather; Key/Koordinaten aus Config/ENV)
  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setWeather({
          temp: typeof data.temp === "number" ? Math.round(data.temp) : null,
          desc: data.desc || "",
          icon: data.icon || null,
          city: data.city || ""
        });
      } catch (err) {
        if (cancelled) return;
        setWeather(null);
      }
    };

    fetchWeather();
    const intervalId = setInterval(fetchWeather, 10 * 60 * 1000); // alle 10 Minuten
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // Geburtstage für heute aus Config ableiten
  useEffect(() => {
    if (!config || !Array.isArray(config.birthdays)) {
      setTodaysBirthdays([]);
      setUpcomingBirthdays([]);
      return;
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lookahead = Math.min(365, Math.max(1, Number(config.birthdayLookaheadDays ?? 30) || 30));
    const upcoming = [];
    const matches = config.birthdays
      .map((entry) => {
        const name = entry?.name || "";
        const rawDate = entry?.date || entry?.birthday;
        if (!name || !rawDate) return null;
        const birthDate = new Date(rawDate);
        if (Number.isNaN(birthDate.getTime())) return null;
        const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const isToday = thisYear.getTime() === todayMidnight.getTime();

        // Bestimme nächstes Geburtstagsdatum (dieses Jahr oder nächstes)
        let nextBirthday = thisYear;
        if (thisYear < todayMidnight) {
          nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        }

        const daysUntil = Math.round((nextBirthday - todayMidnight) / (1000 * 60 * 60 * 24));
        const ageAtNext = nextBirthday.getFullYear() - birthDate.getFullYear();

        if (isToday) {
          return { name, age: ageAtNext };
        }

        if (daysUntil > 0 && daysUntil <= lookahead) {
          upcoming.push({ name, age: ageAtNext, inDays: daysUntil });
        }
        return null;
      })
      .filter(Boolean);

    setTodaysBirthdays(matches);
    setUpcomingBirthdays(upcoming.sort((a, b) => a.inDays - b.inDays));
  }, [config]);

  // Banner-Scrolling nur aktivieren, wenn Inhalt breiter als Container ist
  useEffect(() => {
    const measure = () => {
      const container = bannerContainerRef.current;
      const content = bannerContentRef.current;
      if (!container || !content) return;
      const needsScroll = content.scrollWidth > container.clientWidth;
      setBannerShouldScroll(needsScroll);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [weather, todaysBirthdays, upcomingBirthdays]);

  // Conditional page routing - must be after all hooks
  if (currentPath === "/config") {
    return (
      <ConfigPage
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onBack={() => {
          setCurrentPage("/");
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

  if (currentPath === "/planung") {
    return <MealPlanPage key="meal-plan" onBack={() => {
      setCurrentPage("/");
      window.history.pushState({}, "", "/");
    }} />;
  }

  if (currentPath === "/kalender-planung") {
    return <CalendarEventPage key="calendar-event" onBack={() => {
      setCurrentPage("/");
      window.history.pushState({}, "", "/");
    }} />;
  }

  return (
    <div
      className="min-h-screen p-4"
      style={{ background: "var(--bg-main)", color: "var(--text-main)" }}
    >
      {/* Header: Newsbanner oben, Buttons rechts */}
      <div className="flex items-center mb-4 gap-4 flex-wrap">
        {/* Newsbanner mit Uhr links im Banner */}
        <div className="flex items-center gap-3 flex-1 px-6 py-2 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700 min-w-[240px]">
          <style>{marqueeCss}</style>
          <div className="text-xl font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
            {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {(weather || todaysBirthdays.length > 0 || upcomingBirthdays.length > 0) ? (
            <div className="flex-1 overflow-hidden" ref={bannerContainerRef}>
              <div
                className={`flex items-center gap-6 text-base text-white/80 whitespace-nowrap ${bannerShouldScroll ? 'banner-marquee' : ''}`}
                style={bannerShouldScroll ? { width: '200%' } : undefined}
              >
                {/* first copy */}
                <div className="flex items-center gap-6" ref={bannerContentRef}>
                  {weather ? (
                    <div className="flex items-center gap-2 min-w-0">
                      {weather.icon ? (
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                          alt=""
                          className="w-12 h-12"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="whitespace-nowrap">
                        {`${weather.temp !== null ? weather.temp + '°C' : ''}${weather.desc ? ' · ' + weather.desc : ''}`.trim() || 'Wetter'}
                      </span>
                    </div>
                  ) : null}
                  {todaysBirthdays.length > 0 ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-12 h-12 flex items-center justify-center text-3xl"
                        aria-hidden="true"
                      >
                        🎂
                      </span>
                      <span className="whitespace-nowrap">
                        {todaysBirthdays.map((b) => `${b.name} (${b.age})`).join(', ')}
                      </span>
                    </div>
                  ) : null}
                  {upcomingBirthdays.length > 0 ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-12 h-12 flex items-center justify-center text-3xl"
                        aria-hidden="true"
                      >
                        🎉
                      </span>
                      <span className="whitespace-nowrap">
                        {`Anstehende Geburtstage: ${upcomingBirthdays.map((b) => `${b.name} (in ${b.inDays} Tagen)`).join(', ')}`}
                      </span>
                    </div>
                  ) : null}
                </div>
                {/* duplicate for seamless scroll (nur wenn nötig) */}
                {bannerShouldScroll ? (
                  <div className="flex items-center gap-6" aria-hidden="true">
                    {weather ? (
                      <div className="flex items-center gap-2 min-w-0">
                        {weather.icon ? (
                          <img
                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                            alt=""
                            className="w-12 h-12"
                            loading="lazy"
                          />
                        ) : null}
                        <span className="whitespace-nowrap">
                          {`${weather.temp !== null ? weather.temp + '°C' : ''}${weather.desc ? ' · ' + weather.desc : ''}`.trim() || 'Wetter'}
                        </span>
                      </div>
                    ) : null}
                    {todaysBirthdays.length > 0 ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-12 h-12 flex items-center justify-center text-3xl"
                          aria-hidden="true"
                        >
                          🎂
                        </span>
                        <span className="whitespace-nowrap">
                          {todaysBirthdays.map((b) => `${b.name} (${b.age})`).join(', ')}
                        </span>
                      </div>
                    ) : null}
                    {upcomingBirthdays.length > 0 ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-12 h-12 flex items-center justify-center text-3xl"
                          aria-hidden="true"
                        >
                          🎉
                        </span>
                        <span className="whitespace-nowrap">
                          {`Anstehende Geburtstage: ${upcomingBirthdays.map((b) => `${b.name} (in ${b.inDays} Tagen)`).join(', ')}`}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Navigation Buttons rechts */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCurrentPage("/planung");
              window.history.pushState({}, "", "/planung");
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 whitespace-nowrap"
          >
            🍽
          </button>
          <button
            onClick={() => {
              setCurrentPage("/kalender-planung");
              window.history.pushState({}, "", "/kalender-planung");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
          >
            📅
          </button>
        </div>
      </div>

      {/* Wochenkalender Titel + Wochenwechsel unter dem Banner */}
      <div className="flex items-center justify-start gap-3 mb-4 flex-wrap">
        <h1 className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
          {calendarViewMode === "rolling" ? "Rollierende Ansicht" : "Wochenkalender"}
        </h1>
        {calendarViewMode === "week" ? (
          <>
            <button
              onClick={() =>
                setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(prev.getDate() - 7);
                  return d;
                })
              }
              className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              aria-label="Vorherige Woche"
            >
              ←
            </button>
            <div className="text-sm text-gray-300 min-w-[150px] text-center">
              {(() => {
                const start = new Date(viewStartDate);
                const end = new Date(viewStartDate);
                end.setDate(start.getDate() + viewDays - 1);
                const fmt = (d) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                return `${fmt(start)} – ${fmt(end)}`;
              })()}
            </div>
            <button
              onClick={() => setWeekStart(getMonday())}
              className="px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-600"
            >
              Heute
            </button>
            <button
              onClick={() =>
                setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(prev.getDate() + 7);
                  return d;
                })
              }
              className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              aria-label="Nächste Woche"
            >
              →
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() =>
                setRollingCenter((prev) => {
                  const d = new Date(prev);
                  d.setDate(prev.getDate() - 1);
                  return d;
                })
              }
              className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              aria-label="Vorheriger Tag"
            >
              ←
            </button>
            <div className="text-sm text-gray-300 min-w-[150px] text-center">
              {(() => {
                const start = new Date(viewStartDate);
                const end = new Date(viewStartDate);
                end.setDate(start.getDate() + viewDays - 1);
                const fmt = (d) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                return `${fmt(start)} – ${fmt(end)}`;
              })()}
            </div>
            <button
              onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setRollingCenter(d);
              }}
              className="px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-600"
            >
              Heute
            </button>
            <button
              onClick={() =>
                setRollingCenter((prev) => {
                  const d = new Date(prev);
                  d.setDate(prev.getDate() + 1);
                  return d;
                })
              }
              className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              aria-label="Nächster Tag"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Kalender */}
      <div className="mb-6">
        <div className="overflow-x-auto card">
          {calendarLoading ? (
            <div className="p-4">Lade Kalender...</div>
          ) : calendarError ? (
            <div className="text-red-500 p-4">{calendarError}</div>
          ) : (
            <>
              {familyWithOther && familyWithOther.length > 0 ? (
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-slate-100" style={{ backgroundColor: "#f1f5f9" }}>
                        Person
                      </th>
                      {Array.from({ length: viewDays }, (_, i) => {
                        const baseDate = new Date(viewStartDate);
                        const date = new Date(baseDate);
                        date.setDate(baseDate.getDate() + i);
                        const todayBg = isToday(date) ? "#78350f" : "#f1f5f9";
                        return (
                          <th
                            key={i}
                            className="border p-2 bg-slate-100 min-w-32"
                            style={{ backgroundColor: todayBg }}
                          >
                            <div>{["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()]}</div>
                            <div className="text-xs">
                              {date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {familyWithOther.map((memberName, memberIndex) => (
                      <tr key={memberIndex}>
                        <td
                          className="border p-2 font-semibold bg-slate-50"
                          style={{ backgroundColor: "#334155", color: "#f1f5f9" }}
                        >
                          {memberName}
                        </td>
                        {Array.from({ length: viewDays }, (_, dayIndex) => {
                          const baseDate = new Date(viewStartDate);
                          const date = new Date(baseDate);
                          date.setDate(baseDate.getDate() + dayIndex);
                          const dateStr = getLocalDateString(date);

                          const dayEvents = classifiedEvents.filter((ev) => {
                            const evStart = new Date(ev.start);
                            const evStartStr = getLocalDateString(evStart);
                            
                            // Für mehrtägige Events: prüfe ob der Tag im Zeitraum liegt
                            if (ev.end && ev.allDay) {
                              const evEnd = new Date(ev.end);
                              // Setze beide auf Mitternacht für Vergleich
                              const checkDate = new Date(date);
                              checkDate.setHours(0, 0, 0, 0);
                              const startDate = new Date(evStart);
                              startDate.setHours(0, 0, 0, 0);
                              const endDate = new Date(evEnd);
                              endDate.setHours(0, 0, 0, 0);
                              
                              // Event anzeigen wenn Tag zwischen Start und Ende liegt
                              return checkDate >= startDate && checkDate < endDate && ev.owner === memberName;
                            }
                            
                            // Für normale Events: nur am Starttag anzeigen
                            return evStartStr === dateStr && ev.owner === memberName;
                          });

                          return (
                            <td
                              key={dayIndex}
                              className="border p-1 align-top"
                              style={{
                                backgroundColor: isToday(date) ? "#2d2416" : "#232526",
                                color: isToday(date) ? "#d97706" : "inherit",
                              }}
                            >
                              <div className="text-xs space-y-1">
                                {/* Activity Icons für diese Person an diesem Tag */}
                                {(dayActivityIcons[dateStr]?.[memberName] || []).length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {dayActivityIcons[dateStr][memberName].map((iconId) => {
                                      const icon = activityIcons.find(a => a.id === iconId);
                                      if (!icon) return null;
                                      if (icon.iconType === "emoji" || !icon.iconType) {
                                        return (
                                          <span key={iconId} title={icon.activity} className="text-5xl">
                                            {icon.icon}
                                          </span>
                                        );
                                      } else if (icon.iconType === "icon" && icon.iconValue) {
                                        // SVG icon rendering: bevorzugt iconSvg aus DB, sonst Fallback auf svgIcons-Lookup
                                        if (icon.iconSvg && icon.iconSvg.trim().startsWith('<svg')) {
                                          return (
                                            <span key={iconId} title={icon.activity} className="text-5xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(icon.iconSvg) }} />
                                          );
                                        } else {
                                          const svgIcon = svgIcons?.find(s => s.name === icon.iconValue);
                                          return svgIcon ? (
                                            <span key={iconId} title={icon.activity} className="text-5xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(svgIcon.svg) }} />
                                          ) : (
                                            <span key={iconId} title={icon.activity} className="text-5xl">🔲</span>
                                          );
                                        }
                                      } else if (icon.iconType === "image" && icon.iconValue) {
                                        // always use backend url for /uploads/
                                        const backendUrl = window.location.origin.includes(':3000')
                                          ? window.location.origin.replace(':3000', ':4000')
                                          : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000');
                                        const imageUrl = icon.iconValue.startsWith('/uploads/')
                                          ? backendUrl + icon.iconValue
                                          : icon.iconValue;
                                        return (
                                          <img
                                            key={iconId}
                                            title={icon.activity}
                                            src={imageUrl}
                                            alt={icon.activity}
                                            className="w-12 h-12 object-contain rounded border border-slate-500 align-middle"
                                            style={{ display: 'inline-block', verticalAlign: 'middle' }}
                                          />
                                        );
                                      } else {
                                        return (
                                          <span key={iconId} title={icon.activity} className="text-5xl">❓</span>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                                
                                {dayEvents.map((ev) => (
                                  <div
                                    key={ev.id}
                                    className="p-2 rounded text-xs border-l-2"
                                    style={{ backgroundColor: "#1f2937", borderColor: "#475569", color: "#e2e8f0" }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <div className="truncate">
                                        {ev.uid && ev.start && !ev.allDay
                                          ? `${new Date(ev.start).toLocaleTimeString("de-DE", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })} `
                                          : ""}
                                        {ev.summary.replace(memberName + ":", "").trim()}
                                      </div>
                                      {ev.uid && <span className="text-sm" title="iCal Ereignis">📅</span>}
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
      </div>

      {/* Essensplan + Todos + Notizen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max lg:auto-rows-fr items-stretch">
        {/* Essensplan */}
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent)" }}>
            🍽 Essensplan
          </h2>
          <div className="overflow-x-auto card flex-1 flex flex-col">
            {mealPlanLoading ? (
              <div className="p-4">Lade Essensplan...</div>
            ) : mealPlanError ? (
              <div className="text-red-500 p-4">{mealPlanError}</div>
            ) : (
              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-slate-100" style={{ backgroundColor: "#f1f5f9" }}>
                      Tag
                    </th>
                    {meals
                      .filter((mealTime) => mealVisibility[mealTime])
                      .map((mealTime) => (
                        <th
                          key={mealTime}
                          className="border p-2 bg-slate-100"
                          style={{ backgroundColor: "#f1f5f9" }}
                        >
                          {mealTime}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: viewDays }, (_, dayIndex) => {
                    const baseDate = new Date(viewStartDate);
                    const date = new Date(baseDate);
                    date.setDate(baseDate.getDate() + dayIndex);
                    const dateStr = getLocalDateString(date);
                    const todayBg = isToday(date) ? "#2d2416" : "#232526";

                    return (
                      <tr key={dayIndex}>
                        <td
                          className="border p-2 font-semibold"
                          style={{ backgroundColor: todayBg, color: isToday(date) ? "#d97706" : "#e2e8f0" }}
                        >
                          {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()]}
                        </td>
                        {meals
                          .filter((mealTime) => mealVisibility[mealTime])
                          .map((mealTime) => {
                            const mealTypeMap = { Morgens: 0, Mittags: 1, Abends: 2 };
                            const mealTypeNum = mealTypeMap[mealTime];

                            const dayMeal = (mealPlan || [])
                              .filter((meal) => {
                                try {
                                  const mealDateStr = getLocalDateString(new Date(meal.date));
                                  return mealDateStr === dateStr && meal.mealType === mealTypeNum;
                                } catch (e) {
                                  return false;
                                }
                              })
                              .reduce((highest, current) =>
                                !highest || current.id > highest.id ? current : highest,
                                null
                              );

                            return (
                              <td
                                key={`${dayIndex}-${mealTime}`}
                                className="border p-2 text-center align-middle"
                                style={{ backgroundColor: todayBg, color: isToday(date) ? "#d97706" : "#e2e8f0" }}
                              >
                                <div className="text-sm">
                                  {dayMeal ? (
                                    dayMeal.recipeUrl ? (
                                      <a
                                        href={ensureProtocol(dayMeal.recipeUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold hover:underline text-blue-400"
                                      >
                                        {dayMeal.meal}
                                      </a>
                                    ) : (
                                      <span className="font-semibold">{dayMeal.meal}</span>
                                    )
                                  ) : (
                                    <div className="text-gray-500">-</div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Todos */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              ✅ Todos
            </h2>
            <button
              onClick={() => setShowAddTodoModal(true)}
              className="w-8 h-8 rounded-full bg-green-700 text-white text-lg hover:bg-green-600 flex items-center justify-center"
              title="Neues To-do hinzufügen"
            >
              +
            </button>
          </div>
          <div className="card p-4 flex-1 flex flex-col">
            {todosLoading ? (
              <div className="p-2">Lade To-dos…</div>
            ) : todosError ? (
              <div className="text-red-500 p-2">{todosError}</div>
            ) : visibleTodos.length === 0 ? (
              <div className="text-slate-400 p-2">Keine To-dos vorhanden.</div>
            ) : (
              <ul className="divide-y divide-slate-700 flex-1 overflow-y-auto">
                {visibleTodos.map((todo) => {
                  const done = !!todo.done;
                  const recentlyDone = isRecentlyDone(todo);
                  return (
                    <li key={todo.id} className="py-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-green-600 flex-shrink-0"
                        checked={done}
                        onChange={() => handleToggleTodo(todo)}
                        aria-label="To-do erledigt"
                      />
                      <div className="flex-1">
                        <div 
                          className={`cursor-pointer hover:text-blue-400 transition text-sm ${done ? "line-through text-green-400" : ""}`}
                          onClick={() => {
                            console.log("TODO clicked:", todo);
                            setEditTodo(todo);
                            setEditTodoText(todo.text);
                            setEditTodoDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : "");
                          }}
                          title="Klick zum Bearbeiten"
                        >
                          {todo.text}
                        </div>
                        {!done && todo.dueDate && (
                          <div className="text-xs mt-1">
                            <span className={new Date(todo.dueDate) < new Date() ? "text-red-400" : "text-slate-300"}>
                              Fällig am {new Date(todo.dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </span>
                          </div>
                        )}
                        {done && recentlyDone && todo.doneAt && (
                          <div className="text-xs text-slate-400 mt-1">
                            Erledigt am
                            {" "}
                            {new Date(todo.doneAt).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo)}
                        className="px-2 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                        title="Löschen"
                      >
                        🗑
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Notizen */}
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent)" }}>
            📝 Notizen
          </h2>
          <div 
            className="card p-4 flex-1 flex flex-col overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-500 transition"
            onClick={() => {
              setNotesModalText(notesList.length > 0 ? notesList[0].content || "" : "");
              setNotesEditMode(true);
              setShowNotesModal(true);
            }}
          >
            {notesLoading ? (
              <div className="p-2 text-sm">Lade Notizen…</div>
            ) : notesError ? (
              <div className="text-red-500 p-2 text-sm">{notesError}</div>
            ) : (
              <div className="prose prose-invert prose-lg max-w-none flex-1 overflow-y-auto">
                <ReactMarkdown>
                  {notesList.length > 0 && notesList[0].content
                    ? notesList[0].content
                    : "*Klicken zum Bearbeiten...*"}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notizen Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: "var(--accent)" }}>
                📝 Notizen bearbeiten
              </h3>
              <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setNotesEditMode(true)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    notesEditMode
                      ? "bg-slate-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  onClick={() => setNotesEditMode(false)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    !notesEditMode
                      ? "bg-slate-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  👁️ Vorschau
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
              {/* Editor / Preview */}
              <div className="flex-1 flex flex-col min-h-0">
                {notesEditMode ? (
                  <textarea
                    className="w-full bg-slate-700 text-slate-100 text-lg resize-none outline-none flex-1 min-h-0 font-mono p-3 rounded border border-slate-600"
                    placeholder="Notiz eingeben… (Markdown wird unterstützt)"
                    value={notesModalText}
                    onChange={(e) => setNotesModalText(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="prose prose-invert prose-lg max-w-none flex-1 overflow-y-auto bg-slate-700 p-3 rounded border border-slate-600">
                    <ReactMarkdown>
                      {notesModalText || "*Keine Notizen vorhanden*"}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {/* Markdown Cheat Sheet */}
              {notesEditMode && (
                <div className="w-64 bg-slate-700/50 rounded border border-slate-600 p-3 overflow-y-auto text-xs">
                  <h4 className="font-bold text-slate-300 mb-2">📖 Markdown Hilfe</h4>
                  <div className="space-y-2 text-slate-400">
                    <div>
                      <span className="text-slate-300 font-mono"># Überschrift 1</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">## Überschrift 2</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">### Überschrift 3</span>
                    </div>
                    <hr className="border-slate-600" />
                    <div>
                      <span className="text-slate-300 font-mono">**fett**</span>
                      <span className="ml-2">→ <strong>fett</strong></span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">*kursiv*</span>
                      <span className="ml-2">→ <em>kursiv</em></span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">~~durchgestrichen~~</span>
                    </div>
                    <hr className="border-slate-600" />
                    <div>
                      <span className="text-slate-300 font-mono">- Aufzählung</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">1. Nummerierung</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">- [ ] Checkbox</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">- [x] Erledigt</span>
                    </div>
                    <hr className="border-slate-600" />
                    <div>
                      <span className="text-slate-300 font-mono">`Code`</span>
                      <span className="ml-2">→ <code className="bg-slate-600 px-1 rounded">Code</code></span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">&gt; Zitat</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">[Link](url)</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-mono">---</span>
                      <span className="ml-2">→ Trennlinie</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  if (notesList.length > 0) {
                    handleSaveNote(notesList[0], "content", notesModalText);
                  } else if (notesModalText.trim()) {
                    handleAddNote("", notesModalText);
                  }
                  setShowNotesModal(false);
                }}
                className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-500 text-white transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showAddTodoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>
              Neues To-do
            </h3>
            <input
              type="text"
              className="w-full rounded px-3 py-2 mb-4 bg-slate-700 text-slate-100 border border-slate-600"
              placeholder="To-do Text eingeben…"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTodo();
                if (e.key === "Escape") setShowAddTodoModal(false);
              }}
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-sm mb-1">Fälligkeitsdatum (optional)</label>
              <input
                type="date"
                className="w-full rounded px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddTodoModal(false);
                  setNewTodoText("");
                  setNewTodoDueDate("");
                }}
                className="px-3 py-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddTodo}
                className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {editTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>
              To-do bearbeiten
            </h3>
            <input
              type="text"
              className="w-full rounded px-3 py-2 mb-4 bg-slate-700 text-slate-100 border border-slate-600"
              placeholder="To-do Text eingeben…"
              value={editTodoText}
              onChange={(e) => setEditTodoText(e.target.value)}
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-sm mb-1">Fälligkeitsdatum (optional)</label>
              <input
                type="date"
                className="w-full rounded px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600"
                value={editTodoDueDate}
                onChange={(e) => setEditTodoDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditTodo(null)}
                className="px-3 py-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  if (!editTodoText.trim()) return;
                  try {
                    const updated = await saveTodo({
                      id: editTodo.id,
                      text: editTodoText,
                      done: editTodo.done,
                      doneAt: editTodo.doneAt,
                      dueDate: editTodoDueDate ? new Date(editTodoDueDate).toISOString() : null
                    });
                    setTodos((prev) => prev.map((t) => (t.id === editTodo.id ? updated : t)));
                    setEditTodo(null);
                    setToast({ visible: true, message: "To-do aktualisiert" });
                    setTimeout(() => setToast({ visible: false, message: "" }), 2000);
                  } catch (e) {
                    setTodosError("Fehler beim Speichern des To-dos");
                  }
                }}
                className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div
          className="fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white"
          style={{ backgroundColor: "#16a34a" }}
          role="status"
          aria-live="polite"
        >
          ✅ {toast.message}
        </div>
      )}
    </div>
  );
}

