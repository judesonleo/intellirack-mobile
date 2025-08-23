import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMyDevices } from "../services/devices";
import { useSocket } from "../contexts/SocketContext";
import DeviceCard from "../components/DeviceCard";
import DeviceActionSheet from "../components/DeviceActionSheet";
import AddDeviceSheet from "../components/AddDeviceSheet";
import AddDeviceCard from "../components/AddDeviceCard";
import { Ionicons } from "@expo/vector-icons";

export default function DevicesScreen() {
	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(false);
	const [deletingDeviceId, setDeletingDeviceId] = useState(null);
	const { socket } = useSocket();
	const [selected, setSelected] = useState(null);
	const [addVisible, setAddVisible] = useState(false);

	async function load() {
		try {
			setLoading(true);
			const data = await fetchMyDevices();
			setDevices(data || []);
		} catch (e) {
			// noop
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	useEffect(() => {
		if (!socket) return;

		// Handle device status updates (including weight, ingredient, status)
		const onStatus = (data) => {
			console.log("DevicesScreen - deviceStatus received:", data);
			setDevices((prev) =>
				prev.map((d) =>
					d.rackId === data.deviceId
						? {
								...d,
								isOnline: data.isOnline ?? d.isOnline,
								lastSeen: data.lastSeen ?? d.lastSeen,
								// Update real-time data
								lastWeight: data.weight ?? d.lastWeight,
								lastStatus: data.status ?? d.lastStatus,
								ingredient: data.ingredient ?? d.ingredient,
						  }
						: d
				)
			);
		};

		// Handle real-time device updates (weight, status, ingredient)
		const onUpdate = (data) => {
			console.log("DevicesScreen - update received:", data);
			setDevices((prev) =>
				prev.map((d) =>
					d.rackId === data.deviceId
						? {
								...d,
								isOnline: data.isOnline ?? d.isOnline,
								lastSeen: data.lastSeen ?? d.lastSeen,
								// Update real-time data
								lastWeight: data.weight ?? d.lastWeight,
								lastStatus: data.status ?? d.lastStatus,
								ingredient: data.ingredient ?? d.ingredient,
						  }
						: d
				)
			);
		};

		const onAdded = () => load();
		const onDeleted = (data) => {
			console.log("Device deleted via socket:", data);
			// Remove the deleted device from the local state immediately
			setDevices((prev) =>
				prev.filter(
					(d) => d._id !== data.deviceId && d.rackId !== data.deviceId
				)
			);
		};

		socket.on("deviceStatus", onStatus);
		socket.on("update", onUpdate);
		socket.on("deviceAdded", onAdded);
		socket.on("deviceDeleted", onDeleted);

		// Test event listener
		socket.on("test", (data) => {
			console.log("DevicesScreen - Test response received:", data);
		});

		return () => {
			socket.off("deviceStatus", onStatus);
			socket.off("update", onUpdate);
			socket.off("deviceAdded", onAdded);
			socket.off("deviceDeleted", onDeleted);
			socket.off("test");
		};
	}, [socket]);

	return (
		<SafeAreaView style={styles.container}>
			{/* Debug Info - Remove in production */}
			{/* {__DEV__ && ( */}
			{/* <View style={styles.debugSection}>
				<Text style={styles.debugTitle}>Debug: Devices State</Text>
				<Text style={styles.debugText}>Total Devices: {devices.length}</Text>
				{devices.length > 0 && (
					<Text style={styles.debugText}>
						First Device: {JSON.stringify(devices[0], null, 2)}
					</Text>
				)}

				<TouchableOpacity
					style={styles.testButton}
					onPress={() => {
						console.log("DevicesScreen - Testing websocket connection...");
						console.log("Socket connected:", socket?.connected);
						console.log("Socket ID:", socket?.id);
						console.log("Current devices:", devices);

						// Test by emitting a test event for the first device
						if (socket && devices.length > 0) {
							const firstDevice = devices[0];
							socket.emit("test", {
								deviceId: firstDevice.rackId || firstDevice._id,
								message: "Test from DevicesScreen",
							});
						}
					}}
				>
					<Text style={styles.testButtonText}>Test WebSocket</Text>
				</TouchableOpacity>
			</View> */}
			{/* )} */}
			<View style={styles.header}>
				<Text style={styles.title}>Devices</Text>
			</View>
			<FlatList
				data={devices}
				keyExtractor={(item) => item._id || item.rackId}
				refreshControl={
					<RefreshControl refreshing={loading} onRefresh={load} />
				}
				ListEmptyComponent={<Text style={styles.text}>No devices yet.</Text>}
				renderItem={({ item }) => (
					<DeviceCard
						device={item}
						onPress={() => setSelected(item)}
						isDeleting={deletingDeviceId === (item._id || item.rackId)}
					/>
				)}
				ListFooterComponent={
					<AddDeviceCard onPress={() => setAddVisible(true)} />
				}
				contentContainerStyle={{ paddingBottom: 40 }}
			/>
			<DeviceActionSheet
				device={selected}
				visible={!!selected}
				onClose={() => setSelected(null)}
				onDeleted={(deletedDeviceId) => {
					console.log("Device deleted, updating display:", deletedDeviceId);

					// Close the action sheet immediately
					setSelected(null);

					// Remove the deleted device from local state for instant UI update
					setDevices((prev) =>
						prev.filter(
							(d) => d._id !== deletedDeviceId && d.rackId !== deletedDeviceId
						)
					);

					// Also refresh from server to ensure consistency
					setTimeout(() => {
						load();
					}, 100);
				}}
				onDeleteStart={(deviceId) => {
					setDeletingDeviceId(deviceId);
				}}
				onDeleteEnd={() => {
					setDeletingDeviceId(null);
				}}
			/>
			<AddDeviceSheet
				visible={addVisible}
				onClose={() => setAddVisible(false)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	header: {
		marginBottom: 8,
	},
	title: { fontSize: 22, fontWeight: "700" },
	text: { color: "#6b7280" },
	meta: { color: "#6b7280", fontSize: 12 },

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
});
