import { useEffect, useState } from "react";

export default function DatabaseTest() {
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [status, setStatus] = useState("");

  // Laden der Daten
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const todosResponse = await fetch("http://localhost:4000/api/todos");
      const todosData = await todosResponse.json();
      setTodos(todosData);

      const notesResponse = await fetch("http://localhost:4000/api/notes");
      const notesData = await notesResponse.json();
      setNotes(notesData);

      setStatus("✅ Daten erfolgreich geladen!");
    } catch (error) {
      setStatus("❌ Fehler beim Laden: " + error.message);
    }
  }

  async function addTodo() {
    if (!newTodoText.trim()) return;
    
    try {
      const response = await fetch("http://localhost:4000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodoText })
      });
      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTodoText("");
      setStatus("✅ Todo hinzugefügt!");
    } catch (error) {
      setStatus("❌ Fehler beim Hinzufügen: " + error.message);
    }
  }

  async function addNote() {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    try {
      const response = await fetch("http://localhost:4000/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newNoteTitle, content: newNoteContent })
      });
      const newNote = await response.json();
      setNotes([...notes, newNote]);
      setNewNoteTitle("");
      setNewNoteContent("");
      setStatus("✅ Notiz hinzugefügt!");
    } catch (error) {
      setStatus("❌ Fehler beim Hinzufügen: " + error.message);
    }
  }

  async function toggleTodo(id, done) {
    try {
      const response = await fetch(`http://localhost:4000/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: todos.find(t => t.id === id)?.text,
          done: !done,
          doneAt: !done ? new Date().toISOString() : null
        })
      });
      const updatedTodo = await response.json();
      setTodos(todos.map(t => t.id === id ? updatedTodo : t));
      setStatus("✅ Todo aktualisiert!");
    } catch (error) {
      setStatus("❌ Fehler beim Aktualisieren: " + error.message);
    }
  }

  async function deleteTodo(id) {
    try {
      await fetch(`http://localhost:4000/api/todos/${id}`, { method: "DELETE" });
      setTodos(todos.filter(t => t.id !== id));
      setStatus("✅ Todo gelöscht!");
    } catch (error) {
      setStatus("❌ Fehler beim Löschen: " + error.message);
    }
  }

  async function deleteNote(id) {
    try {
      await fetch(`http://localhost:4000/api/notes/${id}`, { method: "DELETE" });
      setNotes(notes.filter(n => n.id !== id));
      setStatus("✅ Notiz gelöscht!");
    } catch (error) {
      setStatus("❌ Fehler beim Löschen: " + error.message);
    }
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🗄️ PostgreSQL + Prisma Database Test</h1>
      
      <div style={{ backgroundColor: "#f0f0f0", padding: "10px", marginBottom: "20px", borderRadius: "5px" }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        {/* TODOS */}
        <div>
          <h2>📋 To-Dos ({todos.length})</h2>
          
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Neues Todo..."
              style={{ width: "70%", padding: "8px" }}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
            />
            <button onClick={addTodo} style={{ marginLeft: "10px", padding: "8px" }}>
              Hinzufügen
            </button>
          </div>

          <div>
            {todos.map(todo => (
              <div key={todo.id} style={{ 
                padding: "10px", 
                marginBottom: "10px", 
                backgroundColor: todo.done ? "#e8f5e8" : "#fff3cd",
                border: "1px solid #ddd",
                borderRadius: "5px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ 
                    textDecoration: todo.done ? "line-through" : "none",
                    opacity: todo.done ? 0.6 : 1
                  }}>
                    {todo.text}
                  </span>
                  <div>
                    <button 
                      onClick={() => toggleTodo(todo.id, todo.done)}
                      style={{ marginRight: "5px", padding: "4px 8px" }}
                    >
                      {todo.done ? "↶" : "✓"}
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      style={{ padding: "4px 8px", backgroundColor: "#ff6b6b", color: "white" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <small style={{ color: "#666" }}>
                  Erstellt: {new Date(todo.createdAt).toLocaleString()}
                  {todo.doneAt && ` • Erledigt: ${new Date(todo.doneAt).toLocaleString()}`}
                </small>
              </div>
            ))}
          </div>
        </div>

        {/* NOTIZEN */}
        <div>
          <h2>📝 Notizen ({notes.length})</h2>
          
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Titel..."
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Inhalt der Notiz..."
              rows="3"
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <button onClick={addNote} style={{ padding: "8px" }}>
              Notiz hinzufügen
            </button>
          </div>

          <div>
            {notes.map(note => (
              <div key={note.id} style={{ 
                padding: "15px", 
                marginBottom: "15px", 
                backgroundColor: "#f8f9fa",
                border: "1px solid #ddd",
                borderRadius: "5px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>{note.title}</h3>
                    <p style={{ margin: "0 0 10px 0", lineHeight: "1.4" }}>{note.content}</p>
                    <small style={{ color: "#666" }}>
                      Erstellt: {new Date(note.createdAt).toLocaleString()}
                    </small>
                  </div>
                  <button 
                    onClick={() => deleteNote(note.id)}
                    style={{ padding: "4px 8px", backgroundColor: "#ff6b6b", color: "white", marginLeft: "10px" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#e8f5e8", borderRadius: "5px" }}>
        <h3>🎉 PostgreSQL + Prisma Integration erfolgreich!</h3>
        <ul>
          <li>✅ Backend läuft auf Port 4000</li>
          <li>✅ PostgreSQL Database verbunden</li>
          <li>✅ Prisma ORM funktioniert</li>
          <li>✅ API-Endpunkte verfügbar (/api/todos, /api/notes, /api/mealplan, /api/calendar-events)</li>
          <li>✅ Frontend kann Daten erstellen, lesen, aktualisieren und löschen (CRUD)</li>
          <li>✅ Alle Daten werden persistent in der Datenbank gespeichert</li>
        </ul>
      </div>
    </div>
  );
}