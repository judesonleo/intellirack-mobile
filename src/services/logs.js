import { API_BASE } from "../config";
import { fetchWithAuth } from "../lib/auth";

export async function fetchRecentLogs(limit = 3) {
	const res = await fetchWithAuth(
		`${API_BASE}/logs/?limit=${limit}&sort=newest`
	);
	if (!res.ok) throw new Error("Failed to load logs");
	const data = await res.json();
	return data.logs || data;
}
