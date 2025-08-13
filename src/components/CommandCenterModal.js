import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const { height } = Dimensions.get("window");

export default function CommandCenter({
	onOpenAlerts,
	onOpenSettings,
	onOpenShoppingList,
}) {
	const [visible, setVisible] = useState(false);

	return (
		<>
			<TouchableOpacity
				onPress={() => setVisible(true)}
				activeOpacity={0.8}
				style={styles.trigger}
			>
				<LinearGradient
					colors={["#6366f1", "#a21caf"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.triggerGradient}
				>
					<Ionicons name="menu" size={20} color="#fff" />
				</LinearGradient>
			</TouchableOpacity>

			<Modal
				transparent
				animationType="fade"
				visible={visible}
				onRequestClose={() => setVisible(false)}
			>
				<TouchableOpacity
					style={styles.overlay}
					activeOpacity={1}
					onPress={() => setVisible(false)}
				>
					<View style={styles.dropdown}>
						<BlurView
							intensity={80}
							tint="light"
							style={styles.dropdownContent}
						>
							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenAlerts();
								}}
							>
								<Ionicons name="warning" size={20} color="#ef4444" />
								<Text style={styles.menuText}>Alerts</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenShoppingList();
								}}
							>
								<Ionicons name="cart" size={20} color="#10b981" />
								<Text style={styles.menuText}>Shopping List</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.menuItem}
								onPress={() => {
									setVisible(false);
									onOpenSettings();
								}}
							>
								<Ionicons name="settings" size={20} color="#6366f1" />
								<Text style={styles.menuText}>Settings</Text>
								<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
							</TouchableOpacity>
						</BlurView>
					</View>
				</TouchableOpacity>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	trigger: {
		position: "absolute",
		top: 50,
		right: 20,
		zIndex: 1000,
	},
	triggerGradient: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#6366f1",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.1)",
	},
	dropdown: {
		position: "absolute",
		top: 100,
		right: 20,
		zIndex: 1001,
	},
	dropdownContent: {
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 16,
		elevation: 8,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
		gap: 12,
		minWidth: 190,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	menuText: {
		flex: 1,
		fontSize: 16,
		fontWeight: "600",
		color: "#1f2937",
	},
});
