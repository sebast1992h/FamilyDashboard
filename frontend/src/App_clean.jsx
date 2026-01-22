import { useEffect, useState, useRef } from "react";
import { fetchNotes, saveNote, deleteNote, fetchTodos, saveTodo, deleteTodo, fetchMealPlan, saveMealPlan, deleteMealPlan, fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from "./api";
import { fetchVersion } from "./versionApi";
import ConfigPage from "./ConfigPage";

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
  const [route, setRoute] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("dashboardAuth") === "1");
  const [error, setError] = useState("");
  const [version, setVersion] = useState("");
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [editNote, setEditNote] = useState(null);
  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");
  const [editMeal, setEditMeal] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [editCalendarEvent, setEditCalendarEvent] = useState(null);
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

  const isMobile = useIsMobile(768);

  function handleLogin(password) {
    if (password === "admin") {
      localStorage.setItem("dashboardAuth", "1");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  if (route === "config") {
    return <ConfigPage isAuthenticated={isAuthenticated} onLogin={handleLogin} onBack={() => setRoute("dashboard")} />;
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent)' }}>Family Dashboard</h1>
        <p className="mb-4">Familie: {family ? family.length : 0} Mitglieder</p>
        <div className="space-x-4">
          <button 
            onClick={() => setRoute("config")}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Zur Konfiguration
          </button>
        </div>
        <div className="mt-8 text-left max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-2">🗓 Kalender-Info</h2>
          <p>Der Kalender wird angezeigt, sobald Familienmitglieder konfiguriert sind.</p>
        </div>
      </div>
    </div>
  );
}