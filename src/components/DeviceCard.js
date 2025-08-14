import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import slot from "../../assets/slot.png";

export default function DeviceCard({ device, onPress, isDeleting = false }) {
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
		if (!device?.lastWeight || device.lastWeight < 50) return "EMPTY";
		if (device.lastWeight < 200) return "LOW";
		return "GOOD";
	};

	return (
		<TouchableOpacity
			style={[styles.card, isDeleting && styles.cardDeleting]}
			activeOpacity={0.9}
			onPress={onPress}
			disabled={isDeleting}
		>
			{/* Top Row - Status Badge and NFC Status */}
			<View style={styles.topRow}>
				<View style={styles.statusBadge}>
					<Text
						style={[
							styles.statusText,
							{ color: device?.isOnline ? "#10b981" : "#ef4444" },
						]}
					>
						{device?.isOnline ? "ONLINE" : "OFFLINE"}
					</Text>
				</View>

				{/* NFC Status Indicator */}
				{device?.nfcStatus && (
					<View style={styles.nfcBadge}>
						<Ionicons name="nfc" size={16} color="#8A2BE2" />
						<Text style={styles.nfcText}>
							{device.nfcStatus.type?.toUpperCase()}
						</Text>
					</View>
				)}

				{/* Command Status Indicator */}
				{device?.commandStatus && (
					<View
						style={[
							styles.commandBadge,
							{
								backgroundColor: device.commandStatus.success
									? "#10b981"
									: "#ef4444",
							},
						]}
					>
						<Ionicons
							name={device.commandStatus.success ? "checkmark" : "close"}
							size={14}
							color="white"
						/>
						<Text style={styles.commandText}>
							{device.commandStatus.command}
						</Text>
					</View>
				)}
			</View>

			{/* Main Row - Big Image Left, Weight Right */}
			<View style={styles.mainRow}>
				<View style={styles.imageSection}>
					<Image source={slot} style={styles.deviceImage} resizeMode="cover" />
				</View>
				<View style={styles.weightSection}>
					<Text style={styles.weightValue}>
						{Math.max(0, Math.round(device?.lastWeight || 0))}g
					</Text>
					<Text style={styles.weightLabel}>Current Weight</Text>
				</View>
			</View>

			{/* Bottom Section - Device Info and Extra Stats */}
			<View style={styles.bottomSection}>
				{/* Device Name and Ingredient */}
				<View style={styles.deviceInfo}>
					<Text style={styles.deviceName}>
						{device?.name || `IntelliRack ${device?.rackId}`}
					</Text>
					<Text style={styles.ingredientInfo}>
						{device?.ingredient || "No ingredient set"}
					</Text>
				</View>

				{/* Extra Stats Row */}
				<View style={styles.statsRow}>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Stock Level</Text>
						<View
							style={[
								styles.stockBadge,
								{ backgroundColor: getStatusColor(getStatusText()) },
							]}
						>
							<Text style={styles.stockBadgeText}>{getStatusText()}</Text>
						</View>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Last Updated</Text>
						<Text style={styles.statValue}>
							{device?.lastSeen
								? new Date(device.lastSeen).toLocaleTimeString()
								: "Never"}
						</Text>
					</View>
				</View>
			</View>

			{/* Settings Button */}
			<TouchableOpacity style={styles.settingsButton} onPress={onPress}>
				<Text style={styles.settingsButtonText}>Device Settings</Text>
			</TouchableOpacity>

			{/* Deletion Overlay */}
			{isDeleting && (
				<View style={styles.deletionOverlay}>
					<View style={styles.deletionContent}>
						<Ionicons name="trash" size={24} color="#fff" />
						<Text style={styles.deletionText}>Deleting...</Text>
					</View>
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	topRow: {
		alignItems: "flex-end",
		// marginBottom: 12,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: "#f3f4f6",
		alignSelf: "flex-end",
	},
	statusText: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
	},
	mainRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		marginBottom: 12,
	},
	imageSection: {
		flex: 1,
		alignItems: "center",
	},
	deviceImage: {
		width: 180,
		height: 120,
		margin: 12,
		paddingLeft: 12,
		borderRadius: 12,
	},
	weightSection: {
		flex: 1,
		alignItems: "flex-end",
	},
	weightValue: {
		fontSize: 62,
		fontWeight: "900",
		color: "#6366f1",
		marginBottom: 6,
	},
	weightLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
		textTransform: "uppercase",
	},
	bottomSection: {
		marginBottom: 12,
	},
	deviceInfo: {
		marginBottom: 12,
	},
	deviceName: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 4,
	},
	ingredientInfo: {
		fontSize: 14,
		color: "#6b7280",
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	statItem: {
		flex: 1,
		alignItems: "flex-start",
	},
	statLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: "#6b7280",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	statValue: {
		fontSize: 12,
		fontWeight: "600",
		color: "#374151",
	},
	stockBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	stockBadgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
		textTransform: "uppercase",
	},
	settingsButton: {
		backgroundColor: "#6366f1",
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
	},
	settingsButtonText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
	},
	// NFC and Command status badges
	nfcBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(138, 43, 226, 0.1)",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "rgba(138, 43, 226, 0.3)",
		gap: 4,
	},
	nfcText: {
		fontSize: 10,
		fontWeight: "600",
		color: "#8A2BE2",
		textTransform: "uppercase",
	},
	commandBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	commandText: {
		fontSize: 10,
		fontWeight: "600",
		color: "white",
		textTransform: "uppercase",
	},
	// Deletion overlay styles
	cardDeleting: {
		opacity: 0.6,
	},
	deletionOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(239, 68, 68, 0.9)",
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	deletionContent: {
		alignItems: "center",
		gap: 8,
	},
	deletionText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
});
