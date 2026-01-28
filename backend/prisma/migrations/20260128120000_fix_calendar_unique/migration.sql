-- Drop the old unique constraint on uid only
DROP INDEX IF EXISTS "CalendarEvent_uid_key";

-- Create the correct composite unique constraint on uid + start
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEvent_uid_start_key" ON "CalendarEvent"("uid", "start");
