
import { useEffect, useState } from "react";
import ConfigPage from "./ConfigPage";
import { fetchDashboardConfig, saveDashboardConfig, fetchIcalEvents } from "./api";
import { fetchVersion } from "./versionApi";

function loadAuth() {
  return localStorage.getItem("dashboardAuth") === "1";
}
function saveAuth(val) {
  if (val) localStorage.setItem("dashboardAuth", "1");
  else localStorage.removeItem("dashboardAuth");
}


const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const meals = ["Morgens", "Mittags", "Abends"];


export default function App() {
  const [todos, setTodos] = useState([]);
  const [config, setConfig] = useState(null);
  const [route, setRoute] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(loadAuth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [icalEvents, setIcalEvents] = useState(Array(7).fill([]));
  const [version, setVersion] = useState("");
    // Version beim Start laden
    useEffect(() => {
      fetchVersion().then(setVersion);
    }, []);
  // Intervall aus config, fallback 15
  const refreshInterval = config && typeof config.refreshInterval === 'number' ? config.refreshInterval : 15;


  // Initiales Laden + Auto-Refresh
  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const cfg = await fetchDashboardConfig();
        if (!stopped) {
          setConfig(cfg);
          setTodos(cfg.todos);
          setLoading(false);
        }
        // iCal-Termine laden
        try {
          const events = await fetchIcalEvents();
          if (!stopped) setIcalEvents(events);
        } catch (e) {
          if (!stopped) setIcalEvents(Array(7).fill([]));
        }
      } catch (e) {
        if (!stopped) {
          setError("Fehler beim Laden der Dashboard-Daten");
          setLoading(false);
        }
      }
    }
    load();
    if (refreshInterval > 0) {
      const timer = setInterval(load, refreshInterval * 1000);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }
    return () => { stopped = true; };
  }, [refreshInterval]);

  useEffect(() => {
    if (config) setTodos(config.todos);
  }, [config]);


  async function handleSave(newConfig) {
    setConfig(newConfig);
    setLoading(true);
    try {
      await saveDashboardConfig(newConfig);
      setConfig(newConfig);
      setRoute("config");
    } catch (e) {
      setError("Fehler beim Speichern der Dashboard-Daten");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(pw) {
    if (pw === "familie2025") {
      setIsAuthenticated(true);
      saveAuth(true);
      return true;
    }
    return false;
  }

  // Logout-Funktion (optional, z.B. für später)
  // function handleLogout() {
  //   setIsAuthenticated(false);
  //   saveAuth(false);
  //   setRoute("dashboard");
  // }


  if (loading) {
    return <div className="p-8 text-center">Lade Dashboard-Daten...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (route === "config") {
    return <ConfigPage onSave={handleSave} config={config} isAuthenticated={isAuthenticated} onLogin={handleLogin} onBack={() => setRoute("dashboard")} />;
  }

  async function handleTodoToggle(idx) {
    const newTodos = todos.map((todo, i) => i === idx ? { ...todo, done: !todo.done } : todo);
    const newConfig = { ...config, todos: newTodos };
    setTodos(newTodos);
    setConfig(newConfig);
    try {
      await saveDashboardConfig(newConfig);
    } catch (e) {
      setError("Fehler beim Speichern der To-dos");
    }
  }

  return (
    <>
      <div className="min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        <nav className="flex justify-between items-center p-4 shadow" style={{ background: 'var(--accent2)', color: 'var(--accent)' }}>
          <span className="font-bold text-xl">Family Dashboard</span>
          <button className="px-4 py-2" onClick={() => setRoute("config")}>Konfiguration</button>
        </nav>
        <div className="p-4">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent)' }}>🗓 Termine</h2>
            <div className="overflow-x-auto mb-6 card">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-1"> </th>
                    {days.map((day, i) => (
                      <th key={i} className="border p-1">{day}</th>
                    ))}
                  </tr>
                  <tr>
                    <th className="border p-1"></th>
                    {days.map((_, i) => {
                      const now = new Date();
                      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
                      const dayStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      return <th key={i} className="border p-1 text-xs text-gray-500">{dayStr}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {config.family.map((member, mIdx) => (
                    <tr key={mIdx}>
                      <td className="border p-1 font-semibold">{member}</td>
                      {days.map((_, dIdx) => (
                        <td className="border p-1" key={dIdx}>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {config.standardItemPersonPlan && config.standardItemPersonPlan[dIdx] && config.standardItemPersonPlan[dIdx][mIdx] && config.standardItemPersonPlan[dIdx][mIdx].map(itemIdx => {
                              const item = config.standardItems && config.standardItems[itemIdx];
                              if (!item) return null;
                              return (
                                <span key={itemIdx} title={item.name} className="inline-block text-lg align-middle" style={{ filter: 'drop-shadow(0 1px 2px #0002)' }}>{item.icon}</span>
                              );
                            })}
                          </div>
                          <div>
                            {config.termine && config.termine[dIdx] && config.termine[dIdx][mIdx] ? config.termine[dIdx][mIdx] : ""}
                          </div>
                          {/* iCal-Termine für dieses Familienmitglied */}
                          {icalEvents[dIdx] && icalEvents[dIdx][member] && icalEvents[dIdx][member].length > 0 && (
                            <div className="mt-1 text-xs text-blue-700">
                              {icalEvents[dIdx][member].map((ev, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span className="inline-block">📅</span>
                                  <span>{ev.summary}</span>
                                  {ev.start && (
                                    <span className="ml-1 text-gray-500">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                  {ev.location && (
                                    <span className="ml-1 text-gray-400">({ev.location})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* iCal-Termine als eigene Zeile für nicht zugeordnete */}
                  <tr>
                    <td className="border p-1 font-semibold">Kalender</td>
                    {days.map((_, dIdx) => (
                      <td className="border p-1" key={dIdx}>
                        {icalEvents[dIdx] && icalEvents[dIdx]["Kalender"] && icalEvents[dIdx]["Kalender"].length > 0 && (
                          <div>
                            {icalEvents[dIdx]["Kalender"].map((ev, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="inline-block">📅</span>
                                <span>{ev.summary}</span>
                                {ev.start && (
                                  <span className="ml-1 text-gray-500">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                                {ev.location && (
                                  <span className="ml-1 text-gray-400">({ev.location})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent)' }}>🍽 Essensplan</h2>
              <div className="overflow-x-auto card">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      <th className="border p-1"> </th>
                      {meals.map((meal, i) => (
                        <th key={i} className="border p-1">{meal}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, dayIdx) => (
                      <tr key={dayIdx}>
                        <td className="border p-1 font-semibold">{day}</td>
                        {meals.map((_, mealIdx) => (
                          <td className="border p-1" key={mealIdx}>
                            {config.mealplan && config.mealplan[dayIdx] ? config.mealplan[dayIdx][mealIdx] : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent)' }}>✅ To-dos</h2>
              <ul className="card">
                {todos.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={!!t.done}
                      onChange={() => handleTodoToggle(i)}
                      className="accent-green-600 w-5 h-5"
                    />
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#888' : undefined }}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "fixed", right: 12, bottom: 8, fontSize: "0.9em", color: "#888", zIndex: 50 }}>
        Version: {version}
      </div>
    </>
  );
}
