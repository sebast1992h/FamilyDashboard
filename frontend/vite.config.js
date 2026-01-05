import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite-Konfiguration für lokales und Docker-Setup
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // notwendig für Zugriff im Docker-Netzwerk
    port: 3000,
    proxy: {
      "/api": "http://backend:4000" // API-Proxy zu deinem Express-Server
    },
    allowedHosts: true
  },
  build: {
    outDir: "dist"
  }
});
