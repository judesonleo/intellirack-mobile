// API base used across the app
export const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// Derive server URL (without /api) for endpoints like /health and sockets
export const SERVER_URL = API_BASE.replace(/\/api$/, "");

export default {
	API_BASE,
	SERVER_URL,
};
