// API base used across the app
export const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// Derive server URL (without /api) for endpoints like /health and sockets
export const SERVER_URL = API_BASE.replace(/\/api$/, "");

// Debug log to see what API URL is being used
console.log("🔧 Mobile App Config:");
console.log("📡 API_BASE:", API_BASE);
console.log("🌐 SERVER_URL:", SERVER_URL);

export default {
	API_BASE,
	SERVER_URL,
};
