import express from "express";
import cors from "cors";
import nodeIcal from "node-ical";
import fetch from "node-fetch";
import cron from "node-cron";
import { PrismaClient } from '@prisma/client';
// date-fns-tz kept for potential manual-event UTC conversion use
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

// Multer-Upload-Konfiguration für Activity-Icons
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });
// Statische Bereitstellung der Uploads
app.use("/uploads", express.static(uploadsDir));



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
    // iconSvg als eigenes Feld mitliefern (falls nicht vorhanden, fallback auf iconValue bei iconType==='icon')
    const iconsWithSvg = icons.map(icon => ({
      ...icon,
      iconSvg: icon.iconSvg || (icon.iconType === 'icon' ? icon.iconValue : null)
    }));
    res.json(iconsWithSvg);
  } catch (e) {
    console.error("Error fetching activity icons:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/activity-icons', async (req, res) => {
  try {
    const { activity, icon, iconType, iconValue, iconSvg } = req.body;
    if (!activity) {
      return res.status(400).json({ error: 'activity is required' });
    }
    // Validate based on iconType
    const type = iconType || 'emoji';
    if (type === 'emoji' && !icon) {
      return res.status(400).json({ error: 'icon (emoji) is required for emoji type' });
    }
    if (type === 'icon' && !iconValue && !iconSvg) {
      return res.status(400).json({ error: 'iconValue or iconSvg is required for icon type' });
    }
    if (type === 'image' && !iconValue) {
      return res.status(400).json({ error: 'iconValue (image URL) is required for image type' });
    }
    // iconSvg: explizit aus iconSvg, sonst fallback auf iconValue bei iconType==='icon'
    let svgString = null;
    if (type === 'icon') {
      svgString = iconSvg || iconValue || null;
    }
    const activityIcon = await prisma.activityIcon.upsert({
      where: { activity },
      update: { 
        icon: icon || '', 
        iconType: type, 
        iconValue: iconValue || null,
        iconSvg: svgString
      },
      create: { 
        activity, 
        icon: icon || '', 
        iconType: type, 
        iconValue: iconValue || null,
        iconSvg: svgString
      }
    });
    // iconSvg im Response mitliefern
    res.json({ ...activityIcon, iconSvg: activityIcon.iconSvg || (activityIcon.iconType === 'icon' ? activityIcon.iconValue : null) });
  } catch (e) {
    console.error("Error creating/updating activity icon:", e);
    res.status(500).json({ error: e.message });
  }
});

