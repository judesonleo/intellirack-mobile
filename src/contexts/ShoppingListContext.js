import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ShoppingListContext = createContext({
	shoppingList: [],
	addToShoppingList: async () => {},
	removeFromShoppingList: async () => {},
	updateShoppingListItem: async () => {},
	clearShoppingList: async () => {},
	loading: false,
});

export function ShoppingListProvider({ children }) {
	const [shoppingList, setShoppingList] = useState([]);
	const [loading, setLoading] = useState(true);

	// Load shopping list from AsyncStorage on mount
	useEffect(() => {
		loadShoppingList();
	}, []);

	// Clean up corrupted items after loading
	useEffect(() => {
		if (shoppingList.length > 0 && !loading) {
			cleanupCorruptedItems();
		}
	}, [shoppingList, loading]);

	const loadShoppingList = async () => {
		try {
			setLoading(true);
			const stored = await AsyncStorage.getItem("shoppingList");
			if (stored) {
				setShoppingList(JSON.parse(stored));
			}
		} catch (error) {
			console.error("Failed to load shopping list:", error);
		} finally {
			setLoading(false);
		}
	};

	const saveShoppingList = async (newList) => {
		try {
			await AsyncStorage.setItem("shoppingList", JSON.stringify(newList));
		} catch (error) {
			console.error("Failed to save shopping list:", error);
		}
	};

	// Helper function to sanitize item names
	const sanitizeItemName = (name) => {
		if (!name || typeof name !== "string") return "Unknown Item";

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

		return sanitized.length > 0 ? sanitized : "Unknown Item";
	};

	const addToShoppingList = async (item) => {
		try {
			// Validate and sanitize the item data
			const sanitizedName = sanitizeItemName(item.name);

			// Don't add items with completely corrupted names
			if (sanitizedName === "Unknown Item") {
				console.warn("Skipping item with corrupted name:", item.name);
				throw new Error(
					"Item name is corrupted and cannot be added to shopping list"
				);
			}

			const newItem = {
				id: Date.now().toString(),
				name: sanitizedName, // Use sanitized name
				quantity: item.quantity || "1",
				notes: item.notes || "",
				addedAt: new Date().toISOString(),
				completed: false,
				priority: item.priority || "medium",
			};

			const newList = [...shoppingList, newItem];
			setShoppingList(newList);
			await saveShoppingList(newList);
			return newItem;
		} catch (error) {
			console.error("Failed to add item to shopping list:", error);
			throw error;
		}
	};

	const removeFromShoppingList = async (itemId) => {
		try {
			const newList = shoppingList.filter((item) => item.id !== itemId);
			setShoppingList(newList);
			await saveShoppingList(newList);
		} catch (error) {
			console.error("Failed to remove item from shopping list:", error);
			throw error;
		}
	};

	const updateShoppingListItem = async (itemId, updates) => {
		try {
			const newList = shoppingList.map((item) =>
				item.id === itemId ? { ...item, ...updates } : item
			);
			setShoppingList(newList);
			await saveShoppingList(newList);
		} catch (error) {
			console.error("Failed to update shopping list item:", error);
			throw error;
		}
	};

	const clearShoppingList = async () => {
		try {
			setShoppingList([]);
			await AsyncStorage.removeItem("shoppingList");
		} catch (error) {
			console.error("Failed to clear shopping list:", error);
			throw error;
		}
	};

	const toggleItemComplete = async (itemId) => {
		try {
			const newList = shoppingList.map((item) =>
				item.id === itemId ? { ...item, completed: !item.completed } : item
			);
			setShoppingList(newList);
			await saveShoppingList(newList);
		} catch (error) {
			console.error("Failed to toggle item completion:", error);
			throw error;
		}
	};

	// Clean up corrupted items from existing shopping list
	const cleanupCorruptedItems = async () => {
		try {
			const corruptedItems = shoppingList.filter((item) => {
				const sanitizedName = sanitizeItemName(item.name);
				return sanitizedName === "Unknown Item";
			});

			if (corruptedItems.length > 0) {
				console.log("Cleaning up corrupted items:", corruptedItems);
				const cleanList = shoppingList.filter((item) => {
					const sanitizedName = sanitizeItemName(item.name);
					return sanitizedName !== "Unknown Item";
				});
				setShoppingList(cleanList);
				await saveShoppingList(cleanList);
			}
		} catch (error) {
			console.error("Failed to cleanup corrupted items:", error);
		}
	};

	const value = {
		shoppingList,
		addToShoppingList,
		removeFromShoppingList,
		updateShoppingListItem,
		clearShoppingList,
		toggleItemComplete,
		cleanupCorruptedItems,
		loading,
	};

	return (
		<ShoppingListContext.Provider value={value}>
			{children}
		</ShoppingListContext.Provider>
	);
}

export function useShoppingList() {
	return useContext(ShoppingListContext);
}
