import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bestimme die API-URL basierend auf der Umgebung
const apiTarget = process.env.NODE_ENV === "docker" 
  ? "http://backend:4000" // Im Docker-Netzwerk: Service-Name verwenden
  : "http://localhost:4000"; // Lokal: localhost verwenden

// Vite-Konfiguration für lokales und Docker-Setup
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // notwendig für Zugriff im Docker-Netzwerk
    port: 3000,
    hmr: {
      port: 3000
    },
    proxy: {
      "/api": apiTarget // API-Proxy
    }
  },
  preview: {
    port: 3000,
    host: "0.0.0.0"
  },
  build: {
    outDir: "dist"
  }
});
