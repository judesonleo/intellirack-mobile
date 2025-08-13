import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useShoppingList } from "../contexts/ShoppingListContext";
import ExportShoppingListModal from "../components/ExportShoppingListModal";

export default function ShoppingListScreen({ navigation }) {
	const {
		shoppingList,
		removeFromShoppingList,
		toggleItemComplete,
		clearShoppingList,
	} = useShoppingList();
	const [refreshing, setRefreshing] = useState(false);
	const [exportModalVisible, setExportModalVisible] = useState(false);

	const onRefresh = async () => {
		setRefreshing(true);
		// The context will automatically refresh the data
		setTimeout(() => setRefreshing(false), 1000);
	};

	const handleToggleComplete = async (itemId) => {
		try {
			await toggleItemComplete(itemId);
		} catch (error) {
			Alert.alert("Error", "Failed to update item");
		}
	};

	const handleDeleteItem = (itemId) => {
		Alert.alert(
			"Delete Item",
			"Are you sure you want to remove this item from your shopping list?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await removeFromShoppingList(itemId);
						} catch (error) {
							Alert.alert("Error", "Failed to delete item");
						}
					},
				},
			]
		);
	};

	const handleClearList = () => {
		Alert.alert(
			"Clear Shopping List",
			"Are you sure you want to clear all items from your shopping list?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear All",
					style: "destructive",
					onPress: async () => {
						try {
							await clearShoppingList();
						} catch (error) {
							Alert.alert("Error", "Failed to clear shopping list");
						}
					},
				},
			]
		);
	};

	const getPriorityColor = (priority) => {
		switch (priority) {
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

	const getPriorityIcon = (priority) => {
		switch (priority) {
			case "high":
				return "arrow-up";
			case "medium":
				return "remove";
			case "low":
				return "arrow-down";
			default:
				return "remove";
		}
	};

	const renderShoppingItem = ({ item }) => (
		<View style={[styles.shoppingItem, item.completed && styles.completedItem]}>
			<TouchableOpacity
				style={styles.checkboxContainer}
				onPress={() => handleToggleComplete(item.id)}
			>
				<View
					style={[styles.checkbox, item.completed && styles.checkboxCompleted]}
				>
					{item.completed && (
						<Ionicons name="checkmark" size={16} color="#fff" />
					)}
				</View>
			</TouchableOpacity>

			<View style={styles.itemContent}>
				<View style={styles.itemHeader}>
					<Text
						style={[styles.itemName, item.completed && styles.completedText]}
					>
						{item.name}
					</Text>
					<View style={styles.itemMeta}>
						<Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
						<View
							style={[
								styles.priorityBadge,
								{ backgroundColor: getPriorityColor(item.priority) },
							]}
						>
							<Ionicons
								name={getPriorityIcon(item.priority)}
								size={12}
								color="#fff"
							/>
							<Text style={styles.priorityText}>{item.priority}</Text>
						</View>
					</View>
				</View>

				{item.notes && (
					<Text
						style={[styles.itemNotes, item.completed && styles.completedText]}
					>
						{item.notes}
					</Text>
				)}

				<Text style={styles.itemDate}>
					Added: {new Date(item.addedAt).toLocaleDateString()}
				</Text>
			</View>

			<TouchableOpacity
				style={styles.deleteButton}
				onPress={() => handleDeleteItem(item.id)}
			>
				<Ionicons name="trash-outline" size={20} color="#ef4444" />
			</TouchableOpacity>
		</View>
	);

	const completedItems = shoppingList.filter((item) => item.completed);
	const activeItems = shoppingList.filter((item) => !item.completed);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#6366f1" />
				</TouchableOpacity>
				<Text style={styles.title}>Shopping List</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={styles.exportButton}
						onPress={() => setExportModalVisible(true)}
						disabled={shoppingList.length === 0}
					>
						<Ionicons name="share-outline" size={20} color="#8A2BE2" />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.clearButton}
						onPress={handleClearList}
						disabled={shoppingList.length === 0}
					>
						<Ionicons name="trash-outline" size={20} color="#ef4444" />
					</TouchableOpacity>
				</View>
			</View>

			{shoppingList.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="cart-outline" size={64} color="#9ca3af" />
					<Text style={styles.emptyTitle}>Your shopping list is empty</Text>
					<Text style={styles.emptySubtitle}>
						Add items from restock alerts to get started
					</Text>
				</View>
			) : (
				<FlatList
					data={[...activeItems, ...completedItems]}
					renderItem={renderShoppingItem}
					keyExtractor={(item) => item.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* Summary */}
			{shoppingList.length > 0 && (
				<View style={styles.summary}>
					<Text style={styles.summaryText}>
						{activeItems.length} active • {completedItems.length} completed
					</Text>
				</View>
			)}

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
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	backButton: {
		padding: 8,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#1f2937",
	},
	headerActions: {
		flexDirection: "row",
		gap: 8,
	},
	exportButton: {
		padding: 8,
		opacity: 0.8,
	},
	clearButton: {
		padding: 8,
		opacity: 0.7,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
		textAlign: "center",
	},
	emptySubtitle: {
		fontSize: 16,
		color: "#6b7280",
		marginTop: 8,
		textAlign: "center",
		lineHeight: 22,
	},
	listContainer: {
		padding: 16,
	},
	shoppingItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "#fff",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	completedItem: {
		opacity: 0.6,
	},
	checkboxContainer: {
		marginRight: 12,
		marginTop: 2,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#d1d5db",
		justifyContent: "center",
		alignItems: "center",
	},
	checkboxCompleted: {
		backgroundColor: "#10b981",
		borderColor: "#10b981",
	},
	itemContent: {
		flex: 1,
	},
	itemHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	itemName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1f2937",
		flex: 1,
		marginRight: 12,
	},
	completedText: {
		textDecorationLine: "line-through",
		color: "#9ca3af",
	},
	itemMeta: {
		alignItems: "flex-end",
		gap: 8,
	},
	itemQuantity: {
		fontSize: 14,
		color: "#6b7280",
		fontWeight: "500",
	},
	priorityBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: "600",
		color: "#fff",
		textTransform: "uppercase",
	},
	itemNotes: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 8,
		fontStyle: "italic",
	},
	itemDate: {
		fontSize: 12,
		color: "#9ca3af",
	},
	deleteButton: {
		padding: 8,
		marginLeft: 8,
		marginTop: 2,
	},
	summary: {
		padding: 16,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
		alignItems: "center",
	},
	summaryText: {
		fontSize: 14,
		color: "#6b7280",
		fontWeight: "500",
	},
});
