import express from "express";
import cors from "cors";
import ical from "ical";
import fetch from "node-fetch";
import cron from "node-cron";
import { PrismaClient } from '@prisma/client';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// Helper: Configwert aus DB lesen (JSON oder Plain)
async function getConfigValue(key) {
  const entry = await prisma.config.findUnique({ where: { key } });
  if (!entry) return null;
  try {
    return JSON.parse(entry.value);
  } catch (e) {
    return entry.value;
  }
}

// API für Version (liefert statisch oder aus Umgebungsvariable)
app.get("/api/version", (req, res) => {
  const version = process.env.DASHBOARD_VERSION || "1.0.0";
  res.json({ version });
});

// Kalender-API: Nur noch aus DB (CalendarEvent)
app.get("/api/calendar", async (req, res) => {
  try {
    // Optional: ?day=YYYY-MM-DD für Filterung nach Tag
    const where = {};
    if (req.query.day) {
      const day = new Date(req.query.day);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      where.AND = [
        { start: { gte: day } },
        { start: { lt: nextDay } }
      ];
    }
    const events = await prisma.calendarEvent.findMany({ where, orderBy: { start: 'asc' } });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Wetter-API: Nur noch mit Umgebungsvariablen für Koordinaten/API-Key
const weatherCache = { ts: 0, data: null };
const WEATHER_TTL = (process.env.WEATHER_CACHE_TTL_SECONDS ? parseInt(process.env.WEATHER_CACHE_TTL_SECONDS, 10) : 600) * 1000; // default 10min

app.get('/api/weather', async (req, res) => {
  try {
    const now = Date.now();
    if (weatherCache.data && (now - weatherCache.ts) < WEATHER_TTL) {
      return res.json({ cached: true, ...weatherCache.data });
    }
    let key = process.env.OPENWEATHER_API_KEY;
    if (!key) {
      const dbKey = await getConfigValue('openWeatherApiKey');
      if (dbKey && typeof dbKey === 'string') key = dbKey.trim();
    }
    if (!key) return res.status(500).json({ error: 'No weather API key configured' });

    const dbLat = await getConfigValue('weatherLat');
    const dbLon = await getConfigValue('weatherLon');
    const lat = process.env.WEATHER_LAT || (dbLat ? String(dbLat) : '53.865');
    const lon = process.env.WEATHER_LON || (dbLon ? String(dbLon) : '10.686');
    const units = 'metric';
    const lang = 'de';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=${units}&lang=${lang}&appid=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    const respText = await r.text();
    let body = null;
    try { body = JSON.parse(respText); } catch (e) { body = respText; }
    if (!r.ok) {
      return res.status(502).json({ error: 'Weather provider error', status: r.status, provider: body });
    }
    const data = {
      temp: body.main?.temp ?? null,
      feels_like: body.main?.feels_like ?? null,
      desc: body.weather && body.weather[0] && body.weather[0].description ? String(body.weather[0].description) : null,
      icon: body.weather && body.weather[0] && body.weather[0].icon ? String(body.weather[0].icon) : null,
      city: body.name || null,
      humidity: body.main?.humidity ?? null,
      wind_speed: body.wind?.speed ?? null,
      raw: body
    };
    weatherCache.ts = now;
    weatherCache.data = data;
    res.json({ cached: false, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Beispiel: User abfragen
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// CRUD für Notizen
app.get('/api/notes', async (req, res) => {
  const notes = await prisma.note.findMany();
  res.json(notes);
});

app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body;
  const note = await prisma.note.create({ data: { title, content } });
  res.json(note);
});

app.put('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const note = await prisma.note.update({
    where: { id: Number(id) },
    data: { title, content }
  });
  res.json(note);
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.note.delete({ where: { id: Number(id) } });
  res.json({ success: true });
});

// CRUD für To-dos
app.get('/api/todos', async (req, res) => {
  const todos = await prisma.todo.findMany({ orderBy: { id: 'asc' } });
  res.json(todos);
});

app.post('/api/todos', async (req, res) => {
  const { text, dueDate } = req.body;
  const parsedDue = dueDate ? new Date(dueDate) : null;
  const todo = await prisma.todo.create({ data: { text, dueDate: parsedDue } });
  res.json(todo);
});

app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { text, done, doneAt, dueDate } = req.body;
  const parsedDue = dueDate ? new Date(dueDate) : null;
  const todo = await prisma.todo.update({
    where: { id: Number(id) },
    data: { text, done, doneAt, dueDate: parsedDue }
  });
  res.json(todo);
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.todo.delete({ where: { id: Number(id) } });
  res.json({ success: true });
});

// TEST: Manuelles Trigger des Icon-Kopierens
app.post('/api/test/copy-icons-now', async (req, res) => {
  try {
    await copyIconsToNextWeek();
    res.json({ success: true, message: "Icons wurden kopiert" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CRUD für Essensplan
app.get('/api/mealplan', async (req, res) => {
  // Optional: ?date=YYYY-MM-DD&mealType=0,1,2 für Filterung
  const where = {};
  if (req.query.date) {
    const targetDate = new Date(req.query.date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    where.AND = [
      { date: { gte: targetDate } },
      { date: { lt: nextDate } }
    ];
  }
  if (req.query.mealType !== undefined) where.mealType = Number(req.query.mealType);
  const mealplan = await prisma.mealPlan.findMany({ where, orderBy: [{ date: 'asc' }, { mealType: 'asc' }] });
  res.json(mealplan);
});

app.post('/api/mealplan', async (req, res) => {
  const { date, mealType, meal, recipeUrl } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  const entry = await prisma.mealPlan.create({ data: { date: new Date(date), mealType, meal, recipeUrl } });
  res.json(entry);
});

app.put('/api/mealplan/:id', async (req, res) => {
  const { id } = req.params;
  const { date, mealType, meal, recipeUrl } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  const entry = await prisma.mealPlan.update({ where: { id: Number(id) }, data: { date: new Date(date), mealType, meal, recipeUrl } });
  res.json(entry);
});

app.delete('/api/mealplan/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.mealPlan.delete({ where: { id: Number(id) } });
  res.json({ success: true });
});

// CRUD für Kalendereinträge
app.get('/api/calendar-events', async (req, res) => {
  // Optional: ?day=YYYY-MM-DD für Filterung nach Tag
  const where = {};
  if (req.query.day) {
    const day = new Date(req.query.day);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    where.AND = [
      { start: { gte: day } },
      { start: { lt: nextDay } }
    ];
  }
  const events = await prisma.calendarEvent.findMany({ where, orderBy: { start: 'asc' } });
  res.json(events);
});

app.post('/api/calendar-events', async (req, res) => {
  const { summary, location, start, end, allDay, uid } = req.body;
  const event = await prisma.calendarEvent.create({ data: { summary, location, start: new Date(start), end: end ? new Date(end) : null, allDay: !!allDay, uid } });
  res.json(event);
});

app.put('/api/calendar-events/:id', async (req, res) => {
  const { id } = req.params;
  const { summary, location, start, end, allDay, uid } = req.body;
  const event = await prisma.calendarEvent.update({
    where: { id: Number(id) },
    data: { summary, location, start: new Date(start), end: end ? new Date(end) : null, allDay: !!allDay, uid }
  });
  res.json(event);
});

// Endpoint zum Löschen aller iCal-importierten Events (haben uid) - MUSS vor /:id stehen!
app.delete('/api/calendar-events/ical', async (req, res) => {
  try {
    const result = await prisma.calendarEvent.deleteMany({
      where: {
        uid: {
          not: null
        }
      }
    });
    console.log("Deleted", result.count, "iCal events");
    res.json({ success: true, deleted: result.count });
  } catch (e) {
    console.error("Error deleting iCal events:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/calendar-events/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.calendarEvent.delete({ where: { id: Number(id) } });
  res.json({ success: true });
});

// Config API
app.get('/api/config', async (req, res) => {
  try {
    console.log("GET /api/config - Fetching config data");
    const configs = await prisma.config.findMany();
    console.log("GET /api/config - Found", configs.length, "config entries");
    const configObject = {};
    configs.forEach(config => {
      try {
        configObject[config.key] = JSON.parse(config.value);
      } catch (e) {
        configObject[config.key] = config.value; // Fallback für non-JSON Werte
      }
    });
    console.log("GET /api/config - Returning config:", JSON.stringify(configObject, null, 2).substring(0, 200));
    res.json(configObject);
  } catch (e) {
    console.error("GET /api/config - Error:", e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const configData = req.body;
    console.log("POST /api/config - Received data:", JSON.stringify(configData, null, 2));
    
    // Für jeden Key im Config-Objekt einzeln speichern
    for (const [key, value] of Object.entries(configData)) {
      console.log(`Saving config key: ${key}`, value);
      const valueString = JSON.stringify(value);
      console.log(`Saving as string: ${valueString}`);
      
      await prisma.config.upsert({
        where: { key },
        update: { value: valueString },
        create: { key, value: valueString }
      });
    }
    
    console.log("Config saved successfully");
    res.json({ success: true, message: 'Konfiguration gespeichert' });
  } catch (e) {
    console.error("Error saving config:", e);
    res.status(500).json({ error: e.message });
  }
});

// Activity Icon API
app.get('/api/activity-icons', async (req, res) => {
  try {
    const icons = await prisma.activityIcon.findMany({
      orderBy: { activity: 'asc' }
    });
    res.json(icons);
  } catch (e) {
    console.error("Error fetching activity icons:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/activity-icons', async (req, res) => {
  try {
    const { activity, icon } = req.body;
    if (!activity || !icon) {
      return res.status(400).json({ error: 'activity and icon are required' });
    }
    
    const activityIcon = await prisma.activityIcon.upsert({
      where: { activity },
      update: { icon },
      create: { activity, icon }
    });
    res.json(activityIcon);
  } catch (e) {
    console.error("Error creating/updating activity icon:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/activity-icons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.activityIcon.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting activity icon:", e);
    res.status(500).json({ error: e.message });
  }
});

// Day Activity Icons API
app.get('/api/day-activity-icons/:date/:personName', async (req, res) => {
  try {
    const dateStr = req.params.date; // Format: YYYY-MM-DD
    const personName = req.params.personName;
    const date = new Date(dateStr + 'T00:00:00Z');
    
    const icons = await prisma.dayActivityIcon.findMany({
      where: { date, personName }
    });
    res.json(icons);
  } catch (e) {
    console.error("Error fetching day activity icons:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/day-activity-icons/:date/:personName', async (req, res) => {
  try {
    const dateStr = req.params.date; // Format: YYYY-MM-DD
    const personName = req.params.personName;
    const { activityIconIds } = req.body;
    
    if (!Array.isArray(activityIconIds)) {
      return res.status(400).json({ error: 'activityIconIds must be an array' });
    }
    
    const date = new Date(dateStr + 'T00:00:00Z');
    
    // Delete all existing icons for this day and person
    await prisma.dayActivityIcon.deleteMany({ where: { date, personName } });
    
    // Create new ones
    const result = await Promise.all(
      activityIconIds.map(activityIconId =>
        prisma.dayActivityIcon.create({
          data: { date, personName, activityIconId }
        })
      )
    );
    
    res.json(result);
  } catch (e) {
    console.error("Error saving day activity icons:", e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// iCal Import/Sync Funktion (wiederverwendbar)
// ============================================

/**
 * Importiert/Synchronisiert iCal-Events aus einer URL
 * Strategie: 
 * - Update existierende Events (basierend auf UID+start)
 * - Füge neue hinzu
 * - Lösche Events die nicht mehr im iCal sind (nur Events mit UID)
 * - Manuelle Events (ohne UID) bleiben erhalten
 */
async function processIcalData(icalUrl) {
  try {
    console.log("\n========== iCal IMPORT/SYNC STARTED ==========");
    console.log("Fetching iCal from:", icalUrl);
    const response = await fetch(icalUrl);
    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch iCal URL' });
    }

    const icalData = await response.text();
    const parsedCal = ical.parseICS(icalData);

    // SCHRITT 1: Erstelle eine Map von UIDs zu DTSTART-Werten UND hasTZID
    // Sammle gleichzeitig alle UIDs aus dem iCal (für Lösch-Logik)
    // Workaround für ical-Library Bug: Sie parst Datumsangaben manchmal falsch
    const uidDTStartMap = new Map(); // UID -> { rawDTStart, hasTZID, originalDateStr, isAllDay }
    const uidTzidMap = new Map();
    const uidAllDayMap = new Map(); // UID -> isAllDay
    const icalUids = new Set(); // Alle UIDs die im iCal vorkommen
    const eventBlocks = icalData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) || [];
    
    for (const block of eventBlocks) {
      const uidMatch = block.match(/UID:(.+)/);
      if (!uidMatch) continue;
      const uid = uidMatch[1].trim();
      icalUids.add(uid); // Sammle UID für Lösch-Logik
      
      // Prüfe ob All-Day-Event (DTSTART;VALUE=DATE ohne Zeit)
      const isAllDayEvent = /DTSTART;VALUE=DATE:/m.test(block);
      
      // Extrahiere DTSTART direkt aus dem rohen Block
      // Format kann sein: DTSTART:20260122T150000Z oder DTSTART;TZID=Europe/Berlin:20260122T150000
      const dtStartMatch = block.match(/DTSTART(?:;VALUE=DATE|;TZID=([^:]+))?:([^\r\n]+)/);
      let rawDTStart = null;
      let tzidFromDTStart = dtStartMatch ? dtStartMatch[1] : null;
      
      if (dtStartMatch) {
        const dateStr = dtStartMatch[2].trim();
        
        // Prüfe ob TZID oder Z (UTC)
        const hasDTSTARTwithTZID = /DTSTART;TZID=/m.test(block);
        const hasDTSTARTwithZ = /DTSTART:[0-9T]+Z/m.test(block);
        const hasTZID = hasDTSTARTwithTZID && !hasDTSTARTwithZ;
        
        // Wenn es UTC ist (Z suffix), parse direkt als UTC
        if (hasDTSTARTwithZ) {
          // Format: 20260122T150000Z
          // Manually parse to avoid ical-Library bugs
          if (/^\d{8}T\d{6}Z$/.test(dateStr)) {
            const year = parseInt(dateStr.substring(0, 4), 10);
            const month = parseInt(dateStr.substring(4, 6), 10);
            const day = parseInt(dateStr.substring(6, 8), 10);
            const hours = parseInt(dateStr.substring(9, 11), 10);
            const minutes = parseInt(dateStr.substring(11, 13), 10);
            const seconds = parseInt(dateStr.substring(13, 15), 10);
            rawDTStart = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
          }
        }
        
        uidDTStartMap.set(uid, { rawDTStart, hasTZID, originalDateStr: dateStr, tzidValue: tzidFromDTStart, isAllDay: isAllDayEvent });
        uidTzidMap.set(uid, hasTZID);
        uidAllDayMap.set(uid, isAllDayEvent);
        
        // Debug-Log for UTC events
        const summaryMatch = block.match(/SUMMARY:(.+)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : 'Unknown';
        if (!hasTZID) { // Log all UTC-events (no TZID)
          console.log(`\n=== RAW DTSTART PARSING (UTC Event): ${summary} (UID: ${uid}) ===`);
          console.log(`  Raw date string: ${dateStr}`);
          console.log(`  hasTZID: ${hasTZID}`);
          console.log(`  isAllDay: ${isAllDayEvent}`);
          console.log(`  Manually parsed rawDTStart: ${rawDTStart ? rawDTStart.toISOString() : 'null'}`);
          console.log(`  hasDTSTARTwithZ: ${/DTSTART:[0-9T]+Z/m.test(block)}`);
          console.log('=== END RAW DTSTART PARSING ===\n');
        }
      }
    }

    const importedEvents = [];
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0); // Start von heute (Mitternacht)
    const windowEnd = new Date(now);
    windowEnd.setFullYear(windowEnd.getFullYear() + 1); // import bis zu 1 Jahr im Voraus

    // SCHRITT 2: Verarbeite alle Event-Instanzen und verwende die uidTzidMap
    for (const k in parsedCal) {
      if (parsedCal.hasOwnProperty(k)) {
        const ev = parsedCal[k];
        if (ev.type !== 'VEVENT') continue;

        const uid = ev.uid;
        if (!uid) continue;

        const summary = ev.summary || 'Untitled';
        const location = ev.location || null;
        const baseStart = ev.start || new Date();
        const baseEnd = ev.end || null;
        const durationMs = baseEnd && baseStart ? (new Date(baseEnd).getTime() - new Date(baseStart).getTime()) : 0;
        
        // Hole die TZID-Info und All-Day-Info aus der Map (gilt für ALLE Instanzen dieses Events)
        const hasTZID = uidTzidMap.get(uid) || false;
        const allDay = uidAllDayMap.get(uid) || false;
        const dtStartInfo = uidDTStartMap.get(uid);
        
        // DEBUG: Detailliertes Logging für alle Events
        const baseStartISOString = new Date(baseStart).toISOString();
        console.log(`\n=== EVENT PROCESSING DEBUG ===`);
        console.log(`  Summary: ${summary}`);
        console.log(`  UID: ${uid}`);
        console.log(`  Has RRULE: ${!!ev.rrule}`);
        if (dtStartInfo && dtStartInfo.rawDTStart) {
          console.log(`  Manually parsed rawDTStart: ${dtStartInfo.rawDTStart.toISOString()}`);
        }

        // Wenn es TZID hatte, wurde es von ical-Library zu UTC konvertiert
        // Wir müssen es zurück zu Berlin-Zeit konvertieren
        const correctTime = (date) => {
          if (!date || !hasTZID) {
            console.log(`    correctTime: NO ADJUSTMENT (hasTZID=${hasTZID}), returning: ${new Date(date).toISOString()}`);
            return date;
          }
          
          // Das Event war in Berlin-Zeit (TZID=Europe/Berlin)
          // Die ical-Library hat es NICHT zu UTC konvertiert
          // stattdessen hat sie einfach die Zeit genommen: 09:45
          // JavaScript speichert das als 09:45 UTC
          // Aber wir wollen es als 09:45 Berlin-Zeit in der DB haben
          // 
          // 09:45 Berlin (CET, UTC+1) = 08:45 UTC
          // Also müssen wir MINUS 1h (Winter) oder MINUS 2h (Sommer)
          // um die echte UTC-Zeit zu bekommen, die dann beim Frontend-Display korrekt wird
          
          const d = new Date(date);
          const month = d.getMonth();
          
          // DST: März-Oktober ist CEST (UTC+2), sonst CET (UTC+1)
          const isDST = month >= 2 && month < 10;
          const offsetHours = isDST ? 2 : 1;
          const offsetMs = offsetHours * 3600000;
          
          const corrected = new Date(d.getTime() - offsetMs); // MINUS, nicht PLUS!
          console.log(`    correctTime: ADJUSTED (isDST=${isDST}, -${offsetHours}h), ${d.toISOString()} -> ${corrected.toISOString()}`);
          return corrected;
        };

        // Wiederkehrende Termine expandieren
        if (ev.rrule) {
          const dates = ev.rrule.between(windowStart, windowEnd, true);
          for (const occ of dates) {
            // RRULE liefert bereits korrekte UTC-Zeiten, keine Korrektur nötig
            let occStart = new Date(occ);
            if (dtStartInfo && dtStartInfo.rawDTStart && !hasTZID) {
              // Berechne Offset von der ical-Library-Parse zur manuellen Parse
              const icalTimestamp = new Date(baseStart).getTime();
              const manualTimestamp = dtStartInfo.rawDTStart.getTime();
              const offsetMs = manualTimestamp - icalTimestamp;
              occStart = new Date(occStart.getTime() + offsetMs);
              console.log(`    Using manually parsed offset for recurring instance: +${offsetMs}ms`);
            }
            
            // RRULE-Zeiten sind bereits in UTC, KEINE correctTime-Korrektur anwenden!
            const occEnd = durationMs ? new Date(occStart.getTime() + durationMs) : null;
            console.log(`    Recurring instance: storing start=${occStart.toISOString()}`);
            try {
              // Deduplizieren: gleicher uid + start
              const exists = await prisma.calendarEvent.findFirst({ where: { uid, start: occStart } });
              if (exists) {
                console.log(`    ⊘ Instance already exists, skipping`);
                continue;
              }
              const created = await prisma.calendarEvent.create({
                data: { summary, location, start: occStart, end: occEnd, allDay, uid }
              });
              importedEvents.push(created);
              console.log(`    ✓ Instance created successfully`);
            } catch (instErr) {
              console.error(`    ERROR creating instance: ${instErr.message}`);
            }
          }
        } else {
          // Für Single Events: verwende manuell geparste DTSTART wenn verfügbar
          let start = baseStart;
          if (dtStartInfo && dtStartInfo.rawDTStart && !hasTZID) {
            start = dtStartInfo.rawDTStart;
            console.log(`    Using manually parsed start for single event: ${start.toISOString()}`);
          }
          
          start = correctTime(start);
          let end = null;
          if (baseEnd) {
            end = correctTime(baseEnd);
          }
          console.log(`    Single event: storing start=${start.toISOString()}, end=${end ? end.toISOString() : 'null'}`);
          try {
            const exists = await prisma.calendarEvent.findFirst({ where: { uid, start } });
            if (!exists) {
              const created = await prisma.calendarEvent.create({
                data: { summary, location, start, end, allDay, uid }
              });
              importedEvents.push(created);
              console.log(`    ✓ Event created successfully`);
            } else {
              console.log(`    ⊘ Event already exists, skipping`);
            }
          } catch (eventErr) {
            console.error(`    ERROR creating event: ${eventErr.message}`);
          }
        }
        console.log(`=== END EVENT DEBUG ===\n`);
      }
    }

    console.log("Imported", importedEvents.length, "events");

    // SCHRITT 3: Lösche Events die nicht mehr im iCal sind
    // Nur Events mit UID (iCal-Events) - manuelle Events (ohne UID) bleiben erhalten
    console.log("\n--- CHECKING FOR DELETED EVENTS ---");
    const dbEvents = await prisma.calendarEvent.findMany({
      where: { 
        uid: { not: null } // Nur iCal-Events prüfen
      }
    });

    let deletedCount = 0;
    for (const dbEvent of dbEvents) {
      if (!icalUids.has(dbEvent.uid)) {
        // Event existiert in DB aber nicht mehr im iCal -> löschen
        await prisma.calendarEvent.delete({ where: { id: dbEvent.id } });
        console.log(`  ✗ Deleted event: ${dbEvent.summary} (UID: ${dbEvent.uid})`);
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} events that are no longer in iCal`);

    console.log("========== iCal IMPORT/SYNC FINISHED ==========\n");
    return { success: true, imported: importedEvents.length, deleted: deletedCount };
  } catch (e) {
    console.error("Error processing iCal:", e);
    return { success: false, error: e.message };
  }
}

// Neuer Endpoint: iCal-Events fetchen und in DB speichern
app.post('/api/calendar-events/import-ical', async (req, res) => {
  try {
    const { icalUrl } = req.body;
    if (!icalUrl) {
      return res.status(400).json({ error: 'iCalUrl is required' });
    }

    const result = await processIcalData(icalUrl);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (e) {
    console.error("Error importing iCal:", e);
    res.status(500).json({ error: e.message });
  }
});

// Sync Endpoint: Nutzt die gleiche Logik wie Import
app.post('/api/calendar-events/sync-ical', async (req, res) => {
  try {
    const config = await prisma.config.findUnique({
      where: { key: 'icalUrl' }
    });
    
    if (!config) {
      return res.status(400).json({ error: 'iCalUrl not configured' });
    }

    const icalUrl = config.value.replace(/^"|"$/g, ''); // Remove quotes if present
    const result = await processIcalData(icalUrl);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (e) {
    console.error("Error in manual sync:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// Wöchentlicher Icon Copy Scheduler
// ============================================

// Globale Variable um sicherzustellen, dass pro Tag nur einmal kopiert wird
let lastWeeklyIconCopyDate = null;

/**
 * Kopiert alle Icons der aktuellen Woche in die nächste Woche
 * z.B. Montag Papa: Büro → nächster Montag Papa: Büro
 */
async function copyIconsToNextWeek() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Prüfe ob bereits heute kopiert wurde
    if (lastWeeklyIconCopyDate && lastWeeklyIconCopyDate.getTime() === today.getTime()) {
      console.log("✓ Icons wurden bereits heute kopiert, überspringe...");
      return;
    }

    // Berechne den Sonntag der aktuellen Woche (Tag 0)
    const currentSunday = new Date(now);
    const dayOfWeek = currentSunday.getDay();
    currentSunday.setDate(now.getDate() - dayOfWeek);
    currentSunday.setHours(0, 0, 0, 0);

    // Berechne den Samstag der aktuellen Woche (Tag 6)
    const currentSaturday = new Date(currentSunday);
    currentSaturday.setDate(currentSunday.getDate() + 6);
    currentSaturday.setHours(23, 59, 59, 999);

    // Berechne die nächste Woche (Sonntag)
    const nextWeekSunday = new Date(currentSunday);
    nextWeekSunday.setDate(currentSunday.getDate() + 7);

    console.log(`📅 Wöchentliches Icon-Kopieren gestartet...`);
    console.log(`   Aktuelle Woche: ${currentSunday.toISOString().split('T')[0]} bis ${currentSaturday.toISOString().split('T')[0]}`);
    console.log(`   Nächste Woche Sonntag: ${nextWeekSunday.toISOString().split('T')[0]}`);

    // Lade alle Icons der aktuellen Woche
    const currentWeekIcons = await prisma.dayActivityIcon.findMany({
      where: {
        date: {
          gte: currentSunday,
          lte: currentSaturday
        }
      }
    });

    console.log(`   Gefundene Icon-Records: ${currentWeekIcons.length}`);

    // Kopiere Icons zur nächsten Woche
    let copiedCount = 0;
    for (const icon of currentWeekIcons) {
      const nextWeekDate = new Date(icon.date);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      nextWeekDate.setHours(0, 0, 0, 0);

      // Prüfe ob es bereits existiert (um Duplikate zu vermeiden)
      const existing = await prisma.dayActivityIcon.findFirst({
        where: {
          date: nextWeekDate,
          personName: icon.personName,
          activityIconId: icon.activityIconId
        }
      });

      if (!existing) {
        await prisma.dayActivityIcon.create({
          data: {
            date: nextWeekDate,
            personName: icon.personName,
            activityIconId: icon.activityIconId
          }
        });
        copiedCount++;
      }
    }

    lastWeeklyIconCopyDate = today;
    console.log(`✅ ${copiedCount} neue Icon-Records zur nächsten Woche hinzugefügt`);
  } catch (e) {
    console.error("❌ Fehler beim wöchentlichen Icon-Kopieren:", e);
  }
}

/**
 * Startet den Scheduler für das wöchentliche Icon-Kopieren
 */
function startWeeklyIconCopyScheduler() {
  // Job läuft jede Minute und prüft die Config
  cron.schedule("* * * * *", async () => {
    try {
      // Lade die Config mit der Konfiguration
      const configEntry = await prisma.config.findUnique({
        where: { key: "weeklyIconCopyConfig" }
      });

      if (!configEntry) {
        return; // Config nicht gesetzt
      }

      const weeklyConfig = JSON.parse(configEntry.value);
      const targetDay = weeklyConfig.day; // 0-6, wobei 0=Sonntag
      const targetHour = weeklyConfig.hour; // 0-23

      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();

      // Prüfe ob heute der richtige Tag und die richtige Stunde ist
      if (currentDay === targetDay && currentHour === targetHour) {
        await copyIconsToNextWeek();
      }
    } catch (e) {
      console.error("Fehler im Weekly Icon Copy Scheduler:", e);
    }
  });

  console.log("✓ Weekly Icon Copy Scheduler gestartet (läuft jede Minute)");
}

// ============================================
// iCal Auto-Sync Scheduler
// ============================================

let lastIcalSyncTime = null;

/**
 * Startet den Auto-Sync Scheduler für iCal-Events
 * Läuft alle X Minuten basierend auf icalSyncIntervalMinutes aus Config
 */
function startIcalAutoSyncScheduler() {
  // Job läuft jede Minute und prüft ob Sync fällig ist
  cron.schedule("* * * * *", async () => {
    try {
      const config = await prisma.config.findUnique({
        where: { key: 'icalSyncIntervalMinutes' }
      });

      if (!config) {
        return; // Config nicht gesetzt
      }

      let syncIntervalMinutes = 60; // Default
      try {
        const parsed = JSON.parse(config.value);
        syncIntervalMinutes = parseInt(parsed, 10) || 60;
      } catch (e) {
        syncIntervalMinutes = parseInt(config.value, 10) || 60;
      }

      const now = new Date();
      
      // Initial sync 10 Sekunden nach Server-Start
      if (!lastIcalSyncTime) {
        console.log("⏰ Initial iCal sync will run in 10 seconds...");
        setTimeout(async () => {
          const icalConfig = await prisma.config.findUnique({
            where: { key: 'icalUrl' }
          });
          if (icalConfig) {
            const icalUrl = icalConfig.value.replace(/^"|"$/g, '');
            await processIcalData(icalUrl);
            lastIcalSyncTime = new Date();
          }
        }, 10000);
        lastIcalSyncTime = now; // Set to prevent multiple initial syncs
        return;
      }

      // Prüfe ob genug Zeit vergangen ist
      const timeSinceLastSync = now.getTime() - lastIcalSyncTime.getTime();
      const intervalMs = syncIntervalMinutes * 60 * 1000;

      if (timeSinceLastSync >= intervalMs) {
        const icalConfig = await prisma.config.findUnique({
          where: { key: 'icalUrl' }
        });
        if (icalConfig) {
          const icalUrl = icalConfig.value.replace(/^"|"$/g, '');
          await processIcalData(icalUrl);
          lastIcalSyncTime = new Date();
        }
      }
    } catch (e) {
      console.error("Fehler im iCal Auto-Sync Scheduler:", e);
    }
  });

  console.log("✓ iCal Auto-Sync Scheduler gestartet (läuft jede Minute)");
}

// Starte den Scheduler beim Start des Servers
startWeeklyIconCopyScheduler();
startIcalAutoSyncScheduler();

app.listen(4000, () => console.log('Backend läuft auf Port 4000'));