// Image upload endpoint for activity icons
app.post('/api/upload/icon', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (e) {
    console.error("Error uploading icon:", e);
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
 * Importiert/Synchronisiert iCal-Events aus einer URL.
 * Nutzt node-ical für korrekte VTIMEZONE/DST-Behandlung.
 * - Neue Events werden eingefügt (dedup via UID+start)
 * - Events, die nicht mehr im Feed sind, werden gelöscht
 * - Manuelle Events (uid=null) bleiben unangetastet
 */
async function processIcalData(icalUrl) {
  try {
    console.log("\n========== iCal IMPORT/SYNC STARTED ==========");
    const response = await fetch(icalUrl);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch iCal: ${response.status}` };
    }
    const icalData = await response.text();

    // node-ical nutzt intern moment-timezone: ev.start ist bereits ein korrekter UTC-Instant.
    // ev.start.tz enthält den originalen TZID-String (nur für Logging).
    const parsedCal = nodeIcal.parseICS(icalData);

    // Alle UIDs sammeln (für Lösch-Sync)
    const icalUids = new Set();
    for (const k in parsedCal) {
      const ev = parsedCal[k];
      if (ev.type === 'VEVENT' && ev.uid) icalUids.add(ev.uid);
    }

    // UTC-Fenster (gilt für Single-Events UND rrule.between(), da node-ical bereits UTC liefert)
    const now = new Date();
    const utcWindowStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const utcWindowEnd   = new Date(Date.UTC(now.getFullYear() + 1, now.getMonth(), now.getDate()));

    const importedEvents = [];

    for (const k in parsedCal) {
      if (!Object.prototype.hasOwnProperty.call(parsedCal, k)) continue;
      const ev = parsedCal[k];
      if (ev.type !== 'VEVENT' || !ev.uid) continue;

      const uid      = ev.uid;
      const summary  = ev.summary  || 'Untitled';
      const location = ev.location || null;
      const allDay   = ev.datetype === 'date';

      // ev.start.tz = originaler TZID (nur Logging); node-ical hat bereits korrekt zu UTC konvertiert
      const tzid = ev.start?.tz || (allDay ? 'allDay' : 'UTC');

      const baseStart  = new Date(ev.start);
      const baseEnd    = ev.end ? new Date(ev.end) : null;
      const durationMs = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0;

      console.log(`\n  EVENT: ${summary} | tz: ${tzid} | start: ${baseStart.toISOString()}`);

      if (ev.rrule) {
        // rrule.between() operiert im gleichen UTC-Koordinatensystem wie ev.start (node-ical korrekt)
        const occurrences = ev.rrule.between(utcWindowStart, utcWindowEnd, true);

        for (const occ of occurrences) {
          // EXDATE-Prüfung (ausgeschlossene Termine)
          if (ev.exdate) {
            const occDateStr = occ.toISOString().slice(0, 10);
            const excluded = Object.values(ev.exdate).some(
              exd => new Date(exd).toISOString().slice(0, 10) === occDateStr
            );
            if (excluded) continue;
          }

          let occStart    = new Date(occ);
          let occEnd      = durationMs ? new Date(occStart.getTime() + durationMs) : null;
          let occSummary  = summary;
          let occLocation = location;

          // RECURRENCE-ID Overrides (abweichende Instanzen)
          if (ev.recurrences) {
            const occDateStr = occ.toISOString().slice(0, 10);
            const override = Object.values(ev.recurrences).find(
              r => new Date(r.start).toISOString().slice(0, 10) === occDateStr
            );
            if (override) {
              occStart    = new Date(override.start);
              occEnd      = override.end ? new Date(override.end) : occEnd;
              occSummary  = override.summary  || summary;
              occLocation = override.location || location;
            }
          }

          try {
            const exists = await prisma.calendarEvent.findFirst({ where: { uid, start: occStart } });
            if (!exists) {
              const created = await prisma.calendarEvent.create({
                data: { summary: occSummary, location: occLocation, start: occStart, end: occEnd, allDay, uid }
              });
              importedEvents.push(created);
            }
          } catch (err) {
            console.error(`  ERROR (recurring ${occStart.toISOString()}): ${err.message}`);
          }
        }
      } else {
        // Single Event: nur im Fenster speichern
        if (baseStart < utcWindowStart || baseStart > utcWindowEnd) continue;

        try {
          const exists = await prisma.calendarEvent.findFirst({ where: { uid, start: baseStart } });
          if (!exists) {
            const created = await prisma.calendarEvent.create({
              data: { summary, location, start: baseStart, end: baseEnd, allDay, uid }
            });
            importedEvents.push(created);
          }
        } catch (err) {
          console.error(`  ERROR (single ${baseStart.toISOString()}): ${err.message}`);
        }
      }
    }

    // Lösche Events, die nicht mehr im iCal-Feed vorhanden sind
    const dbEvents = await prisma.calendarEvent.findMany({ where: { uid: { not: null } } });
    let deletedCount = 0;
    for (const dbEvent of dbEvents) {
      if (!icalUids.has(dbEvent.uid)) {
        await prisma.calendarEvent.delete({ where: { id: dbEvent.id } });
        deletedCount++;
      }
    }

    console.log(`========== SYNC DONE: +${importedEvents.length} imported, -${deletedCount} deleted ==========\n`);
    return { success: true, imported: importedEvents.length, deleted: deletedCount };
  } catch (e) {
    console.error("Error in processIcalData:", e);
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

// Einmaliger Cleanup: löscht alte iCal-Events (falsche UTC-Zeiten durch vorherige
// DST-Heuristik) und triggert sofort einen sauberen Re-Import.
// Läuft nur beim ersten Start nach dem Update, danach no-op.
async function runOneTimeIcalTzCleanup() {
  const flagKey = "icalTzCleanup_v1_done";
  try {
    const existing = await prisma.config.findUnique({ where: { key: flagKey } });
    if (existing) return;

    const deleted = await prisma.calendarEvent.deleteMany({ where: { uid: { not: null } } });
    console.log(`[ical-tz-cleanup] ${deleted.count} stale iCal events deleted, re-importing...`);

    await prisma.config.create({
      data: { key: flagKey, value: JSON.stringify({ at: new Date().toISOString(), deleted: deleted.count }) }
    });

    const icalConfig = await prisma.config.findUnique({ where: { key: 'icalUrl' } });
    if (icalConfig) {
      const icalUrl = icalConfig.value.replace(/^"|"$/g, '');
      await processIcalData(icalUrl);
    }
  } catch (e) {
    console.error("[ical-tz-cleanup] Error:", e.message);
  }
}

runOneTimeIcalTzCleanup();

app.listen(4000, () => console.log('Backend läuft auf Port 4000'));
