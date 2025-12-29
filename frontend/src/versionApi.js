export async function fetchVersion() {
  const { hostname } = window.location;
  let url = "http://localhost:4000/api/version";
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    url = `http://${hostname}:4000/api/version`;
  }
  const res = await fetch(url);
  if (!res.ok) return "unbekannt";
  const data = await res.json();
  return data.version || "unbekannt";
}
