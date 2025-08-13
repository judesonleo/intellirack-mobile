import { API_BASE } from "../config";
import { fetchWithAuth } from "../lib/auth";

export async function fetchActiveAlerts(limit = 5) {
	const res = await fetchWithAuth(
		`${API_BASE}/alerts/?status=active&limit=${limit}`
	);
	if (!res.ok) throw new Error("Failed to load alerts");
	const data = await res.json();
	return data.alerts || data;
}

export async function fetchAllAlerts(limit = 50) {
	const res = await fetchWithAuth(`${API_BASE}/alerts/?limit=${limit}`);
	if (!res.ok) throw new Error("Failed to load alerts");
	const data = await res.json();
	return data.alerts || data;
}

export async function acknowledgeAlert(alertId) {
	const res = await fetchWithAuth(`${API_BASE}/alerts/${alertId}/acknowledge`, {
		method: "PATCH",
	});
	if (!res.ok) throw new Error("Failed to acknowledge alert");
	return res.json();
}

export async function acknowledgeAllAlerts() {
	const res = await fetchWithAuth(`${API_BASE}/alerts/acknowledge-all`, {
		method: "PATCH",
	});
	if (!res.ok) throw new Error("Failed to acknowledge all alerts");
	return res.json();
}

export async function deleteAlert(alertId) {
	const res = await fetchWithAuth(`${API_BASE}/alerts/${alertId}`, {
		method: "DELETE",
	});
	if (!res.ok) throw new Error("Failed to delete alert");
	return res.json();
}

export async function clearAcknowledgedAlerts() {
	const res = await fetchWithAuth(`${API_BASE}/alerts/clearacknowledged`, {
		method: "DELETE",
	});
	if (!res.ok) throw new Error("Failed to clear acknowledged alerts");
	return res.json();
}
