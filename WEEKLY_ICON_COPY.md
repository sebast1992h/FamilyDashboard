# Wöchentliches Icon-Kopieren - Implementierung

## Übersicht
Die Anwendung kopiert automatisch alle Activity Icons von der aktuellen Woche in die nächste Woche zu denselben Tagen und Personen.

**Beispiel:**
- Montag: Papa hat 💼 Büro Icon
- → Nächster Montag: Papa hat auch 💼 Büro Icon

## Konfiguration

### 1. Einstellung unter `/config`
Navigiere zu **"⏰ Icons wöchentlich kopieren"** im Config-Bereich:
- **Tag wählen** (0-6): 0 = Sonntag, 1 = Montag, etc.
- **Stunde wählen** (0-23): 0 = 00:00 Uhr, 9 = 09:00 Uhr
- **Speichern** mit "Alle Änderungen speichern" Button

### 2. Beispiel-Konfiguration
```
Tag: Montag (1)
Stunde: 9 (09:00 Uhr)
```
→ Jeden Montag um 09:00 Uhr werden Icons kopiert

## Wie es funktioniert

### Backend-Scheduler (server.js)
1. **node-cron** läuft jede Minute
2. Liest `weeklyIconCopyConfig` aus der `Config` Tabelle
3. Prüft ob aktueller Tag und Stunde übereinstimmen
4. Wenn ja: Ruft `copyIconsToNextWeek()` auf

### copyIconsToNextWeek() Funktion
```javascript
1. Ermittle Sonntag der aktuellen Woche
2. Lade alle DayActivityIcon Records der Woche (Sonntag-Samstag)
3. Für jedes Icon:
   - Berechne das Datum der nächsten Woche (7 Tage später)
   - Prüfe ob es bereits existiert (verhindert Duplikate)
   - Erstelle neuen Record falls nicht vorhanden
4. Protokolliere Anzahl der kopierten Records
```

### Duplikat-Vermeidung
- **Täglich-Sperre**: `lastWeeklyIconCopyDate` speichert das letzte Kopier-Datum
  - Verhindert mehrfaches Kopieren an einem Tag
- **Eindeutigkeits-Prüfung**: Vor jedem Create wird geprüft ob Record existiert

## Datenbank-Schema

### Config Tabelle
```
key: "weeklyIconCopyConfig"
value: "{\"day\": 1, \"hour\": 9}"  // JSON als String
```

### DayActivityIcon Tabelle
```
id              Int
date            DateTime      // z.B. 2026-01-26
personName      String        // z.B. "Papa"
activityIconId  Int          // Referenz zu ActivityIcon
createdAt       DateTime
updatedAt       DateTime

@@unique([date, personName, activityIconId])
```

## API-Endpunkte

### POST /api/config
Speichert die weekly config:
```json
{
  "weeklyIconCopyConfig": "{\"day\": 1, \"hour\": 9}"
}
```

### POST /api/test/copy-icons-now (nur Tests)
Triggt das Kopieren sofort (ohne auf die konfigurierte Zeit zu warten):
```bash
curl -X POST http://localhost:4000/api/test/copy-icons-now
```

## Logs anschauen

```bash
# Backend-Logs live
docker logs -f family-dashboard-backend-1

# Nur Weekly Copy Logs
docker logs family-dashboard-backend-1 | grep "Icon-Kopieren"
```

### Beispiel-Log-Output
```
📅 Wöchentliches Icon-Kopieren gestartet...
   Aktuelle Woche: 2026-01-18 bis 2026-01-24
   Nächste Woche Sonntag: 2026-01-25
   Gefundene Icon-Records: 6
✅ 6 neue Icon-Records zur nächsten Woche hinzugefügt
```

## Fehlerbehandlung

- ✓ Wenn `weeklyIconCopyConfig` nicht in Config vorhanden ist → Scheduler prüft nur
- ✓ Wenn Parse der Config fehlschlägt → Error wird gelogged, Scheduler läuft weiter
- ✓ Wenn Datenbank unerreichbar → Error wird gelogged, nächste Minute wird wieder versucht

## Beispiel-Workflow

**Montag, 09:00 Uhr:**

1. Scheduler prüft Config: Tag = 1 (Montag), Hour = 9
2. `copyIconsToNextWeek()` wird aufgerufen
3. Lädt alle Icons der Woche 18.01-24.01 (6 Records)
4. Kopiert sie zur Woche 25.01-31.01:
   - Mo 20.01 Papa:💼 → Mo 27.01 Papa:💼
   - Di 21.01 Mama:🏫 → Di 28.01 Mama:🏫
   - usw.
5. Logs: `✅ 6 neue Icon-Records zur nächsten Woche hinzugefügt`
6. `lastWeeklyIconCopyDate` wird gespeichert → kein Duplikat heute
7. Nächstes Kopieren: Nächsten Montag 09:00 Uhr

## Änderungen an bestehenden Icons

Wenn du Icons nach dem Copy noch änderst, werden die neuen Icons NICHT automatisch aktualisiert.

**Beispiel:**
- Montag 09:00: Kopiere Papa:💼 vom 20.01 zum 27.01
- Montag 10:00: Du änderst 20.01 Papa: 💼 → 👔
- Der 27.01 Papa hat immer noch 💼 (nicht 👔)

Das ist beabsichtigt - die Icons werden nur kopiert, nicht synchronisiert.

## Deaktivieren

Um das automatische Kopieren zu deaktivieren:
1. `/config` Seite öffnen
2. "⏰ Icons wöchentlich kopieren" Section
3. Eine unrealistische Zeit setzen, z.B. Stunde = 25 (existiert nicht)
4. Speichern

Der Scheduler läuft weiter, wird aber nie triggern.
