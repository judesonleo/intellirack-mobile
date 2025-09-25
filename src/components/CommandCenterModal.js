import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	Dimensions,
	Alert,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSocket } from "../contexts/SocketContext";

const { height } = Dimensions.get("window");

export default function CommandCenter({
	onOpenAlerts,
	onOpenSettings,
	onOpenShoppingList,
}) {
	const [visible, setVisible] = useState(false);
	const [devices, setDevices] = useState([]);
	const [deviceStatus, setDeviceStatus] = useState({});
	const { socket, sendCommand } = useSocket();

	// Define unique handlers OUTSIDE useEffect - Fix for Hook rules
	const onDeviceStatusCommandCenter = useCallback((data) => {
		if (!data || !data.deviceId) return;
		setDeviceStatus((prev) => ({
			...prev,
			[data.deviceId]: {
				isOnline: data.isOnline,
				lastSeen: data.lastSeen,
				weight: data.weight,
				status: data.status,
			},
		}));
	}, []);

	const onUpdateCommandCenter = useCallback((data) => {
		if (!data || !data.deviceId) return;
		setDeviceStatus((prev) => ({
			...prev,
			[data.deviceId]: {
				...prev[data.deviceId],
				weight: data.weight,
				status: data.status,
				ingredient: data.ingredient,
			},
		}));
	}, []);

	const onNfcEventCommandCenter = useCallback((data) => {
		if (!data || !data.deviceId) return;
		console.log("NFC event in command center:", data);
	}, []);

	const onCommandResponseCommandCenter = useCallback((data) => {
		if (!data || !data.deviceId) return;
		console.log("Command response in command center:", data);
	}, []);

	// WebSocket real-time updates
	useEffect(() => {
		if (!socket) return;

		socket.on("deviceStatus", onDeviceStatusCommandCenter);
		socket.on("update", onUpdateCommandCenter);
		socket.on("nfcEvent", onNfcEventCommandCenter);
		socket.on("commandResponse", onCommandResponseCommandCenter);

		return () => {
			socket.off("deviceStatus", onDeviceStatusCommandCenter);
			socket.off("update", onUpdateCommandCenter);
			socket.off("nfcEvent", onNfcEventCommandCenter);
			socket.off("commandResponse", onCommandResponseCommandCenter);
		};
	}, [socket]);

	// Broadcast command functions
	const sendBroadcastCommand = (command, data = {}) => {
		if (!socket) return;

		Alert.alert("Broadcast Command", `Send "${command}" to all devices?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Send",
				onPress: () => {
					sendCommand({
						deviceId: "broadcast",
						command: "broadcast",
						broadcastCommand: command,
						...data,
					});
					Alert.alert(
						"Success",
						`Broadcast command "${command}" sent to all devices`
					);
				},
			},
		]);
	};

	const getOnlineDeviceCount = () => {
		return Object.values(deviceStatus).filter((status) => status.isOnline)
			.length;
	};

	const getTotalDeviceCount = () => {
		return Object.keys(deviceStatus).length;
	};

	return (
		<>
			<TouchableOpacity
				onPress={() => setVisible(true)}
				activeOpacity={0.8}
				style={styles.trigger}
			>
				<LinearGradient
					colors={["#6366f1", "#a21caf"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.triggerGradient}
				>
					<Ionicons name="menu" size={20} color="#fff" />
				</LinearGradient>
			</TouchableOpacity>

			<Modal
				transparent
				animationType="fade"
				visible={visible}
				onRequestClose={() => setVisible(false)}
			>
				<TouchableOpacity
					style={styles.overlay}
					activeOpacity={1}
					onPress={() => setVisible(false)}
				>
					<View style={styles.dropdown}>
						<BlurView
							intensity={80}
							tint="light"
							style={styles.dropdownContent}
						>
							{/* Device Status Header */}
							<View style={styles.statusHeader}>
								<Text style={styles.statusTitle}>Device Status</Text>
								<Text style={styles.statusSubtitle}>
									{getOnlineDeviceCount()}/{getTotalDeviceCount()} Online
								</Text>
							</View>

							{/* Navigation Menu Items */}
							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenAlerts();
								}}
							>
								<Ionicons name="warning" size={20} color="#ef4444" />
								<Text style={styles.menuText}>Alerts</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenShoppingList();
								}}
							>
								<Ionicons name="cart" size={20} color="#10b981" />
								<Text style={styles.menuText}>Shopping List</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenSettings();
								}}
							>
								<Ionicons name="settings" size={20} color="#6366f1" />
								<Text style={styles.menuText}>Settings</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>

							{/* Divider */}
							{/* <View style={styles.divider} /> */}

							{/* Broadcast Commands */}
							<Text style={styles.sectionTitle}>Broadcast Commands</Text>

							<TouchableOpacity
								style={styles.commandItem}
								onPress={() => sendBroadcastCommand("tare")}
							>
								<Ionicons name="scale" size={18} color="#8A2BE2" />
								<Text style={styles.commandText}>Tare All Scales</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.commandItem}
								onPress={() => sendBroadcastCommand("nfc_read")}
							>
								<Ionicons name="nfc" size={18} color="#8A2BE2" />
								<Text style={styles.commandText}>Read All NFC Tags</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.commandItem}
								onPress={() => sendBroadcastCommand("restart")}
							>
								<Ionicons name="refresh" size={18} color="#f59e0b" />
								<Text style={styles.commandText}>Restart All Devices</Text>
							</TouchableOpacity>

							{/* <TouchableOpacity
								style={styles.commandItem}
								onPress={() => sendBroadcastCommand("config")}
							>
								<Ionicons name="cog" size={18} color="#6366f1" />
								<Text style={styles.commandText}>Get All Configs</Text>
							</TouchableOpacity> */}
						</BlurView>
					</View>
				</TouchableOpacity>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	trigger: {
		position: "absolute",
		top: 50,
		right: 20,
		zIndex: 1000,
	},
	triggerGradient: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#6366f1",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.1)",
	},
	dropdown: {
		position: "absolute",
		top: 100,
		right: 20,
		zIndex: 1001,
	},
	dropdownContent: {
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 16,
		elevation: 8,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
		gap: 12,
		minWidth: 190,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	menuText: {
		flex: 1,
		fontSize: 16,
		fontWeight: "600",
		color: "#1f2937",
	},
	// New styles for enhanced command center
	statusHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(156, 163, 175, 0.2)",
		marginBottom: 8,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	statusTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 4,
	},
	statusSubtitle: {
		fontSize: 12,
		color: "#6b7280",
	},
	divider: {
		height: 1,
		backgroundColor: "rgba(156, 163, 175, 0.2)",
		marginVertical: 12,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		color: "#6b7280",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		paddingHorizontal: 16,
		// marginBottom: 8,
		backgroundColor: "rgba(255,255,255,0.9)",
		paddingVertical: 8,
	},
	commandItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 12,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	commandText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
});
