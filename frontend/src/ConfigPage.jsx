import { useState, useEffect, useRef } from "react";
import { fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent, fetchMealPlan, saveMealPlan, deleteMealPlan, fetchNotes, saveNote, deleteNote } from "./api";
import { normalizeSvgForFont } from "./iconUtils_fixed";

// Emoji-Picker für Activity Icons
const commonEmojis = [
  // Haus & Räume
  "🏠", "🍳", "🛋️", "🛏️", "🚿", "🚽", "🧹", "🧺", "💡", "🪟", "🔑", "🪴",
  "🛁", "🧻", "🔧", "🪜", "🧰", "⚡", "🔌", "🌡️", "🖼️", "📺", "🧼", "🏢",
  // Tägliche Aufgaben & Haushalt
  "🛒", // Einkaufen
  "🧽", // Putzen
  "🧼", // Waschen
  "🧺", // Wäsche
  "🗑️", // Müll
  "📦", // Paket/Post
  "🐕", "🐈", // Haustiere
  "🌱", // Pflanzen
  "💊", // Medikamente
  "⏰", // Termin/Wecker
  "🧯", // Sicherheit
  "🧴", // Pflege
  "🧑‍🍳", // Kochen
  "🥘", // Essen zubereiten
  "🍽️", // Tisch decken
  "🧃", // Getränke
  "🧊", // Kühlschrank
  "🧂", // Vorräte
  "🧹", // Staubsaugen
  "🧺", // Wäschekorb
  "🧻", // Toilettenpapier
  "🧼", // Seife
  "🧽", // Schwamm
  "🧴", // Reinigungsmittel
  "🧯", // Feuerlöscher
  "🧰", // Werkzeug
  "🔋", // Batterie
  "🔑", // Schlüssel
  "📅", // Kalender
  "📋", // Checkliste
  // Kindergarten & Schule
  "🏫", "🎒", "📚", "📖", "✏️", "🖊️", "✂️", "📝", "📄", "🎓", "👨‍🎓", "👩‍🎓",
  "👨‍🏫", "👩‍🏫", "🧮", "📐", "📏", "🔬", "🧪", "🔭", "🧬", "🎨", "🖌️", "🖍️",
  "🎭", "🎪", "🎯", "🏆", "⭐", "🌟", "📕", "📗", "📘", "📙",
  // Work & Office
  "💼", "💻", "📱", "🖥️", "⌨️", "🖱️", "📋", "📊", "📈", "📉", "🖨️", "📞",
  // Aktivitäten & Sport
  "🏃", "💪", "⚽", "🏀", "🎾", "🏊", "🧗", "🚴", "⛷️", "🎿", "🧘", "🤸",
  // Hobbies & Freizeit
  "🎮", "🎬", "🎵", "🎨", "🎹", "🎸", "🎤", "📻", "🎭", "📸", "📷", "🧩",
  // Transport
  "🚗", "✈️", "🚀", "🚁", "🚂", "🚢", "🚲", "🛴", "🛵", "🏍️", "🚙", "🚕",
  // Natur & Orte
  "🏖️", "🏔️", "🏕️", "🗻", "🌋", "⛰️", "🏜️", "🏝️", "🌊", "⛱️", "🌳", "🌲"
];

