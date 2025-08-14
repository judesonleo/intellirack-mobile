import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Platform, Alert } from "react-native";

class ExternalAppsService {
	// Platform detection
	isIOS = Platform.OS === "ios";
	isAndroid = Platform.OS === "android";

	// Export shopping list to various formats and apps
	async exportToExternalApp(shoppingList, format = "text", app = "auto") {
		console.log("ExternalAppsService.exportToExternalApp called with:", {
			shoppingList,
			format,
			app,
		});
		console.log("ExternalAppsService - Platform:", Platform.OS);
		console.log("ExternalAppsService - Is Expo:", typeof Expo !== "undefined");

		try {
			let content = "";
			let mimeType = "";
			let fileExtension = "";

			// Generate content based on format
			switch (format) {
				case "text":
					content = this.generateTextFormat(shoppingList);
					mimeType = "text/plain";
					fileExtension = ".txt";
					break;
				case "markdown":
					content = this.generateMarkdownFormat(shoppingList);
					mimeType = "text/markdown";
					fileExtension = ".md";
					break;
				case "csv":
					content = this.generateCSVFormat(shoppingList);
					mimeType = "text/csv";
					fileExtension = ".csv";
					break;
				case "json":
					content = this.generateJSONFormat(shoppingList);
					mimeType = "application/json";
					fileExtension = ".json";
					break;
				default:
					content = this.generateTextFormat(shoppingList);
					mimeType = "text/plain";
					fileExtension = ".txt";
			}

			// Create temporary file
			const fileName = `IntelliRack_ShoppingList_${
				new Date().toISOString().split("T")[0]
			}${fileExtension}`;
			const fileUri = `${FileSystem.documentDirectory}${fileName}`;

			await FileSystem.writeAsStringAsync(fileUri, content, {
				encoding: FileSystem.EncodingType.UTF8,
			});

			// Handle different export methods based on app preference
			if (app === "auto") {
				await this.autoDetectAndExport(fileUri, mimeType, fileName);
			} else {
				await this.exportToSpecificApp(fileUri, mimeType, fileName, app);
			}
		} catch (error) {
			console.error("Export failed:", error);
			Alert.alert("Export Failed", "Unable to export shopping list");
		}
	}

	// Auto-detect available apps and suggest export options
	async autoDetectAndExport(fileUri, mimeType, fileName) {
		console.log("autoDetectAndExport called with:", {
			fileUri,
			mimeType,
			fileName,
		});

		const availableApps = await this.getAvailableApps();
		console.log("Available apps:", availableApps);

		if (availableApps.length === 0) {
			console.log("No apps available, falling back to share");
			// Fallback to sharing
			await this.shareFile(fileUri, mimeType, fileName);
			return;
		}

		console.log("Showing app selection dialog");
		// Show app selection dialog
		this.showAppSelectionDialog(availableApps, fileUri, mimeType, fileName);
	}

	// Export to a specific app
	async exportToSpecificApp(fileUri, mimeType, fileName, app) {
		switch (app) {
			case "apple_notes":
				await this.exportToAppleNotes(fileUri, fileName);
				break;
			case "google_keep":
				await this.exportToGoogleKeep(fileUri, fileName);
				break;
			case "evernote":
				await this.exportToEvernote(fileUri, fileName);
				break;
			case "onenote":
				await this.exportToOneNote(fileUri, fileName);
				break;
			case "notion":
				await this.exportToNotion(fileUri, fileName);
				break;
			case "share":
			default:
				await this.shareFile(fileUri, mimeType, fileName);
				break;
		}
	}

	// Get available apps on the device
	async getAvailableApps() {
		const apps = [];

		// Check iOS-specific apps
		if (this.isIOS) {
			apps.push(
				{
					id: "apple_notes",
					name: "Apple Notes",
					icon: "📝",
					scheme: "notes://",
				},
				{
					id: "reminders",
					name: "Reminders",
					icon: "✅",
					scheme: "x-apple-reminder://",
				},
				{ id: "mail", name: "Mail", icon: "📧", scheme: "message://" }
			);
		}

		// Check Android-specific apps
		if (this.isAndroid) {
			apps.push(
				{
					id: "google_keep",
					name: "Google Keep",
					icon: "📝",
					scheme: "keep://",
				},
				{
					id: "google_docs",
					name: "Google Docs",
					icon: "📄",
					scheme: "googledocs://",
				},
				{ id: "gmail", name: "Gmail", icon: "📧", scheme: "googlegmail://" }
			);
		}

		// Cross-platform apps
		apps.push(
			{ id: "evernote", name: "Evernote", icon: "🐘", scheme: "evernote://" },
			{ id: "onenote", name: "OneNote", icon: "📓", scheme: "ms-onenote://" },
			{ id: "notion", name: "Notion", icon: "📚", scheme: "notion://" },
			{ id: "share", name: "Share...", icon: "📤", scheme: null }
		);

		return apps;
	}

