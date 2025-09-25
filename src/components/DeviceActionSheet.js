import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Switch,
	Alert,
	FlatList,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../contexts/SocketContext";
import { API_BASE } from "../config";

export default function DeviceActionSheet({
	device,
	visible,
	onClose,
	onDeleted,
	onDeleteStart,
	onDeleteEnd,
}) {
	const [activeTab, setActiveTab] = useState("overview");
	const [config, setConfig] = useState({
		autoTare: false,
		weightThresholds: { low: 200, critical: 50, max: 5000 },
		location: "",
		name: "",
		ledEnabled: true,
		soundEnabled: false,
		mqttPublishInterval: 5000,
		calibrationFactor: 204.99,
	});
	const [nfcWriteIngredient, setNfcWriteIngredient] = useState("");
	const [showNfcWrite, setShowNfcWrite] = useState(false);
	const [alerts, setAlerts] = useState([]);
	const [logs, setLogs] = useState([]);
	const [loadingStates, setLoadingStates] = useState({});
	const [commandResponses, setCommandResponses] = useState({});
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// NEW: State to track real-time device data
	const [realTimeData, setRealTimeData] = useState({
		weight: null,
		status: null,
		ingredient: null,
		lastSeen: null,
		isOnline: true,
	});

	const { sendCommand, socket } = useSocket();

	useEffect(() => {
		if (device) {
			setConfig({
				autoTare: device.settings?.autoTare || false,
				weightThresholds: device.weightThresholds || {
					low: 200,
					critical: 50,
					max: 5000,
				},
				location: device.location || "",
				name: device.name || "",
				ledEnabled: device.settings?.ledEnabled !== false,
				soundEnabled: device.settings?.soundEnabled || false,
				mqttPublishInterval: device.settings?.mqttPublishInterval || 5000,
				calibrationFactor: device.settings?.calibrationFactor || 204.99,
			});

			// Initialize real-time data with current device data
			setRealTimeData({
				weight: device.lastWeight,
				status: device.lastStatus,
				ingredient: device.ingredient,
				lastSeen: device.lastSeen,
				isOnline: device.isOnline,
			});
		}
	}, [device]);

	useEffect(() => {
		if (!socket || !device) return;

		const deviceIdentifier = device?.rackId || device?._id;
		if (!deviceIdentifier) {
			console.warn("DeviceActionSheet - No device identifier available");
			return;
		}

		// Listen for command responses - UNIQUE HANDLER
		const onCommandResponseActionSheet = (data) => {
			console.log("DeviceActionSheet - Command response received:", data);
			console.log(
				`DeviceActionSheet - Target device: ${deviceIdentifier}, Response device: ${data.deviceId}`
			);

			// Strict device ID matching
			if (data.deviceId && data.deviceId === deviceIdentifier) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Processing command response:`,
					data
				);

				// Extract command from various possible fields
				const command = data.command || data.response || data.type || "unknown";

				setCommandResponses((prev) => ({
					...prev,
					[command]: {
						success: true, // Assume success since we removed the field
						message: data.message || data.response || "Command completed",
						timestamp: Date.now(),
					},
				}));

				// Clear loading state for the command
				setLoadingStates((prev) => ({
					...prev,
					[command]: false,
				}));

				// Show success feedback with enhanced messages for all NFC operations
				let message = data.message || data.response || "Command completed";
				let title = "Success";

				// Special handling for all NFC operations
				if (command && command.startsWith("nfc_")) {
					const nfcType = command.replace("nfc_", "");
					switch (nfcType) {
						case "read":
							if (data.ingredient) {
								title = "NFC Tag Read";
								message = `Ingredient: ${data.ingredient}\nUID: ${
									data.tagUID || "N/A"
								}\n${data.response || "Tag read successfully"}`;
							} else {
								title = "NFC Tag Read";
								message = data.response || "Tag read successfully";
							}
							break;
						case "write":
							title = "NFC Write";
							message = data.response || "Tag written successfully";
							break;
						case "clear":
							title = "NFC Clear";
							message = data.response || "Tag cleared successfully";
							break;
						case "format":
							title = "NFC Format";
							message = data.response || "Tag formatted successfully";
							break;
						default:
							title = "NFC Operation";
							message = data.response || "NFC operation completed";
					}
				}

				Alert.alert(title, message);
			} else if (data.deviceId) {
				// Log when we receive command responses for other devices (for debugging)
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Ignoring command response for device: ${data.deviceId}`
				);
			}
		};

		// Listen for command sent confirmations - UNIQUE HANDLER
		const onCommandSentActionSheet = (data) => {
			console.log("DeviceActionSheet - Command sent confirmation:", data);

			// Strict device ID matching
			if (data.deviceId && data.deviceId === deviceIdentifier) {
				// Extract command from various possible fields
				const command = data.command || data.type || "unknown";

				// Assume success since we removed the success field
				console.log(
					`Command ${command} sent successfully to device ${deviceIdentifier}`
				);
			} else if (data.deviceId) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Ignoring command sent for device: ${data.deviceId}`
				);
			}
		};

		// Listen for NFC events - UNIQUE HANDLER
		const onNfcEventActionSheet = (data) => {
			console.log("DeviceActionSheet - NFC event received:", data);

			// Strict device ID matching
			if (data.deviceId && data.deviceId === deviceIdentifier) {
				// Extract event type from various possible fields
				const eventType = data.type || data.command || "unknown";

				// Don't show any alerts - command response handles all NFC operations
				// Just log the event for debugging purposes
				console.log(
					`NFC ${eventType} event received for device ${deviceIdentifier}, skipping alert (handled by command response)`
				);
			} else if (data.deviceId) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Ignoring NFC event for device: ${data.deviceId}`
				);
			}
		};

		// Listen for device status changes - UNIQUE HANDLER
		const onDeviceStatusActionSheet = (data) => {
			console.log("DeviceActionSheet - Device status received (ALL):", data);
			console.log("Current device ID:", deviceIdentifier);
			console.log("Event device ID:", data.deviceId);

			// Strict device ID matching
			if (data.deviceId && data.deviceId === deviceIdentifier) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Device status received (MATCHED):`,
					data
				);

				// Update device status in real-time
				if (data.isOnline !== undefined) {
					console.log(
						`Device ${data.deviceId} is now ${
							data.isOnline ? "online" : "offline"
						}`
					);
				}

				// Update real-time data
				setRealTimeData((prev) => {
					const newData = {
						...prev,
						weight: data.weight !== undefined ? data.weight : prev.weight,
						status: data.status !== undefined ? data.status : prev.status,
						ingredient:
							data.ingredient !== undefined ? data.ingredient : prev.ingredient,
						lastSeen:
							data.lastSeen !== undefined ? data.lastSeen : prev.lastSeen,
						isOnline:
							data.isOnline !== undefined ? data.isOnline : prev.isOnline,
					};
					console.log(
						`DeviceActionSheet [${deviceIdentifier}] - Updating realTimeData from status:`,
						newData
					);
					return newData;
				});
			} else if (data.deviceId) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Ignoring status for device: ${data.deviceId}`
				);
			}
		};

		// NEW: Listen for real-time device updates (weight, status, ingredient) - UNIQUE HANDLER
		const onDeviceUpdateActionSheet = (data) => {
			console.log("DeviceActionSheet - Device update received (ALL):", data);
			console.log("Current device ID:", deviceIdentifier);
			console.log("Event device ID:", data.deviceId);

			// Strict device ID matching
			if (data.deviceId && data.deviceId === deviceIdentifier) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Device update received (MATCHED):`,
					data
				);

				// Update the device object with real-time data
				// This will trigger a re-render with updated weight/status/ingredient
				if (
					data.weight !== undefined ||
					data.status !== undefined ||
					data.ingredient !== undefined
				) {
					setRealTimeData((prev) => {
						const newData = {
							...prev,
							weight: data.weight !== undefined ? data.weight : prev.weight,
							status: data.status !== undefined ? data.status : prev.status,
							ingredient:
								data.ingredient !== undefined
									? data.ingredient
									: prev.ingredient,
							lastSeen:
								data.lastSeen !== undefined ? data.lastSeen : prev.lastSeen,
							isOnline:
								data.isOnline !== undefined ? data.isOnline : prev.isOnline,
						};
						console.log(
							`DeviceActionSheet [${deviceIdentifier}] - Updating realTimeData:`,
							newData
						);
						return newData;
					});
				}
			} else if (data.deviceId) {
				console.log(
					`DeviceActionSheet [${deviceIdentifier}] - Ignoring update for device: ${data.deviceId}`
				);
			}
		};

		socket.on("commandResponse", onCommandResponseActionSheet);
		socket.on("commandSent", onCommandSentActionSheet);
		socket.on("nfcEvent", onNfcEventActionSheet);
		socket.on("deviceStatus", onDeviceStatusActionSheet);
		socket.on("update", onDeviceUpdateActionSheet);

		// Test event listener
		socket.on("test", (data) => {
			console.log("DeviceActionSheet - Test response received:", data);
			Alert.alert("WebSocket Test", `Response: ${data.message}`);
		});

		return () => {
			socket.off("commandResponse", onCommandResponseActionSheet);
			socket.off("commandSent", onCommandSentActionSheet);
			socket.off("nfcEvent", onNfcEventActionSheet);
			socket.off("deviceStatus", onDeviceStatusActionSheet);
			socket.off("update", onDeviceUpdateActionSheet);
			socket.off("test");
		};
	}, [socket, device]);

	if (!device) return null;

	const setLoading = (command, loading) => {
		setLoadingStates((prev) => ({ ...prev, [command]: loading }));
	};

	const send = (command, extra = {}) => {
		setLoading(command, true);
		sendCommand({ deviceId: device.rackId || device._id, command, ...extra });

		// Auto-clear loading after 10 seconds as fallback
		setTimeout(() => {
			setLoading(command, false);
		}, 10000);
	};

	const handleConfigUpdate = (key, value) => {
		setConfig((prev) => ({ ...prev, [key]: value }));
		send("set_config", { [key]: value });
	};

	const handleThresholdUpdate = (type, value) => {
		const newThresholds = {
			...config.weightThresholds,
			[type]: type === "max" ? parseInt(value) || 5000 : parseInt(value) || 0,
		};
		setConfig((prev) => ({ ...prev, weightThresholds: newThresholds }));
	};

	const handleNfcWrite = () => {
		if (nfcWriteIngredient.trim()) {
			send("nfc_write", { ingredient: nfcWriteIngredient.trim() });
			setShowNfcWrite(false);
			setNfcWriteIngredient("");
		}
	};

	const acknowledgeAlert = (alertId) => {
		send("acknowledge_alert", { alertId });
		setAlerts((prev) =>
			prev.map((a) =>
				a._id === alertId ? { ...a, status: "acknowledged" } : a
			)
		);
	};

	const handleDeleteDevice = () => {
		setShowDeleteConfirm(true);
	};

	const confirmDeleteDevice = async () => {
		try {
			// Notify parent that deletion is starting
			if (onDeleteStart) {
				onDeleteStart(device._id || device.rackId);
			}

			// Debug: Log the entire device object to see what we have
			console.log("=== DEVICE DELETE DEBUG ===");
			console.log("Full device object:", JSON.stringify(device, null, 2));
			console.log("Device keys:", Object.keys(device));
			console.log("Device._id:", device._id);
			console.log("Device.rackId:", device.rackId);
			console.log("Device.name:", device.name);
			console.log("==========================");

			// Try multiple possible identifiers
			const possibleIds = [
				device.rackId,
				device._id,
				device.deviceId,
				device.id,
			].filter(Boolean);

			console.log("Possible device IDs:", possibleIds);

			if (possibleIds.length === 0) {
				throw new Error("No device identifier found");
			}

			// Try each possible ID until one works
			let deleteSuccess = false;
			let lastError = null;

			for (const deviceId of possibleIds) {
				try {
					console.log(`Trying to delete with ID: ${deviceId}`);

					const token = await AsyncStorage.getItem("token");
					const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});

					if (response.ok) {
						console.log(`Successfully deleted device with ID: ${deviceId}`);
						deleteSuccess = true;

						// First, send delete command to device
						send("delete_device", { deviceId });

						// Success - close sheet and notify parent
						setShowDeleteConfirm(false);
						onClose();

						// Notify parent component to refresh device list
						if (device.onDeleted) {
							device.onDeleted(deviceId);
						}

						Alert.alert("Success", "Device deleted successfully");
						break;
					} else {
						const errorData = await response.json().catch(() => ({}));
						lastError =
							errorData.error ||
							`HTTP ${response.status}: ${response.statusText}`;
						console.log(`Failed with ID ${deviceId}:`, lastError);
					}
				} catch (fetchError) {
					console.log(`Error with ID ${deviceId}:`, fetchError.message);
					lastError = fetchError.message;
				}
			}

			if (!deleteSuccess) {
				throw new Error(
					`All deletion attempts failed. Last error: ${lastError}`
				);
			}
		} catch (error) {
			console.error("Delete device error:", error);
			Alert.alert("Error", "Failed to delete device: " + error.message);
			setShowDeleteConfirm(false);
		} finally {
			// Always notify parent that deletion attempt has ended
			if (onDeleteEnd) {
				onDeleteEnd();
			}
		}
	};

	const getStatusColor = (status) => {
		switch (status?.toLowerCase()) {
			case "empty":
				return "#ef4444";
			case "low":
				return "#f59e0b";
			case "good":
				return "#10b981";
			default:
				return "#6b7280";
		}
	};

	const getStatusText = () => {
		const currentWeight = realTimeData.weight ?? device?.lastWeight;
		if (!currentWeight || currentWeight < 50) return "EMPTY";
		if (currentWeight < 200) return "LOW";
		return "GOOD";
	};

	const getSeverityColor = (severity) => {
		switch (severity?.toLowerCase()) {
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

	const renderOverview = () => (
		<View style={styles.tabContent}>
			{/* Debug Info - Remove in production */}
			{/* {__DEV__ && (
				<View style={styles.debugSection}>
					<Text style={styles.debugTitle}>Debug: Real-time Data</Text>
					<Text style={styles.debugText}>
						{JSON.stringify(realTimeData, null, 2)}
					</Text>

					<Text style={styles.debugTitle}>Command Responses:</Text>
					<Text style={styles.debugText}>
						{JSON.stringify(commandResponses, null, 2)}
					</Text>

					<Text style={styles.debugTitle}>Loading States:</Text>
					<Text style={styles.debugText}>
						{JSON.stringify(loadingStates, null, 2)}
					</Text>

					<View style={styles.connectionStatus}>
						<Text style={styles.connectionStatusText}>
							Socket Connected: {socket?.connected ? "Yes" : "No"}
						</Text>
						<Text style={styles.connectionStatusText}>
							Socket ID: {socket?.id || "None"}
						</Text>
						<Text style={styles.connectionStatusText}>
							Device ID: {device?.rackId || device?._id || "None"}
						</Text>
					</View>

					<TouchableOpacity
						style={styles.testButton}
						onPress={() => {
							console.log("Testing websocket connection...");
							console.log("Socket connected:", socket?.connected);
							console.log("Socket ID:", socket?.id);

							// Test by emitting a test event
							if (socket) {
								socket.emit("test", {
									deviceId: device?.rackId || device?._id,
									message: "Test from mobile app",
								});
							}
						}}
					>
						<Text style={styles.testButtonText}>Test WebSocket</Text>
					</TouchableOpacity>
				</View>
			)} */}

			<View style={styles.statusGrid}>
				<View style={styles.statusItem}>
					<Text style={styles.statusLabel}>Status</Text>
					<Text
						style={[
							styles.statusValue,
							{ color: realTimeData.isOnline ? "#10b981" : "#ef4444" },
						]}
					>
						{realTimeData.isOnline ? "ONLINE" : "OFFLINE"}
					</Text>
				</View>
				<View style={styles.statusItem}>
					<Text style={styles.statusLabel}>Weight</Text>
					<Text style={styles.statusValue}>
						{Math.max(
							0,
							Math.round(realTimeData.weight ?? (device?.lastWeight || 0))
						)}
						g
					</Text>
				</View>
				<View style={styles.statusItem}>
					<Text style={styles.statusLabel}>Stock Level</Text>
					<View
						style={[
							styles.statusBadge,
							{ backgroundColor: getStatusColor(getStatusText()) },
						]}
					>
						<Text style={styles.statusBadgeText}>{getStatusText()}</Text>
					</View>
				</View>
				<View style={styles.statusItem}>
					<Text style={styles.statusLabel}>Connection</Text>
					<View
						style={[
							styles.statusBadge,
							{
								backgroundColor: realTimeData.isOnline ? "#10b981" : "#6b7280",
							},
						]}
					>
						<Text style={styles.statusBadgeText}>
							{realTimeData.isOnline ? "Online" : "Offline"}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.infoSection}>
				<Text style={styles.sectionTitle}>Device Information</Text>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Location:</Text>
					<Text style={styles.infoValue}>{device?.location || "Kitchen"}</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>IP Address:</Text>
					<Text style={styles.infoValue}>{device?.ipAddress || "Unknown"}</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Firmware:</Text>
					<Text style={styles.infoValue}>
						{device?.firmwareVersion || "v1.0"}
					</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Last Updated:</Text>
					<Text style={styles.infoValue}>
						{realTimeData.lastSeen
							? new Date(realTimeData.lastSeen).toLocaleString()
							: device?.lastSeen
							? new Date(device.lastSeen).toLocaleString()
							: "Never"}
					</Text>
				</View>
			</View>
		</View>
	);

	const renderConfiguration = () => (
		<View style={styles.tabContent}>
			<View style={styles.configSection}>
				<Text style={styles.sectionTitle}>Device Settings</Text>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Auto Tare</Text>
					<Switch
						value={config.autoTare}
						onValueChange={(value) => handleConfigUpdate("autoTare", value)}
						trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
						thumbColor={config.autoTare ? "#6366f1" : "#f3f4f6"}
					/>
				</View>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Location</Text>
					<TextInput
						style={styles.textInput}
						value={config.location}
						onChangeText={(value) => handleConfigUpdate("location", value)}
						placeholder="Enter location"
					/>
				</View>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Device Name</Text>
					<TextInput
						style={styles.textInput}
						value={device.name || ""}
						onChangeText={(value) => handleConfigUpdate("name", value)}
						placeholder="Enter device name"
					/>
				</View>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Enable LED</Text>
					<Switch
						value={config.ledEnabled !== false}
						onValueChange={(value) => handleConfigUpdate("ledEnabled", value)}
						trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
						thumbColor={config.ledEnabled !== false ? "#6366f1" : "#f3f4f6"}
					/>
				</View>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Enable Sound</Text>
					<Switch
						value={config.soundEnabled || false}
						onValueChange={(value) => handleConfigUpdate("soundEnabled", value)}
						trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
						thumbColor={config.soundEnabled ? "#6366f1" : "#f3f4f6"}
					/>
				</View>
			</View>

			<View style={styles.configSection}>
				<Text style={styles.sectionTitle}>Weight Thresholds</Text>
				<View style={styles.thresholdRow}>
					<Text style={styles.configLabel}>Low Stock (g)</Text>
					<TextInput
						style={styles.numberInput}
						value={String(config.weightThresholds.low)}
						onChangeText={(value) => handleThresholdUpdate("low", value)}
						keyboardType="numeric"
						placeholder="200"
					/>
				</View>
				<View style={styles.thresholdRow}>
					<Text style={styles.configLabel}>Critical (g)</Text>
					<TextInput
						style={styles.numberInput}
						value={String(config.weightThresholds.critical)}
						onChangeText={(value) => handleThresholdUpdate("critical", value)}
						keyboardType="numeric"
						placeholder="50"
					/>
				</View>
				<View style={styles.thresholdRow}>
					<Text style={styles.configLabel}>Max Weight (g)</Text>
					<TextInput
						style={styles.numberInput}
						value={String(config.weightThresholds.max || 5000)}
						onChangeText={(value) => handleThresholdUpdate("max", value)}
						keyboardType="numeric"
						placeholder="5000"
					/>
				</View>
			</View>

			<View style={styles.configSection}>
				<Text style={styles.sectionTitle}>MQTT Settings</Text>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Publish Interval (ms)</Text>
					<TextInput
						style={styles.numberInput}
						value={String(config.mqttPublishInterval || 5000)}
						onChangeText={(value) =>
							handleConfigUpdate("mqttPublishInterval", parseInt(value) || 5000)
						}
						keyboardType="numeric"
						placeholder="5000"
					/>
				</View>
			</View>

			<View style={styles.configSection}>
				<Text style={styles.sectionTitle}>Calibration</Text>
				<View style={styles.configRow}>
					<Text style={styles.configLabel}>Calibration Factor</Text>
					<TextInput
						style={styles.numberInput}
						value={String(config.calibrationFactor || 204.99)}
						onChangeText={(value) =>
							handleConfigUpdate(
								"calibrationFactor",
								parseFloat(value) || 204.99
							)
						}
						keyboardType="numeric"
						placeholder="204.99"
					/>
				</View>
			</View>

			{/* Save Configuration Button */}
			<TouchableOpacity
				style={styles.saveConfigButton}
				onPress={() => {
					// Save all configuration changes
					Object.keys(config).forEach((key) => {
						if (key === "weightThresholds") {
							send("set_thresholds", config.weightThresholds);
						} else {
							send("set_config", { [key]: config[key] });
						}
					});
					Alert.alert("Success", "Configuration saved successfully");
				}}
			>
				<Ionicons name="save" size={20} color="#fff" />
				<Text style={styles.saveConfigButtonText}>Save Configuration</Text>
			</TouchableOpacity>
		</View>
	);

	const renderActions = () => (
		<View style={styles.tabContent}>
			<Text style={styles.sectionTitle}>Device Actions</Text>
			<View style={styles.actionGrid}>
				<TouchableOpacity
					style={[
						styles.actionButton,
						loadingStates.tare && styles.actionButtonLoading,
					]}
					onPress={() => send("tare")}
					disabled={loadingStates.tare}
				>
					{loadingStates.tare ? (
						<ActivityIndicator size="small" color="#6366f1" />
					) : (
						<Ionicons name="speedometer" size={24} color="#6366f1" />
					)}
					<Text style={styles.actionButtonText}>Tare Scale</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.actionButton,
						loadingStates.calibrate && styles.actionButtonLoading,
					]}
					onPress={() => {
						Alert.alert(
							"Calibrate Scale",
							"This will start automatic calibration using a 100g known weight.\n\n⚠️ IMPORTANT:\n• Have exactly 100g weight ready\n• Remove all items from scale first\n• Place 100g weight when prompted\n• Do not touch during calibration\n• Negative calibration factors are normal\n\nContinue?",
							[
								{ text: "Cancel", style: "cancel" },
								{
									text: "Start Calibration",
									onPress: () => send("calibrate"),
									style: "destructive",
								},
							]
						);
					}}
					disabled={loadingStates.calibrate}
				>
					{loadingStates.calibrate ? (
						<ActivityIndicator size="small" color="#f59e0b" />
					) : (
						<Ionicons name="settings" size={24} color="#f59e0b" />
					)}
					<Text style={styles.actionButtonText}>Calibrate</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.actionButton,
						loadingStates.restart && styles.actionButtonLoading,
					]}
					onPress={() => send("restart")}
					disabled={loadingStates.restart}
				>
					{loadingStates.restart ? (
						<ActivityIndicator size="small" color="#0ea5e9" />
					) : (
						<Ionicons name="refresh" size={24} color="#0ea5e9" />
					)}
					<Text style={styles.actionButtonText}>Restart</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.actionButton,
						loadingStates.resetwifi && styles.actionButtonLoading,
					]}
					onPress={() => send("resetwifi")}
					disabled={loadingStates.resetwifi}
				>
					{loadingStates.resetwifi ? (
						<ActivityIndicator size="small" color="#8b5cf6" />
					) : (
						<Ionicons name="wifi" size={24} color="#8b5cf6" />
					)}
					<Text style={styles.actionButtonText}>Reset WiFi</Text>
				</TouchableOpacity>
			</View>

			{/* Device Info Section */}
			<View style={styles.infoSection}>
				<Text style={styles.sectionTitle}>Device Information</Text>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Device ID:</Text>
					<Text style={styles.infoValue}>{device.rackId || device._id}</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Firmware:</Text>
					<Text style={styles.infoValue}>
						{device.firmwareVersion || "v1.0"}
					</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>MAC Address:</Text>
					<Text style={styles.infoValue}>{device.macAddress || "Unknown"}</Text>
				</View>
			</View>
		</View>
	);

	const renderNFC = () => (
		<View style={styles.tabContent}>
			<Text style={styles.sectionTitle}>NFC Operations</Text>
			<View style={styles.nfcActions}>
				<TouchableOpacity
					style={[
						styles.nfcButton,
						loadingStates.nfc_read && styles.nfcButtonLoading,
					]}
					onPress={() => send("nfc_read")}
					disabled={loadingStates.nfc_read}
				>
					{loadingStates.nfc_read ? (
						<ActivityIndicator size="small" color="#6366f1" />
					) : (
						<Ionicons name="scan" size={20} color="#6366f1" />
					)}
					<Text style={styles.nfcButtonText}>Read NFC Tag</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.nfcButton}
					onPress={() => setShowNfcWrite(true)}
				>
					<Ionicons name="create" size={20} color="#10b981" />
					<Text style={styles.nfcButtonText}>Write to NFC</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.nfcButton,
						loadingStates.nfc_clear && styles.nfcButtonLoading,
					]}
					onPress={() => send("nfc_clear")}
					disabled={loadingStates.nfc_clear}
				>
					{loadingStates.nfc_clear ? (
						<ActivityIndicator size="small" color="#ef4444" />
					) : (
						<Ionicons name="trash" size={20} color="#ef4444" />
					)}
					<Text style={styles.nfcButtonText}>Clear NFC</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.nfcButton,
						loadingStates.nfc_format && styles.nfcButtonLoading,
					]}
					onPress={() => send("nfc_format")}
					disabled={loadingStates.nfc_format}
				>
					{loadingStates.nfc_format ? (
						<ActivityIndicator size="small" color="#f59e0b" />
					) : (
						<Ionicons name="refresh" size={20} color="#f59e0b" />
					)}
					<Text style={styles.nfcButtonText}>Format NFC</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	const renderStatus = () => (
		<View style={styles.tabContent}>
			<Text style={styles.sectionTitle}>Device Status</Text>
			<View style={styles.statusSection}>
				<View style={styles.statusRow}>
					<Text style={styles.statusLabel}>Connection Status:</Text>
					<Text
						style={[
							styles.statusValue,
							{ color: realTimeData.isOnline ? "#10b981" : "#ef4444" },
						]}
					>
						{realTimeData.isOnline ? "Connected" : "Disconnected"}
					</Text>
				</View>
				<View style={styles.statusRow}>
					<Text style={styles.statusLabel}>Last Heartbeat:</Text>
					<Text style={styles.statusValue}>
						{realTimeData.lastSeen
							? new Date(realTimeData.lastSeen).toLocaleString()
							: device?.lastSeen
							? new Date(device.lastSeen).toLocaleString()
							: "Never"}
					</Text>
				</View>
				<View style={styles.statusRow}>
					<Text style={styles.statusLabel}>Firmware Version:</Text>
					<Text style={styles.statusValue}>
						{device?.firmwareVersion || "Unknown"}
					</Text>
				</View>
				<View style={styles.statusRow}>
					<Text style={styles.statusLabel}>IP Address:</Text>
					<Text style={styles.statusValue}>
						{device?.ipAddress || "Unknown"}
					</Text>
				</View>
			</View>
		</View>
	);

	const tabs = [
		{ id: "overview", label: "Overview", icon: "information-circle" },
		{ id: "configuration", label: "Configuration", icon: "settings" },
		{ id: "actions", label: "Actions", icon: "flash" },
		{ id: "nfc", label: "NFC", icon: "scan" },
		{ id: "status", label: "Status", icon: "stats-chart" },
	];

	return (
		<Modal
			transparent
			visible={visible}
			animationType="slide"
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.backdrop}
				activeOpacity={1}
				onPress={onClose}
			/>
			<View style={styles.sheet}>
				<View style={styles.handle} />
				<View style={styles.header}>
					<Text style={styles.title}>
						{device.name || `IntelliRack ${device.rackId}`}
					</Text>
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.settingsButton}
							onPress={handleDeleteDevice}
						>
							<Ionicons name="trash" size={20} color="#ef4444" />
						</TouchableOpacity>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color="#6b7280" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.tabsContainer}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.tabsScrollContent}
					>
						{tabs.map((tab) => (
							<TouchableOpacity
								key={tab.id}
								style={[styles.tab, activeTab === tab.id && styles.activeTab]}
								onPress={() => setActiveTab(tab.id)}
							>
								<Ionicons
									name={tab.icon}
									size={16}
									color={activeTab === tab.id ? "#6366f1" : "#6b7280"}
								/>
								<Text
									style={[
										styles.tabText,
										activeTab === tab.id && styles.activeTabText,
									]}
								>
									{tab.label}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				<ScrollView
					style={styles.content}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.contentContainer}
				>
					{activeTab === "overview" && renderOverview()}
					{activeTab === "configuration" && renderConfiguration()}
					{activeTab === "actions" && renderActions()}
					{activeTab === "nfc" && renderNFC()}
					{activeTab === "status" && renderStatus()}
				</ScrollView>

				{/* NFC Write Modal */}
				<Modal
					transparent
					visible={showNfcWrite}
					animationType="fade"
					onRequestClose={() => setShowNfcWrite(false)}
				>
					<TouchableOpacity
						style={styles.backdrop}
						activeOpacity={1}
						onPress={() => setShowNfcWrite(false)}
					/>
					<View style={styles.nfcWriteModal}>
						<Text style={styles.nfcWriteTitle}>Write to NFC Tag</Text>
						<Text style={styles.nfcWriteSubtitle}>
							Enter the ingredient name to write to the NFC tag
						</Text>
						<TextInput
							style={styles.nfcWriteInput}
							value={nfcWriteIngredient}
							onChangeText={setNfcWriteIngredient}
							placeholder="e.g., Sugar, Coffee, Flour"
							autoFocus
						/>
						<View style={styles.nfcWriteButtons}>
							<TouchableOpacity
								style={styles.nfcWriteCancel}
								onPress={() => setShowNfcWrite(false)}
							>
								<Text style={styles.nfcWriteCancelText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.nfcWriteConfirm,
									!nfcWriteIngredient.trim() && styles.nfcWriteConfirmDisabled,
								]}
								onPress={handleNfcWrite}
								disabled={!nfcWriteIngredient.trim()}
							>
								<Text style={styles.nfcWriteConfirmText}>Write</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>

				{/* Delete Device Confirmation Modal */}
				<Modal
					transparent
					visible={showDeleteConfirm}
					animationType="fade"
					onRequestClose={() => setShowDeleteConfirm(false)}
				>
					<TouchableOpacity
						style={styles.backdrop}
						activeOpacity={1}
						onPress={() => setShowDeleteConfirm(false)}
					/>
					<View style={styles.deleteConfirmModal}>
						<View style={styles.deleteConfirmIcon}>
							<Ionicons name="warning" size={48} color="#ef4444" />
						</View>
						<Text style={styles.deleteConfirmTitle}>Delete Device</Text>
						<Text style={styles.deleteConfirmMessage}>
							Are you sure you want to delete "
							{device.name || `IntelliRack ${device.rackId}`}"? This action
							cannot be undone.
						</Text>
						<View style={styles.deleteConfirmButtons}>
							<TouchableOpacity
								style={styles.deleteConfirmCancel}
								onPress={() => setShowDeleteConfirm(false)}
							>
								<Text style={styles.deleteConfirmCancelText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.deleteConfirmDelete}
								onPress={confirmDeleteDevice}
							>
								<Text style={styles.deleteConfirmDeleteText}>Delete</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(0,0,0,0.2)",
	},
	sheet: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		height: "70%",
	},
	handle: {
		width: 40,
		height: 4,
		backgroundColor: "#e5e7eb",
		borderRadius: 2,
		alignSelf: "center",
		marginTop: 8,
		marginBottom: 16,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1f2937",
		flex: 1,
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	settingsButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: "rgba(239, 68, 68, 0.1)",
	},
	closeButton: {
		padding: 4,
	},
	tabs: {
		flexDirection: "row",
		paddingHorizontal: 20,
		marginBottom: 20,
		gap: 8,
	},
	tab: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
		marginRight: 8,
	},
	activeTab: {
		backgroundColor: "#e0e7ff",
	},
	tabText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
	},
	activeTabText: {
		color: "#6366f1",
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	tabContent: {
		paddingBottom: 20,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 16,
		marginTop: 8,
	},
	statusGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
		marginBottom: 24,
	},
	statusItem: {
		flex: 1,
		minWidth: "45%",
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
		alignItems: "center",
	},
	statusLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
		marginBottom: 8,
		textTransform: "uppercase",
	},
	statusValue: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1f2937",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusBadgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
		textTransform: "uppercase",
	},
	infoSection: {
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	infoLabel: {
		fontSize: 14,
		color: "#6b7280",
	},
	infoValue: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1f2937",
	},
	configSection: {
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
		marginBottom: 16,
	},
	configRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	configLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
	},
	textInput: {
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "#fff",
		minWidth: 120,
	},
	thresholdRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	numberInput: {
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "#fff",
		width: 80,
		textAlign: "center",
	},
	saveConfigButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#10b981",
		padding: 16,
		borderRadius: 12,
		marginTop: 20,
	},
	saveConfigButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	actionGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	actionButton: {
		flex: 1,
		minWidth: "45%",
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
		alignItems: "center",
		gap: 8,
	},
	actionButtonLoading: {
		backgroundColor: "#e0e7ff",
		opacity: 0.7,
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#374151",
		textAlign: "center",
	},
	nfcActions: {
		gap: 12,
	},
	nfcButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
	},
	nfcButtonLoading: {
		backgroundColor: "#e0e7ff",
		opacity: 0.7,
	},
	nfcButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
	},
	statusSection: {
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
		marginBottom: 20,
	},
	statusRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	statusLabel: {
		fontSize: 14,
		color: "#6b7280",
	},
	alertItem: {
		backgroundColor: "#f8fafc",
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
	},
	alertHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	severityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 8,
	},
	alertTitle: {
		flex: 1,
		fontSize: 14,
		fontWeight: "600",
		color: "#1f2937",
	},
	ackButton: {
		backgroundColor: "#10b981",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	ackButtonLoading: {
		backgroundColor: "#059669",
		opacity: 0.7,
	},
	ackButtonText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
	},
	alertMessage: {
		fontSize: 12,
		color: "#6b7280",
		marginBottom: 4,
	},
	alertTime: {
		fontSize: 10,
		color: "#9ca3af",
	},
	logItem: {
		backgroundColor: "#f8fafc",
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
	},
	logTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
	},
	logMeta: {
		fontSize: 12,
		color: "#6b7280",
		marginBottom: 2,
	},
	logTime: {
		fontSize: 10,
		color: "#9ca3af",
	},
	emptyText: {
		textAlign: "center",
		color: "#9ca3af",
		fontSize: 14,
		fontStyle: "italic",
		marginTop: 8,
	},
	nfcWriteModal: {
		position: "absolute",
		top: "50%",
		left: 20,
		right: 20,
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 24,
		transform: [{ translateY: -100 }],
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},
	nfcWriteTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 8,
		textAlign: "center",
	},
	nfcWriteSubtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 20,
		textAlign: "center",
		lineHeight: 20,
	},
	nfcWriteInput: {
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#f9fafb",
		marginBottom: 20,
		fontSize: 16,
	},
	nfcWriteButtons: {
		flexDirection: "row",
		gap: 12,
	},
	nfcWriteCancel: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#d1d5db",
		alignItems: "center",
	},
	nfcWriteCancelText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6b7280",
	},
	nfcWriteConfirm: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: "#6366f1",
		alignItems: "center",
	},
	nfcWriteConfirmDisabled: {
		backgroundColor: "#d1d5db",
	},
	nfcWriteConfirmText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},

	// Danger Zone Styles
	dangerSection: {
		marginTop: 24,
		paddingTop: 20,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	dangerSectionTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: "#ef4444",
		marginBottom: 16,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#ef4444",
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#dc2626",
	},
	deleteButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},

	// Delete Confirmation Modal Styles
	deleteConfirmModal: {
		position: "absolute",
		top: "50%",
		left: 20,
		right: 20,
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 24,
		transform: [{ translateY: -100 }],
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
		alignItems: "center",
	},
	deleteConfirmIcon: {
		marginBottom: 16,
	},
	deleteConfirmTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 12,
		textAlign: "center",
	},
	deleteConfirmMessage: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 24,
	},
	deleteConfirmButtons: {
		flexDirection: "row",
		gap: 12,
		width: "100%",
	},
	deleteConfirmCancel: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#d1d5db",
		alignItems: "center",
		backgroundColor: "#f9fafb",
	},
	deleteConfirmCancelText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6b7280",
	},
	deleteConfirmDelete: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: "#ef4444",
		alignItems: "center",
	},
	deleteConfirmDeleteText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},

	// Debug styles
	debugSection: {
		backgroundColor: "#fef3c7",
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#f59e0b",
	},
	debugTitle: {
		fontSize: 12,
		fontWeight: "700",
		color: "#92400e",
		marginBottom: 4,
	},
	debugText: {
		fontSize: 10,
		color: "#92400e",
		fontFamily: "monospace",
	},
	testButton: {
		backgroundColor: "#6366f1",
		padding: 8,
		borderRadius: 6,
		marginTop: 8,
		alignItems: "center",
	},
	testButtonText: {
		fontSize: 10,
		fontWeight: "600",
		color: "#fff",
	},
	connectionStatus: {
		marginTop: 8,
		padding: 8,
		backgroundColor: "#f3f4f6",
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#d1d5db",
	},
	connectionStatusText: {
		fontSize: 9,
		color: "#374151",
		marginBottom: 2,
	},

	tabsContainer: {
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	tabsScrollContent: {
		alignItems: "center",
		gap: 8,
	},
});
