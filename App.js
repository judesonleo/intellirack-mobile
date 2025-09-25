import { StatusBar } from "expo-status-bar";
import {
	StyleSheet,
	Text,
	View,
	ActivityIndicator,
	TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { SocketProvider } from "./src/contexts/SocketContext";
import { ShoppingListProvider } from "./src/contexts/ShoppingListContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LandingScreen from "./src/screens/LandingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import DevicesScreen from "./src/screens/DevicesScreen";
import IngredientsScreen from "./src/screens/IngredientsScreen";
import AlertsScreen from "./src/screens/AlertsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ShoppingListScreen from "./src/screens/ShoppingListScreen";
import ModernTabBar from "./src/navigation/ModernTabBar";
import CommandCenter from "./src/components/CommandCenterModal";
import { Ionicons } from "@expo/vector-icons";
import { SERVER_URL } from "./src/config";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HealthGate({ children }) {
	const [health, setHealth] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkHealth();
	}, []);

	async function checkHealth() {
		setLoading(true);
		try {
			console.log(
				"🔍 HealthGate - checking server health at:",
				`${SERVER_URL}/health`
			);
			const res = await fetch(`${SERVER_URL}/health`, {
				timeout: 10000, // 10 second timeout
			});
			console.log("🔍 HealthGate - server response:", res.ok, res.status);
			setHealth(res.ok);
		} catch (e) {
			console.log("❌ HealthGate - server connection failed:", e.message);
			setHealth(false);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#6366f1" />
				<Text style={styles.loadingText}>Checking connection...</Text>
			</View>
		);
	}

	if (!health) {
		return (
			<View style={styles.center}>
				<Ionicons name="cloud-offline" size={64} color="#ef4444" />
				<Text style={styles.errorTitle}>Connection Failed</Text>
				<Text style={styles.errorText}>
					Unable to connect to IntelliRack backend.
				</Text>
				<TouchableOpacity style={styles.retryButton} onPress={checkHealth}>
					<Text style={styles.retryText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return children;
}

function AuthGate({ children }) {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#6366f1" />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	if (!user) {
		return <AuthStack />;
	}

	return children;
}

function AuthStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="Landing" component={LandingScreen} />
			<Stack.Screen name="Login" component={LoginScreen} />
			<Stack.Screen name="Register" component={RegisterScreen} />
		</Stack.Navigator>
	);
}

function HomeTabs() {
	const [ccVisible, setCcVisible] = useState(false);
	const navigation = useNavigation();
	return (
		<>
			<Tab.Navigator
				tabBar={(props) => <ModernTabBar {...props} />}
				screenOptions={{ headerShown: false }}
			>
				<Tab.Screen
					name="Dashboard"
					component={DashboardScreen}
					options={{ tabBarLabel: "Dashboard" }}
				/>
				<Tab.Screen
					name="Devices"
					component={DevicesScreen}
					options={{ tabBarLabel: "Devices" }}
				/>
				<Tab.Screen
					name="Ingredients"
					component={IngredientsScreen}
					options={{ tabBarLabel: "Ingredients" }}
				/>
			</Tab.Navigator>
			<CommandCenter
				onOpenAlerts={() => {
					navigation.navigate("Alerts");
				}}
				onOpenShoppingList={() => {
					navigation.navigate("ShoppingList");
				}}
				onOpenSettings={() => {
					navigation.navigate("Settings");
				}}
			/>
		</>
	);
}

function MainStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="HomeTabs" component={HomeTabs} />
			<Stack.Screen name="Alerts" component={AlertsScreen} />
			<Stack.Screen name="Settings" component={SettingsScreen} />
			<Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
		</Stack.Navigator>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<AuthProvider>
				<HealthGate>
					<ShoppingListProvider>
						<SocketProvider>
							<NavigationContainer>
								<AuthGate>
									<MainStack />
								</AuthGate>
							</NavigationContainer>
						</SocketProvider>
					</ShoppingListProvider>
				</HealthGate>
			</AuthProvider>
			<StatusBar style="auto" />
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#f9fafb",
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: "#6b7280",
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "#1f2937",
		marginTop: 16,
		marginBottom: 8,
	},
	errorText: {
		fontSize: 16,
		color: "#6b7280",
		textAlign: "center",
		marginBottom: 24,
		lineHeight: 24,
	},
	retryButton: {
		backgroundColor: "#6366f1",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 12,
	},
	retryText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
