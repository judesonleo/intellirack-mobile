import { API_BASE } from "../config";
import { fetchWithAuth } from "../lib/auth";

export async function fetchMyDevices() {
	console.log("🔍 fetchMyDevices - API_BASE:", API_BASE);
	console.log("🔍 fetchMyDevices - Full URL:", `${API_BASE}/devices/my`);
	const res = await fetchWithAuth(`${API_BASE}/devices/my`, {
		headers: { "Content-Type": "application/json" },
	});

	console.log("📱 fetchMyDevices response status:", res.status);
	console.log("📱 fetchMyDevices response ok:", res.ok);

	if (!res.ok) {
		const errorText = await res.text();
		console.error("❌ fetchMyDevices error response:", errorText);
		throw new Error("Failed to load devices");
	}

	const data = await res.json();
	console.log("✅ fetchMyDevices success - devices:", data);
	return data;
}
