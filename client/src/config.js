export const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "");

if (!serverUrl) {
  throw new Error("VITE_SERVER_URL environment variable is required");
}
