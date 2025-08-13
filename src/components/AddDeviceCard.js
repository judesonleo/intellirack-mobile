import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AddDeviceCard({ onPress }) {
	return (
		<TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
			<View style={styles.iconContainer}>
				<Ionicons name="add" size={32} color="#fff" />
			</View>
			<Text style={styles.title}>Add New Device</Text>
			<Text style={styles.subtitle}>
				Discover and register new IntelliRack devices on your network
			</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 24,
		marginBottom: 16,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
		borderWidth: 2,
		borderColor: "#f3f4f6",
		borderStyle: "dashed",
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#6366f1",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
		shadowColor: "#6366f1",
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 8,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 20,
	},
});
