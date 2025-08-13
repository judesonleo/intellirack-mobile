import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { getUser } from "../lib/auth";

export default function SettingsScreen({ navigation }) {
	const [user, setUser] = useState(null);
	const [notifications, setNotifications] = useState(true);
	const [darkMode, setDarkMode] = useState(false);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const { logout } = useAuth();

	useEffect(() => {
		loadUser();
	}, []);

	async function loadUser() {
		try {
			const userData = await getUser();
			setUser(userData);
		} catch (e) {
			console.error("Failed to load user:", e);
		}
	}

	const handleLogout = () => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Logout",
				style: "destructive",
				onPress: logout,
			},
		]);
	};

	const renderSettingItem = ({
		icon,
		title,
		subtitle,
		onPress,
		rightElement,
	}) => (
		<TouchableOpacity
			style={styles.settingItem}
			onPress={onPress}
			activeOpacity={0.7}
		>
			<View style={styles.settingLeft}>
				<View style={styles.iconContainer}>
					<Ionicons name={icon} size={20} color="#6366f1" />
				</View>
				<View style={styles.settingText}>
					<Text style={styles.settingTitle}>{title}</Text>
					{subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
				</View>
			</View>
			{rightElement || (
				<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
			)}
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#6366f1" />
				</TouchableOpacity>
				<Text style={styles.title}>Settings</Text>
				<View style={styles.placeholder} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Profile Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Profile</Text>
					<View style={styles.profileCard}>
						<View style={styles.avatarContainer}>
							<Ionicons name="person" size={32} color="#6366f1" />
						</View>
						<View style={styles.profileInfo}>
							<Text style={styles.profileName}>
								{user?.name || user?.email || "User"}
							</Text>
							<Text style={styles.profileEmail}>
								{user?.email || "No email"}
							</Text>
						</View>
					</View>
				</View>

				{/* App Settings */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>App Settings</Text>
					{renderSettingItem({
						icon: "notifications",
						title: "Push Notifications",
						subtitle: "Receive alerts and updates",
						rightElement: (
							<Switch
								value={notifications}
								onValueChange={setNotifications}
								trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
								thumbColor={notifications ? "#6366f1" : "#f3f4f6"}
							/>
						),
					})}
					{renderSettingItem({
						icon: "moon",
						title: "Dark Mode",
						subtitle: "Switch to dark theme",
						rightElement: (
							<Switch
								value={darkMode}
								onValueChange={setDarkMode}
								trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
								thumbColor={darkMode ? "#6366f1" : "#f3f4f6"}
							/>
						),
					})}
					{renderSettingItem({
						icon: "refresh",
						title: "Auto Refresh",
						subtitle: "Automatically update data",
						rightElement: (
							<Switch
								value={autoRefresh}
								onValueChange={setAutoRefresh}
								trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
								thumbColor={autoRefresh ? "#6366f1" : "#f3f4f6"}
							/>
						),
					})}
				</View>

				{/* Account Actions */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Account</Text>
					{renderSettingItem({
						icon: "shield-checkmark",
						title: "Privacy Policy",
						subtitle: "Read our privacy policy",
					})}
					{renderSettingItem({
						icon: "help-circle",
						title: "Help & Support",
						subtitle: "Get help and contact support",
					})}
					{renderSettingItem({
						icon: "information-circle",
						title: "About",
						subtitle: "App version and information",
					})}
				</View>

				{/* Logout Button */}
				<TouchableOpacity
					style={styles.logoutButton}
					onPress={handleLogout}
					activeOpacity={0.8}
				>
					<Ionicons name="log-out-outline" size={20} color="#ef4444" />
					<Text style={styles.logoutText}>Logout</Text>
				</TouchableOpacity>

				<View style={styles.bottomSpacing} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9fafb",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	backButton: {
		padding: 8,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1f2937",
	},
	placeholder: {
		width: 40,
	},
	content: {
		flex: 1,
	},
	section: {
		marginTop: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 12,
		marginHorizontal: 20,
	},
	profileCard: {
		backgroundColor: "#fff",
		marginHorizontal: 20,
		borderRadius: 16,
		padding: 20,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	avatarContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#f3f4f6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	profileInfo: {
		flex: 1,
	},
	profileName: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 4,
	},
	profileEmail: {
		fontSize: 14,
		color: "#6b7280",
	},
	settingItem: {
		backgroundColor: "#fff",
		marginHorizontal: 20,
		marginBottom: 1,
		paddingVertical: 16,
		paddingHorizontal: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	settingLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	settingText: {
		flex: 1,
	},
	settingTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 2,
	},
	settingSubtitle: {
		fontSize: 14,
		color: "#6b7280",
	},
	logoutButton: {
		backgroundColor: "#fff",
		marginHorizontal: 20,
		marginTop: 32,
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#ef4444",
	},
	bottomSpacing: {
		height: 20,
	},
});
