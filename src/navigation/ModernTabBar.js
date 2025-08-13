import React, { useEffect } from "react";
import {
	View,
	TouchableOpacity,
	Text,
	StyleSheet,
	Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	Easing,
} from "react-native-reanimated";

export default function ModernTabBar({ state, descriptors, navigation }) {
	const insets = useSafeAreaInsets();
	const borderAnimation = useSharedValue(0);

	useEffect(() => {
		borderAnimation.value = withRepeat(
			withTiming(1, {
				duration: 3000,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true
		);
	}, []);

	const animatedBorderStyle = useAnimatedStyle(() => {
		return {
			borderColor: `rgba(99, 102, 241, ${0.3 + borderAnimation.value * 0.2})`,
			borderWidth: 1 + borderAnimation.value * 0.5,
		};
	});

	return (
		<View pointerEvents="box-none" style={[styles.wrapper]}>
			<Animated.View style={[styles.container, animatedBorderStyle]}>
				<BlurView
					intensity={80}
					tint={Platform.OS === "ios" ? "light" : "default"}
					style={[
						styles.bar,
						{
							paddingBottom: Math.min(insets.bottom, 5),
							paddingTop: 5,
							// borderRadius: 40,
						},
					]}
				>
					{state.routes.map((route, index) => {
						const { options } = descriptors[route.key];
						const label =
							options.tabBarLabel !== undefined
								? options.tabBarLabel
								: options.title !== undefined
								? options.title
								: route.name;

						const isFocused = state.index === index;

						const onPress = () => {
							const event = navigation.emit({
								type: "tabPress",
								target: route.key,
								canPreventDefault: true,
							});
							if (!isFocused && !event.defaultPrevented) {
								navigation.navigate(route.name);
							}
						};

						const onLongPress = () => {
							navigation.emit({
								type: "tabLongPress",
								target: route.key,
							});
						};

						const iconName =
							options.tabBarIconName ||
							(route.name === "Dashboard"
								? "home"
								: route.name === "Devices"
								? "hardware-chip"
								: "nutrition");

						return (
							<TouchableOpacity
								key={route.key}
								accessibilityRole="button"
								accessibilityState={isFocused ? { selected: true } : {}}
								accessibilityLabel={options.tabBarAccessibilityLabel}
								testID={options.tabBarTestID}
								onPress={onPress}
								onLongPress={onLongPress}
								style={styles.item}
								activeOpacity={0.9}
							>
								{isFocused ? (
									<LinearGradient
										colors={["#6366f1", "#a21caf", "#f472b6"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.activeTab}
									>
										<Ionicons name={iconName} size={24} color="#ffffff" />
										<Text style={styles.activeLabel}>{label}</Text>
									</LinearGradient>
								) : (
									<View style={styles.inactiveTab}>
										<Ionicons name={iconName} size={22} color="#9ca3af" />
										<Text style={styles.inactiveLabel}>{label}</Text>
									</View>
								)}
							</TouchableOpacity>
						);
					})}
				</BlurView>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 20,
	},
	container: {
		marginHorizontal: 35,
		borderRadius: 40,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.2,
		shadowRadius: 20,
		elevation: 8,
	},
	bar: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		paddingTop: 10,
		paddingBottom: 4,
		paddingHorizontal: 10,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	item: {
		flex: 1,
		alignItems: "center",
		marginHorizontal: 1,
		// marginVertical: 0,
	},
	activeTab: {
		alignItems: "center",
		paddingVertical: 7,
		paddingHorizontal: 16,
		borderRadius: 40,
		gap: 6,
		shadowColor: "#6366f1",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	inactiveTab: {
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 30,
		gap: 4,
	},
	activeLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: "#ffffff",
		textShadowColor: "rgba(0,0,0,0.1)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	inactiveLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: "#9ca3af",
	},
});