// Lucide-Style SVG Icons für Activity Icons
export const svgIcons = [
  { name: "kitchen", label: "Küche", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><rect x="6" y="2" width="12" height="6" rx="1"/><path d="M9 18v-2a2 2 0 1 1 4 0v2"/></svg>' },
  { name: "bath", label: "Badezimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M5 19v2"/><path d="M19 19v2"/></svg>' },
  { name: "sofa", label: "Wohnzimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="12" width="20" height="7" rx="2"/><path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>' },
  { name: "bedroom", label: "Schlafzimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="10" rx="2"/><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>' },
  { name: "child", label: "Kinderzimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M2 22v-2a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v2"/></svg>' },
  { name: "hallway", label: "Flur", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M12 8v8"/></svg>' },
  { name: "garage", label: "Garage", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 19v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "garden", label: "Garten", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>' },
  { name: "balcony", label: "Balkon", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 14V8a4 4 0 0 1 8 0v6"/></svg>' },
  { name: "wc", label: "WC", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="7" rx="8" ry="4"/><path d="M4 7v6c0 2.21 3.58 4 8 4s8-1.79 8-4V7"/><path d="M4 13v2c0 2.21 3.58 4 8 4s8-1.79 8-4v-2"/></svg>' },
  { name: "office", label: "Büro", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><rect x="7" y="2" width="10" height="5" rx="1"/><path d="M9 17v-2a2 2 0 1 1 4 0v2"/></svg>' },
  { name: "storage", label: "Abstellraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "laundry", label: "Waschküche", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M12 7V2"/></svg>' },
  { name: "dining", label: "Esszimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="8" rx="2"/><path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "guest", label: "Gästezimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="12" width="20" height="8" rx="2"/><path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/></svg>' },
  { name: "terrace", label: "Terrasse", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="16" width="18" height="5" rx="2"/><path d="M7 16V8a5 5 0 0 1 10 0v8"/></svg>' },
  { name: "attic", label: "Dachboden", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 12 22 12 12 2"/><rect x="7" y="12" width="10" height="10" rx="2"/></svg>' },
  { name: "basement", label: "Keller", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 14V8a4 4 0 0 1 8 0v6"/></svg>' },
  { name: "playroom", label: "Spielzimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="10" rx="2"/><circle cx="12" cy="15" r="3"/></svg>' },
  { name: "workroom", label: "Arbeitszimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M12 8v8"/></svg>' },
  { name: "fitness", label: "Fitnessraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="12" width="20" height="8" rx="2"/><path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><circle cx="12" cy="16" r="2"/></svg>' },
  { name: "sauna", label: "Sauna", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "pantry", label: "Vorratsraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "workshop", label: "Werkstatt", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 19v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "hobby", label: "Hobbyraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "music-room", label: "Musikzimmer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M12 10v10"/><circle cx="12" cy="15" r="3"/></svg>' },
  { name: "cinema", label: "Heimkino", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="12" width="20" height="8" rx="2"/><path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/></svg>' },
  { name: "library", label: "Bibliothek", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "conservatory", label: "Wintergarten", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 19v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "pool", label: "Pool", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="17" rx="8" ry="3"/><path d="M4 17v2c0 1.1 3.58 2 8 2s8-.9 8-2v-2"/></svg>' },
  { name: "carport", label: "Carport", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 19v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "bicycle", label: "Fahrradkeller", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>' },
  { name: "heating", label: "Heizungsraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "tech", label: "Technikraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },
  { name: "utility", label: "Hauswirtschaftsraum", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M12 7V2"/></svg>' },
  { name: "locker", label: "Umkleide", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M12 8v8"/></svg>' },
  { name: "shower", label: "Dusche", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 19v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/></svg>' },
  { name: "toilet", label: "Toilette", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="7" rx="8" ry="4"/><path d="M4 7v6c0 2.21 3.58 4 8 4s8-1.79 8-4V7"/><path d="M4 13v2c0 2.21 3.58 4 8 4s8-1.79 8-4v-2"/></svg>' },
  { name: "pantry2", label: "Speisekammer", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>' },

  { name: "briefcase", label: "Büro", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
  { name: "home", label: "Zuhause", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { name: "school", label: "Schule", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' },
  { name: "dumbbell", label: "Sport", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>' },
  { name: "car", label: "Auto", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.5-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>' },
  { name: "plane", label: "Flugzeug", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>' },
  { name: "shopping-cart", label: "Einkaufen", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' },
  { name: "heart", label: "Arzt", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' },
  { name: "music", label: "Musik", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
  { name: "gamepad-2", label: "Gaming", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>' },
  { name: "utensils", label: "Essen", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>' },
  { name: "bed-sleep", label: "Schlafen", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>' },
  { name: "baby", label: "Baby", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>' },
  { name: "bike", label: "Fahrrad", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>' },
  { name: "coffee", label: "Kaffee", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>' },
  { name: "book", label: "Lesen", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>' },
  { name: "users", label: "Treffen", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { name: "party-popper", label: "Party", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>' },
  { name: "stethoscope", label: "Arzt", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>' },
  { name: "moon", label: "Nacht", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' },
  { name: "sun", label: "Tag", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>' },
];


const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const meals = ["Morgens", "Mittags", "Abends"];

export default function ConfigPage({ isAuthenticated, onLogin, onBack }) {
  // States für Datenbankdaten
  const [notesList, setNotesList] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [editNote, setEditNote] = useState(null);
  
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [editCalendarEvent, setEditCalendarEvent] = useState(null);
  
  const [mealPlan, setMealPlan] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const [mealPlanError, setMealPlanError] = useState("");
  const [editMeal, setEditMeal] = useState(null);

  // States für Konfiguration (lokale Speicherung)
  const [family, setFamily] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [standardItems, setStandardItems] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [config, setConfig] = useState(null);
  const [localConfig, setLocalConfig] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Activity Icons
  const [activityIcons, setActivityIcons] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [newActivity, setNewActivity] = useState("");
  const [newIcon, setNewIcon] = useState("💼");
  const [newIconType, setNewIconType] = useState("emoji"); // "emoji" | "icon" | "image"
  const [newIconValue, setNewIconValue] = useState(""); // icon name or image URL
  const [iconPickerTab, setIconPickerTab] = useState("emoji"); // tab selection for picker
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Weekly Icon Copy Configuration
  const [weeklyIconCopyDay, setWeeklyIconCopyDay] = useState(1); // 0=Sonntag, 1=Montag, etc
  const [weeklyIconCopyHour, setWeeklyIconCopyHour] = useState(9);
  const [savingWeeklyConfig, setSavingWeeklyConfig] = useState(false);

  // iCal Sync Configuration
  const [icalSyncIntervalMinutes, setIcalSyncIntervalMinutes] = useState(60);

  // Wetter-Konfiguration
  const [openWeatherApiKey, setOpenWeatherApiKey] = useState("");
  const [weatherLat, setWeatherLat] = useState("53.865");
  const [weatherLon, setWeatherLon] = useState("10.686");
  const [showWeatherKey, setShowWeatherKey] = useState(false);

  // Geburtstags-Vorschau (Tage)
  const [birthdayLookaheadDays, setBirthdayLookaheadDays] = useState(30);

  // Login-Logik
  const [password, setPassword] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [importingIcal, setImportingIcal] = useState(false);
  const [showIcalUrl, setShowIcalUrl] = useState(false);

  const defaultData = {
    "family": [],
    "birthdays": [],
    "grocery": { "standardItems": [] },
    "refreshInterval": 15,
    // Zentrale Sichtbarkeit der Mahlzeitentypen
    "mealVisibility": { "Morgens": true, "Mittags": true, "Abends": true },
    // Kalenderansicht: "week" (Mo-So) oder "rolling" (x-3 bis x+3 Tage)
    "calendarViewMode": "week",
    // Todos: wie lange erledigte Todos sichtbar bleiben (in Tagen)
    "todoDaysVisible": 10,
    // Geburtstags-Vorschau (Tage in Zukunft für Banner)
    "birthdayLookaheadDays": 30,
    // Wetter
    "openWeatherApiKey": "",
    "weatherLat": "53.865",
    "weatherLon": "10.686"
  };

  // Daten laden wenn authentifiziert
  useEffect(() => {
    // Immer laden, auch wenn nicht authentifiziert (für Test)
    loadConfigData();
    loadDatabaseData();
    loadActivityIcons();
    loadWeeklyIconCopyConfig();
  }, []);

  async function loadConfigData() {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // Stelle Standardwerte sicher (insbesondere mealVisibility)
        setLocalConfig({
          ...data,
          mealVisibility: data.mealVisibility || { "Morgens": true, "Mittags": true, "Abends": true },
          birthdayLookaheadDays: Number(data.birthdayLookaheadDays ?? defaultData.birthdayLookaheadDays) || defaultData.birthdayLookaheadDays,
          calendarViewMode: data.calendarViewMode || defaultData.calendarViewMode
        });
        setFamily(data.family || []);
        setBirthdays(data.birthdays || []);
        setStandardItems(data.grocery?.standardItems || []);
        setRefreshInterval(data.refreshInterval || 15);
        setIcalUrl(data.icalUrl || "");
        setOpenWeatherApiKey(data.openWeatherApiKey || "");
        setWeatherLat(data.weatherLat || "53.865");
        setWeatherLon(data.weatherLon || "10.686");
        setBirthdayLookaheadDays(
          Number(data.birthdayLookaheadDays ?? defaultData.birthdayLookaheadDays) || defaultData.birthdayLookaheadDays
        );
      } else {
        console.warn("Config not found, using defaults");
        setConfig({ ...defaultData });
        setLocalConfig({ ...defaultData });
        setFamily(defaultData.family);
        setBirthdays(defaultData.birthdays);
        setStandardItems(defaultData.grocery.standardItems);
        setRefreshInterval(defaultData.refreshInterval);
        setOpenWeatherApiKey(defaultData.openWeatherApiKey);
        setWeatherLat(defaultData.weatherLat);
        setWeatherLon(defaultData.weatherLon);
        setBirthdayLookaheadDays(defaultData.birthdayLookaheadDays);
      }
    } catch (e) {
      console.error("Error loading config:", e);
      setConfig({ ...defaultData });
      setLocalConfig({ ...defaultData });
      setOpenWeatherApiKey(defaultData.openWeatherApiKey);
      setWeatherLat(defaultData.weatherLat);
      setWeatherLon(defaultData.weatherLon);
      setBirthdayLookaheadDays(defaultData.birthdayLookaheadDays);
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabaseData() {
    // Notizen laden
    try {
      setNotesLoading(true);
      const notes = await fetchNotes();
      setNotesList(notes);
    } catch (e) {
      setNotesError("Fehler beim Laden der Notizen");
    } finally {
      setNotesLoading(false);
    }

    // Essensplan laden
    try {
      setMealPlanLoading(true);
      const meals = await fetchMealPlan();
      setMealPlan(meals);
    } catch (e) {
      setMealPlanError("Fehler beim Laden des Essensplans");
    } finally {
      setMealPlanLoading(false);
    }

    // Kalender laden
    try {
      setCalendarLoading(true);
      const events = await fetchCalendarEvents();
      setCalendarEvents(events);
    } catch (e) {
      setCalendarError("Fehler beim Laden der Kalendereinträge");
    } finally {
      setCalendarLoading(false);
    }
  }


  async function loadActivityIcons() {
    try {
      const res = await fetch("/api/activity-icons");
      if (res.ok) {
        const icons = await res.json();
        setActivityIcons(Array.isArray(icons) ? icons : []);
      } else {
        setActivityIcons([]);
        console.warn("Fehler beim Laden der Activity Icons: ", res.status);
      }
    } catch (e) {
      setActivityIcons([]);
      console.error("Fehler beim Laden der Activity Icons:", e);
    }
  }

  // Hilfsfunktion für Bild-URLs (auch für andere Seiten exportieren!)
  function getBackendImageUrl(url) {
    if (!url) return '';
    // Wenn bereits eine absolute URL, gib sie zurück
    if (/^https?:\/\//.test(url)) return url;
    // Wenn /uploads/ am Anfang, ergänze Backend-URL
    const backendUrl = window.location.origin.includes(':3000')
      ? window.location.origin.replace(':3000', ':4000')
      : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000');
    if (url.startsWith('/uploads/')) return backendUrl + url;
    return url;
  }

  function renderImageIcon(item) {
    const imageUrl = getBackendImageUrl(item.iconValue);
    return (
      <img
        src={imageUrl}
        alt={item.activity}
        className="w-12 h-12 object-contain rounded border border-slate-500 align-middle"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      />
    );
  }
  async function handleAddActivityIcon(e) {
    e.preventDefault();
    if (!newActivity.trim()) {
      alert("Bitte gib eine Tätigkeit ein");
      return;
    }
    let payload = { activity: newActivity.trim(), iconType: newIconType };
    if (newIconType === "emoji") {
      payload.icon = newIcon;
      payload.iconValue = null;
    } else if (newIconType === "icon") {
      payload.icon = "";
      payload.iconValue = newIconValue;
      // Wenn ein icon name aus der lokalen svgIcons-Liste gewählt wurde,
      // liefere gleichzeitig das komplette SVG als `iconSvg` mit, damit
      // das Backend die tatsächliche SVG-Zeichenfolge speichern kann.
      try {
        const svgEntry = svgIcons.find(s => s.name === newIconValue || s.label === newIconValue);
        if (svgEntry && svgEntry.svg) payload.iconSvg = svgEntry.svg;
      } catch (e) {
        // silent fallback
      }
    } else if (newIconType === "image") {
      payload.icon = "";
      payload.iconValue = newIconValue;
    }
    try {
      const res = await fetch("/api/activity-icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const icon = await res.json();
        setActivityIcons([...activityIcons, icon]);
        setNewActivity("");
        setNewIcon("💼");
        setNewIconType("emoji");
        setNewIconValue("");
      } else {
        alert("Fehler beim Speichern");
      }
    } catch (e) {
      console.error("Error saving activity icon:", e);
      alert("Fehler: " + e.message);
    }
  }

  async function handleDeleteActivityIcon(id) {
    if (!confirm("Wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/activity-icons/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setActivityIcons(activityIcons.filter(a => a.id !== id));
      } else {
        alert("Fehler beim Löschen");
      }
    } catch (e) {
      console.error("Error deleting activity icon:", e);
      alert("Fehler: " + e.message);
    }
  }

  async function loadWeeklyIconCopyConfig() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        if (data.weeklyIconCopyConfig) {
          const config = typeof data.weeklyIconCopyConfig === 'string' ? JSON.parse(data.weeklyIconCopyConfig) : data.weeklyIconCopyConfig;
          setWeeklyIconCopyDay(Number(config.day) || 1);
          setWeeklyIconCopyHour(Number(config.hour) || 9);
        }
        if (data.icalSyncIntervalMinutes) {
          const minutes = typeof data.icalSyncIntervalMinutes === 'string' ? Number(JSON.parse(data.icalSyncIntervalMinutes)) : Number(data.icalSyncIntervalMinutes);
          setIcalSyncIntervalMinutes(minutes || 60);
        }
      }
    } catch (e) {
      console.error("Error loading weekly icon copy config:", e);
    }
  }



  async function onSaveConfig(newConfig) {
    setLoading(true);
    try {
      // Weekly icon copy config und iCal sync interval hinzufügen
      const configWithExtras = {
        ...newConfig,
        refreshInterval: Number(refreshInterval) || 30,
        weeklyIconCopyConfig: JSON.stringify({ day: Number(weeklyIconCopyDay), hour: Number(weeklyIconCopyHour) }),
        icalSyncIntervalMinutes: Number(icalSyncIntervalMinutes),
        birthdayLookaheadDays: Math.min(365, Math.max(1, Number(birthdayLookaheadDays) || defaultData.birthdayLookaheadDays)),
        openWeatherApiKey,
        weatherLat,
        weatherLon
      };
      
      console.log("Saving config:", JSON.stringify(configWithExtras, null, 2));
      const bodyString = JSON.stringify(configWithExtras);
      console.log("Body string length:", bodyString.length);
      console.log("Body string:", bodyString);
      
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyString
      });
      console.log("Response status:", res.status);
      const responseText = await res.text();
      console.log("Response text:", responseText);
      
      if (res.ok) {
        setConfig(configWithExtras);
        setLocalConfig({ ...configWithExtras });
        // Daten neuladen im Hintergrund (nicht warten)
        loadConfigData().catch(e => console.error("Error reloading config:", e));
        // Flag für Dashboard-Toast setzen
        try { localStorage.setItem('configUpdated', String(Date.now())); } catch {}
        alert("Konfiguration gespeichert!");
      } else {
        alert(`Fehler beim Speichern der Konfiguration: ${res.status} - ${responseText}`);
      }
    } catch (e) {
      console.error("Save config error:", e);
      alert("Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteIcalEvents() {
    if (!confirm("Alle iCal-importierten Events löschen? (Events ohne uid bleiben erhalten)")) {
      return;
    }

    setImportingIcal(true);
    try {
      const res = await fetch("/api/calendar-events/ical", {
        method: "DELETE"
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        alert(`${data.deleted || 0} iCal-Events gelöscht! Jetzt kannst du neu importieren.`);
      } else {
        const text = await res.text();
        alert(`Fehler beim Löschen: ${text}`);
      }
    } catch (e) {
      console.error("Error deleting iCal events:", e);
      alert("Fehler: " + e.message);
    } finally {
      setImportingIcal(false);
    }
  }

  async function handleImportIcal() {
    if (!icalUrl.trim()) {
      alert("Bitte gib eine iCal-URL ein");
      return;
    }

    setImportingIcal(true);
    try {
      const res = await fetch("/api/calendar-events/import-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl: icalUrl.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${data.imported} Events importiert!`);
        // Speichere iCal-URL in Config
        const updatedConfig = { ...localConfig, icalUrl: icalUrl.trim() };
        setLocalConfig(updatedConfig);
        await onSaveConfig(updatedConfig);
      } else {
        alert(`Fehler beim Import: ${data.error}`);
      }
    } catch (e) {
      console.error("Error importing iCal:", e);
      alert("Fehler: " + e.message);
    } finally {
      setImportingIcal(false);
    }
  }

  // Datenbankfunktionen
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

  // Konfigurationsfunktionen
  function addFamilyMember() {
    const newMember = { name: "", birthday: "" };
    const updatedFamily = [...family, newMember];
    setFamily(updatedFamily);
    setLocalConfig(prev => ({ ...prev, family: updatedFamily }));
  }

  function updateFamilyMember(index, field, value) {
    const updatedFamily = [...family];
    updatedFamily[index][field] = value;
    setFamily(updatedFamily);
    setLocalConfig(prev => {
      const newConfig = { ...prev, family: updatedFamily };
      console.log("Updated localConfig:", JSON.stringify(newConfig, null, 2));
      return newConfig;
    });
  }

  function deleteFamilyMember(index) {
    const updatedFamily = family.filter((_, i) => i !== index);
    setFamily(updatedFamily);
    setLocalConfig(prev => ({ ...prev, family: updatedFamily }));
  }

  function renderBirthdayPopup() {
    if (editMode !== "birthday") return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-bold mb-4">Geburtstag bearbeiten</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Name:</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editData?.name || ""}
                onChange={e => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block mb-1">Geburtsdatum:</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editData?.date || ""}
                onChange={e => setEditData({ ...editData, date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                const newBirthdays = editData.isNew
                  ? [...birthdays, { name: editData.name, date: editData.date }]
                  : birthdays.map((b, i) => i === editData.index ? { name: editData.name, date: editData.date } : b);
                setBirthdays(newBirthdays);
                setLocalConfig(prev => ({ ...prev, birthdays: newBirthdays }));
                setEditMode(null);
                setEditData(null);
              }}
            >
              Speichern
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => {
                setEditMode(null);
                setEditData(null);
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMealEditPopup() {
    if (!editMeal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-96">
          <h3 className="text-lg font-bold mb-4">Gericht bearbeiten</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Tag: {days[editMeal.day]}</label>
            </div>
            <div>
              <label className="block mb-1">Zeit: {meals[editMeal.mealType]}</label>
            </div>
            <div>
              <label className="block mb-1">Gericht:</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                value={editMeal.meal}
                onChange={e => setEditMeal({ ...editMeal, meal: e.target.value })}
                placeholder="z.B. Spaghetti Bolognese"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => handleMealSave(editMeal)}
            >
              Speichern
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => setEditMeal(null)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    if (onLogin(password)) {
      setPassword("");
    } else {
      alert("Falsches Passwort");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="p-8 rounded-lg shadow" style={{ background: 'var(--bg-card)' }}>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>Konfiguration</h1>
          <form onSubmit={handleLoginSubmit}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
              onFocus={e => e.target.style.backgroundColor = '#ffffff'}
              onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
            />
            <button
              type="submit"
              className="w-full p-3 rounded text-white"
              style={{ background: 'var(--accent)' }}
            >
              Anmelden
            </button>
          </form>
          <button
            onClick={onBack}
            className="w-full mt-4 p-3 rounded"
            style={{ background: 'var(--accent2)', color: 'var(--text-main)' }}
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  // Für Testzwecke: Zeige direkt die Konfiguration ohne Authentifizierung
  return (
    <>
      <div className="min-h-screen p-4" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>⚙️ Konfiguration - NEUE VERSION!</h1>
          <div className="flex gap-2">
            <button
              onClick={() => onSaveConfig(localConfig)}
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Speichere...' : '💾 Alle Änderungen speichern'}
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded"
              style={{ background: 'var(--accent2)', color: 'var(--text-main)' }}
            >
              Zurück zum Dashboard
            </button>
          </div>
        </div>

        {/* Google iCal */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>📅 Google iCal Kalender</h2>
          <p className="text-sm text-gray-600 mb-3">Gib die URL zu einem öffentlichen Google iCal Kalender ein. Die Events werden automatisch importiert.</p>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm mb-1 font-semibold">iCal URL:</label>
                <input
                  type={showIcalUrl ? "text" : "password"}
                  value={icalUrl}
                  onChange={e => setIcalUrl(e.target.value)}
                  onCopy={e => e.preventDefault()}
                  onContextMenu={e => e.preventDefault()}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="w-full border p-2 rounded"
                  style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                  onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                  onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                />
              </div>
              <button
                onClick={() => setShowIcalUrl(!showIcalUrl)}
                className="px-3 py-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                title={showIcalUrl ? "Verbergen" : "Anzeigen"}
              >
                {showIcalUrl ? "👁️" : "👁️‍🗨️"}
              </button>
              <button
                onClick={handleDeleteIcalEvents}
                disabled={importingIcal}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                title="Alle iCal-Events löschen (zum Neuimport mit korrigierten Zeiten)"
              >
                {importingIcal ? "..." : "🗑️ iCal Events löschen"}
              </button>
              <button
                onClick={handleImportIcal}
                disabled={importingIcal || !icalUrl.trim()}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {importingIcal ? "Importiere..." : "📥 Importieren"}
              </button>
            </div>
          </div>

          {/* iCal Sync Intervall */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>🔄 Auto-Synchronisierung</h3>
            <p className="text-sm text-gray-600 mb-3">
              Der iCal-Kalender wird automatisch synchronisiert. Gib an, wie oft die Synchronisierung stattfinden soll.
            </p>
            <div>
              <label className="block text-sm mb-1 font-semibold">Sync-Intervall (Minuten):</label>
              <input
                type="number"
                min="1"
                max="120"
                value={icalSyncIntervalMinutes}
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= 120) {
                    setIcalSyncIntervalMinutes(val);
                  }
                }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => {
                  const val = Number(e.target.value);
                  if (val < 1) {
                    setIcalSyncIntervalMinutes(1);
                    e.target.value = 1;
                  } else if (val > 120) {
                    setIcalSyncIntervalMinutes(120);
                    e.target.value = 120;
                  }
                  e.target.style.backgroundColor = '#f8fafc';
                }}
                className="w-full border p-2 rounded"
                style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Zulässig: 1-120 Minuten (Standard: 60 Minuten). Wird beim Speichern der Konfiguration übernommen.
              </p>
            </div>
          </div>

          {/* Wetter Konfiguration */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent)' }}>🌦 Wetter</h3>
            <p className="text-sm text-gray-600 mb-3">OpenWeather API-Key und Koordinaten hinterlegen.</p>
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm mb-1 font-semibold">OpenWeather API Key:</label>
                  <input
                    type={showWeatherKey ? "text" : "password"}
                    value={openWeatherApiKey}
                    onChange={(e) => {
                      setOpenWeatherApiKey(e.target.value);
                      setLocalConfig(prev => ({ ...prev, openWeatherApiKey: e.target.value }));
                    }}
                    placeholder="API Key"
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
                <button
                  onClick={() => setShowWeatherKey(!showWeatherKey)}
                  className="px-3 py-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                  title={showWeatherKey ? "Verbergen" : "Anzeigen"}
                >
                  {showWeatherKey ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1 font-semibold">Breitengrad (lat):</label>
                  <input
                    type="text"
                    value={weatherLat}
                    onChange={(e) => {
                      setWeatherLat(e.target.value);
                      setLocalConfig(prev => ({ ...prev, weatherLat: e.target.value }));
                    }}
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-semibold">Längengrad (lon):</label>
                  <input
                    type="text"
                    value={weatherLon}
                    onChange={(e) => {
                      setWeatherLon(e.target.value);
                      setLocalConfig(prev => ({ ...prev, weatherLon: e.target.value }));
                    }}
                    className="w-full border p-2 rounded"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#f8fafc' }}
                    onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                    onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Wenn kein Key gesetzt ist, liefert die Wetter-API einen Fehler.</p>
            </div>
          </div>
        </div>

        {/* Dashboard Auto-Refresh Einstellung */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🔄 Dashboard Auto-Refresh</h2>
          <p className="text-sm text-gray-600 mb-3">Wie oft sollen Daten automatisch aktualisiert werden? (in Sekunden)</p>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-semibold">Aktualisierungsintervall:</label>
            <input
              type="number"
              min="5"
              max="300"
              step="5"
              value={refreshInterval}
              onChange={(e) => {
                const value = Math.max(5, parseInt(e.target.value) || 30);
                setRefreshInterval(value);
                setLocalConfig(prev => ({ ...prev, refreshInterval: value }));
              }}
              className="w-20 px-3 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
            <span className="text-sm text-gray-400">Sekunden</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Der Dashboard wird diese Werte alle X Sekunden aktualisieren. Mindestwert: 5 Sekunden, Höchstwert: 300 Sekunden.</p>
        </div>

        {/* Kalenderansicht */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>📆 Kalenderansicht</h2>
          <p className="text-sm text-gray-600 mb-3">Umschalten zwischen Wochenansicht (Mo-So) und Tagesfenster (x -3 bis x +3).</p>
          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="calendarViewMode"
                value="week"
                checked={(localConfig?.calendarViewMode || "week") === "week"}
                onChange={() => {
                  setLocalConfig(prev => ({ ...prev, calendarViewMode: "week" }));
                }}
              />
              <span className="text-sm">Montag - Sonntag</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="calendarViewMode"
                value="rolling"
                checked={(localConfig?.calendarViewMode || "week") === "rolling"}
                onChange={() => {
                  setLocalConfig(prev => ({ ...prev, calendarViewMode: "rolling" }));
                }}
              />
              <span className="text-sm">x -3 bis x +3 Tage</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">Änderungen werden mit "Alle Änderungen speichern" übernommen.</p>
        </div>

        {/* Familienmitglieder */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>👨‍👩‍👧‍👦 Familienmitglieder</h2>
          <div className="mb-4">
            <p>Debug: family array length: {family.length}</p>
          </div>
          {family.map((member, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                placeholder="Name"
                value={member.name}
                onChange={e => updateFamilyMember(index, "name", e.target.value)}
                className="border p-2 rounded flex-1"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <input
                type="date"
                value={member.birthday || ""}
                onChange={e => updateFamilyMember(index, "birthday", e.target.value)}
                className="border p-2 rounded"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <button
                onClick={() => deleteFamilyMember(index)}
                className="bg-red-600 text-white px-3 py-2 rounded"
              >
                Löschen
              </button>
            </div>
          ))}
          <button
            onClick={addFamilyMember}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
          >
            + Familienmitglied hinzufügen
          </button>
        </div>

        {/* Geburtstage */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🎂 Geburtstage</h2>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Vorschau-Tage für Geburtstage (Newsbanner)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={birthdayLookaheadDays}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setBirthdayLookaheadDays(value);
                  setLocalConfig(prev => ({ ...prev, birthdayLookaheadDays: value }));
                }}
                className="border p-2 rounded w-full"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <p className="text-xs text-gray-500 mt-1">Zeitraum 1-365 Tage in die Zukunft, der später im Newsbanner genutzt wird.</p>
            </div>
          </div>
          <div className="mb-4">
            <p>Debug: birthdays array length: {birthdays.length}</p>
          </div>
          <div className="space-y-2 mb-4">
            {birthdays.map((birthday, index) => (
              <div key={index} className="flex justify-between items-center border p-2 rounded">
                <span>{birthday.name} - {birthday.date}</span>
                <div>
                  <button
                    onClick={() => {
                      setEditMode("birthday");
                      setEditData({ ...birthday, index, isNew: false });
                    }}
                    className="text-blue-600 mr-2"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      const newBirthdays = birthdays.filter((_, i) => i !== index);
                      setBirthdays(newBirthdays);
                      setLocalConfig(prev => ({ ...prev, birthdays: newBirthdays }));
                    }}
                    className="text-red-600"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setEditMode("birthday");
              setEditData({ name: "", date: "", isNew: true });
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + Geburtstag hinzufügen
          </button>
        </div>

        {/* Standard-Einkaufsartikel */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🛒 Standard-Einkaufsartikel</h2>
          <div className="mb-4">
            <p>Debug: standardItems array length: {standardItems.length}</p>
          </div>
          {standardItems.length === 0 && (
            <p className="text-gray-500 mb-4">Noch keine Standard-Artikel definiert.</p>
          )}
          {standardItems.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                value={item}
                onChange={e => {
                  const newItems = [...standardItems];
                  newItems[index] = e.target.value;
                  setStandardItems(newItems);
                  setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
                }}
                className="border p-2 rounded flex-1"
                style={{ backgroundColor: '#f8fafc' }}
                onFocus={e => e.target.style.backgroundColor = '#ffffff'}
                onBlur={e => e.target.style.backgroundColor = '#f8fafc'}
              />
              <button
                onClick={() => {
                  const newItems = standardItems.filter((_, i) => i !== index);
                  setStandardItems(newItems);
                  setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
                }}
                className="bg-red-600 text-white px-3 py-2 rounded"
              >
                Löschen
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newItems = [...standardItems, ""];
              setStandardItems(newItems);
              setLocalConfig(prev => ({ ...prev, grocery: { ...prev.grocery, standardItems: newItems } }));
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + Artikel hinzufügen
          </button>
        </div>

        {/* Essensplan Sichtbarkeit */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>🍽 Essensplan – Sichtbarkeit</h2>
          <p className="text-sm text-gray-600 mb-3">Steuere, welche Mahlzeitentypen (Zeilen) in Dashboard und Planungsseite angezeigt werden.</p>
          <div className="flex gap-6">
            {["Morgens", "Mittags", "Abends"].map((mealType) => (
              <label key={mealType} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(localConfig?.mealVisibility?.[mealType])}
                  onChange={() => {
                    const current = localConfig?.mealVisibility || { "Morgens": true, "Mittags": true, "Abends": true };
                    const updated = { ...current, [mealType]: !current[mealType] };
                    setLocalConfig(prev => ({ ...prev, mealVisibility: updated }));
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{mealType}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Änderungen werden mit "Alle Änderungen speichern" übernommen.</p>
        </div>

        {/* Todos Konfiguration */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>✅ Todos – Sichtbarkeitsdauer</h2>
          <p className="text-sm text-gray-600 mb-3">Wie lange sollen erledigte Todos sichtbar bleiben?</p>
          <div className="flex items-center gap-3">
            <label className="text-sm">Tage:</label>
            <input
              type="number"
              min="1"
              max="365"
              value={localConfig?.todoDaysVisible ?? 10}
              onChange={(e) => {
                const value = Math.max(1, parseInt(e.target.value) || 10);
                setLocalConfig(prev => ({ ...prev, todoDaysVisible: value }));
              }}
              className="w-16 px-3 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Erledigte Todos werden diese Anzahl an Tagen mit grünem Häkchen und durchgestrichenem Text angezeigt.</p>
        </div>

        {/* Activity Icons Konfiguration */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🎯 Tätigkeits-Icons</h2>
          <p className="text-sm text-gray-600 mb-4">Ordne Icons/Emojis den Tätigkeiten zu (z.B. 💻 = Büro)</p>

          {/* Formulär zum Hinzufügen */}
          <form onSubmit={handleAddActivityIcon} className="mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="flex gap-2 mb-3 items-end">
              {/* Tabs for icon type */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 mb-2">
                  <button type="button" className={`px-2 py-1 rounded ${iconPickerTab === 'emoji' ? 'bg-slate-600 text-white' : 'bg-slate-500 text-slate-300'}`} onClick={() => { setIconPickerTab('emoji'); setNewIconType('emoji'); }}>Emoji</button>
                  <button type="button" className={`px-2 py-1 rounded ${iconPickerTab === 'icon' ? 'bg-slate-600 text-white' : 'bg-slate-500 text-slate-300'}`} onClick={() => { setIconPickerTab('icon'); setNewIconType('icon'); }}>Symbol</button>
                  <button type="button" className={`px-2 py-1 rounded ${iconPickerTab === 'image' ? 'bg-slate-600 text-white' : 'bg-slate-500 text-slate-300'}`} onClick={() => { setIconPickerTab('image'); setNewIconType('image'); }}>Bild</button>
                </div>
                {/* Picker for each type */}
                {iconPickerTab === 'emoji' && (
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(showEmojiPicker === 'main' ? null : 'main')}
                    className="text-2xl bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded border-2 border-slate-500 min-w-12 h-12 flex items-center justify-center"
                  >
                    {newIcon}
                  </button>
                )}
                {iconPickerTab === 'icon' && (
                  <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto bg-slate-600 p-2 rounded">
                    {svgIcons.map((icon) => (
                      <button
                        key={icon.name}
                        type="button"
                        title={icon.label}
                        className={`p-2 rounded ${newIconValue === icon.name ? 'bg-slate-500' : 'hover:bg-slate-500'}`}
                        onClick={() => setNewIconValue(icon.name)}
                        dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(icon.svg) }}
                      />
                    ))}
                  </div>
                )}
                {iconPickerTab === 'image' && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingImage(true);
                        const formData = new FormData();
                        formData.append('image', file);
                        try {
                          const res = await fetch('/api/upload/icon', {
                            method: 'POST',
                            body: formData
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setNewIconValue(data.url);
                          } else {
                            alert('Fehler beim Hochladen');
                          }
                        } catch (err) {
                          alert('Fehler beim Hochladen: ' + err.message);
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 bg-slate-600 rounded hover:bg-slate-500 text-white"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Lädt...' : (newIconValue ? 'Bild ändern' : 'Bild auswählen')}
                    </button>
                    {newIconValue && (
                      <img src={newIconValue} alt="Icon Vorschau" className="w-12 h-12 object-contain rounded border border-slate-500" />
                    )}
                  </div>
                )}
                {/* Emoji-Picker */}
                {showEmojiPicker === 'main' && iconPickerTab === 'emoji' && (
                  <div className="bg-slate-600 p-3 rounded-lg grid grid-cols-8 gap-2 max-h-48 overflow-y-auto mt-2">
                    {commonEmojis.map((emoji, idx) => (
                      <button
                        key={emoji + '-' + idx}
                        type="button"
                        onClick={() => {
                          setNewIcon(emoji);
                          setShowEmojiPicker(null);
                        }}
                        className="text-2xl hover:bg-slate-500 p-2 rounded cursor-pointer transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="z.B. Büro, Schule, Sport..."
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-slate-600 text-slate-100 border border-slate-500 placeholder-slate-400"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold"
              >
                Hinzufügen
              </button>
            </div>
          </form>

          {/* Liste der Activity Icons */}
          <div className="space-y-2">
            {activityIcons.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Icons hinzugefügt</p>
            ) : (
              activityIcons.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    {/* Icon je nach Typ anzeigen */}
                    {item.iconType === "emoji" || !item.iconType ? (
                      <span className="text-2xl">{item.icon}</span>
                    ) : item.iconType === "icon" && item.iconValue ? (
                      (() => {
                        const svgIcon = svgIcons.find(s => s.name === item.iconValue);
                        return svgIcon ? (
                            <span className="text-2xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(svgIcon.svg) }} />
                          ) : (
                            <span className="text-2xl">🔲</span>
                          );
                      })()
                    ) : item.iconType === "image" && item.iconValue ? (
                      renderImageIcon(item)
                    ) : (
                      <span className="text-2xl">❓</span>
                    )}
                    <span className="font-semibold text-slate-100">{item.activity}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteActivityIcon(item.id)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Löschen
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Wöchentliches Icon-Kopieren konfigurieren */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>⏰ Icons wöchentlich kopieren</h2>
          <p className="text-sm text-gray-300 mb-4">Konfiguriere einen Wochentag und Uhrzeit, um Icons aus der vergangenen Woche automatisch in die nächste Woche zu kopieren.</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Wochentag */}
              <div>
                <label className="block text-sm font-semibold mb-2">Wochentag</label>
                <select
                  value={weeklyIconCopyDay}
                  onChange={(e) => setWeeklyIconCopyDay(parseInt(e.target.value))}
                  className="w-full p-2 bg-slate-700 text-white rounded border border-slate-600"
                >
                  <option value={0}>Sonntag</option>
                  <option value={1}>Montag</option>
                  <option value={2}>Dienstag</option>
                  <option value={3}>Mittwoch</option>
                  <option value={4}>Donnerstag</option>
                  <option value={5}>Freitag</option>
                  <option value={6}>Samstag</option>
                </select>
              </div>

              {/* Stunde */}
              <div>
                <label className="block text-sm font-semibold mb-2">Uhrzeit (Stunde)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={weeklyIconCopyHour}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) val = 0;
                    if (val < 0) val = 0;
                    if (val > 23) val = 23;
                    setWeeklyIconCopyHour(val);
                  }}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0 || val > 23) {
                      setWeeklyIconCopyHour(Math.max(0, Math.min(23, val || 0)));
                    }
                  }}
                  className="w-full p-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
              <p>✓ Kopiert jeden <strong>{["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][weeklyIconCopyDay]}</strong> um <strong>{String(weeklyIconCopyHour).padStart(2, '0')}:00 Uhr</strong></p>
            </div>
          </div>
        </div>

        {/* Test Sektion */}
        <div className="mb-6 card p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>🔧 Test-Bereich</h2>
          <div className="space-y-2">
            <div>Loading: {loading ? 'true' : 'false'}</div>
            <div>IsAuthenticated: {isAuthenticated ? 'true' : 'false'}</div>
            <div>LocalConfig: {localConfig ? 'vorhanden' : 'null'}</div>
            <div>Family length: {family ? family.length : 'undefined'}</div>
            <div>Birthdays length: {birthdays ? birthdays.length : 'undefined'}</div>
            <div>StandardItems length: {standardItems ? standardItems.length : 'undefined'}</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Modals */}
    {renderBirthdayPopup()}
    {renderMealEditPopup()}

    </>
  );
}
