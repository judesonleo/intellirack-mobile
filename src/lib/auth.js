import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE as API_URL } from "../config";

export async function login(email, password) {
	const res = await fetch(`${API_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	if (!res.ok) throw new Error((await safeJson(res))?.error || "Login failed");
	const data = await res.json();
	await AsyncStorage.setItem("token", data.token);
	await AsyncStorage.setItem("user", JSON.stringify(data.user));
	await AsyncStorage.setItem("email", email);
	return data.user;
}

export async function register(firstName, lastName, email, password) {
	const res = await fetch(`${API_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ firstName, lastName, email, password }),
	});
	if (!res.ok)
		throw new Error((await safeJson(res))?.error || "Register failed");
	return await res.json();
}

export async function refreshUser() {
	try {
		const token = await getToken();
		if (!token) return null;
		const res = await fetch(`${API_URL}/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return null;
		const userData = await res.json();
		await AsyncStorage.setItem("user", JSON.stringify(userData));
		return userData;
	} catch (e) {
		return null;
	}
}

export async function logout() {
	await AsyncStorage.multiRemove(["token", "user", "email"]);
}

export async function getToken() {
	return AsyncStorage.getItem("token");
}

export async function getUser() {
	try {
		const [userStr, email] = await AsyncStorage.multiGet([
			"user",
			"email",
		]).then((entries) => entries.map(([, v]) => v));
		if (!userStr) return null;
		const userData = JSON.parse(userStr);
		return {
			...userData,
			email: userData.email || email || undefined,
			_id: userData._id || userData.id,
			id: userData.id || userData._id,
		};
	} catch (e) {
		return null;
	}
}

export async function getEmail() {
	return AsyncStorage.getItem("email");
}

export async function fetchWithAuth(url, options = {}) {
	const token = await getToken();
	const headers = {
		...(options.headers || {}),
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
	return fetch(url, { ...options, headers });
}

async function safeJson(res) {
	try {
		return await res.json();
	} catch {
		return null;
	}
}

export { API_URL };
