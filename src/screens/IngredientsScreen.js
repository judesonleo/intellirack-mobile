import React, { useState, useEffect, useCallback } from "react";
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
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ChartKit from "react-native-chart-kit";
import {
	fetchIngredientsSummary,
	fetchIngredientUsage,
	fetchIngredientPrediction,
	fetchIngredientLogs,
} from "../services/ingredients";
import { useSocket } from "../contexts/SocketContext";

const screenWidth = Dimensions.get("window").width;

export default function IngredientsScreen() {
	const [ingredients, setIngredients] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedIngredient, setSelectedIngredient] = useState(null);
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [analyticsData, setAnalyticsData] = useState({});
	const [ingredientLogs, setIngredientLogs] = useState({});
	const [analyticsLoading, setAnalyticsLoading] = useState({});
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");
	const { socket } = useSocket();

	useEffect(() => {
		loadIngredients();

		// Cleanup function to clear chart cache
		return () => {
			chartDataCache.clear();
		};
	}, []);

	// WebSocket real-time updates for ingredients
	useEffect(() => {
		if (!socket) return;

		const onUpdateIngredientsScreen = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Ingredient update via WebSocket:", data);

			// Update ingredient data in real-time
			setIngredients((prev) =>
				prev.map((ing) =>
					ing.device === data.deviceId
						? {
								...ing,
								weight: data.weight ?? ing.weight,
								status: data.status ?? ing.status,
								ingredient: data.ingredient ?? ing.ingredient,
								lastUpdated: new Date(),
						  }
						: ing
				)
			);
		};

		const onDeviceStatusIngredientsScreen = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Device status update for ingredients:", data);

			// Update device status in ingredients
			setIngredients((prev) =>
				prev.map((ing) =>
					ing.device === data.deviceId
						? {
								...ing,
								deviceOnline: data.isOnline,
								lastSeen: data.lastSeen,
						  }
						: ing
				)
			);
		};

		// NFC and Command events for ingredients - UNIQUE HANDLERS
		const onNfcEventIngredientsScreen = (data) => {
			if (!data || !data.deviceId) return;
			console.log("NFC event for ingredients:", data);

			// Update ingredient if NFC tag changed
			if (data.type === "read" && data.ingredient) {
				setIngredients((prev) =>
					prev.map((ing) =>
						ing.device === data.deviceId
							? {
									...ing,
									ingredient: data.ingredient,
									tagUID: data.tagUID,
									lastNfcUpdate: new Date(),
							  }
							: ing
					)
				);
			}
		};

		const onCommandResponseIngredientsScreen = (data) => {
			if (!data || !data.deviceId) return;
			console.log("Command response for ingredients:", data);

			// Handle ingredient-related commands
			if (data.command === "tare" || data.command === "calibrate") {
				// Reload ingredients after scale operations
				setTimeout(() => {
					loadIngredients();
				}, 1000);
			}
		};

		socket.on("update", onUpdateIngredientsScreen);
		socket.on("deviceStatus", onDeviceStatusIngredientsScreen);
		socket.on("nfcEvent", onNfcEventIngredientsScreen);
		socket.on("commandResponse", onCommandResponseIngredientsScreen);

		return () => {
			socket.off("update", onUpdateIngredientsScreen);
			socket.off("deviceStatus", onDeviceStatusIngredientsScreen);
			socket.off("nfcEvent", onNfcEventIngredientsScreen);
			socket.off("commandResponse", onCommandResponseIngredientsScreen);
		};
	}, [socket]);

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

			// Add a small delay to prevent rapid successive calls
			await new Promise((resolve) => setTimeout(resolve, 100));

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

	// Chart data processing functions with memoization
	const chartDataCache = new Map();

	const processUsageChartData = (usageData) => {
		if (!usageData || usageData.length === 0) return null;

		// Create a cache key based on the data
		const cacheKey = `usage_${JSON.stringify(usageData)}`;
		if (chartDataCache.has(cacheKey)) {
			return chartDataCache.get(cacheKey);
		}

		// Get last 7 days of data
		const last7Days = usageData.slice(-7);
		const labels = last7Days.map((day) =>
			new Date(day.date).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})
		);
		const data = last7Days.map((day) => day.totalUsed || 0);

		const result = { labels, data };
		chartDataCache.set(cacheKey, result);
		return result;
	};

	const processStockChartData = (logsData) => {
		if (!logsData || logsData.length === 0) return null;

		// Get last 10 weight measurements
		const last10Logs = logsData.slice(-10).reverse();
		const labels = last10Logs.map((log) =>
			new Date(log.timestamp).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})
		);
		const data = last10Logs.map((log) => Math.max(0, log.weight || 0));

		return { labels, data };
	};

	const processConsumptionPatternData = (usageData) => {
		if (!usageData || usageData.length === 0) return null;

		// Group by day of week
		const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const patternData = new Array(7).fill(0);

		usageData.forEach((day) => {
			const date = new Date(day.date);
			const dayIndex = date.getDay();
			patternData[dayIndex] += day.totalUsed || 0;
		});

		return { labels: dayOfWeek, data: patternData };
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

			{/* Mini Trend Chart */}
			{(() => {
				// Try to get some recent weight data for a mini trend
				const recentWeights = item.recentWeights || [];
				if (recentWeights.length > 1) {
					const miniData = recentWeights
						.slice(-5)
						.map((w) => Math.max(0, w.weight || 0));
					const miniLabels = recentWeights.slice(-5).map((w) =>
						new Date(w.timestamp).toLocaleDateString("en-US", {
							day: "numeric",
						})
					);

					return (
						<View style={styles.miniChartContainer}>
							<Text style={styles.miniChartLabel}>Recent Trend</Text>
							<View style={styles.miniChartPlaceholder}>
								<Ionicons name="trending-up" size={24} color="#6366f1" />
								<Text style={styles.miniChartPlaceholderText}>Trend</Text>
							</View>
						</View>
					);
				}
				return null;
			})()}
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

						{/* Charts Section */}
						<View style={styles.detailSection}>
							<View style={styles.chartHeader}>
								<Text style={styles.sectionTitle}>Usage Charts</Text>
								<View style={styles.chartLegend}>
									<View style={styles.legendItem}>
										<View
											style={[
												styles.legendColor,
												{ backgroundColor: "#6366f1" },
											]}
										/>
										<Text style={styles.legendText}>Daily Usage</Text>
									</View>
									<View style={styles.legendItem}>
										<View
											style={[
												styles.legendColor,
												{ backgroundColor: "#10b981" },
											]}
										/>
										<Text style={styles.legendText}>Stock Level</Text>
									</View>
									<View style={styles.legendItem}>
										<View
											style={[
												styles.legendColor,
												{ backgroundColor: "#f59e0b" },
											]}
										/>
										<Text style={styles.legendText}>Weekly Pattern</Text>
									</View>
								</View>
							</View>
							{analyticsLoading[selectedIngredient.name] ? (
								<View style={styles.chartsLoading}>
									<ActivityIndicator size="large" color="#6366f1" />
									<Text style={styles.loadingText}>Loading charts...</Text>
								</View>
							) : (
								<View style={styles.chartsContainer}>
									{/* Daily Usage Trend Chart */}
									{(() => {
										const usageData = processUsageChartData(
											analyticsData[selectedIngredient.name]?.usage
										);
										if (!usageData) {
											return (
												<View style={styles.chartPlaceholder}>
													<Ionicons
														name="analytics-outline"
														size={32}
														color="#d1d5db"
													/>
													<Text style={styles.chartPlaceholderText}>
														No usage data available
													</Text>
												</View>
											);
										}

										return (
											<View style={styles.chartSection}>
												<Text style={styles.chartTitle}>
													Daily Usage Trend (7 days)
												</Text>
												<ChartKit.LineChart
													data={{
														labels: usageData.labels,
														datasets: [
															{
																data: usageData.data,
																color: (opacity = 1) =>
																	`rgba(99, 102, 241, ${opacity})`,
																strokeWidth: 3,
																fillShadowGradient: "rgba(99, 102, 241, 0.1)",
																fillShadowGradientOpacity: 0.3,
															},
														],
													}}
													width={screenWidth - 64}
													height={180}
													chartConfig={{
														backgroundColor: "#ffffff",
														backgroundGradientFrom: "#ffffff",
														backgroundGradientTo: "#ffffff",
														decimalPlaces: 0,
														color: (opacity = 1) =>
															`rgba(99, 102, 241, ${opacity})`,
														labelColor: (opacity = 1) =>
															`rgba(107, 114, 128, ${opacity})`,
														style: {
															borderRadius: 16,
														},
														propsForDots: {
															r: "6",
															strokeWidth: "2",
															stroke: "#6366f1",
														},
														propsForBackgroundLines: {
															strokeDasharray: "",
															strokeWidth: 1,
															stroke: "rgba(107, 114, 128, 0.1)",
														},
													}}
													bezier
													withInnerLines={true}
													withOuterLines={false}
													withVerticalLines={false}
													withHorizontalLines={true}
													withDots={true}
													withShadow={true}
													decorator={() => (
														<View style={styles.chartDecorator}>
															<Text style={styles.chartDecoratorText}>
																{usageData.data.reduce(
																	(sum, val) => sum + val,
																	0
																)}
																g total
															</Text>
														</View>
													)}
													style={styles.chart}
												/>
											</View>
										);
									})()}

									{/* Stock Level Chart */}
									{(() => {
										const stockData = processStockChartData(
											ingredientLogs[selectedIngredient.name]
										);
										if (!stockData) {
											return (
												<View style={styles.chartPlaceholder}>
													<Ionicons
														name="trending-up-outline"
														size={32}
														color="#d1d5db"
													/>
													<Text style={styles.chartPlaceholderText}>
														No stock data available
													</Text>
												</View>
											);
										}

										return (
											<View style={styles.chartSection}>
												<Text style={styles.chartTitle}>
													Stock Level History
												</Text>
												<ChartKit.LineChart
													data={{
														labels: stockData.labels,
														datasets: [
															{
																data: stockData.data,
																color: (opacity = 1) =>
																	`rgba(16, 185, 129, ${opacity})`,
																strokeWidth: 3,
																fillShadowGradient: "rgba(16, 185, 129, 0.3)",
																fillShadowGradientOpacity: 0.3,
															},
														],
													}}
													width={screenWidth - 64}
													height={180}
													chartConfig={{
														backgroundColor: "#ffffff",
														backgroundGradientFrom: "#ffffff",
														backgroundGradientTo: "#ffffff",
														decimalPlaces: 0,
														color: (opacity = 1) =>
															`rgba(16, 185, 129, ${opacity})`,
														labelColor: (opacity = 1) =>
															`rgba(107, 114, 128, ${opacity})`,
														style: {
															borderRadius: 16,
														},
														propsForDots: {
															r: "6",
															strokeWidth: "2",
															stroke: "#10b981",
														},
														propsForBackgroundLines: {
															strokeDasharray: "",
															strokeWidth: 1,
															stroke: "rgba(107, 114, 128, 0.1)",
														},
													}}
													bezier
													withInnerLines={true}
													withOuterLines={false}
													withVerticalLines={false}
													withHorizontalLines={true}
													withDots={true}
													withShadow={true}
													decorator={() => (
														<View style={styles.chartDecorator}>
															<Text style={styles.chartDecoratorText}>
																{Math.max(...stockData.data)}g max
															</Text>
														</View>
													)}
													style={styles.chart}
												/>
											</View>
										);
									})()}

									{/* Consumption Pattern Chart */}
									{(() => {
										const patternData = processConsumptionPatternData(
											analyticsData[selectedIngredient.name]?.usage
										);
										if (!patternData) {
											return (
												<View style={styles.chartPlaceholder}>
													<Ionicons
														name="calendar-outline"
														size={32}
														color="#d1d5db"
													/>
													<Text style={styles.chartPlaceholderText}>
														No pattern data available
													</Text>
												</View>
											);
										}

										return (
											<View style={styles.chartSection}>
												<Text style={styles.chartTitle}>
													Weekly Consumption Pattern
												</Text>
												<ChartKit.BarChart
													data={{
														labels: patternData.labels,
														datasets: [
															{
																data: patternData.data,
																color: (opacity = 1) =>
																	`rgba(245, 158, 11, ${opacity})`,
															},
														],
													}}
													width={screenWidth - 64}
													height={180}
													chartConfig={{
														backgroundColor: "#ffffff",
														backgroundGradientFrom: "#ffffff",
														backgroundGradientTo: "#ffffff",
														decimalPlaces: 0,
														color: (opacity = 1) =>
															`rgba(245, 158, 11, ${opacity})`,
														labelColor: (opacity = 1) =>
															`rgba(107, 114, 128, ${opacity})`,
														style: {
															borderRadius: 16,
														},
														propsForBackgroundLines: {
															strokeDasharray: "",
															strokeWidth: 1,
															stroke: "rgba(107, 114, 128, 0.1)",
														},
													}}
													withInnerLines={true}
													withOuterLines={false}
													withVerticalLines={false}
													withHorizontalLines={true}
													withShadow={true}
													decorator={() => (
														<View style={styles.chartDecorator}>
															<Text style={styles.chartDecoratorText}>
																{Math.max(...patternData.data)}g peak
															</Text>
														</View>
													)}
													style={styles.chart}
													fromZero
												/>
											</View>
										);
									})()}
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
		<SafeAreaView style={styles.container}>
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
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
	text: { color: "#6b7280" },
	header: {
		marginBottom: 16,
	},

	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginTop: 4,
	},
	searchSection: {
		marginBottom: 16,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f0f2f5",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 0,
		fontSize: 16,
		color: "#333",
	},
	filterButtons: {
		flexDirection: "row",
		justifyContent: "space-around",
		backgroundColor: "#f0f2f5",
		borderRadius: 10,
		paddingVertical: 8,
		marginTop: 8,
	},
	filterButton: {
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 20,
	},
	filterButtonActive: {
		backgroundColor: "#e0e7ff",
		borderWidth: 1,
		borderColor: "#6366f1",
	},
	filterButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6b7280",
	},
	filterButtonTextActive: {
		color: "#6366f1",
	},
	ingredientCard: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 3,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	ingredientInfo: {
		flex: 1,
	},
	ingredientName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	deviceInfo: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 2,
	},
	statusSection: {
		alignItems: "flex-end",
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#fff",
	},
	weightRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	weightSection: {
		alignItems: "center",
	},
	weightValue: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
	},
	weightLabel: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 4,
	},
	statsSection: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	statItem: {
		alignItems: "center",
	},
	statLabel: {
		fontSize: 12,
		color: "#6b7280",
		marginTop: 4,
	},
	statValue: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
	},
	lastUpdated: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 12,
	},
	lastUpdatedText: {
		fontSize: 12,
		color: "#6b7280",
		marginLeft: 4,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 16,
		color: "#666",
		marginTop: 8,
		textAlign: "center",
		paddingHorizontal: 20,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "#f9fafb",
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#f0f2f5",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	closeButton: {
		padding: 8,
	},
	modalTitle: {
		flex: 1,
		textAlign: "center",
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
	},
	headerSpacer: {
		width: 40,
	},
	modalContent: {
		flex: 1,
		padding: 16,
	},
	detailSection: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 3,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginBottom: 12,
	},
	statusGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-around",
	},
	statusItem: {
		alignItems: "center",
		marginVertical: 8,
		width: "45%", // Adjust as needed for two columns
	},
	statusLabel: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 4,
	},
	statusValue: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
	},
	statusIndicator: {
		marginTop: 8,
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 10,
	},
	statusIndicatorText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#fff",
	},
	analyticsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: 12,
	},
	analyticsItem: {
		alignItems: "center",
		width: "45%", // Adjust as needed for two columns
	},
	analyticsLabel: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 8,
	},
	analyticsValue: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
	},
	analyticsLoading: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 20,
	},
	loadingText: {
		marginLeft: 10,
		fontSize: 16,
		color: "#6366f1",
	},
	activityList: {
		marginTop: 12,
	},
	activityItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: "#f0f2f5",
		borderRadius: 10,
		marginBottom: 8,
	},
	activityIcon: {
		marginRight: 12,
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	activityTime: {
		fontSize: 12,
		color: "#6b7280",
		marginTop: 2,
	},
	activityStatus: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: "#e0e7ff",
	},
	activityStatusText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6366f1",
	},
	moreActivity: {
		alignItems: "center",
		marginTop: 12,
	},
	moreActivityText: {
		fontSize: 14,
		color: "#6366f1",
	},
	activityPlaceholder: {
		alignItems: "center",
		paddingVertical: 40,
	},
	placeholderText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
	},
	placeholderSubtext: {
		fontSize: 14,
		color: "#666",
		marginTop: 8,
		textAlign: "center",
		paddingHorizontal: 20,
	},
	// Chart styles
	chartsContainer: {
		marginTop: 12,
	},
	chartSection: {
		marginBottom: 24,
		alignItems: "center",
	},
	chartTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 12,
		textAlign: "center",
	},
	chart: {
		marginVertical: 8,
		borderRadius: 16,
	},
	chartDecorator: {
		position: "absolute",
		top: 10,
		right: 10,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "rgba(107, 114, 128, 0.2)",
	},
	chartDecoratorText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#374151",
	},
	chartHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
		flexWrap: "wrap",
	},
	chartLegend: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	legendColor: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	legendText: {
		fontSize: 12,
		color: "#6b7280",
		fontWeight: "500",
	},
	chartPlaceholder: {
		alignItems: "center",
		paddingVertical: 40,
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		marginVertical: 8,
	},
	chartPlaceholderText: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 8,
		textAlign: "center",
	},

	chartsLoading: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 40,
	},
	// Mini chart styles
	miniChartContainer: {
		alignItems: "center",
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#f0f2f5",
	},
	miniChartLabel: {
		fontSize: 12,
		color: "#6b7280",
		marginBottom: 8,
	},
	miniChart: {
		borderRadius: 8,
	},
	miniChartPlaceholder: {
		alignItems: "center",
		justifyContent: "center",
		width: 120,
		height: 60,
		backgroundColor: "#f0f2f5",
		borderRadius: 8,
	},
	miniChartPlaceholderText: {
		fontSize: 12,
		color: "#6366f1",
		marginTop: 4,
		fontWeight: "600",
	},
});
