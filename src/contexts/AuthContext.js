import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	login as apiLogin,
	register as apiRegister,
	logout as apiLogout,
	getUser as apiGetUser,
	refreshUser as apiRefreshUser,
} from "../lib/auth";

const AuthContext = createContext({
	user: null,
	loading: true,
	login: async (_e, _p) => {},
	register: async (_f, _l, _e, _p) => {},
	logout: async () => {},
	refresh: async () => {},
});

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			console.log("🔐 AuthContext - initializing...");
			const existing = await apiGetUser();
			if (existing) {
				console.log("🔐 AuthContext - found existing user:", existing.email);
				// Verify the token is still valid by calling refreshUser
				const refreshed = await apiRefreshUser();
				if (refreshed) {
					console.log(
						"🔐 AuthContext - token validated, user set:",
						refreshed.email
					);
					setUser(refreshed);
				} else {
					console.log("🔐 AuthContext - token invalid, clearing user");
					setUser(null);
				}
			} else {
				console.log("🔐 AuthContext - no existing user found");
			}
			setLoading(false);
		})();
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			login: async (email, password) => {
				const u = await apiLogin(email, password);
				setUser(u);
				return u;
			},
			register: async (firstName, lastName, email, password) =>
				apiRegister(firstName, lastName, email, password),
			logout: async () => {
				await apiLogout();
				setUser(null);
			},
			refresh: async () => {
				const refreshed = await apiRefreshUser();
				if (refreshed) setUser(refreshed);
				return refreshed;
			},
		}),
		[user, loading]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	return useContext(AuthContext);
}