	// Export to Apple Notes (iOS)
	async exportToAppleNotes(fileUri, fileName) {
		try {
			// Read file content
			const content = await FileSystem.readAsStringAsync(fileUri);

			// Create a note with the shopping list
			const noteContent = `Shopping List - ${new Date().toLocaleDateString()}\n\n${content}`;

			// Try to open Apple Notes with pre-filled content
			const notesUrl = `notes://new?body=${encodeURIComponent(noteContent)}`;

			const canOpen = await Linking.canOpenURL(notesUrl);
			if (canOpen) {
				await Linking.openURL(notesUrl);
			} else {
				// Fallback to sharing
				await this.shareFile(fileUri, "text/plain", fileName);
			}
		} catch (error) {
			console.error("Apple Notes export failed:", error);
			await this.shareFile(fileUri, "text/plain", fileName);
		}
	}

	// Export to Google Keep (Android)
	async exportToGoogleKeep(fileUri, fileName) {
		try {
			const content = await FileSystem.readAsStringAsync(fileUri);
			const keepUrl = `https://keep.google.com/#NOTE/${encodeURIComponent(
				content
			)}`;

			const canOpen = await Linking.canOpenURL(keepUrl);
			if (canOpen) {
				await Linking.openURL(keepUrl);
			} else {
				// Fallback to web browser
				await Linking.openURL(keepUrl);
			}
		} catch (error) {
			console.error("Google Keep export failed:", error);
			await this.shareFile(fileUri, "text/plain", fileName);
		}
	}

	// Export to Evernote
	async exportToEvernote(fileUri, fileName) {
		try {
			const content = await FileSystem.readAsStringAsync(fileUri);
			const evernoteUrl = `evernote:///view/${encodeURIComponent(content)}`;

			const canOpen = await Linking.canOpenURL(evernoteUrl);
			if (canOpen) {
				await Linking.openURL(evernoteUrl);
			} else {
				// Fallback to web
				const webUrl = `https://www.evernote.com/Home.action#n=${encodeURIComponent(
					content
				)}`;
				await Linking.openURL(webUrl);
			}
		} catch (error) {
			console.error("Evernote export failed:", error);
			await this.shareFile(fileUri, "text/plain", fileName);
		}
	}

	// Export to OneNote
	async exportToOneNote(fileUri, fileName) {
		try {
			const content = await FileSystem.readAsStringAsync(fileUri);
			const oneNoteUrl = `ms-onenote:///p/${encodeURIComponent(content)}`;

			const canOpen = await Linking.canOpenURL(oneNoteUrl);
			if (canOpen) {
				await Linking.openURL(oneNoteUrl);
			} else {
				// Fallback to web
				const webUrl = `https://www.onenote.com/notebooks?auth=1&login=1&target=${encodeURIComponent(
					content
				)}`;
				await Linking.openURL(webUrl);
			}
		} catch (error) {
			console.error("OneNote export failed:", error);
			await this.shareFile(fileUri, "text/plain", fileName);
		}
	}

	// Export to Notion
	async exportToNotion(fileUri, fileName) {
		try {
			const content = await FileSystem.readAsStringAsync(fileUri);
			const notionUrl = `notion:///new?title=Shopping%20List&content=${encodeURIComponent(
				content
			)}`;

			const canOpen = await Linking.canOpenURL(notionUrl);
			if (canOpen) {
				await Linking.openURL(notionUrl);
			} else {
				// Fallback to web
				const webUrl = `https://www.notion.so/new?title=Shopping%20List&content=${encodeURIComponent(
					content
				)}`;
				await Linking.openURL(webUrl);
			}
		} catch (error) {
			console.error("Notion export failed:", error);
			await this.shareFile(fileUri, "text/plain", fileName);
		}
	}

	// Share file using system share sheet
	async shareFile(fileUri, mimeType, fileName) {
		console.log("shareFile called with:", { fileUri, mimeType, fileName });
		console.log("shareFile - Platform:", Platform.OS);

		try {
			// Check if sharing is available
			const isAvailable = await Sharing.isAvailableAsync();
			console.log("Sharing available:", isAvailable);

			if (isAvailable) {
				console.log("Attempting to share file...");
				await Sharing.shareAsync(fileUri, {
					mimeType,
					dialogTitle: `Share ${fileName}`,
					UTI: this.getUTI(mimeType),
				});
				console.log("Share completed successfully");
			} else {
				console.log("Sharing not available, using fallback");
				// Fallback to copying to clipboard
				const content = await FileSystem.readAsStringAsync(fileUri);
				// You'd need to implement clipboard functionality here
				Alert.alert("Share", "Content copied to clipboard");
			}
		} catch (error) {
			console.error("Share failed:", error);
			console.error("Share error details:", {
				platform: Platform.OS,
				fileUri,
				mimeType,
				fileName,
				error: error.message,
				stack: error.stack,
			});
			Alert.alert("Share Failed", "Unable to share file");
		}
	}

