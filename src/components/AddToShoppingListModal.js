import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Alert,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function AddToShoppingListModal({
	visible,
	onClose,
	onAdd,
	item,
}) {
	const [quantity, setQuantity] = useState("1");
	const [notes, setNotes] = useState("");
	const [priority, setPriority] = useState("medium");

	const handleAdd = () => {
		if (!quantity.trim()) {
			Alert.alert("Error", "Please enter a quantity");
			return;
		}

		onAdd({
			name: item.name,
			quantity: quantity.trim(),
			notes: notes.trim(),
			priority,
		});

		// Reset form
		setQuantity("1");
		setNotes("");
		setPriority("medium");
		onClose();
	};

	const handleClose = () => {
		setQuantity("1");
		setNotes("");
		setPriority("medium");
		onClose();
	};

	const priorityOptions = [
		{ value: "low", label: "Low", color: "#10b981", icon: "arrow-down" },
		{ value: "medium", label: "Medium", color: "#f59e0b", icon: "remove" },
		{ value: "high", label: "High", color: "#ef4444", icon: "arrow-up" },
	];

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={handleClose}
		>
			<View style={styles.overlay}>
				<View style={styles.modal}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.title}>Add to Shopping List</Text>
						<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color="#6b7280" />
						</TouchableOpacity>
					</View>

					{/* Item Info */}
					<View style={styles.itemInfo}>
						<View style={styles.itemIcon}>
							<Ionicons name="warning" size={24} color="#f59e0b" />
						</View>
						<View style={styles.itemDetails}>
							<Text style={styles.itemName}>{item?.name}</Text>
							<Text style={styles.itemStatus}>
								Current: {Math.round(item?.weight || 0)}g • Need:{" "}
								{Math.round((item?.maxWeight || 1000) - (item?.weight || 0))}g
							</Text>
						</View>
					</View>

					<ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
						{/* Quantity Input */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Quantity</Text>
							<View style={styles.quantityContainer}>
								<TouchableOpacity
									style={styles.quantityButton}
									onPress={() => {
										const num = parseInt(quantity) || 1;
										setQuantity(Math.max(1, num - 1).toString());
									}}
								>
									<Ionicons name="remove" size={20} color="#6b7280" />
								</TouchableOpacity>
								<TextInput
									style={styles.quantityInput}
									value={quantity}
									onChangeText={setQuantity}
									keyboardType="numeric"
									placeholder="1"
									placeholderTextColor="#9ca3af"
								/>
								<TouchableOpacity
									style={styles.quantityButton}
									onPress={() => {
										const num = parseInt(quantity) || 1;
										setQuantity((num + 1).toString());
									}}
								>
									<Ionicons name="add" size={20} color="#6b7280" />
								</TouchableOpacity>
							</View>
						</View>

						{/* Priority Selection */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Priority</Text>
							<View style={styles.priorityContainer}>
								{priorityOptions.map((option) => (
									<TouchableOpacity
										key={option.value}
										style={[
											styles.priorityOption,
											priority === option.value && styles.priorityOptionActive,
										]}
										onPress={() => setPriority(option.value)}
									>
										<Ionicons
											name={option.icon}
											size={16}
											color={priority === option.value ? "#fff" : option.color}
										/>
										<Text
											style={[
												styles.priorityOptionText,
												priority === option.value &&
													styles.priorityOptionTextActive,
											]}
										>
											{option.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Notes Input */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Notes (Optional)</Text>
							<TextInput
								style={styles.notesInput}
								value={notes}
								onChangeText={setNotes}
								placeholder="e.g., Organic preferred, specific brand, etc."
								placeholderTextColor="#9ca3af"
								multiline
								numberOfLines={3}
								textAlignVertical="top"
							/>
						</View>
					</ScrollView>

					{/* Action Buttons */}
					<View style={styles.actions}>
						<TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
							<Text style={styles.cancelButtonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.addButton} onPress={handleAdd}>
							<LinearGradient
								colors={["#8A2BE2", "#FF69B4"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.gradientButton}
							>
								<Text style={styles.addButtonText}>Add to List</Text>
							</LinearGradient>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modal: {
		backgroundColor: "#fff",
		borderRadius: 20,
		width: "100%",
		maxHeight: "80%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.25,
		shadowRadius: 20,
		elevation: 10,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#1f2937",
	},
	closeButton: {
		padding: 4,
	},
	itemInfo: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#f9fafb",
		margin: 20,
		borderRadius: 12,
	},
	itemIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#fef3c7",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	itemDetails: {
		flex: 1,
	},
	itemName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
	},
	itemStatus: {
		fontSize: 14,
		color: "#6b7280",
	},
	form: {
		paddingHorizontal: 20,
	},
	inputGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 8,
	},
	quantityContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	quantityButton: {
		padding: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	quantityInput: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 16,
		fontSize: 18,
		fontWeight: "600",
		color: "#1f2937",
		textAlign: "center",
	},
	priorityContainer: {
		flexDirection: "row",
		gap: 8,
	},
	priorityOption: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "#fff",
		gap: 6,
	},
	priorityOptionActive: {
		backgroundColor: "#8A2BE2",
		borderColor: "#8A2BE2",
	},
	priorityOptionText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
	priorityOptionTextActive: {
		color: "#fff",
	},
	notesInput: {
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		fontSize: 16,
		color: "#1f2937",
		minHeight: 80,
	},
	actions: {
		flexDirection: "row",
		gap: 12,
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "#fff",
		alignItems: "center",
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#6b7280",
	},
	addButton: {
		flex: 2,
		borderRadius: 12,
		overflow: "hidden",
	},
	gradientButton: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
	},
	addButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
});
