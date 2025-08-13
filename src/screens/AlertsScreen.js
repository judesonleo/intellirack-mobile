import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	TouchableOpacity,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
	fetchAllAlerts,
	acknowledgeAlert,
	acknowledgeAllAlerts,
	deleteAlert,
	clearAcknowledgedAlerts,
} from "../services/alerts";
import { useSocket } from "../contexts/SocketContext";

export default function AlertsScreen({ navigation }) {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [filter, setFilter] = useState("all"); // all, active, acknowledged, resolved
	const { socket } = useSocket();

	async function load() {
		try {
			setLoading(true);
			const data = await fetchAllAlerts(50);
			// Ensure we have valid data structure
			if (Array.isArray(data)) {
				setAlerts(data);
			} else if (data && Array.isArray(data.alerts)) {
				setAlerts(data.alerts);
			} else {
				console.warn("Invalid alerts data structure:", data);
				setAlerts([]);
			}
		} catch (e) {
			console.error("Failed to load alerts:", e);
			setAlerts([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	// Socket-driven push updates for alerts
	useEffect(() => {
		if (!socket) return;
		const onAlert = (data) => {
			if (!data || !data._id || typeof data !== "object") return;
			setAlerts((prev) => {
				if (prev.find((a) => a._id === data._id)) return prev;
				return [{ ...data, createdAt: new Date() }, ...prev];
			});
		};
		socket.on("alert", onAlert);
		return () => socket.off("alert", onAlert);
	}, [socket]);

	const handleAcknowledge = async (alertId) => {
		try {
			setActionLoading(true);
			await acknowledgeAlert(alertId);
			setAlerts((prev) =>
				prev.map((a) =>
					a._id === alertId
						? { ...a, acknowledged: true, acknowledgedAt: new Date() }
						: a
				)
			);
		} catch (e) {
			Alert.alert("Error", "Failed to acknowledge alert");
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteAlert = async (alertId) => {
		Alert.alert("Delete Alert", "Are you sure you want to delete this alert?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						setActionLoading(true);
						await deleteAlert(alertId);
						setAlerts((prev) => prev.filter((a) => a._id !== alertId));
					} catch (e) {
						Alert.alert("Error", "Failed to delete alert");
					} finally {
						setActionLoading(false);
					}
				},
			},
		]);
	};

	const handleAcknowledgeAll = async () => {
		try {
			setActionLoading(true);
			await acknowledgeAllAlerts();
			setAlerts((prev) =>
				prev.map((a) => ({
					...a,
					acknowledged: true,
					acknowledgedAt: new Date(),
				}))
			);
		} catch (e) {
			Alert.alert("Error", "Failed to acknowledge all alerts");
		} finally {
			setActionLoading(false);
		}
	};

	const handleClearAcknowledged = async () => {
		Alert.alert(
			"Clear Acknowledged",
			"Are you sure you want to delete all acknowledged alerts?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: async () => {
						try {
							setActionLoading(true);
							await clearAcknowledgedAlerts();
							setAlerts((prev) => prev.filter((a) => !a.acknowledged));
						} catch (e) {
							Alert.alert("Error", "Failed to clear acknowledged alerts");
						} finally {
							setActionLoading(false);
						}
					},
				},
			]
		);
	};

	const getSeverityColor = (severity) => {
		if (!severity) return "#6b7280";
		switch (severity.toLowerCase()) {
			case "high":
				return "#ef4444";
			case "medium":
				return "#f59e0b";
			case "low":
				return "#10b981";
			default:
				return "#6b7280";
		}
	};

	const getStatusColor = (alert) => {
		if (!alert) return "#6b7280";
		if (alert.acknowledged) return "#f59e0b";
		switch (alert.status?.toLowerCase()) {
			case "active":
				return "#ef4444";
			case "acknowledged":
				return "#f59e0b";
			case "resolved":
				return "#10b981";
			default:
				return "#6b7280";
		}
	};

	const getStatusText = (alert) => {
		if (!alert) return "Unknown";
		if (alert.acknowledged) return "Acknowledged";
		return alert.status || "Active";
	};

	const filteredAlerts = alerts.filter((alert) => {
		if (!alert || typeof alert !== "object") return false;
		if (filter === "all") return true;
		if (filter === "active") return !alert.acknowledged;
		if (filter === "acknowledged") return alert.acknowledged;
		if (filter === "resolved") return alert.status === "resolved";
		return true;
	});

	const renderAlert = ({ item }) => {
		if (!item) return null;

		return (
			<View style={styles.alertCard}>
				<View style={styles.alertHeader}>
					<View style={styles.severityBadge}>
						<View
							style={[
								styles.severityDot,
								{ backgroundColor: getSeverityColor(item.severity) },
							]}
						/>
						<Text style={styles.severityText}>
							{item.severity || "Unknown"}
						</Text>
					</View>
					<View style={styles.statusBadge}>
						<Text style={[styles.statusText, { color: getStatusColor(item) }]}>
							{getStatusText(item)}
						</Text>
					</View>
				</View>

				<Text style={styles.alertTitle}>
					{item.ingredient || item.type || "Alert"}
				</Text>
				{item.message && (
					<Text style={styles.alertMessage}>{item.message}</Text>
				)}
				{item.device && (
					<Text style={styles.deviceInfo}>
						Device: {item.device.name || item.device.rackId}
					</Text>
				)}

				<View style={styles.alertFooter}>
					<Text style={styles.timestamp}>
						{new Date(item.createdAt || item.timestamp).toLocaleString()}
					</Text>
					<View style={styles.alertActions}>
						{!item.acknowledged && (
							<TouchableOpacity
								style={styles.ackButton}
								onPress={() => handleAcknowledge(item._id)}
								disabled={actionLoading}
							>
								<Ionicons name="checkmark-circle" size={16} color="#10b981" />
								<Text style={styles.ackButtonText}>Acknowledge</Text>
							</TouchableOpacity>
						)}
						<TouchableOpacity
							style={styles.deleteButton}
							onPress={() => handleDeleteAlert(item._id)}
							disabled={actionLoading}
						>
							<Ionicons name="trash" size={16} color="#ef4444" />
							<Text style={styles.deleteButtonText}>Delete</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#6366f1" />
				</TouchableOpacity>
				<Text style={styles.title}>Alerts</Text>
				<View style={styles.placeholder} />
			</View>

			<View style={styles.filters}>
				{["all", "active", "acknowledged", "resolved"].map((f) => (
					<TouchableOpacity
						key={f}
						style={[
							styles.filterButton,
							filter === f && styles.filterButtonActive,
						]}
						onPress={() => setFilter(f)}
					>
						<Text
							style={[
								styles.filterText,
								filter === f && styles.filterTextActive,
							]}
						>
							{f.charAt(0).toUpperCase() + f.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Quick Actions */}
			<View style={styles.quickActions}>
				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleAcknowledgeAll}
					disabled={actionLoading}
				>
					<Ionicons name="checkmark-circle" size={16} color="#fff" />
					<Text style={styles.actionButtonText}>Acknowledge All</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.actionButton, styles.clearButton]}
					onPress={handleClearAcknowledged}
					disabled={actionLoading}
				>
					<Ionicons name="trash" size={16} color="#fff" />
					<Text style={styles.actionButtonText}>Clear Acknowledged</Text>
				</TouchableOpacity>
			</View>

			<FlatList
				data={filteredAlerts}
				keyExtractor={(item) => item._id}
				renderItem={renderAlert}
				refreshControl={
					<RefreshControl refreshing={loading} onRefresh={load} />
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<Ionicons name="checkmark-circle" size={48} color="#d1d5db" />
						<Text style={styles.emptyText}>No alerts found</Text>
						<Text style={styles.emptySubtext}>
							{filter === "all"
								? "You're all caught up!"
								: `No ${filter} alerts`}
						</Text>
					</View>
				}
				contentContainerStyle={{ paddingBottom: 20 }}
			/>
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
	filters: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingVertical: 16,
		gap: 8,
		backgroundColor: "#fff",
	},
	filterButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
	},
	filterButtonActive: {
		backgroundColor: "#6366f1",
	},
	filterText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#6b7280",
	},
	filterTextActive: {
		color: "#fff",
	},
	alertCard: {
		backgroundColor: "#fff",
		marginHorizontal: 20,
		marginTop: 12,
		borderRadius: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	alertHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	severityBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	severityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	severityText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
		textTransform: "uppercase",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: "#f3f4f6",
	},
	statusText: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	alertTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 8,
	},
	alertMessage: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 8,
		lineHeight: 20,
	},
	deviceInfo: {
		fontSize: 12,
		color: "#9ca3af",
		marginBottom: 12,
	},
	alertFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	timestamp: {
		fontSize: 12,
		color: "#9ca3af",
	},
	ackButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: "#f0fdf4",
		borderWidth: 1,
		borderColor: "#dcfce7",
		minWidth: 120,
		justifyContent: "center",
	},
	ackButtonText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#10b981",
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: "#fef3f2",
		borderWidth: 1,
		borderColor: "#fca5a5",
		minWidth: 120,
		justifyContent: "center",
	},
	deleteButtonText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#ef4444",
	},
	alertActions: {
		flexDirection: "column",
		gap: 8,
		alignItems: "flex-end",
	},
	quickActions: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: "#6366f1",
	},
	clearButton: {
		backgroundColor: "#ef4444",
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 60,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#6b7280",
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#9ca3af",
		marginTop: 4,
	},
});
