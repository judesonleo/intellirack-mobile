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
		const onStatus = (data) => {
			setDevices((prev) =>
				prev.map((d) =>
					d.rackId === data.deviceId
						? { ...d, isOnline: data.isOnline, lastSeen: data.lastSeen }
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
		socket.on("deviceAdded", onAdded);
		socket.on("deviceDeleted", onDeleted);
		return () => {
			socket.off("deviceStatus", onStatus);
			socket.off("deviceAdded", onAdded);
			socket.off("deviceDeleted", onDeleted);
		};
	}, [socket]);

	return (
		<SafeAreaView style={styles.container}>
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
});
