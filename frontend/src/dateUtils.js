export const DISPLAY_TZ = "Europe/Berlin";

export function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TZ,
  });
}

export function formatDate(isoStr, opts = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  return new Date(isoStr).toLocaleDateString("de-DE", { ...opts, timeZone: DISPLAY_TZ });
}

export function getBerlinDateString(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
