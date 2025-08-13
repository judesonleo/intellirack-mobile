import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Image,
	Dimensions,
	ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function LandingScreen({ navigation }) {
	const features = [
		{
			icon: "analytics-outline",
			title: "Real-Time Tracking",
			description: "Monitor your inventory levels instantly with live updates",
		},
		{
			icon: "notifications-outline",
			title: "Smart Alerts",
			description: "Get notified when items are running low or need attention",
		},
		{
			icon: "trending-up-outline",
			title: "Analytics & Insights",
			description: "Understand usage patterns and optimize your stock",
		},
		{
			icon: "wifi-outline",
			title: "IoT Powered",
			description: "Advanced sensors and connectivity for seamless operation",
		},
	];

	return (
		<LinearGradient
			colors={["#8A2BE2", "#FF69B4"]}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={styles.container}
		>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Hero Section */}
				<View style={styles.heroSection}>
					<View style={styles.heroContent}>
						<Text style={styles.heroTitle}>
							Smart Shelf,{"\n"}
							<Text style={styles.heroTitleHighlight}>Real-Time Tracking</Text>
						</Text>
						<Text style={styles.heroSubtitle}>IntelliRack</Text>
						<Text style={styles.heroDescription}>
							Effortless inventory management for homes, businesses, and
							warehouses
						</Text>
					</View>
					<View style={styles.heroImageContainer}>
						<View style={styles.rackIllustration}>
							<View style={styles.shelf}>
								<View style={styles.item} />
								<View style={styles.item} />
								<View style={styles.item} />
							</View>
							<View style={styles.shelf}>
								<View style={styles.item} />
								<View style={styles.item} />
								<View style={styles.item} />
							</View>
							<View style={styles.shelf}>
								<View style={styles.item} />
								<View style={styles.item} />
								<View style={styles.item} />
							</View>
						</View>
					</View>
				</View>

				{/* Features Section */}
				<View style={styles.featuresSection}>
					<Text style={styles.sectionTitle}>Why Choose IntelliRack?</Text>
					{features.map((feature, index) => (
						<View key={index} style={styles.featureCard}>
							<View style={styles.featureIcon}>
								<Ionicons name={feature.icon} size={24} color="#8A2BE2" />
							</View>
							<View style={styles.featureContent}>
								<Text style={styles.featureTitle}>{feature.title}</Text>
								<Text style={styles.featureDescription}>
									{feature.description}
								</Text>
							</View>
						</View>
					))}
				</View>

				{/* CTA Section */}
				<View style={styles.ctaSection}>
					<Text style={styles.ctaTitle}>Ready to Get Started?</Text>
					<Text style={styles.ctaDescription}>
						Join thousands of users managing their inventory smarter
					</Text>
					<View style={styles.ctaButtons}>
						<TouchableOpacity
							style={styles.primaryButton}
							onPress={() => navigation.navigate("Register")}
						>
							<LinearGradient
								colors={["#8A2BE2", "#FF69B4"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.gradientButton}
							>
								<Text style={styles.primaryButtonText}>Get Started</Text>
							</LinearGradient>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.secondaryButton}
							onPress={() => navigation.navigate("Login")}
						>
							<Text style={styles.secondaryButtonText}>Sign In</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>Powered by IoT & AI</Text>
				</View>
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 50, // Add top padding for status bar
	},
	heroSection: {
		minHeight: height * 0.6,
		paddingHorizontal: 24,
		paddingTop: 40,
		paddingBottom: 60,
		justifyContent: "space-between",
		backgroundColor: "transparent",
	},
	heroContent: {
		flex: 1,
		justifyContent: "center",
	},
	heroTitle: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#fff",
		lineHeight: 40,
		marginBottom: 16,
	},
	heroTitleHighlight: {
		color: "#FFD700",
	},
	heroSubtitle: {
		fontSize: 28,
		fontWeight: "800",
		color: "#fff",
		marginBottom: 16,
	},
	heroDescription: {
		fontSize: 16,
		color: "#fff",
		lineHeight: 24,
		opacity: 0.9,
	},
	heroImageContainer: {
		alignItems: "center",
		marginTop: 20,
	},
	rackIllustration: {
		width: 120,
		height: 120,
		justifyContent: "space-between",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	shelf: {
		flexDirection: "row",
		justifyContent: "space-around",
		height: 30,
		backgroundColor: "rgba(255,255,255,0.2)",
		borderRadius: 8,
		marginBottom: 8,
	},
	item: {
		width: 20,
		height: 20,
		backgroundColor: "#FFD700",
		borderRadius: 10,
		marginTop: 5,
	},
	featuresSection: {
		paddingHorizontal: 24,
		paddingVertical: 40,
		backgroundColor: "#f8fafc",
	},
	sectionTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
		textAlign: "center",
		marginBottom: 32,
	},
	featureCard: {
		flexDirection: "row",
		backgroundColor: "#fff",
		padding: 20,
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	featureIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#f3e8ff",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	featureContent: {
		flex: 1,
	},
	featureTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 8,
	},
	featureDescription: {
		fontSize: 14,
		color: "#6b7280",
		lineHeight: 20,
	},
	ctaSection: {
		paddingHorizontal: 24,
		paddingVertical: 40,
		backgroundColor: "#fff",
		alignItems: "center",
	},
	ctaTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
		textAlign: "center",
		marginBottom: 16,
	},
	ctaDescription: {
		fontSize: 16,
		color: "#6b7280",
		textAlign: "center",
		marginBottom: 32,
		lineHeight: 24,
	},
	ctaButtons: {
		width: "100%",
		gap: 16,
	},
	primaryButton: {
		borderRadius: 12,
		overflow: "hidden",
	},
	gradientButton: {
		paddingVertical: 16,
		paddingHorizontal: 32,
		alignItems: "center",
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	secondaryButton: {
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#8A2BE2",
		alignItems: "center",
	},
	secondaryButtonText: {
		color: "#8A2BE2",
		fontSize: 16,
		fontWeight: "600",
	},
	footer: {
		paddingVertical: 24,
		alignItems: "center",
		backgroundColor: "#f8fafc",
	},
	footerText: {
		fontSize: 14,
		color: "#9ca3af",
	},
});
