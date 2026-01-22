# 👨‍👩‍👧‍👦 Family-Dashboard

Ein modernes, benutzerfreundliches Familien-Dashboard für Organisation und Planung im Haushalt. Mit Wochenkalender, To-Do-Listen, Essensplan, Kalenderintegration und automatischen Geburtstagserinnerungen.

## 📋 Inhaltsverzeichnis

- [Features](#features)
- [Technologie-Stack](#technologie-stack)
- [Installation](#installation)
  - [Voraussetzungen](#voraussetzungen)
  - [Setup mit Docker](#setup-mit-docker)
  - [Setup ohne Docker](#setup-ohne-docker)
- [Konfiguration](#konfiguration)
- [Benutzung für User](#benutzung-für-user)
  - [Dashboard-Übersicht](#dashboard-übersicht)
  - [To-Do-Listen verwalten](#to-do-listen-verwalten)
  - [Essensplan bearbeiten](#essensplan-bearbeiten)
  - [Notizen erstellen](#notizen-erstellen)
  - [Kalender nutzen](#kalender-nutzen)
- [Benutzung für Admins](#benutzung-für-admins)
  - [Admin-Zugang](#admin-zugang)
  - [Familieneinstellungen](#familieneinstellungen)
  - [Wetter-Integration](#wetter-integration)
  - [Kalender-Integration](#kalender-integration)
  - [Activity Icons](#activity-icons)
  - [Dashboard-Einstellungen](#dashboard-einstellungen)
- [API-Dokumentation](#api-dokumentation)
- [Troubleshooting](#troubleshooting)
- [Sicherheit](#sicherheit)
- [Lizenz](#lizenz)

---

## ✨ Features

### Für alle Benutzer:
- 📅 **Wochenkalender** - Übersicht der Familie für 7 Tage
- ✅ **To-Do-Listen** - Mit Fälligkeitsdaten und Status-Tracking
- 🍽️ **Essensplan** - Wöchentliche Mahlzeitsplanung mit Rezept-Links
- 📝 **Notizen** - Schnelle Notizen für die Familie
- 🎂 **Geburtstagserinnerungen** - Automatische Anzeige im Banner
- ☀️ **Wetter-Widget** - Aktuelle Temperatur und Wetterbeschreibung
- 🔄 **Auto-Refresh** - Automatische Aktualisierung der Daten (konfigurierbar)

### Für Administratoren:
- 👥 **Familienverwaltung** - Mitglieder und Geburtstage verwalten
- 🌤️ **Wetter-Integration** - OpenWeather API Integration mit eigenen Koordinaten
- 📱 **iCal-Kalender-Integration** - Externe Kalender einbinden
- 🎨 **Activity Icons** - Personalisierte Icons für Aktivitäten
- ⚙️ **Konfiguration** - Umfangreiche Einstellungsmöglichkeiten
- 🔐 **Passwort-Schutz** - Admin-Bereich mit Authentifizierung

---

## 🛠️ Technologie-Stack

### Frontend
- **React 18** - UI Framework
- **Vite** - Build-Tool
- **Tailwind CSS** - Styling
- **Drag & Drop** - @hello-pangea/dnd für interaktive Listen

### Backend
- **Express.js** - Web-Framework
- **Prisma ORM** - Datenbankschicht
- **PostgreSQL** - Datenbank
- **googleapis** - Google Kalender Integration
- **node-cron** - Geplante Tasks

### Deployment
- **Docker & Docker Compose** - Containerisierung
- **PostgreSQL Container** - Datenbank-Container

---

## 📦 Installation

### Voraussetzungen

- **Docker & Docker Compose** (empfohlen)
  - Oder: Node.js 20+, PostgreSQL 12+

### Setup mit Docker (Empfohlen)

1. **Repository klonen:**
   ```bash
   git clone <repository-url>
   cd Family-Dashboard
   ```

2. **Umgebungsvariablen konfigurieren:**
   ```bash
   cp .env.example backend/.env
   # Optional: Öffnen und anpassen
   nano backend/.env
   ```

3. **Docker-Container starten:**
   ```bash
   docker-compose up -d
   ```

4. **Dashboard öffnen:**
   - Frontend: http://localhost:3000
   - Backend-API: http://localhost:4000
   - PostgreSQL: localhost:5432

5. **Datenbank initialisieren:**
   ```bash
   docker-compose exec backend npx prisma migrate dev
   ```

### Setup ohne Docker

1. **Dependencies installieren:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Datenbank vorbereiten:**
   ```bash
   # PostgreSQL muss laufen und Datenbank erstellt sein
   createdb family_dashboard
   ```

3. **Environment-Variablen:**
   ```bash
   cp .env.example backend/.env
   # DATABASE_URL in backend/.env anpassen:
   # DATABASE_URL="postgresql://user:password@localhost:5432/family_dashboard"
   ```

4. **Prisma Migrationen durchführen:**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. **Services starten:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

---

## ⚙️ Konfiguration

### Umgebungsvariablen (backend/.env)

```dotenv
# Datenbank
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/family_dashboard"

# Wetter API (OpenWeatherMap)
OPENWEATHER_API_KEY=your_api_key_here

# Standort für Wetter (Breite/Länge)
WEATHER_LAT=53.865
WEATHER_LON=10.686

# Cache-Einstellungen (in Sekunden)
WEATHER_CACHE_TTL_SECONDS=600
```

### Dashboard-Konfiguration (über Admin-Interface)

Alle erweiterten Einstellungen können über die Admin-Seite konfiguriert werden:
- 👥 Familienmitglieder und Geburtstage
- 🍽️ Sichtbarkeit von Mahlzeiten
- 📆 iCal-Kalender URL
- 🌤️ Wetter API Key und Koordinaten
- ⏱️ Auto-Refresh Intervall (5-300 Sekunden)

---

## 👥 Benutzung für User

### Dashboard-Übersicht

Beim Öffnen des Dashboards sehen Sie:

1. **Newsbanner (oben)**
   - Aktuelle Uhrzeit
   - Temperatur und Wetter
   - Geburtstage von heute
   - Anstehende Geburtstage (nächste 30 Tage)
   - 🍽️ Button für Essensplanung
   - 📅 Button für Kalenderevents

2. **Wochenkalender**
   - Zeigt die aktuelle Woche (Montag-Sonntag)
   - Navigation: ← Vorwoche | Heute | Nächste Woche →
   - Kalendereinträge pro Familienglied
   - Activity Icons für besondere Tage

3. **Drei Spalten (unten)**
   - 🍽️ **Essensplan** - Mahlzeiten für diese Woche
   - ✅ **To-Dos** - Aufgabenliste mit Fälligkeitsdaten
   - 📝 **Notizen** - Schnelle Notizen für die Familie

### To-Do-Listen verwalten

**Neues To-Do erstellen:**
1. Klicken Sie auf das grüne **+** Button neben „Todos"
2. Geben Sie den To-Do-Text ein
3. *Optional:* Wählen Sie ein Fälligkeitsdatum
4. Klicken Sie „Hinzufügen"

**To-Do abarbeiten:**
- Klicken Sie die Checkbox an, um es als erledigt zu markieren
- Erledigte To-Dos bleiben für 10 Tage sichtbar
- Danach werden sie automatisch ausgeblendet

**To-Do löschen:**
- Klicken Sie auf das 🗑️ Symbol

**Sortierung:**
- Offene To-Dos werden nach Fälligkeitsdatum sortiert
- Erledigte werden unten angezeigt

### Essensplan bearbeiten

1. Klicken Sie auf den 🍽️ Button oben rechts
2. **Mahlzeit hinzufügen:**
   - Wählen Sie Tag und Zeit
   - Geben Sie das Gericht ein
   - *Optional:* Fügen Sie eine Rezept-URL hinzu
   - Klicken Sie „Speichern"

3. **Mahlzeit bearbeiten:**
   - Klicken Sie auf die Mahlzeit in der Tabelle
   - Ändern Sie den Text oder die URL

4. **Mahlzeit löschen:**
   - Klicken Sie auf das X Symbol

### Notizen erstellen

- Schreiben Sie direkt in das Notizen-Feld
- Änderungen werden automatisch gespeichert
- Pro Familie wird eine gemeinsame Notiz gespeichert

### Kalender nutzen

**Kalender-Einträge anzeigen:**
- Der Wochenkalender zeigt Events aus:
  - iCal-Kalender (wenn konfiguriert)
  - Manuell erstellte Events

**Neuen Event erstellen:**
1. Klicken Sie auf den 📅 Button oben rechts
2. Wählen Sie das Datum und die Uhrzeit
3. Geben Sie einen Titel ein
4. Wählen Sie die Person aus
5. Speichern Sie den Event

**Events sortieren:**
- Events werden automatisch dem Familienmitglied zugeordnet
- Format: "Name: Ereignis" oder "Name - Ereignis"

---

## 🔐 Benutzung für Admins

### Admin-Zugang

1. Klicken Sie auf das ⚙️ Icon in der Navigationsleiste
2. Geben Sie das Admin-Passwort ein (Standard: `admin`)
3. Sie haben jetzt Zugriff auf die Konfigurationsseite

> ⚠️ **Sicherheit:** Ändern Sie das Standard-Passwort sofort in der Konfiguration!

### Familieneinstellungen

**Familienmitglieder hinzufügen:**
1. Navigieren Sie zur Admin-Seite (⚙️)
2. Scrollen Sie zu „Familienmitglieder"
3. Klicken Sie auf das **+** Button
4. Geben Sie den Namen ein
5. Speichern Sie die Einstellungen

**Geburtstage hinzufügen:**
1. Suchen Sie Ihr Familienmitglied in der Liste
2. Klicken Sie auf „Geburtstag hinzufügen"
3. Wählen Sie das Geburtsdatum
4. Speichern Sie

**Geburtstag-Lookahead konfigurieren:**
- Definieren Sie, wie viele Tage im Voraus Geburtstage angezeigt werden
- Standard: 30 Tage

### Wetter-Integration

**OpenWeather API Key besorgen:**
1. Registrieren Sie sich auf https://openweathermap.org/api
2. Erstellen Sie einen API Key (kostenlos)
3. Kopieren Sie den Key

**Wetter-Integration konfigurieren:**
1. Gehen Sie zur Admin-Seite
2. Scrollen Sie zu „Wetter"
3. Geben Sie Ihren API Key ein
4. Setzen Sie Ihre Koordinaten (Breite/Länge)
5. Speichern Sie die Einstellungen

**Standort ermitteln:**
- Nutzen Sie Google Maps oder ein GPS-Tool
- Berlin: 52.52°N, 13.40°E
- München: 48.14°N, 11.58°E

### Kalender-Integration

**iCal-Kalender einbinden:**
1. Exportieren Sie Ihren Kalender als iCal (.ics)
2. Laden Sie die Datei auf einen Web-Server hoch
3. Kopieren Sie die öffentliche URL
4. In der Admin-Seite: Geben Sie die iCal-URL ein
5. Der Kalender wird automatisch eingebunden

**Google Kalender integrieren:**
- Nutzen Sie die iCal-URL von Google Kalender
- Freigeben Sie den Kalender als "Öffentlich lesbar"

**Kalender-Einträge automatisch zuordnen:**
- Events werden dem Familienmitglied zugeordnet, wenn:
  - Der Name am Anfang des Titels steht: "Max: Zahnarzt"
  - Der Name mit "-" getrennt ist: "Sarah - Training"
  - Der Name im Ort-Feld steht

### Activity Icons

Activity Icons sind Emojis, die besondere Aktivitäten auf dem Kalender markieren.

**Icon hinzufügen:**
1. Admin-Seite → „Activity Icons"
2. Klicken Sie **+**
3. Geben Sie eine Aktivität ein (z.B. "Schule")
4. Wählen Sie ein Emoji
5. Speichern Sie

**Icons den Tagen zuordnen:**
1. Im Wochenkalender klicken Sie auf einen Kalendertag
2. Wählen Sie das Familienmitglied
3. Klicken Sie auf das + Icon
4. Wählen Sie die Activity Icons
5. Speichern Sie

### Dashboard-Einstellungen

**Auto-Refresh-Intervall:**
- Einstellen unter „Dashboard Auto-Refresh"
- Bereich: 5-300 Sekunden
- Standard: 30 Sekunden
- Bestimmt, wie oft Daten automatisch aktualisiert werden

**Mahlzeiten-Sichtbarkeit:**
- Wählen Sie, welche Mahlzeiten im Plan angezeigt werden
- Morgens | Mittags | Abends

**To-Do-Aufbewahrungsdauer:**
- Erledigte To-Dos bleiben 10 Tage sichtbar
- Konfigurierbar im Backend (todoDaysVisible)

---

## 📡 API-Dokumentation

### Base URL
```
http://localhost:4000/api
```

### Authentifizierung
Derzeit keine Token-basierte Authentifizierung. Passwort-Schutz nur im Frontend.

### Endpoints

#### To-Dos
```
GET    /todos                    # Alle To-Dos
POST   /todos                    # Neues To-Do erstellen
PUT    /todos/:id                # To-Do aktualisieren
DELETE /todos/:id                # To-Do löschen
```

#### Notizen
```
GET    /notes                    # Alle Notizen
POST   /notes                    # Neue Notiz erstellen
PUT    /notes/:id                # Notiz aktualisieren
DELETE /notes/:id                # Notiz löschen
```

#### Essensplan
```
GET    /meals                    # Alle Mahlzeiten
POST   /meals                    # Neue Mahlzeit
PUT    /meals/:id                # Mahlzeit aktualisieren
DELETE /meals/:id                # Mahlzeit löschen
```

#### Kalenderevents
```
GET    /calendar-events          # Alle Events
POST   /calendar-events          # Neues Event
PUT    /calendar-events/:id      # Event aktualisieren
DELETE /calendar-events/:id      # Event löschen
```

#### Konfiguration
```
GET    /config                   # Aktuelle Konfiguration
POST   /config                   # Konfiguration aktualisieren
```

#### Wetter
```
GET    /weather                  # Aktuelle Wetter-Daten
```

#### Activity Icons
```
GET    /activity-icons           # Alle Icons
POST   /activity-icons           # Neues Icon
DELETE /activity-icons/:id       # Icon löschen
```

---

## 🐛 Troubleshooting

### Dashboard wird nicht geladen
**Problem:** Weiße Seite oder Fehler beim Laden

**Lösungen:**
1. Browser-Cache löschen (Ctrl+Shift+Del)
2. Prüfen Sie, ob Backend läuft: `curl http://localhost:4000/api/config`
3. Öffnen Sie DevTools (F12) und prüfen Sie die Console auf Fehler
4. Starten Sie Container neu: `docker-compose restart`

### Datenbank-Fehler
**Problem:** "Migration failed" oder Datenbankfehler

**Lösungen:**
```bash
# Datenbank zurücksetzen und neu migrieren:
docker-compose exec backend npx prisma migrate reset

# Oder für Produktionsumgebungen:
docker-compose exec backend npx prisma db push
```

### Wetter wird nicht angezeigt
**Problem:** Kein Wetter im Banner sichtbar

**Lösungen:**
1. Überprüfen Sie den API Key in der Admin-Seite
2. Stellen Sie sicher, dass die Koordinaten korrekt sind
3. OpenWeather API kann bis zu 5 Minuten dauern
4. Prüfen Sie in der Browser-Console für API-Fehler

### Kalender-Einträge fehlen
**Problem:** iCal-Kalender wird nicht angezeigt

**Lösungen:**
1. Überprüfen Sie die iCal-URL in der Admin-Seite
2. URL muss öffentlich erreichbar sein
3. Prüfen Sie das Format der .ics-Datei
4. Warten Sie 1-2 Minuten für Aktualisierung

### Container starten nicht
**Problem:** Docker-Fehler beim Start

**Lösungen:**
```bash
# Logs prüfen
docker-compose logs -f

# Container neu bauen
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Volumes überprüfen
docker volume ls
```

---

## 🔒 Sicherheit

### Aktuelle Sicherheitsmaßnahmen
- Frontend-Passwort-Schutz für Admin-Bereich
- Datenbank-Isolation in Docker
- CORS-Konfiguration für API

### ⚠️ Bekannte Sicherheitslücken
1. **Passwörter sind hardcodiert** (Docker Compose, Frontend)
   - Standard-DB-Passwort: `postgres`
   - Standard-Admin-Passwort: `admin`
   
2. **API hat keine Authentifizierung**
   - Alle Endpoints sind öffentlich erreichbar
   
3. **API Keys sind nicht verschlüsselt** in der Datenbank

### Empfehlungen für Production
- [ ] OpenWeather API Key und DB-Passwörter über Umgebungsvariablen setzen
- [ ] Authentifizierungs-Token implementieren (JWT)
- [ ] API Keys verschlüsselt in Datenbank speichern
- [ ] HTTPS/TLS aktivieren
- [ ] Rate-Limiting implementieren
- [ ] Input-Validierung verstärken
- [ ] Regelmäßige Security-Audits durchführen

---

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

---

**Zuletzt aktualisiert:** Januar 2026
