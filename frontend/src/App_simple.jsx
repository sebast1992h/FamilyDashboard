import { useEffect, useState } from "react";
import { fetchNotes, saveNote, deleteNote, fetchTodos, saveTodo, deleteTodo, fetchMealPlan, saveMealPlan, deleteMealPlan, fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from "./api";
import { fetchVersion } from "./versionApi";

export default function App() {
  const [todos, setTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosError, setTodosError] = useState("");
  const [editTodo, setEditTodo] = useState(null);
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

  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const meals = ["Morgens", "Mittags", "Abends"];

  // To-dos aus DB laden
  useEffect(() => {
    async function loadTodos() {
      setTodosLoading(true);
      try {
        const data = await fetchTodos();
        setTodos(data);
        setTodosError("");
      } catch (e) {
        setTodosError("Fehler beim Laden der To-dos");
      } finally {
        setTodosLoading(false);
      }
    }
    loadTodos();
  }, []);

  async function handleTodoSave(todo) {
    try {
      const saved = await saveTodo(todo);
      setEditTodo(null);
      setTodos(list => {
        const idx = list.findIndex(t => t.id === saved.id);
        if (idx >= 0) {
          const copy = [...list]; copy[idx] = saved; return copy;
        } else {
          return [...list, saved];
        }
      });
    } catch (e) {
      setTodosError("Fehler beim Speichern des To-dos");
    }
  }

  async function handleTodoDelete(id) {
    try {
      await deleteTodo(id);
      setTodos(list => list.filter(t => t.id !== id));
    } catch (e) {
      setTodosError("Fehler beim Löschen des To-dos");
    }
  }

  async function handleTodoToggle(todo) {
    await handleTodoSave({ ...todo, done: !todo.done, doneAt: !todo.done ? new Date().toISOString() : null });
  }

  // Notizen aus DB laden
  useEffect(() => {
    async function loadNotes() {
      setNotesLoading(true);
      try {
        const data = await fetchNotes();
        setNotesList(data);
        setNotesError("");
      } catch (e) {
        setNotesError("Fehler beim Laden der Notizen");
      } finally {
        setNotesLoading(false);
      }
    }
    loadNotes();
  }, []);

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
    loadMealPlan();
  }, []);

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
    loadCalendarEvents();
  }, []);

  async function handleCalendarEventSave(event) {
    try {
      const saved = await saveCalendarEvent(event);
      setEditCalendarEvent(null);
      setCalendarEvents(list => {
        const idx = list.findIndex(e => e.id === saved.id);
        if (idx >= 0) {
          const copy = [...list]; copy[idx] = saved; return copy;
        } else {
          return [...list, saved];
        }
      });
    } catch (e) {
      setCalendarError("Fehler beim Speichern des Kalendereintrags");
    }
  }

  async function handleCalendarEventDelete(id) {
    try {
      await deleteCalendarEvent(id);
      setCalendarEvents(list => list.filter(e => e.id !== id));
    } catch (e) {
      setCalendarError("Fehler beim Löschen des Kalendereintrags");
    }
  }

  // Filter: Zeige erledigte To-dos nur, wenn sie in den letzten 10 Tagen abgehakt wurden
  const now = new Date();
  const todosFiltered = todos.filter(t => {
    if (!t.done) return true;
    if (!t.doneAt) return true;
    const doneAtDate = new Date(t.doneAt);
    const diffDays = (now - doneAtDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 10;
  });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Family Dashboard</h1>

      {/* Termine */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🗓 Termine</h2>
        {calendarLoading ? (
          <div>Lade Termine...</div>
        ) : calendarError ? (
          <div className="text-red-500">{calendarError}</div>
        ) : (
          <div className="bg-white border rounded p-4">
            <table className="min-w-full border text-base">
              <thead>
                <tr>
                  <th className="border p-2">Datum</th>
                  <th className="border p-2">Start</th>
                  <th className="border p-2">Ende</th>
                  <th className="border p-2">Titel</th>
                  <th className="border p-2">Ort</th>
                  <th className="border p-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {calendarEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className="border p-2">{new Date(ev.start).toLocaleDateString('de-DE')}</td>
                    <td className="border p-2">{ev.allDay ? "Ganztägig" : new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                    <td className="border p-2">{ev.end ? new Date(ev.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false }) : ""}</td>
                    <td className="border p-2">{ev.summary}</td>
                    <td className="border p-2">{ev.location || ""}</td>
                    <td className="border p-2">
                      <button className="text-blue-600 mr-2 px-2 py-1 border rounded" onClick={() => setEditCalendarEvent(ev)}>Bearbeiten</button>
                      <button className="text-red-600 px-2 py-1 border rounded" onClick={() => handleCalendarEventDelete(ev.id)}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded" onClick={() => setEditCalendarEvent({ summary: "", location: "", start: new Date().toISOString(), end: "", allDay: false })}>Neuer Termin</button>
          </div>
        )}
        
        {editCalendarEvent && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h3 className="font-bold mb-2">Termin bearbeiten</h3>
            <input className="w-full mb-2 p-2 border rounded" placeholder="Titel" value={editCalendarEvent.summary} onChange={e => setEditCalendarEvent({ ...editCalendarEvent, summary: e.target.value })} />
            <input className="w-full mb-2 p-2 border rounded" placeholder="Ort" value={editCalendarEvent.location} onChange={e => setEditCalendarEvent({ ...editCalendarEvent, location: e.target.value })} />
            <input className="w-full mb-2 p-2 border rounded" type="datetime-local" value={editCalendarEvent.start ? new Date(editCalendarEvent.start).toISOString().slice(0,16) : ""} onChange={e => setEditCalendarEvent({ ...editCalendarEvent, start: new Date(e.target.value).toISOString() })} />
            <input className="w-full mb-2 p-2 border rounded" type="datetime-local" value={editCalendarEvent.end ? new Date(editCalendarEvent.end).toISOString().slice(0,16) : ""} onChange={e => setEditCalendarEvent({ ...editCalendarEvent, end: new Date(e.target.value).toISOString() })} />
            <label className="block mb-2"><input type="checkbox" checked={!!editCalendarEvent.allDay} onChange={e => setEditCalendarEvent({ ...editCalendarEvent, allDay: e.target.checked })} /> Ganztägig</label>
            <button className="mr-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => handleCalendarEventSave(editCalendarEvent)}>Speichern</button>
            <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setEditCalendarEvent(null)}>Abbrechen</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Essensplan */}
        <div>
          <h2 className="text-2xl font-bold mb-4">🍽 Essensplan</h2>
          {mealPlanLoading ? (
            <div>Lade Essensplan...</div>
          ) : mealPlanError ? (
            <div className="text-red-500">{mealPlanError}</div>
          ) : (
            <div className="bg-white border rounded p-4">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Tag</th>
                    {meals.map((meal, i) => (
                      <th key={i} className="border p-2">{meal}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, dayIdx) => (
                    <tr key={dayIdx}>
                      <td className="border p-2 font-semibold">{day}</td>
                      {meals.map((_, mealIdx) => {
                        const entry = mealPlan.find(m => m.day === dayIdx && m.mealType === mealIdx);
                        return (
                          <td className="border p-2" key={mealIdx}>
                            {entry ? (
                              <div>
                                <span>{entry.meal}</span>
                                <div className="mt-1">
                                  <button className="text-blue-600 text-xs mr-2" onClick={() => setEditMeal(entry)}>Bearbeiten</button>
                                  <button className="text-red-600 text-xs" onClick={() => handleMealDelete(entry.id)}>Löschen</button>
                                </div>
                              </div>
                            ) : (
                              <button className="text-green-600 w-full p-1" onClick={() => setEditMeal({ day: dayIdx, mealType: mealIdx, meal: "" })}>+ Hinzufügen</button>
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
          
          {editMeal && (
            <div className="mt-4 p-4 border rounded bg-gray-50">
              <h3 className="font-bold mb-2">Gericht bearbeiten</h3>
              <input className="w-full mb-2 p-2 border rounded" placeholder="Gericht" value={editMeal.meal} onChange={e => setEditMeal({ ...editMeal, meal: e.target.value })} />
              <button className="mr-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => handleMealSave(editMeal)}>Speichern</button>
              <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setEditMeal(null)}>Abbrechen</button>
            </div>
          )}
        </div>

        {/* To-dos */}
        <div>
          <h2 className="text-2xl font-bold mb-4">✅ To-dos</h2>
          {todosLoading ? (
            <div>Lade To-dos...</div>
          ) : todosError ? (
            <div className="text-red-500">{todosError}</div>
          ) : (
            <div className="bg-white border rounded p-4 max-h-96 overflow-auto">
              {todosFiltered.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                  <input
                    type="checkbox"
                    checked={!!t.done}
                    onChange={() => handleTodoToggle(t)}
                    className="w-5 h-5"
                  />
                  <span className="flex-1" style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#888' : undefined }}>{t.text}</span>
                  {!t.done && <button className="text-blue-600 text-sm" onClick={() => setEditTodo(t)}>Bearbeiten</button>}
                  <button className="text-red-600 text-sm" onClick={() => handleTodoDelete(t.id)}>Löschen</button>
                </div>
              ))}
            </div>
          )}
          <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded" onClick={() => setEditTodo({ text: "", done: false })}>Neues To-do</button>
          
          {editTodo && (
            <div className="mt-4 p-4 border rounded bg-gray-50">
              <h3 className="font-bold mb-2">To-do bearbeiten</h3>
              <input className="w-full mb-2 p-2 border rounded" placeholder="Text" value={editTodo.text} onChange={e => setEditTodo({ ...editTodo, text: e.target.value })} />
              <button className="mr-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => handleTodoSave(editTodo)}>Speichern</button>
              <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setEditTodo(null)}>Abbrechen</button>
            </div>
          )}
        </div>
      </div>

      {/* Notizen */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">📝 Notizen</h2>
        {notesLoading ? (
          <div>Lade Notizen...</div>
        ) : notesError ? (
          <div className="text-red-500">{notesError}</div>
        ) : (
          <div className="bg-white border rounded p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notesList.map((n) => (
                <div key={n.id} className="border rounded p-3 bg-yellow-100">
                  <h4 className="font-bold">{n.title}</h4>
                  <p className="text-sm mt-1">{n.content}</p>
                  <div className="mt-2">
                    <button className="text-blue-600 text-sm mr-2" onClick={() => setEditNote(n)}>Bearbeiten</button>
                    <button className="text-red-600 text-sm" onClick={() => handleNoteDelete(n.id)}>Löschen</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded" onClick={() => setEditNote({ title: "", content: "" })}>Neue Notiz</button>
          </div>
        )}
        
        {editNote && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h3 className="font-bold mb-2">Notiz bearbeiten</h3>
            <input className="w-full mb-2 p-2 border rounded" placeholder="Titel" value={editNote.title} onChange={e => setEditNote({ ...editNote, title: e.target.value })} />
            <textarea className="w-full mb-2 p-2 border rounded" rows="4" placeholder="Inhalt" value={editNote.content} onChange={e => setEditNote({ ...editNote, content: e.target.value })} />
            <button className="mr-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => handleNoteSave(editNote)}>Speichern</button>
            <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setEditNote(null)}>Abbrechen</button>
          </div>
        )}
      </div>
    </div>
  );
}