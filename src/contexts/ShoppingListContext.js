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

	const addToShoppingList = async (item) => {
		try {
			const newItem = {
				id: Date.now().toString(),
				name: item.name,
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

	const value = {
		shoppingList,
		addToShoppingList,
		removeFromShoppingList,
		updateShoppingListItem,
		clearShoppingList,
		toggleItemComplete,
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
