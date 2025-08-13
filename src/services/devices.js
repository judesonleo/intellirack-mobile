import { API_BASE } from "../config";
import { fetchWithAuth } from "../lib/auth";

export async function fetchMyDevices() {
	const res = await fetchWithAuth(`${API_BASE}/devices/my`, {
		headers: { "Content-Type": "application/json" },
	});
	if (!res.ok) throw new Error("Failed to load devices");
	return res.json();
}
