import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
	Alert,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ExternalAppsService from "../services/externalApps";

export default function ExportShoppingListModal({
	visible,
	onClose,
	shoppingList,
}) {
	const [selectedFormat, setSelectedFormat] = useState("text");
	const [selectedApp, setSelectedApp] = useState("auto");
	const [exporting, setExporting] = useState(false);
	const [exportSuccess, setExportSuccess] = useState(false);

	// Helper function to sanitize corrupted item names
	const sanitizeItemName = (name) => {
		if (!name || typeof name !== "string") return null;

		// Remove or replace corrupted characters
		let sanitized = name
			.replace(/[^\x20-\x7E]/g, "") // Remove non-printable ASCII characters
			.replace(/[^\w\s\-\.]/g, "") // Remove special characters except spaces, hyphens, dots
			.trim();

		// If name is too short or corrupted, try to extract meaningful parts
		if (sanitized.length < 2) {
			// Try to find any readable text in the original name
			const readable = name.match(/[a-zA-Z0-9\s]+/g);
			if (readable && readable.length > 0) {
				sanitized = readable.join(" ").trim();
			}
		}

		return sanitized.length > 0 ? sanitized : null;
	};

	// Debug logging
	useEffect(() => {
		console.log("ExportShoppingListModal - Platform:", Platform.OS);
		console.log("ExportShoppingListModal - shoppingList:", shoppingList);
		console.log(
			"ExportShoppingListModal - shoppingList length:",
			shoppingList?.length
		);
		console.log(
			"ExportShoppingListModal - shoppingList type:",
			typeof shoppingList
		);
		console.log(
			"ExportShoppingListModal - Is Array:",
			Array.isArray(shoppingList)
		);

		if (shoppingList && shoppingList.length > 0) {
			console.log("ExportShoppingListModal - First item:", shoppingList[0]);
			console.log(
				"ExportShoppingListModal - Item properties:",
				Object.keys(shoppingList[0])
			);
		}
	}, [shoppingList]);

	// Reset state when modal opens
	useEffect(() => {
		if (visible) {
			setExporting(false);
			setExportSuccess(false);
		}
	}, [visible]);

	const formats = [
		{
			id: "text",
			name: "Plain Text",
			icon: "📄",
			description: "Simple text format - Best for most apps",
			recommended: true,
		},
		{
			id: "markdown",
			name: "Markdown",
			icon: "📝",
			description: "Rich text with formatting",
			recommended: false,
		},
		{
			id: "csv",
			name: "CSV",
			icon: "📊",
			description: "Spreadsheet compatible",
			recommended: false,
		},
		{
			id: "json",
			name: "JSON",
			icon: "🔧",
			description: "Developer friendly",
			recommended: false,
		},
	];

	const apps = [
		{
			id: "auto",
			name: "Auto-detect",
			icon: "🔍",
			description: "Choose best available app",
		},
		{
			id: "apple_notes",
			name: "Apple Notes",
			icon: "📝",
			description: "iOS Notes app",
			platform: "ios",
		},
		{
			id: "google_keep",
			name: "Google Keep",
			icon: "📝",
			description: "Google Keep app",
			platform: "android",
		},
		{
			id: "evernote",
			name: "Evernote",
			icon: "🐘",
			description: "Cross-platform notes",
		},
		{
			id: "onenote",
			name: "OneNote",
			icon: "📓",
			description: "Microsoft OneNote",
		},
		{
			id: "notion",
			name: "Notion",
			icon: "📚",
			description: "All-in-one workspace",
		},
		{
			id: "share",
			name: "Share...",
			icon: "📤",
			description: "System share sheet",
		},
	];

	const handleExport = async () => {
		console.log("Export button clicked, shoppingList:", shoppingList);

		if (shoppingList.length === 0) {
			Alert.alert(
				"Empty Shopping List",
				"Your shopping list is empty. Add some items from restock alerts or manually create items first.",
				[
					{ text: "OK", style: "default" },
					{
						text: "Go to Shopping List",
						style: "default",
						onPress: () => {
							onClose();
							// You could navigate to shopping list here if needed
						},
					},
				]
			);
			return;
		}

		try {
			setExporting(true);
			setExportSuccess(false); // Reset success state

			console.log("Starting export with:", {
				shoppingList,
				selectedFormat,
				selectedApp,
			});

			await ExternalAppsService.exportToExternalApp(
				shoppingList,
				selectedFormat,
				selectedApp
			);

			console.log("Export completed successfully");
			setExportSuccess(true);
		} catch (error) {
			console.error("Export failed:", error);
			Alert.alert(
				"Export Failed",
				"Unable to export shopping list. Please try again."
			);
		} finally {
			setExporting(false);
		}
	};

	const handleImport = async () => {
		try {
			const importedItems = await ExternalAppsService.importFromExternalApp();
			if (importedItems && importedItems.length > 0) {
				Alert.alert(
					"Import Successful",
					`Imported ${importedItems.length} items from external source`,
					[
						{ text: "Cancel", style: "cancel" },
						{
							text: "View Items",
							onPress: () => {
								console.log("Imported items:", importedItems);
								// You could navigate to a preview screen here
							},
						},
					]
				);
			}
		} catch (error) {
			console.error("Import failed:", error);
		}
	};

	const isAppAvailable = (app) => {
		if (app.platform === "ios" && !ExternalAppsService.isIOS) return false;
		if (app.platform === "android" && !ExternalAppsService.isAndroid)
			return false;
		return true;
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.modal}>
					{/* Header */}
					<View style={styles.header}>
						<View>
							<Text style={styles.title}>Export Shopping List</Text>
							<Text style={styles.subtitle}>
								{shoppingList.length === 0
									? "No items to export"
									: `${shoppingList.length} item${
											shoppingList.length === 1 ? "" : "s"
									  } ready to export`}
							</Text>
							{shoppingList.length > 0 && (
								<Text style={styles.headerNote}>
									📤 Will open system share sheet for app selection
								</Text>
							)}
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color="#6b7280" />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.content}
						showsVerticalScrollIndicator={false}
					>
						{/* Data Debug - Remove in production */}
						<View style={styles.debugInfo}>
							<Text style={styles.debugText}>
								🔍 Debug Info: Modal received shoppingList
							</Text>
							<Text style={styles.debugText}>
								Platform: {Platform.OS} (Expo)
							</Text>
							<Text style={styles.debugText}>
								Length: {shoppingList?.length || 0}
							</Text>
							<Text style={styles.debugText}>
								Type:{" "}
								{Array.isArray(shoppingList) ? "Array" : typeof shoppingList}
							</Text>
							{shoppingList && shoppingList.length > 0 && (
								<Text style={styles.debugText}>
									First item keys: {Object.keys(shoppingList[0]).join(", ")}
								</Text>
							)}
						</View>

						{/* Empty List Warning */}
						{shoppingList.length === 0 && (
							<View style={styles.emptyWarning}>
								<Ionicons name="warning-outline" size={24} color="#f59e0b" />
								<Text style={styles.emptyWarningTitle}>
									Shopping List is Empty
								</Text>
								<Text style={styles.emptyWarningText}>
									Add items from restock alerts or manually create items before
									exporting.
								</Text>
								<View style={styles.emptyWarningTips}>
									<Text style={styles.emptyWarningTipText}>
										💡 <Text style={styles.emptyWarningTipBold}>Tip:</Text> Go
										to the Dashboard and click "Add" on restock alerts to add
										items to your shopping list.
									</Text>
								</View>
							</View>
						)}

						{/* Shopping List Preview */}
						{shoppingList.length > 0 && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>
									📋 Items to Export ({shoppingList.length})
								</Text>
								<Text style={styles.sectionDescription}>
									Preview of items that will be exported
								</Text>

								{/* Debug Info - Remove in production */}
								<View style={styles.debugInfo}>
									<Text style={styles.debugText}>
										Debug: shoppingList data structure
									</Text>
									<Text style={styles.debugText}>
										First item: {JSON.stringify(shoppingList[0], null, 2)}
									</Text>
								</View>

								<View style={styles.previewList}>
									{shoppingList.slice(0, 5).map((item, index) => (
										<View key={index} style={styles.previewItem}>
											<Text style={styles.previewItemName}>
												{index + 1}.{" "}
												{sanitizeItemName(item.name) ||
													sanitizeItemName(item.itemName) ||
													sanitizeItemName(item.title) ||
													"Unknown Item"}
											</Text>
											<View style={styles.previewItemMeta}>
												<Text style={styles.previewItemQuantity}>
													Qty: {item.quantity || item.qty || item.amount || "1"}
												</Text>
												<Text style={styles.previewItemPriority}>
													{item.priority || "medium"}
												</Text>
											</View>
											{/* Show raw data for debugging */}
											<Text style={styles.debugItemText}>
												Raw: {JSON.stringify(item)}
											</Text>
										</View>
									))}
									{shoppingList.length > 5 && (
										<Text style={styles.previewMore}>
											... and {shoppingList.length - 5} more items
										</Text>
									)}
								</View>
							</View>
						)}

						{/* Format Selection */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>📄 Export Format</Text>
							<Text style={styles.sectionDescription}>
								Choose how you want to export your shopping list. Text format is
								recommended for most apps.
							</Text>
							<View style={styles.optionsGrid}>
								{formats.map((format) => (
									<TouchableOpacity
										key={format.id}
										style={[
											styles.optionCard,
											selectedFormat === format.id && styles.optionCardSelected,
											format.recommended && styles.optionCardRecommended,
										]}
										onPress={() => setSelectedFormat(format.id)}
									>
										{format.recommended && (
											<View style={styles.recommendedBadge}>
												<Text style={styles.recommendedText}>RECOMMENDED</Text>
											</View>
										)}
										<Text style={styles.optionIcon}>{format.icon}</Text>
										<Text style={styles.optionName}>{format.name}</Text>
										<Text style={styles.optionDescription}>
											{format.description}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* App Selection */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>📱 Export Destination</Text>
							<Text style={styles.sectionDescription}>
								Choose where to send your shopping list. The system will
								automatically select the best available option and show the
								native share sheet.
							</Text>
							<View style={styles.optionsGrid}>
								{apps.filter(isAppAvailable).map((app) => (
									<TouchableOpacity
										key={app.id}
										style={[
											styles.optionCard,
											selectedApp === app.id && styles.optionCardSelected,
										]}
										onPress={() => setSelectedApp(app.id)}
									>
										<Text style={styles.optionIcon}>{app.icon}</Text>
										<Text style={styles.optionName}>{app.name}</Text>
										<Text style={styles.optionDescription}>
											{app.description}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Export Process Info */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>🔄 How Export Works</Text>
							<Text style={styles.sectionDescription}>
								Your shopping list will be exported as a file and shared using
								your device's native sharing system. The system automatically
								detects available apps and shows the share sheet for you to
								choose where to send it.
							</Text>
						</View>

						{/* Import Section */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>
								Import from External Source
							</Text>
							<Text style={styles.sectionDescription}>
								Bring in shopping lists from other apps or files
							</Text>
							<TouchableOpacity
								style={styles.importButton}
								onPress={handleImport}
							>
								<Ionicons name="download-outline" size={20} color="#8A2BE2" />
								<Text style={styles.importButtonText}>
									Import Shopping List
								</Text>
							</TouchableOpacity>
						</View>

						{/* Test Section - Remove this in production */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>🧪 Test Export</Text>
							<Text style={styles.sectionDescription}>
								Test the export functionality with simple data
							</Text>
							<TouchableOpacity
								style={styles.testButton}
								onPress={() => {
									console.log("Test export button clicked");
									// Test with simple data to see if export works
									const testData = [
										{ name: "Test Item 1", quantity: "2", priority: "high" },
										{ name: "Test Item 2", quantity: "1", priority: "medium" },
									];
									console.log("Testing export with:", testData);

									// Try to export test data
									ExternalAppsService.exportToExternalApp(
										testData,
										"text",
										"share"
									)
										.then(() => {
											console.log("Test export successful");
											Alert.alert(
												"Test Export",
												"Test export completed successfully!"
											);
										})
										.catch((error) => {
											console.error("Test export failed:", error);
											Alert.alert(
												"Test Export Failed",
												`Error: ${error.message}`
											);
										});
								}}
							>
								<Ionicons
									name="play-circle-outline"
									size={20}
									color="#10b981"
								/>
								<Text style={styles.testButtonText}>Test Export</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>

					{/* Success Message */}
					{exportSuccess && (
						<View style={styles.successMessage}>
							<Ionicons name="checkmark-circle" size={20} color="#10b981" />
							<Text style={styles.successMessageText}>
								Export completed successfully! Your shopping list has been
								shared. You can now close this modal.
							</Text>
						</View>
					)}

					{/* Action Buttons */}
					<View style={styles.actions}>
						{exportSuccess ? (
							// Show only close button when export is successful
							<TouchableOpacity
								style={styles.successCloseButton}
								onPress={onClose}
							>
								<Text style={styles.successCloseButtonText}>Close</Text>
							</TouchableOpacity>
						) : (
							// Show normal buttons when not exported
							<>
								<TouchableOpacity style={styles.cancelButton} onPress={onClose}>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.exportButton,
										shoppingList.length === 0 && styles.exportButtonDisabled,
									]}
									onPress={handleExport}
									disabled={exporting || shoppingList.length === 0}
								>
									<LinearGradient
										colors={
											exportSuccess
												? ["#10b981", "#059669"]
												: shoppingList.length === 0
												? ["#9ca3af", "#9ca3af"]
												: ["#8A2BE2", "#FF69B4"]
										}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.gradientButton}
									>
										{exporting ? (
											<Text style={styles.exportButtonText}>Exporting...</Text>
										) : exportSuccess ? (
											<Text style={styles.exportButtonText}>✓ Exported!</Text>
										) : shoppingList.length === 0 ? (
											<Text style={styles.exportButtonText}>
												No Items to Export
											</Text>
										) : (
											<Text style={styles.exportButtonText}>Export</Text>
										)}
									</LinearGradient>
								</TouchableOpacity>
							</>
						)}
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
		maxHeight: "90%",
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
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 2,
	},
	headerNote: {
		fontSize: 12,
		color: "#8A2BE2",
		marginTop: 4,
		fontWeight: "500",
	},
	closeButton: {
		padding: 4,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	emptyWarning: {
		backgroundColor: "#fffbeb",
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		borderLeftWidth: 4,
		borderLeftColor: "#f59e0b",
		alignItems: "center",
	},
	emptyWarningTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#92400e",
		marginTop: 8,
		marginBottom: 4,
	},
	emptyWarningText: {
		fontSize: 14,
		color: "#92400e",
		textAlign: "center",
		lineHeight: 20,
	},
	emptyWarningTips: {
		marginTop: 12,
		padding: 12,
		backgroundColor: "rgba(245, 158, 11, 0.1)",
		borderRadius: 8,
	},
	emptyWarningTipText: {
		fontSize: 13,
		color: "#92400e",
		textAlign: "center",
		lineHeight: 18,
	},
	emptyWarningTipBold: {
		fontWeight: "600",
	},
	previewList: {
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		padding: 12,
	},
	previewItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	previewItemName: {
		fontSize: 14,
		fontWeight: "500",
		color: "#1f2937",
		flex: 1,
	},
	previewItemMeta: {
		flexDirection: "row",
		gap: 12,
		alignItems: "center",
	},
	previewItemQuantity: {
		fontSize: 12,
		color: "#6b7280",
	},
	previewItemPriority: {
		fontSize: 12,
		color: "#8A2BE2",
		fontWeight: "500",
		textTransform: "uppercase",
	},
	previewMore: {
		fontSize: 12,
		color: "#6b7280",
		textAlign: "center",
		fontStyle: "italic",
		marginTop: 8,
	},
	debugInfo: {
		backgroundColor: "#fef3c7",
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		borderLeftWidth: 3,
		borderLeftColor: "#f59e0b",
	},
	debugText: {
		fontSize: 11,
		color: "#92400e",
		fontFamily: "monospace",
		marginBottom: 4,
	},
	debugItemText: {
		fontSize: 10,
		color: "#92400e",
		fontFamily: "monospace",
		marginTop: 4,
		backgroundColor: "rgba(245, 158, 11, 0.1)",
		padding: 4,
		borderRadius: 4,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 16,
		lineHeight: 20,
	},
	optionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	optionCard: {
		width: "48%",
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		padding: 16,
		borderWidth: 2,
		borderColor: "transparent",
		alignItems: "center",
	},
	optionCardSelected: {
		borderColor: "#8A2BE2",
		backgroundColor: "#f3e8ff",
	},
	optionCardRecommended: {
		borderColor: "#10b981",
		backgroundColor: "#ecfdf5",
	},
	recommendedBadge: {
		position: "absolute",
		top: -8,
		right: -8,
		backgroundColor: "#10b981",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	recommendedText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
		textAlign: "center",
	},
	optionIcon: {
		fontSize: 24,
		marginBottom: 8,
	},
	optionName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
		textAlign: "center",
	},
	optionDescription: {
		fontSize: 12,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 16,
	},
	importButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#f3e8ff",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#ddd6fe",
		gap: 8,
	},
	importButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#8A2BE2",
	},
	testButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#ecfdf5",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#a7f3d0",
		gap: 8,
	},
	testButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#10b981",
	},
	successMessage: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#ecfdf5",
		paddingVertical: 12,
		paddingHorizontal: 20,
		marginHorizontal: 20,
		marginBottom: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#a7f3d0",
		gap: 8,
	},
	successMessageText: {
		fontSize: 14,
		color: "#065f46",
		fontWeight: "500",
		textAlign: "center",
	},
	successCloseButton: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		backgroundColor: "#10b981",
		alignItems: "center",
	},
	successCloseButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
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
	exportButton: {
		flex: 2,
		borderRadius: 12,
		overflow: "hidden",
	},
	exportButtonDisabled: {
		opacity: 0.5,
	},
	gradientButton: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
	},
	exportButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
});
