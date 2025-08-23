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

	const [devices, setDevices] = useState([]);
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

			setDevices(devices || []);
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

		const onDeviceStatus = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Device status update:", data);

			// Update device status in real-time like web app
			setDevices((prev) => {
				const updated = prev.map((device) =>
					device.rackId === data.deviceId
						? {
								...device,
								isOnline: data.isOnline,
								lastSeen: data.lastSeen,
								weight: data.weight,
								status: data.status,
								ingredient: data.ingredient,
						  }
						: device
				);

				// Recalculate device counts after status update
				const deviceCounts = recalculateDeviceCounts(updated);
				setCounts((c) => ({
					...c,
					devices: updated.length,
					online: deviceCounts.online,
					offline: deviceCounts.offline,
				}));

				return updated;
			});
		};

		const onUpdate = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Device update:", data);

			// Handle general device updates (weight, status, ingredient changes)
			setDevices((prev) =>
				prev.map((device) =>
					device.rackId === data.deviceId
						? {
								...device,
								isOnline: data.isOnline ?? true,
								lastSeen: data.lastSeen ?? new Date(),
								weight: data.weight,
								status: data.status,
								ingredient: data.ingredient,
						  }
						: device
				)
			);

			// Also update ingredients if weight/status changed
			if (data.weight !== undefined || data.status !== undefined) {
				setIngredients((prev) =>
					prev.map((ing) =>
						ing.device === data.deviceId
							? {
									...ing,
									weight: data.weight ?? ing.weight,
									status: data.status ?? ing.status,
									ingredient: data.ingredient ?? ing.ingredient,
							  }
							: ing
					)
				);
			}
		};

		const onDeviceAdded = () => {
			console.log("Device added, reloading devices...");
			load(); // Reload to get the new device
		};

		const onDeviceDeleted = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Device deleted:", data);

			// Remove the deleted device from local state
			setDevices((prev) =>
				prev.filter(
					(d) => d._id !== data.deviceId && d.rackId !== data.deviceId
				)
			);

			// Recalculate counts
			setCounts((prev) => {
				const remainingDevices = devices.filter(
					(d) => d._id !== data.deviceId && d.rackId !== data.deviceId
				);
				const deviceCounts = recalculateDeviceCounts(remainingDevices);
				return {
					...prev,
					devices: remainingDevices.length,
					online: deviceCounts.online,
					offline: deviceCounts.offline,
				};
			});
		};

		// NFC and Command events
		const onNfcEvent = (data) => {
			if (!data || !data.deviceId) return;
			console.log("NFC event received:", data);

			// Update device with NFC status
			setDevices((prev) =>
				prev.map((device) =>
					device.rackId === data.deviceId
						? {
								...device,
								nfcStatus: {
									type: data.type,
									tagUID: data.tagUID,
									ingredient: data.ingredient,
									timestamp: data.timestamp,
								},
						  }
						: device
				)
			);
		};

		const onCommandResponse = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Command response received:", data);

			// Update device with command status
			setDevices((prev) =>
				prev.map((device) =>
					device.rackId === data.deviceId
						? {
								...device,
								lastCommand: {
									command: data.command,
									response: data.response,
									timestamp: data.timestamp,
									success: true, // Assume success since we removed the field
								},
						  }
						: device
				)
			);
		};

		const onCommandSent = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Command sent confirmation:", data);

			// Update device with command status
			setDevices((prev) =>
				prev.map((device) =>
					device.rackId === data.deviceId
						? {
								...device,
								commandStatus: {
									command: data.command,
									success: true, // Assume success since we removed the field
									error: data.error,
									timestamp: new Date(),
								},
						  }
						: device
				)
			);
		};

		const onDeviceRegistered = (data) => {
			if (!data) return;
			console.log("Device registered successfully:", data);

			// Reload devices to get the newly registered device
			load();
		};

		socket.on("alert", onAlert);
		socket.on("deviceStatus", onDeviceStatus); // Web app uses this event
		socket.on("update", onUpdate); // Web app also uses this event
		socket.on("deviceAdded", onDeviceAdded); // Device added event
		socket.on("deviceDeleted", onDeviceDeleted); // Device deleted event
		socket.on("nfcEvent", onNfcEvent); // NFC events
		socket.on("commandResponse", onCommandResponse); // Command responses
		socket.on("commandSent", onCommandSent); // Command sent confirmations
		socket.on("deviceRegistered", onDeviceRegistered); // Device registration confirmations

		return () => {
			socket.off("alert", onAlert);
			socket.off("deviceStatus", onDeviceStatus);
			socket.off("update", onUpdate);
			socket.off("deviceAdded", onDeviceAdded);
			socket.off("deviceDeleted", onDeviceDeleted);
			socket.off("nfcEvent", onNfcEvent);
			socket.off("commandResponse", onCommandResponse);
			socket.off("commandSent", onCommandSent);
			socket.off("deviceRegistered", onDeviceRegistered);
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

	// Helper function to sanitize ingredient names
	const sanitizeIngredientName = (name) => {
		if (!name || typeof name !== "string") return "Unknown Ingredient";

		// Remove or replace corrupted characters
		let sanitized = name
			.replace(/[^\x20-\x7E]/g, "") // Remove non-printable ASCII characters
			.replace(/[^\w\s\-\.]/g, "") // Remove special characters except spaces, hyphens, dots
			.trim();

		// If name is too short or corrupted, try to extract meaningful parts
		if (sanitized.length < 2) {
			// Try to find any readable text in the original name
			const readable = name.match(/[a-zA-Z0-9\s]+/g);
			if (readable && readable.length > 0) {
				sanitized = readable.join(" ").trim();
			}
		}

		return sanitized.length > 0 ? sanitized : "Unknown Ingredient";
	};

	const getSoonToBeEmpty = () => {
		console.log("getSoonToBeEmpty - ingredients data:", ingredients);

		// Filter ingredients with low weight AND valid names
		const filtered = ingredients.filter((ing) => {
			const hasLowWeight = (ing.weight || 0) < 100;
			const hasValidName =
				ing.name &&
				typeof ing.name === "string" &&
				ing.name.length > 0 &&
				!/[^\x20-\x7E]/.test(ing.name); // Check for non-printable characters

			return hasLowWeight && hasValidName;
		});

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

				{/* Real-time Device Activity */}
				{devices.length > 0 && (
					<View style={styles.sectionCard}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Device Activity</Text>
							<View style={styles.activityStatus}>
								<View
									style={[styles.statusDot, { backgroundColor: "#10b981" }]}
								/>
								<Text style={styles.activityStatusText}>
									{counts.online}/{counts.devices} Online
								</Text>
							</View>
						</View>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							{devices.slice(0, 5).map((device, index) => (
								<View
									key={device.rackId || index}
									style={styles.deviceActivityCard}
								>
									<View style={styles.deviceActivityHeader}>
										<Text style={styles.deviceActivityName}>
											{device.name || device.rackId}
										</Text>
										<View
											style={[
												styles.deviceActivityStatus,
												{
													backgroundColor: device.isOnline
														? "#10b981"
														: "#ef4444",
												},
											]}
										>
											<Text style={styles.deviceActivityStatusText}>
												{device.isOnline ? "ONLINE" : "OFFLINE"}
											</Text>
										</View>
									</View>

									{device.lastCommand && (
										<View style={styles.deviceCommandInfo}>
											<Text style={styles.deviceCommandLabel}>
												Last Command:
											</Text>
											<Text
												style={[
													styles.deviceCommandText,
													{
														color: device.lastCommand.success
															? "#10b981"
															: "#ef4444",
													},
												]}
											>
												{device.lastCommand.command}{" "}
												{device.lastCommand.success ? "✓" : "✗"}
											</Text>
										</View>
									)}

									{device.nfcStatus && (
										<View style={styles.deviceNfcInfo}>
											<Text style={styles.deviceNfcLabel}>NFC Status:</Text>
											<Text style={styles.deviceNfcText}>
												{device.nfcStatus.type} -{" "}
												{device.nfcStatus.ingredient || "No tag"}
											</Text>
										</View>
									)}

									<Text style={styles.deviceLastSeen}>
										Last seen:{" "}
										{device.lastSeen
											? new Date(device.lastSeen).toLocaleTimeString()
											: "Never"}
									</Text>
								</View>
							))}
						</ScrollView>
					</View>
				)}

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
									<Text style={styles.restockItemName}>
										{sanitizeIngredientName(item.name)}
									</Text>
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
											{sanitizeIngredientName(item.name)}:{" "}
											{Math.round(item.weight || 0)}g
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
										<Text style={styles.inventoryItemText}>
											{sanitizeIngredientName(item.name)}
										</Text>
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
	// Device Activity styles
	activityStatus: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	activityStatusText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
	},
	deviceActivityCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginRight: 12,
		minWidth: 200,
		borderWidth: 1,
		borderColor: "rgba(156, 163, 175, 0.2)",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	deviceActivityHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	deviceActivityName: {
		fontSize: 14,
		fontWeight: "700",
		color: "#1f2937",
		flex: 1,
	},
	deviceActivityStatus: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	deviceActivityStatusText: {
		fontSize: 10,
		fontWeight: "700",
		color: "white",
		textTransform: "uppercase",
	},
	deviceCommandInfo: {
		marginBottom: 8,
	},
	deviceCommandLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: "#6b7280",
		marginBottom: 2,
	},
	deviceCommandText: {
		fontSize: 12,
		fontWeight: "600",
	},
	deviceNfcInfo: {
		marginBottom: 8,
	},
	deviceNfcLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: "#6b7280",
		marginBottom: 2,
	},
	deviceNfcText: {
		fontSize: 12,
		fontWeight: "500",
		color: "#8A2BE2",
	},
	deviceLastSeen: {
		fontSize: 10,
		color: "#9ca3af",
		fontStyle: "italic",
	},
});
