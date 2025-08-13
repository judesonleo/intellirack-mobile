import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchMyDevices } from "../services/devices";
import { fetchActiveAlerts } from "../services/alerts";
import { fetchRecentLogs } from "../services/logs";
import { fetchIngredientsSummary } from "../services/ingredients";
import { useSocket } from "../contexts/SocketContext";
import { useShoppingList } from "../contexts/ShoppingListContext";
import AddToShoppingListModal from "../components/AddToShoppingListModal";
import ExportShoppingListModal from "../components/ExportShoppingListModal";

export default function DashboardScreen() {
	const [counts, setCounts] = useState({
		devices: 0,
		online: 0,
		offline: 0,
		alerts: 0,
	});

	const [alerts, setAlerts] = useState([]);
	const [logs, setLogs] = useState([]);
	const [ingredients, setIngredients] = useState([]);
	const [loading, setLoading] = useState(false);
	const [shoppingListModalVisible, setShoppingListModalVisible] =
		useState(false);
	const [exportModalVisible, setExportModalVisible] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const { socket } = useSocket();
	const { addToShoppingList, shoppingList } = useShoppingList();

	async function load() {
		try {
			setLoading(true);
			const [devices, activeAlerts, recentLogs, ingredientsData] =
				await Promise.all([
					fetchMyDevices(),
					fetchActiveAlerts(5),
					fetchRecentLogs(5),
					fetchIngredientsSummary(),
				]);

			// Debug: Log device statuses to see what we're getting
			console.log(
				"Device statuses:",
				devices?.map((d) => ({
					rackId: d.rackId,
					status: d.status,
					lastSeen: d.lastSeen,
				}))
			);

			// Use helper function to calculate device counts
			const deviceCounts = recalculateDeviceCounts(devices);

			setCounts({
				devices: (devices || []).length,
				online: deviceCounts.online,
				offline: deviceCounts.offline,
				alerts: (activeAlerts || []).length,
			});
			setAlerts(activeAlerts || []);
			setLogs(recentLogs || []);
			console.log("Dashboard load - ingredientsData:", ingredientsData);
			setIngredients(ingredientsData || []);
		} catch (e) {
			console.error("Failed to load dashboard data:", e);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	// Socket-driven push updates for alerts and device status
	useEffect(() => {
		if (!socket) return;

		const onAlert = (data) => {
			if (!data || !data._id) return;
			setAlerts((prev) => {
				if (prev.find((a) => a._id === data._id)) return prev;
				const next = [{ ...data, createdAt: new Date() }, ...prev];
				setCounts((c) => ({ ...c, alerts: next.length }));
				return next.slice(0, 5);
			});
		};

		const onDeviceStatusChange = (data) => {
			if (!data || !data.rackId) return;
			console.log("Device status change:", data);

			// Update device status in real-time
			setCounts((prev) => {
				// For now, just update the counts based on the status change
				// In a full implementation, we'd update the devices array and recalculate
				if (data.isOnline !== undefined) {
					const onlineChange = data.isOnline ? 1 : -1;
					return {
						...prev,
						online: Math.max(0, prev.online + onlineChange),
						offline: Math.max(0, prev.offline - onlineChange),
					};
				}
				return prev;
			});
		};

		socket.on("alert", onAlert);
		socket.on("deviceStatusChange", onDeviceStatusChange);
		socket.on("deviceStatus", onDeviceStatusChange); // Web app uses this event

		return () => {
			socket.off("alert", onAlert);
			socket.off("deviceStatusChange", onDeviceStatusChange);
			socket.off("deviceStatus", onDeviceStatusChange);
		};
	}, [socket]);

	const getInventoryHealth = () => {
		if (!ingredients.length) return 0;

		// Use the same logic as the web app
		const totalStock = ingredients.reduce(
			(sum, ing) => sum + (ing.weight || 0),
			0
		);
		const expectedMaxCapacity = ingredients.length * 1000; // Assume 1000g max per ingredient

		// Calculate health as percentage of total stock vs expected max capacity
		const healthPercentage =
			totalStock > 0
				? Math.min(100, Math.round((totalStock / expectedMaxCapacity) * 100))
				: 0;

		return healthPercentage;
	};

	const getInventoryHealthColor = (healthScore) => {
		if (healthScore >= 80) return "#10b981"; // Green - Excellent
		if (healthScore >= 60) return "#3b82f6"; // Blue - Good
		if (healthScore >= 40) return "#f59e0b"; // Yellow - Moderate
		if (healthScore >= 20) return "#f97316"; // Orange - Low
		return "#ef4444"; // Red - Critical
	};

	const getInventoryHealthText = (healthScore) => {
		if (healthScore >= 80) return "Excellent";
		if (healthScore >= 60) return "Good";
		if (healthScore >= 40) return "Moderate";
		if (healthScore >= 20) return "Low";
		return "Critical";
	};

	const getTopStocked = () => {
		return ingredients
			.filter((ing) => ing.weight > 0)
			.sort((a, b) => (b.weight || 0) - (a.weight || 0))
			.slice(0, 3);
	};

	const getLeastStocked = () => {
		return ingredients
			.filter((ing) => ing.weight > 0)
			.sort((a, b) => (a.weight || 0) - (b.weight || 0))
			.slice(0, 3);
	};

	const getSoonToBeEmpty = () => {
		console.log("getSoonToBeEmpty - ingredients data:", ingredients);
		const filtered = ingredients.filter((ing) => (ing.weight || 0) < 100);
		console.log("getSoonToBeEmpty - filtered items:", filtered);
		return filtered;
	};

	const handleAcknowledgeAlert = (alertId) => {
		setAlerts((prev) => prev.filter((alert) => alert._id !== alertId));
		setCounts((prev) => ({ ...prev, alerts: Math.max(0, prev.alerts - 1) }));
	};

	const onAlertAcknowledged = (alertId) => {
		setAlerts((prev) => prev.filter((alert) => alert._id !== alertId));
		setCounts((prev) => ({ ...prev, alerts: Math.max(0, prev.alerts - 1) }));
	};

	const handleAddToShoppingList = (item) => {
		console.log("handleAddToShoppingList called with item:", item);
		setSelectedItem(item);
		setShoppingListModalVisible(true);
	};

	const onShoppingListAdd = async (shoppingItem) => {
		try {
			await addToShoppingList(shoppingItem);
			// You could show a success message here
		} catch (error) {
			console.error("Failed to add to shopping list:", error);
		}
	};

	const getActivityIcon = (status) => {
		switch (status?.toUpperCase()) {
			case "GOOD":
				return "checkmark-circle";
			case "OK":
				return "ellipse";
			case "LOW":
				return "warning";
			case "VLOW":
				return "alert-circle";
			case "EMPTY":
				return "close-circle";
			default:
				return "information-circle";
		}
	};

	const getActivityColor = (status) => {
		switch (status?.toUpperCase()) {
			case "GOOD":
				return "#10b981";
			case "OK":
				return "#f59e0b";
			case "LOW":
				return "#f97316";
			case "VLOW":
				return "#ef4444";
			case "EMPTY":
				return "#dc2626";
			default:
				return "#6366f1";
		}
	};

	const formatActivityTime = (timestamp) => {
		if (!timestamp) return "Unknown time";
		const date = new Date(timestamp);
		const now = new Date();
		const diffMinutes = Math.floor((now - date) / (1000 * 60));

		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	};

	const getAlertIcon = (severity) => {
		switch (severity?.toLowerCase()) {
			case "high":
				return "alert-circle";
			case "medium":
				return "warning";
			case "low":
				return "information-circle";
			default:
				return "warning";
		}
	};

	const getAlertColor = (severity) => {
		switch (severity?.toLowerCase()) {
			case "high":
				return "#ef4444";
			case "medium":
				return "#f59e0b";
			case "low":
				return "#3b82f6";
			default:
				return "#f59e0b";
		}
	};

	const formatAlertTime = (timestamp) => {
		if (!timestamp) return "Unknown time";
		const date = new Date(timestamp);
		const now = new Date();
		const diffMinutes = Math.floor((now - date) / (1000 * 60));

		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	};

	const recalculateDeviceCounts = (devices) => {
		if (!devices) return { online: 0, offline: 0 };

		// Use the same logic as the web app
		const onlineDevices = devices.filter((d) => {
			// Check if device has isOnline field (like web app)
			if (d.isOnline !== undefined) {
				return d.isOnline;
			}

			// Fallback: check if lastSeen is recent (within 5 minutes)
			if (d.lastSeen) {
				const lastSeen = new Date(d.lastSeen);
				const now = new Date();
				const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
				return diffMinutes < 5; // Same threshold as web app
			}

			// Default to offline if no status info
			return false;
		}).length;

		const offlineDevices = devices.filter((d) => {
			// Check if device has isOnline field (like web app)
			if (d.isOnline !== undefined) {
				return !d.isOnline;
			}

			// Fallback: check if lastSeen is old (more than 5 minutes)
			if (d.lastSeen) {
				const lastSeen = new Date(d.lastSeen);
				const now = new Date();
				const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
				return diffMinutes >= 5; // Same threshold as web app
			}

			// Default to offline if no status info
			return true;
		}).length;

		return { online: onlineDevices, offline: offlineDevices };
	};

	const renderInventoryItem = (item, index, isTop = true) => (
		<View
			key={item.name || index}
			style={[
				styles.inventoryItem,
				{ backgroundColor: isTop ? "#10b981" : "#ef4444" },
			]}
		>
			<Text style={styles.inventoryItemText}>
				{item.name}: {Math.round(item.weight || 0)}g
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={load}
						colors={["#6366f1"]}
						tintColor="#6366f1"
					/>
				}
			>
				<Text style={styles.title}>Dashboard</Text>

				{/* Stats Overview */}
				<View style={styles.statsContainer}>
					<Text style={styles.statsTitle}>System Overview</Text>
					<View style={styles.statsGrid}>
						<View style={styles.statCardLarge}>
							<View style={styles.statCardBackground} />
							<View style={styles.statCardHeader}>
								<Ionicons name="hardware-chip" size={40} color="#6366f1" />
								<Text style={styles.statCardTitle}>Devices</Text>
							</View>
							<View style={styles.statCardMainContent}>
								<Text style={styles.statCardValue}>{counts.devices}</Text>
								<Text style={styles.statCardSubtitle}>Total Connected</Text>
							</View>
							<View style={styles.statCardStatusBar}>
								<View style={styles.statusIndicator}>
									<View style={styles.statusContainer}>
										<View
											style={[styles.statusDot, { backgroundColor: "#10b981" }]}
										/>
										<Text style={styles.statusText}>
											{counts.online} Online
										</Text>
									</View>
								</View>
								<View style={styles.statusIndicator}>
									<View style={styles.statusContainer}>
										<View
											style={[styles.statusDot, { backgroundColor: "#ef4444" }]}
										/>
										<Text style={styles.statusText}>
											{counts.offline} Offline
										</Text>
									</View>
								</View>
							</View>
						</View>

						<View style={styles.statCardWide}>
							<View style={styles.statCardHeader}>
								<Ionicons name="warning" size={28} color="#ec4899" />
								<Text style={styles.statCardTitle}>Active Alerts</Text>
							</View>
							<Text style={styles.statCardValueLarge}>{counts.alerts}</Text>
							<Text style={styles.statCardSubtitle}>
								{counts.alerts > 0
									? "Requires attention"
									: "All systems normal"}
							</Text>
						</View>
					</View>
				</View>

				{/* Restock Alerts Section */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Restock Alerts</Text>
						<TouchableOpacity
							style={[
								styles.exportButton,
								shoppingList.length === 0 && styles.exportButtonDisabled,
							]}
							onPress={() => setExportModalVisible(true)}
							disabled={shoppingList.length === 0}
						>
							<Ionicons
								name="share-outline"
								size={16}
								color={shoppingList.length === 0 ? "#9ca3af" : "#8A2BE2"}
							/>
						</TouchableOpacity>
					</View>
					{getSoonToBeEmpty().length > 0 ? (
						getSoonToBeEmpty().map((item, index) => (
							<View key={item.name || index} style={styles.restockItem}>
								<View style={styles.restockItemIcon}>
									<Ionicons name="warning" size={20} color="#f59e0b" />
								</View>
								<View style={styles.restockItemContent}>
									<Text style={styles.restockItemName}>{item.name}</Text>
									<Text style={styles.restockItemStatus}>
										Current: {Math.round(item.weight || 0)}g • Need:{" "}
										{Math.round((item.maxWeight || 1000) - (item.weight || 0))}g
									</Text>
								</View>
								<View style={styles.restockItemActions}>
									<TouchableOpacity
										style={styles.addToShoppingListButton}
										onPress={() => handleAddToShoppingList(item)}
									>
										<Ionicons name="cart-outline" size={16} color="#8A2BE2" />
										<Text style={styles.addToShoppingListText}>Add</Text>
									</TouchableOpacity>
									<View style={styles.restockItemPriority}>
										<Text style={styles.restockItemPriorityText}>
											LOW STOCK
										</Text>
									</View>
								</View>
							</View>
						))
					) : (
						<View style={styles.noRestockItems}>
							<Ionicons name="checkmark-circle" size={48} color="#10b981" />
							<Text style={styles.noRestockItemsText}>
								All ingredients well stocked!
							</Text>
							<Text style={styles.noRestockItemsSubtext}>
								No restocking needed at this time.
							</Text>
						</View>
					)}
				</View>

				{/* Inventory Overview */}
				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Inventory Overview</Text>

					<View style={styles.inventoryStats}>
						<View style={styles.inventoryStat}>
							<Text style={styles.inventoryStatLabel}>Total Stock</Text>
							<Text style={styles.inventoryStatValue}>
								{ingredients
									.reduce((sum, ing) => sum + (ing.weight || 0), 0)
									.toFixed(1)}
								g
							</Text>
						</View>
					</View>

					<View style={styles.healthScoreContainer}>
						<Text style={styles.healthScoreLabel}>Health Score</Text>
						<View style={styles.healthBarContainer}>
							<View
								style={[
									styles.healthBar,
									{
										width: `${getInventoryHealth()}%`,
										backgroundColor: getInventoryHealthColor(
											getInventoryHealth()
										),
									},
								]}
							/>
							<Text
								style={[
									styles.healthText,
									{ color: getInventoryHealthColor(getInventoryHealth()) },
								]}
							>
								{getInventoryHealth()}% -{" "}
								{getInventoryHealthText(getInventoryHealth())}
							</Text>
						</View>
					</View>

					<View style={styles.inventorySection}>
						<Text style={styles.inventorySectionTitle}>Top Stocked</Text>
						<View style={styles.inventoryItems}>
							{getTopStocked().map((item, index) =>
								renderInventoryItem(item, index, true)
							)}
						</View>
					</View>

					<View style={styles.inventorySection}>
						<Text style={styles.inventorySectionTitle}>Least Stocked</Text>
						<View style={styles.inventoryItems}>
							{getLeastStocked().map((item, index) =>
								renderInventoryItem(item, index, false)
							)}
						</View>
					</View>

					<View style={styles.inventorySection}>
						<Text style={styles.inventorySectionTitle}>Soon to be Empty</Text>
						<View style={styles.inventoryItems}>
							{getSoonToBeEmpty().length > 0 ? (
								getSoonToBeEmpty().map((item, index) => (
									<View
										key={item.name || index}
										style={[
											styles.inventoryItem,
											{ backgroundColor: "#f59e0b" },
										]}
									>
										<Text style={styles.inventoryItemText}>
											{item.name}: {Math.round(item.weight || 0)}g
										</Text>
									</View>
								))
							) : (
								<Text style={styles.emptyText}>None</Text>
							)}
						</View>
					</View>

					<View style={styles.inventorySection}>
						<Text style={styles.inventorySectionTitle}>
							Restock Suggestions
						</Text>
						<View style={styles.inventoryItems}>
							{getSoonToBeEmpty().length > 0 ? (
								getSoonToBeEmpty().map((item, index) => (
									<View
										key={item.name || index}
										style={[
											styles.inventoryItem,
											{ backgroundColor: "#8b5cf6" },
										]}
									>
										<Ionicons name="refresh" size={16} color="#fff" />
										<Text style={styles.inventoryItemText}>{item.name}</Text>
									</View>
								))
							) : (
								<Text style={styles.emptyText}>All items well stocked</Text>
							)}
						</View>
					</View>
				</View>

				{/* Recent Activity */}
				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Recent Activity</Text>
					<FlatList
						data={logs}
						keyExtractor={(item) => item._id}
						scrollEnabled={false}
						ListEmptyComponent={
							<Text style={styles.emptyText}>No recent activity.</Text>
						}
						renderItem={({ item }) => (
							<View style={styles.activityItem}>
								<View style={styles.activityIcon}>
									<Ionicons name="checkmark-circle" size={16} color="#10b981" />
								</View>
								<View style={styles.activityContent}>
									<Text style={styles.activityText}>
										{item.ingredient || "Unknown"} {item.status}{" "}
										{Math.round(item.weight || 0)}g{" "}
										{item.device?.name || item.device?.rackId || "Device"}
									</Text>
									<Text style={styles.activityDate}>
										{new Date(item.timestamp).toLocaleDateString()},{" "}
										{new Date(item.timestamp).toLocaleTimeString()}
									</Text>
								</View>
							</View>
						)}
						contentContainerStyle={{ paddingBottom: 0 }}
					/>
				</View>

				{/* Active Alerts */}
				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Active Alerts</Text>
					<FlatList
						data={alerts}
						keyExtractor={(item) => item._id}
						scrollEnabled={false}
						ListEmptyComponent={
							<Text style={styles.emptyText}>No active alerts.</Text>
						}
						renderItem={({ item }) => (
							<View style={styles.alertItem}>
								<View style={styles.alertIcon}>
									<Ionicons name="warning" size={16} color="#6b7280" />
								</View>
								<View style={styles.alertContent}>
									<Text style={styles.alertText}>
										{item.ingredient || item.type}{" "}
										{item.device?.name || item.device?.rackId || "Device"}
									</Text>
									<Text style={styles.alertDate}>
										{new Date(
											item.createdAt || item.timestamp
										).toLocaleDateString()}
										,{" "}
										{new Date(
											item.createdAt || item.timestamp
										).toLocaleTimeString()}
									</Text>
								</View>
								<TouchableOpacity
									style={styles.ackButton}
									onPress={() => handleAcknowledgeAlert(item._id)}
								>
									<Text style={styles.ackButtonText}>Ack</Text>
								</TouchableOpacity>
							</View>
						)}
						contentContainerStyle={{ paddingBottom: 0 }}
					/>
				</View>
			</ScrollView>

			{/* Shopping List Modal */}
			<AddToShoppingListModal
				visible={shoppingListModalVisible}
				onClose={() => setShoppingListModalVisible(false)}
				onAdd={onShoppingListAdd}
				item={selectedItem}
			/>

			{/* Export Modal */}
			<ExportShoppingListModal
				visible={exportModalVisible}
				onClose={() => setExportModalVisible(false)}
				shoppingList={shoppingList}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
	text: { color: "#6b7280" },
	statsContainer: {
		marginBottom: 24,
	},
	statsTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 16,
	},
	statsGrid: {
		gap: 16,
	},
	statsRow: {
		flexDirection: "row",
		gap: 12,
	},
	statCardLarge: {
		backgroundColor: "#f8fafc",
		borderRadius: 24,
		padding: 32,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 3,
		position: "relative",
		overflow: "hidden",
		minHeight: 180,
	},

	statCardWide: {
		backgroundColor: "#fef2f2",
		borderRadius: 20,
		padding: 24,
		borderWidth: 1,
		borderColor: "#fecaca",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 2,
	},
	statCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	statCardTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "#374151",
		marginLeft: 12,
	},
	statCardValue: {
		fontSize: 64,
		fontWeight: "900",
		color: "#6366f1",
		marginBottom: 12,
	},

	statCardValueLarge: {
		fontSize: 42,
		fontWeight: "700",
		color: "#dc2626",
		marginBottom: 8,
	},

	statCardSubtitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#6b7280",
	},
	statCardMainContent: {
		alignItems: "center",
		marginBottom: 16,
	},
	statCardStatusBar: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingTop: 20,
		paddingBottom: 8,
		borderTopWidth: 2,
		borderTopColor: "#e2e8f0",
	},
	statusIndicator: {
		flexDirection: "row",
		alignItems: "center",
	},
	statusContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: "#ffffff",
		borderRadius: 20,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	statusDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 8,
	},
	statusText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
	},
	statCardIconContainer: {
		marginBottom: 12,
	},
	statCardBackground: {
		position: "absolute",
		top: -20,
		right: -20,
		width: 80,
		height: 80,
		backgroundColor: "rgba(99, 102, 241, 0.05)",
		borderRadius: 40,
	},

	stockLevelItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: "#f9fafb",
		borderRadius: 8,
		marginBottom: 6,
	},
	stockLevelIndicator: {
		marginRight: 10,
	},
	stockLevelText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
	stockLevelBadge: {
		backgroundColor: "#10b981",
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 6,
	},
	stockLevelBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "600",
	},
	healthScoreContainer: {
		marginBottom: 16,
	},
	healthScoreLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 8,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginTop: 8,
		marginBottom: 8,
	},
	exportButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: "#f3e8ff",
	},
	exportButtonDisabled: {
		backgroundColor: "#f3f4f6",
		opacity: 0.5,
	},
	itemCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	itemTitle: { fontSize: 14, fontWeight: "700" },
	meta: { color: "#6b7280", fontSize: 12 },
	sectionCard: {
		backgroundColor: "#fff",
		borderRadius: 14,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	restockItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: "#fffbeb",
		borderRadius: 12,
		marginBottom: 8,
		borderLeftWidth: 4,
		borderLeftColor: "#f59e0b",
	},
	restockItemIcon: {
		marginRight: 12,
	},
	restockItemContent: {
		flex: 1,
	},
	restockItemName: {
		fontSize: 16,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 4,
	},
	restockItemStatus: {
		fontSize: 14,
		color: "#6b7280",
	},
	restockItemActions: {
		alignItems: "flex-end",
		gap: 8,
	},
	addToShoppingListButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f3e8ff",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#ddd6fe",
		gap: 4,
	},
	addToShoppingListText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8A2BE2",
	},
	restockItemPriority: {
		backgroundColor: "#f59e0b",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
	},
	restockItemPriorityText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	noRestockItems: {
		alignItems: "center",
		paddingVertical: 20,
	},
	noRestockItemsText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#10b981",
		marginTop: 12,
		textAlign: "center",
	},
	noRestockItemsSubtext: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 4,
		textAlign: "center",
	},
	inventoryStats: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	inventoryStat: {
		alignItems: "center",
	},
	inventoryStatLabel: {
		fontSize: 12,
		color: "#6b7280",
		marginBottom: 4,
	},
	inventoryStatValue: {
		fontSize: 20,
		fontWeight: "800",
	},
	healthBarContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#e0e7ff",
		borderRadius: 8,
		padding: 4,
		width: "100%",
		overflow: "hidden",
	},
	healthBar: {
		height: 8,
		borderRadius: 4,
		backgroundColor: "#3b82f6",
		maxWidth: "100%",
		minWidth: 0,
	},
	healthText: {
		marginLeft: 8,
		fontSize: 12,
		color: "#3b82f6",
		flexShrink: 0,
	},
	inventorySection: {
		marginBottom: 12,
	},
	inventorySectionTitle: {
		fontSize: 14,
		fontWeight: "700",
		marginBottom: 8,
	},
	inventoryItems: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	inventoryItem: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	inventoryItemText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	emptyText: {
		color: "#9ca3af",
		fontSize: 14,
		textAlign: "center",
		marginTop: 10,
	},
	activityItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f3f4f6",
	},
	activityIcon: {
		marginRight: 12,
	},
	activityContent: {
		flex: 1,
	},
	activityText: {
		fontSize: 14,
		color: "#374151",
		marginBottom: 4,
	},
	activityDate: {
		fontSize: 12,
		color: "#9ca3af",
	},
	alertItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#f3f4f6",
	},
	alertIcon: {
		marginRight: 12,
	},
	alertContent: {
		flex: 1,
		marginRight: 8,
	},
	alertText: {
		fontSize: 14,
		color: "#374151",
		marginBottom: 4,
		flexShrink: 1,
		numberOfLines: 2,
	},
	alertDate: {
		fontSize: 12,
		color: "#9ca3af",
	},

	ackButton: {
		backgroundColor: "#3b82f6",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	ackButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
});