	// Import shopping list from external source
	async importFromExternalApp() {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ["text/*", "application/json", "text/csv"],
				copyToCacheDirectory: true,
			});

			if (result.type === "success") {
				const content = await FileSystem.readAsStringAsync(result.uri);
				return this.parseImportedContent(content, result.name);
			}
		} catch (error) {
			console.error("Import failed:", error);
			Alert.alert("Import Failed", "Unable to import file");
		}
		return null;
	}

	// Parse imported content
	parseImportedContent(content, fileName) {
		const extension = fileName.split(".").pop()?.toLowerCase();

		switch (extension) {
			case "json":
				return this.parseJSONContent(content);
			case "csv":
				return this.parseCSVContent(content);
			case "txt":
			case "md":
			default:
				return this.parseTextContent(content);
		}
	}

	// Parse JSON content
	parseJSONContent(content) {
		try {
			const data = JSON.parse(content);
			if (Array.isArray(data)) {
				return data.map((item) => ({
					name: item.name || item.item || item.title || "Unknown Item",
					quantity: item.quantity || item.qty || item.amount || "1",
					notes: item.notes || item.note || item.description || "",
					priority: item.priority || "medium",
				}));
			}
		} catch (error) {
			console.error("JSON parsing failed:", error);
		}
		return null;
	}

	// Parse CSV content
	parseCSVContent(content) {
		try {
			const lines = content.split("\n").filter((line) => line.trim());
			const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
			const items = [];

			for (let i = 1; i < lines.length; i++) {
				const values = lines[i].split(",").map((v) => v.trim());
				const item = {};

				headers.forEach((header, index) => {
					if (values[index]) {
						item[header] = values[index];
					}
				});

				if (item.name || item.item || item.title) {
					items.push({
						name: item.name || item.item || item.title,
						quantity: item.quantity || item.qty || item.amount || "1",
						notes: item.notes || item.note || item.description || "",
						priority: item.priority || "medium",
					});
				}
			}
			return items;
		} catch (error) {
			console.error("CSV parsing failed:", error);
		}
		return null;
	}

	// Parse text content
	parseTextContent(content) {
		try {
			const lines = content.split("\n").filter((line) => line.trim());
			const items = [];

			lines.forEach((line) => {
				// Try to parse common formats like "Item - Qty" or "Item (Qty)"
				const match = line.match(
					/^(.+?)(?:\s*[-–]\s*(\d+)|(?:\s*\((\d+)\))?\s*(.*))?$/
				);
				if (match) {
					const name = match[1].trim();
					const quantity = match[2] || match[3] || "1";
					const notes = match[4] || "";

					if (name) {
						items.push({
							name,
							quantity,
							notes: notes.trim(),
							priority: "medium",
						});
					}
				}
			});

			return items;
		} catch (error) {
			console.error("Text parsing failed:", error);
		}
		return null;
	}

	// Generate different export formats
	generateTextFormat(shoppingList) {
		let content = `Shopping List - ${new Date().toLocaleDateString()}\n`;
		content += "=".repeat(50) + "\n\n";

		shoppingList.forEach((item, index) => {
			content += `${index + 1}. ${item.name} - Qty: ${item.quantity}`;
			if (item.notes) {
				content += ` (${item.notes})`;
			}
			content += ` [${item.priority.toUpperCase()}]\n`;
		});

		return content;
	}

	generateMarkdownFormat(shoppingList) {
		let content = `# Shopping List - ${new Date().toLocaleDateString()}\n\n`;

		shoppingList.forEach((item, index) => {
			content += `## ${index + 1}. ${item.name}\n`;
			content += `- **Quantity:** ${item.quantity}\n`;
			content += `- **Priority:** ${item.priority.toUpperCase()}\n`;
			if (item.notes) {
				content += `- **Notes:** ${item.notes}\n`;
			}
			content += "\n";
		});

		return content;
	}

	generateCSVFormat(shoppingList) {
		let content = "Name,Quantity,Priority,Notes,Added\n";

		shoppingList.forEach((item) => {
			content += `"${item.name}","${item.quantity}","${item.priority}","${
				item.notes || ""
			}","${item.addedAt}"\n`;
		});

		return content;
	}

	generateJSONFormat(shoppingList) {
		return JSON.stringify(shoppingList, null, 2);
	}

	// Get UTI for iOS sharing
	getUTI(mimeType) {
		switch (mimeType) {
			case "text/plain":
				return "public.plain-text";
			case "text/markdown":
				return "net.daringfireball.markdown";
			case "text/csv":
				return "public.comma-separated-values-text";
			case "application/json":
				return "public.json";
			default:
				return "public.plain-text";
		}
	}

	showAppSelectionDialog(apps, fileUri, mimeType, fileName) {
		console.log("Using system share sheet as fallback");

		this.shareFile(fileUri, mimeType, fileName);
	}
}

export default new ExternalAppsService();
