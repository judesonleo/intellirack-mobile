import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../contexts/SocketContext";
import { smartDeviceDiscovery } from "../services/discovery";

export default function AddDeviceSheet({ visible, onClose }) {
	const { socket, registerDevice } = useSocket();
	const [discovering, setDiscovering] = useState(false);
	const [results, setResults] = useState([]);
	const [error, setError] = useState(null);
	const [discoveryStats, setDiscoveryStats] = useState(null);
	const [discoveryProgress, setDiscoveryProgress] = useState("");

	useEffect(() => {
		if (!socket) return;

		// Listen for device registration response
		const onDeviceRegistered = (response) => {
			if (response.success) {
				Alert.alert("Success", "Device registered successfully!");
				onClose && onClose();
			} else {
				Alert.alert("Error", response.error || "Registration failed");
			}
		};

		socket.on("deviceRegistered", onDeviceRegistered);
		return () => socket.off("deviceRegistered", onDeviceRegistered);
	}, [socket, onClose]);

	const startDiscovery = async () => {
		setDiscovering(true);
		setResults([]);
		setError(null);
		setDiscoveryStats(null);
		setDiscoveryProgress("Initializing real-time discovery...");

		try {
			console.log("Starting real-time device discovery...");

			// Get discovery stats
			const stats = smartDeviceDiscovery.getDiscoveryStats();
			setDiscoveryStats(stats);

			// Real-time device discovery with callbacks
			let deviceCount = 0;
			const discoveredDevices = new Map();

			const onDeviceFound = (device) => {
				deviceCount++;
				console.log(`📱 UI: Adding device ${deviceCount}: ${device.rackId}`);

				// Add device to results immediately
				discoveredDevices.set(device.rackId, device);

				// Update UI with current devices
				const currentResults = Array.from(discoveredDevices.values()).sort(
					(a, b) => {
						// Sort new devices first, then by priority
						if (a.isRegistered !== b.isRegistered) {
							return a.isRegistered ? 1 : -1;
						}
						return a.priority - b.priority;
					}
				);

				setResults(currentResults);
				setDiscoveryProgress(
					`Found ${deviceCount} devices! Scanning continues...`
				);
			};

			const onProgressUpdate = (progress) => {
				setDiscoveryProgress(progress);
			};

			// Start real-time discovery
			await smartDeviceDiscovery.discoverDevices(
				onDeviceFound,
				onProgressUpdate
			);

			setDiscoveryProgress(
				`Discovery complete! Found ${deviceCount} devices total.`
			);
			console.log(
				`Real-time discovery completed. Found ${deviceCount} devices.`
			);

			// Clear progress after 3 seconds
			setTimeout(() => {
				setDiscoveryProgress("");
			}, 3000);
		} catch (error) {
			console.error("Discovery failed:", error);
			setError(error.message);
			setDiscoveryProgress("");
			Alert.alert("Discovery Failed", error.message);
		} finally {
			setDiscovering(false);
		}
	};

	const doRegister = async (device) => {
		if (!socket) {
			Alert.alert("Error", "Socket connection not available");
			return;
		}

		try {
			console.log("Registering device:", device);

			const deviceData = {
				rackId: device.rackId || device.deviceId,
				name: device.name || `IntelliRack ${device.rackId || device.deviceId}`,
				location: device.location || "Discovered via Mobile",
				firmwareVersion: device.firmwareVersion || "v2.0",
				ipAddress: device.ipAddress || device.ip,
				macAddress: device.macAddress || "Unknown",
			};

			registerDevice(deviceData);
		} catch (error) {
			console.error("Registration error:", error);
			Alert.alert("Error", "Failed to register device: " + error.message);
		}
	};

	const retryDiscovery = () => {
		setError(null);
		startDiscovery();
	};

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
				<Text style={styles.title}>Add Device</Text>
				<Text style={styles.subtitle}>
					Real-time discovery finds devices as you scan
				</Text>

				{discoveryStats && (
					<View style={styles.statsContainer}>
						<Text style={styles.statsTitle}>Discovery Methods</Text>
						<Text style={styles.statsText}>
							{discoveryStats.priorityOrder.join(" → ")}
						</Text>
					</View>
				)}

				{error && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
						<TouchableOpacity
							style={styles.retryButton}
							onPress={retryDiscovery}
						>
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				)}

				<TouchableOpacity
					style={styles.primary}
					onPress={startDiscovery}
					disabled={discovering}
				>
					{discovering ? (
						<>
							<ActivityIndicator color="#fff" />
							<Text style={styles.primaryText}>
								{discoveryProgress || "Discovering devices..."}
							</Text>
						</>
					) : (
						<>
							<Ionicons name="compass" size={18} color="#fff" />
							<Text style={styles.primaryText}>
								{results.length > 0 ? "Scan Again" : "Start Real-time Scan"}
							</Text>
						</>
					)}
				</TouchableOpacity>

				{discovering && discoveryProgress && (
					<View style={styles.progressContainer}>
						<Text style={styles.progressText}>{discoveryProgress}</Text>
						<Text style={styles.progressSubtext}>
							Scanning entire network to find all devices...
						</Text>
					</View>
				)}

				{results.length > 0 && (
					<View style={styles.resultsHeader}>
						<Text style={styles.resultsCount}>
							Found {results.length} device{results.length !== 1 ? "s" : ""}
						</Text>
						<Text style={styles.resultsSubtitle}>
							{(() => {
								const registered = results.filter((d) => d.isRegistered).length;
								const newDevices = results.length - registered;
								if (registered > 0 && newDevices > 0) {
									return `${newDevices} new, ${registered} already registered`;
								} else if (registered > 0) {
									return `All devices already registered`;
								} else {
									return `${newDevices} new device${
										newDevices !== 1 ? "s" : ""
									} available`;
								}
							})()}
						</Text>
					</View>
				)}

				<FlatList
					data={results}
					keyExtractor={(item, idx) => item.rackId || String(idx)}
					ListEmptyComponent={
						!discovering &&
						!error && (
							<View style={styles.emptyContainer}>
								<Ionicons name="search" size={48} color="#9ca3af" />
								<Text style={styles.emptyTitle}>No devices found</Text>
								<Text style={styles.emptySubtitle}>
									Press "Start Smart Discovery" to scan your network for any
									IntelliRack device
								</Text>
							</View>
						)
					}
					renderItem={({ item }) => (
						<View
							style={[
								styles.resultRow,
								item.isRegistered && styles.registeredRow,
							]}
						>
							<View style={styles.deviceInfo}>
								<View style={styles.deviceHeader}>
									<Text style={styles.resultTitle}>
										{item.name || item.rackId}
									</Text>
									<View style={styles.badgeContainer}>
										{item.isRegistered && (
											<View style={styles.registeredBadge}>
												<Ionicons
													name="checkmark-circle"
													size={14}
													color="#059669"
												/>
												<Text style={styles.registeredText}>Registered</Text>
											</View>
										)}
										<View style={styles.priorityBadge}>
											<Text style={styles.priorityText}>P{item.priority}</Text>
										</View>
									</View>
								</View>
								<Text style={styles.resultMeta}>
									{item.ipAddress || item.ip} • {item.discoveredVia}
								</Text>
								{item.firmwareVersion && (
									<Text style={styles.firmwareVersion}>
										Firmware: {item.firmwareVersion}
									</Text>
								)}
								{item.macAddress && (
									<Text style={styles.macAddress}>MAC: {item.macAddress}</Text>
								)}
							</View>
							{item.isRegistered ? (
								<View style={styles.registeredIndicator}>
									<Ionicons name="checkmark-circle" size={24} color="#059669" />
									<Text style={styles.registeredStatusText}>Already Added</Text>
								</View>
							) : (
								<TouchableOpacity
									style={styles.secondary}
									onPress={() => doRegister(item)}
								>
									<Ionicons name="add-circle" size={16} color="#6366f1" />
									<Text style={styles.secondaryText}>Add Device</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
					contentContainerStyle={{ paddingBottom: 30 }}
				/>
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
		height: "80%",
		padding: 20,
	},
	handle: {
		width: 40,
		height: 4,
		backgroundColor: "#e5e7eb",
		borderRadius: 2,
		alignSelf: "center",
		marginBottom: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 8,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 16,
		color: "#6b7280",
		marginBottom: 24,
		textAlign: "center",
	},
	primary: {
		backgroundColor: "#6366f1",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		marginBottom: 20,
	},
	primaryText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	resultRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		gap: 16,
	},
	deviceInfo: {
		flex: 1,
	},
	resultTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
	},
	resultMeta: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 4,
	},
	firmwareVersion: {
		fontSize: 12,
		color: "#6b7280",
		marginTop: 4,
	},
	secondary: {
		backgroundColor: "#e0e7ff",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	secondaryText: {
		color: "#6366f1",
		fontWeight: "700",
	},
	registeredRow: {
		backgroundColor: "#f0fdf4",
		borderWidth: 1,
		borderColor: "#bbf7d0",
	},
	badgeContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	registeredBadge: {
		backgroundColor: "#dcfce7",
		borderRadius: 12,
		paddingVertical: 3,
		paddingHorizontal: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	registeredText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#059669",
	},
	registeredIndicator: {
		alignItems: "center",
		paddingHorizontal: 12,
	},
	registeredStatusText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#059669",
		marginTop: 4,
	},
	macAddress: {
		fontSize: 11,
		color: "#6b7280",
		fontFamily: "monospace",
		marginTop: 2,
	},
	progressContainer: {
		backgroundColor: "#e0f2fe",
		borderRadius: 10,
		padding: 12,
		marginTop: 12,
		alignItems: "center",
	},
	progressText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#0369a1",
		marginBottom: 4,
	},
	progressSubtext: {
		fontSize: 12,
		color: "#0284c7",
		textAlign: "center",
	},
	errorContainer: {
		backgroundColor: "#fef3c7",
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
		alignItems: "center",
	},
	errorText: {
		color: "#d97706",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 8,
	},
	retryButton: {
		backgroundColor: "#6366f1",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 10,
	},
	retryButtonText: {
		color: "#fff",
		fontWeight: "700",
	},
	resultsHeader: {
		alignItems: "center",
		marginBottom: 16,
	},
	resultsCount: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 4,
	},
	resultsSubtitle: {
		fontSize: 12,
		color: "#6b7280",
		textAlign: "center",
	},
	statsContainer: {
		backgroundColor: "#f0f9eb",
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
		alignItems: "center",
	},
	statsTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: "#22c55e",
		marginBottom: 4,
	},
	statsText: {
		fontSize: 12,
		color: "#344054",
	},
	deviceHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	priorityBadge: {
		backgroundColor: "#d1fae5",
		borderRadius: 12,
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	priorityText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#065f46",
	},
	emptyContainer: {
		alignItems: "center",
		paddingVertical: 30,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#374151",
		marginTop: 15,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 5,
		textAlign: "center",
	},
});
