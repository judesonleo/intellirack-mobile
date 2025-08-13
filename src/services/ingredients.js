import { API_BASE } from "../config";
import { fetchWithAuth } from "../lib/auth";

export async function fetchIngredientsSummary() {
	const res = await fetchWithAuth(`${API_BASE}/ingredients/summary`);
	if (!res.ok) throw new Error("Failed to load ingredients");
	return res.json();
}

export async function fetchIngredientLogs(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/logs/${encodeURIComponent(ingredientName)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient logs");
	return res.json();
}

export async function fetchIngredientUsage(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/usage/${encodeURIComponent(ingredientName)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient usage");
	return res.json();
}

export async function fetchIngredientPrediction(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/prediction/${encodeURIComponent(ingredientName)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient prediction");
	return res.json();
}

export async function fetchIngredientAnomalies(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/anomalies/${encodeURIComponent(ingredientName)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient anomalies");
	return res.json();
}

export async function fetchIngredientSubstitutions(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/substitutions/${encodeURIComponent(
			ingredientName
		)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient substitutions");
	return res.json();
}

export async function fetchIngredientRecommendations(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/recommendations/${encodeURIComponent(
			ingredientName
		)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient recommendations");
	return res.json();
}

export async function fetchIngredientUsagePatterns(ingredientName) {
	const res = await fetchWithAuth(
		`${API_BASE}/ingredients/usage-patterns/${encodeURIComponent(
			ingredientName
		)}`
	);
	if (!res.ok) throw new Error("Failed to load ingredient usage patterns");
	return res.json();
}
