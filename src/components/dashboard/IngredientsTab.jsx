import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	Modal,
	ScrollView,
	ActivityIndicator,
	TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	fetchIngredientsSummary,
	fetchIngredientUsage,
	fetchIngredientPrediction,
	fetchIngredientLogs,
} from "../../services/ingredients";

export default function IngredientsTab() {
	const [ingredients, setIngredients] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedIngredient, setSelectedIngredient] = useState(null);
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [analyticsData, setAnalyticsData] = useState({});
	const [ingredientLogs, setIngredientLogs] = useState({});
	const [analyticsLoading, setAnalyticsLoading] = useState({});
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");

	useEffect(() => {
		loadIngredients();
	}, []);

	async function loadIngredients() {
		try {
			setLoading(true);
			const data = await fetchIngredientsSummary();
			setIngredients(data || []);
		} catch (error) {
			console.error("Failed to load ingredients:", error);
		} finally {
			setLoading(false);
		}
	}

	async function loadIngredientAnalytics(ingredientName) {
		if (analyticsData[ingredientName]) return; // Already loaded

		try {
			setAnalyticsLoading((prev) => ({ ...prev, [ingredientName]: true }));

			const [usage, prediction, logs] = await Promise.all([
				fetchIngredientUsage(ingredientName),
				fetchIngredientPrediction(ingredientName),
				fetchIngredientLogs(ingredientName),
			]);

			setAnalyticsData((prev) => ({
				...prev,
				[ingredientName]: { usage, prediction },
			}));

			setIngredientLogs((prev) => ({
				...prev,
				[ingredientName]: logs,
			}));
		} catch (error) {
			console.error(`Failed to load analytics for ${ingredientName}:`, error);
		} finally {
			setAnalyticsLoading((prev) => ({ ...prev, [ingredientName]: false }));
		}
	}

	const getFilteredIngredients = () => {
		let filtered = ingredients;

		// Apply search filter
		if (searchQuery) {
			filtered = filtered.filter(
				(ingredient) =>
					ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					ingredient.device?.name
						?.toLowerCase()
						.includes(searchQuery.toLowerCase())
			);
		}

		// Apply status filter
		if (filterStatus !== "all") {
			filtered = filtered.filter((ingredient) => {
				const status = getStatusText(ingredient.weight);
				return status.toLowerCase() === filterStatus.toLowerCase();
			});
		}

		return filtered;
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

	const getStatusText = (weight) => {
		if (!weight || weight < 50) return "EMPTY";
		if (weight < 200) return "LOW";
		return "GOOD";
	};

	const renderIngredientCard = ({ item }) => (
		<TouchableOpacity
			style={styles.ingredientCard}
			onPress={() => {
				setSelectedIngredient(item);
				setDetailModalVisible(true);
				loadIngredientAnalytics(item.name);
			}}
		>
			{/* Header Row */}
			<View style={styles.cardHeader}>
				<View style={styles.ingredientInfo}>
					<Text style={styles.ingredientName}>{item.name}</Text>
					<Text style={styles.deviceInfo}>
						{item.device?.name || "Unknown Device"}
					</Text>
				</View>
				<View style={styles.statusSection}>
					<View
						style={[
							styles.statusBadge,
							{ backgroundColor: getStatusColor(getStatusText(item.weight)) },
						]}
					>
						<Text style={styles.statusText}>{getStatusText(item.weight)}</Text>
					</View>
				</View>
			</View>

			{/* Weight and Stats Row */}
			<View style={styles.weightRow}>
				<View style={styles.weightSection}>
					<Text style={styles.weightValue}>
						{Math.max(0, Math.round(item.weight || 0))}g
					</Text>
					<Text style={styles.weightLabel}>Current Stock</Text>
				</View>
				<View style={styles.statsSection}>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Logs</Text>
						<Text style={styles.statValue}>{item.totalLogs || 0}</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Avg</Text>
						<Text style={styles.statValue}>
							{Math.round(item.avgWeight || 0)}g
						</Text>
					</View>
				</View>
			</View>

			{/* Last Updated */}
			<View style={styles.lastUpdated}>
				<Ionicons name="time-outline" size={14} color="#6b7280" />
				<Text style={styles.lastUpdatedText}>
					Last updated:{" "}
					{item.lastUpdated
						? new Date(item.lastUpdated).toLocaleDateString()
						: "Never"}
				</Text>
			</View>
		</TouchableOpacity>
	);

	const renderIngredientDetail = () => {
		if (!selectedIngredient) return null;

		return (
			<Modal
				visible={detailModalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setDetailModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					{/* Header */}
					<View style={styles.modalHeader}>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={() => setDetailModalVisible(false)}
						>
							<Ionicons name="close" size={24} color="#6b7280" />
						</TouchableOpacity>
						<Text style={styles.modalTitle}>{selectedIngredient.name}</Text>
						<View style={styles.headerSpacer} />
					</View>

					<ScrollView style={styles.modalContent}>
						{/* Current Status */}
						<View style={styles.detailSection}>
							<Text style={styles.sectionTitle}>Current Status</Text>
							<View style={styles.statusGrid}>
								<View style={styles.statusItem}>
									<Text style={styles.statusLabel}>Stock Level</Text>
									<Text style={styles.statusValue}>
										{Math.max(0, Math.round(selectedIngredient.weight || 0))}g
									</Text>
									<View
										style={[
											styles.statusIndicator,
											{
												backgroundColor: getStatusColor(
													getStatusText(selectedIngredient.weight)
												),
											},
										]}
									>
										<Text style={styles.statusIndicatorText}>
											{getStatusText(selectedIngredient.weight)}
										</Text>
									</View>
								</View>
								<View style={styles.statusItem}>
									<Text style={styles.statusLabel}>Device</Text>
									<Text style={styles.statusValue}>
										{selectedIngredient.device?.name || "Unknown"}
									</Text>
								</View>
								<View style={styles.statusItem}>
									<Text style={styles.statusLabel}>Total Logs</Text>
									<Text style={styles.statusValue}>
										{selectedIngredient.totalLogs || 0}
									</Text>
								</View>
								<View style={styles.statusItem}>
									<Text style={styles.statusLabel}>Average Weight</Text>
									<Text style={styles.statusValue}>
										{Math.round(selectedIngredient.avgWeight || 0)}g
									</Text>
								</View>
							</View>
						</View>

						{/* Usage Analytics */}
						<View style={styles.detailSection}>
							<Text style={styles.sectionTitle}>Usage Analytics</Text>
							{analyticsLoading[selectedIngredient.name] ? (
								<View style={styles.analyticsLoading}>
									<ActivityIndicator size="large" color="#6366f1" />
									<Text style={styles.loadingText}>Loading analytics...</Text>
								</View>
							) : (
								<View style={styles.analyticsRow}>
									<View style={styles.analyticsItem}>
										<Ionicons name="trending-down" size={24} color="#ef4444" />
										<Text style={styles.analyticsLabel}>Daily Usage</Text>
										<Text style={styles.analyticsValue}>
											{(() => {
												const usage =
													analyticsData[selectedIngredient.name]?.usage;
												if (!usage || usage.length === 0) return "No data";
												const recentUsage = usage.slice(-7);
												const avgUsage =
													recentUsage.reduce(
														(sum, day) => sum + day.totalUsed,
														0
													) / recentUsage.length;
												return `${Math.round(avgUsage)}g/day`;
											})()}
										</Text>
									</View>
									<View style={styles.analyticsItem}>
										<Ionicons name="calendar" size={24} color="#3b82f6" />
										<Text style={styles.analyticsLabel}>Days Left</Text>
										<Text style={styles.analyticsValue}>
											{(() => {
												const prediction =
													analyticsData[selectedIngredient.name]?.prediction;
												if (!prediction || !prediction.prediction)
													return "Calculating...";
												return `${Math.round(prediction.prediction)} days`;
											})()}
										</Text>
									</View>
								</View>
							)}
						</View>

						{/* Recent Activity */}
						<View style={styles.detailSection}>
							<Text style={styles.sectionTitle}>Recent Activity</Text>
							{analyticsLoading[selectedIngredient.name] ? (
								<View style={styles.activityLoading}>
									<ActivityIndicator size="large" color="#6366f1" />
									<Text style={styles.loadingText}>Loading activity...</Text>
								</View>
							) : (
								(() => {
									const logs = ingredientLogs[selectedIngredient.name] || [];
									if (logs.length === 0) {
										return (
											<View style={styles.activityPlaceholder}>
												<Ionicons
													name="document-text-outline"
													size={48}
													color="#d1d5db"
												/>
												<Text style={styles.placeholderText}>
													No activity logs yet
												</Text>
												<Text style={styles.placeholderSubtext}>
													Activity will appear here as you use ingredients
												</Text>
											</View>
										);
									}

									return (
										<View style={styles.activityList}>
											{logs.slice(0, 5).map((log, index) => (
												<View
													key={log._id || index}
													style={styles.activityItem}
												>
													<View style={styles.activityIcon}>
														<Ionicons
															name="scale-outline"
															size={20}
															color={
																log.weight > (logs[index + 1]?.weight || 0)
																	? "#10b981"
																	: "#ef4444"
															}
														/>
													</View>
													<View style={styles.activityContent}>
														<Text style={styles.activityTitle}>
															{log.weight}g •{" "}
															{log.device?.name || "Unknown Device"}
														</Text>
														<Text style={styles.activityTime}>
															{new Date(log.timestamp).toLocaleString()}
														</Text>
													</View>
													<View style={styles.activityStatus}>
														<Text style={styles.activityStatusText}>
															{log.status || "Updated"}
														</Text>
													</View>
												</View>
											))}
											{logs.length > 5 && (
												<View style={styles.moreActivity}>
													<Text style={styles.moreActivityText}>
														+{logs.length - 5} more entries
													</Text>
												</View>
											)}
										</View>
									);
								})()
							)}
						</View>
					</ScrollView>
				</View>
			</Modal>
		);
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Ingredients</Text>
				<Text style={styles.subtitle}>
					Manage and monitor your ingredient inventory
				</Text>
			</View>

			{/* Search and Filters */}
			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#6b7280" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search ingredients..."
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery ? (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Ionicons name="close-circle" size={20} color="#6b7280" />
						</TouchableOpacity>
					) : null}
				</View>

				<View style={styles.filterButtons}>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filterStatus === "all" && styles.filterButtonActive,
						]}
						onPress={() => setFilterStatus("all")}
					>
						<Text
							style={[
								styles.filterButtonText,
								filterStatus === "all" && styles.filterButtonTextActive,
							]}
						>
							All
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filterStatus === "good" && styles.filterButtonActive,
						]}
						onPress={() => setFilterStatus("good")}
					>
						<Text
							style={[
								styles.filterButtonText,
								filterStatus === "good" && styles.filterButtonTextActive,
							]}
						>
							Good
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filterStatus === "low" && styles.filterButtonActive,
						]}
						onPress={() => setFilterStatus("low")}
					>
						<Text
							style={[
								styles.filterButtonText,
								filterStatus === "low" && styles.filterButtonTextActive,
							]}
						>
							Low
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filterStatus === "empty" && styles.filterButtonActive,
						]}
						onPress={() => setFilterStatus("empty")}
					>
						<Text
							style={[
								styles.filterButtonText,
								filterStatus === "empty" && styles.filterButtonTextActive,
							]}
						>
							Empty
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Ingredients List */}
			<FlatList
				data={getFilteredIngredients()}
				keyExtractor={(item) => item.name}
				renderItem={renderIngredientCard}
				refreshControl={
					<RefreshControl refreshing={loading} onRefresh={loadIngredients} />
				}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<Ionicons name="leaf-outline" size={64} color="#d1d5db" />
						<Text style={styles.emptyTitle}>
							{searchQuery || filterStatus !== "all"
								? "No Matching Ingredients"
								: "No Ingredients Yet"}
						</Text>
						<Text style={styles.emptySubtitle}>
							{searchQuery || filterStatus !== "all"
								? "Try adjusting your search or filters"
								: "Start tracking ingredients by adding them to your devices"}
						</Text>
					</View>
				}
				contentContainerStyle={{ paddingBottom: 40 }}
			/>

			{/* Ingredient Detail Modal */}
			{renderIngredientDetail()}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	header: {
		padding: 20,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
	},
	// Search and filter styles
	searchSection: {
		backgroundColor: "#fff",
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 16,
		gap: 12,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#1f2937",
	},
	filterButtons: {
		flexDirection: "row",
		gap: 8,
	},
	filterButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	filterButtonActive: {
		backgroundColor: "#6366f1",
		borderColor: "#6366f1",
	},
	filterButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6b7280",
	},
	filterButtonTextActive: {
		color: "#fff",
	},
	ingredientCard: {
		backgroundColor: "#fff",
		marginHorizontal: 16,
		marginVertical: 8,
		borderRadius: 16,
		padding: 20,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	ingredientInfo: {
		flex: 1,
	},
	ingredientName: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 4,
	},
	deviceInfo: {
		fontSize: 14,
		color: "#6b7280",
	},
	statusSection: {
		alignItems: "flex-end",
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#fff",
		textTransform: "uppercase",
	},
	weightRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	weightSection: {
		flex: 1,
	},
	weightValue: {
		fontSize: 32,
		fontWeight: "800",
		color: "#6366f1",
		marginBottom: 4,
	},
	weightLabel: {
		fontSize: 12,
		color: "#6b7280",
		textTransform: "uppercase",
		fontWeight: "600",
	},
	statsSection: {
		flexDirection: "row",
		gap: 20,
	},
	statItem: {
		alignItems: "center",
	},
	statLabel: {
		fontSize: 11,
		color: "#6b7280",
		textTransform: "uppercase",
		fontWeight: "600",
		marginBottom: 2,
	},
	statValue: {
		fontSize: 16,
		fontWeight: "700",
		color: "#374151",
	},
	lastUpdated: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	lastUpdatedText: {
		fontSize: 12,
		color: "#6b7280",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 60,
		paddingHorizontal: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 20,
	},
	// Modal Styles
	modalContainer: {
		flex: 1,
		backgroundColor: "#fff",
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	closeButton: {
		padding: 4,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1f2937",
		flex: 1,
		textAlign: "center",
	},
	headerSpacer: {
		width: 32,
	},
	modalContent: {
		flex: 1,
		padding: 20,
	},
	detailSection: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 16,
	},
	statusGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 16,
	},
	statusItem: {
		flex: 1,
		minWidth: "45%",
		backgroundColor: "#f9fafb",
		padding: 16,
		borderRadius: 12,
		alignItems: "center",
	},
	statusLabel: {
		fontSize: 12,
		color: "#6b7280",
		textTransform: "uppercase",
		fontWeight: "600",
		marginBottom: 8,
	},
	statusValue: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1f2937",
		marginBottom: 8,
	},
	statusIndicator: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusIndicatorText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
		textTransform: "uppercase",
	},
	analyticsRow: {
		flexDirection: "row",
		gap: 16,
	},
	analyticsItem: {
		flex: 1,
		backgroundColor: "#f9fafb",
		padding: 20,
		borderRadius: 12,
		alignItems: "center",
	},
	analyticsLabel: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 12,
		marginBottom: 4,
		fontWeight: "600",
	},
	analyticsValue: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1f2937",
	},
	activityPlaceholder: {
		alignItems: "center",
		paddingVertical: 40,
		backgroundColor: "#f9fafb",
		borderRadius: 12,
	},
	placeholderText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
		marginBottom: 8,
	},
	placeholderSubtext: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 20,
	},
	// Loading states
	analyticsLoading: {
		alignItems: "center",
		paddingVertical: 40,
	},
	activityLoading: {
		alignItems: "center",
		paddingVertical: 40,
	},
	loadingText: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 12,
	},
	// Activity list styles
	activityList: {
		gap: 12,
	},
	activityItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f9fafb",
		padding: 16,
		borderRadius: 12,
		gap: 12,
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
		justifyContent: "center",
		alignItems: "center",
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
	},
	activityTime: {
		fontSize: 12,
		color: "#6b7280",
	},
	activityStatus: {
		alignItems: "flex-end",
	},
	activityStatusText: {
		fontSize: 11,
		color: "#6b7280",
		textTransform: "uppercase",
		fontWeight: "600",
	},
	moreActivity: {
		alignItems: "center",
		paddingVertical: 16,
	},
	moreActivityText: {
		fontSize: 14,
		color: "#6366f1",
		fontWeight: "600",
	},
});
