# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FamilyDashboard is a German-language family household planning app. It provides a weekly schedule, meal planning, todos, notes, calendar integration (iCal import), and birthday reminders.

**Stack:** React 18 + Vite (frontend) / Express.js + Prisma + PostgreSQL (backend)

## Common Commands

### Docker (Recommended)
```bash
docker-compose up -d          # Start all services
docker-compose logs -f        # Watch logs
docker-compose down           # Stop all services
docker-compose exec backend npx prisma migrate dev  # Run DB migrations
```

### Local Development
```bash
# Backend (port 4000)
cd backend && npm install && npm run dev

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

### Frontend Build
```bash
cd frontend
npm run build    # outputs to dist/
npm run preview  # preview built app
```

### Database (Prisma)
```bash
cd backend
npx prisma migrate dev    # apply + generate migration
npx prisma migrate reset  # reset DB (destructive)
npx prisma studio         # open GUI
npx prisma generate       # regenerate client after schema change
```

## Architecture

### Data Flow
```
React (localhost:3000)
  → REST API calls (auto-discovered hostname)
Express server (localhost:4000)
  → Prisma ORM
    → PostgreSQL
```

The frontend detects its hostname and auto-routes API calls: `localhost → localhost:4000`, Docker network → proxy through Vite to `http://backend:4000`.

### Key Files

**Backend — single-file server:**
- `backend/server.js` (~981 lines) — all Express routes, Prisma client init, CORS, `node-cron` scheduled tasks
- `backend/prisma/schema.prisma` — full data model
- `backend/start.sh` — Docker entrypoint: waits for postgres via `nc`, then runs `prisma migrate deploy`

**Frontend — mostly monolithic App:**
- `frontend/src/App.jsx` (~1515 lines) — main orchestrator: all state, data fetching, layout
- `frontend/src/api.js` — all REST client functions
- `frontend/src/ConfigPage.jsx` — admin settings panel (large)
- `frontend/src/MealPlanPage.jsx`, `CalendarEventPage.jsx` — modals
- `frontend/src/iconUtils_fixed.js` — SVG icon utilities

### Data Model (Prisma)

| Model | Purpose |
|---|---|
| `Todo` | Tasks with optional due date and completion |
| `MealPlan` | Weekly entries keyed by day+type (Morgens/Mittags/Abends) |
| `Note` | Shared family notes (markdown-enabled) |
| `CalendarEvent` | Manual + iCal-imported events; `uid` field deduplicates imports |
| `Config` | JSON key-value store for all app settings and API keys |
| `ActivityIcon` | Custom emoji/icon definitions per family member |
| `DayActivityIcon` | Icon assignment per person per date |

### Key Patterns

**Calendar sync:** iCal URLs are imported via `/api/calendar-events/sync-ical`. Events are stored with a `uid` from the iCal spec for deduplication. Family member names are parsed from event titles (e.g. `"Max: Zahnarzt"` → assigned to Max).

**Config system:** App settings (API keys, schedule preferences, family member names, iCal URLs) are stored as JSON strings in the `Config` table. The admin panel writes/reads these. Backend also reads `OPENWEATHER_API_KEY` from environment with DB config as fallback.

**Auth:** Minimal — a localStorage password check (`dashboardAuth`) gates the config page. No backend authentication exists; all API endpoints are public.

**Scheduled tasks:** `node-cron` in `server.js` handles weekly icon copying and iCal sync on configurable day/hour (stored in Config).

**Mobile:** Responsive Tailwind layout with a 768px breakpoint. Mobile detection is done in `App.jsx`.

## Environment Variables (Backend)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/family_dashboard` | Postgres connection |
| `OPENWEATHER_API_KEY` | — | Optional; can also set in admin UI |
| `WEATHER_LAT` / `WEATHER_LON` | `53.865` / `10.686` | North Germany default |
| `WEATHER_CACHE_TTL_SECONDS` | `600` | — |
| `TZ` | `Europe/Berlin` | Set in Docker Compose |

Frontend has no `.env` — the API URL is derived at runtime from `window.location.hostname`.
