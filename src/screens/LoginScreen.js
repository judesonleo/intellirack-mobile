import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen({ navigation }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		try {
			setLoading(true);
			await login(email, password);
		} catch (error) {
			Alert.alert(
				"Login Failed",
				error.message || "Please check your credentials"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardView}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Header */}
					<View style={styles.header}>
						<TouchableOpacity
							onPress={() => navigation.goBack()}
							style={styles.backButton}
						>
							<Ionicons name="arrow-back" size={24} color="#8A2BE2" />
						</TouchableOpacity>
					</View>

					{/* Logo Section */}
					<View style={styles.logoSection}>
						<LinearGradient
							colors={["#8A2BE2", "#FF69B4"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.logoContainer}
						>
							<Text style={styles.logoText}>IntelliRack</Text>
						</LinearGradient>
						<Text style={styles.tagline}>Smart inventory management</Text>
					</View>

					{/* Form Section */}
					<View style={styles.formSection}>
						<Text style={styles.welcomeText}>Welcome back</Text>
						<Text style={styles.subtitleText}>
							Sign in to your IntelliRack account
						</Text>

						{/* Email Input */}
						<View style={styles.inputContainer}>
							<View style={styles.inputIcon}>
								<Ionicons name="mail-outline" size={20} color="#9ca3af" />
							</View>
							<TextInput
								style={styles.textInput}
								placeholder="Email address"
								placeholderTextColor="#9ca3af"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
							/>
						</View>

						{/* Password Input */}
						<View style={styles.inputContainer}>
							<View style={styles.inputIcon}>
								<Ionicons
									name="lock-closed-outline"
									size={20}
									color="#9ca3af"
								/>
							</View>
							<TextInput
								style={styles.textInput}
								placeholder="Password"
								placeholderTextColor="#9ca3af"
								value={password}
								onChangeText={setPassword}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								style={styles.eyeButton}
								onPress={() => setShowPassword(!showPassword)}
							>
								<Ionicons
									name={showPassword ? "eye-off-outline" : "eye-outline"}
									size={20}
									color="#9ca3af"
								/>
							</TouchableOpacity>
						</View>

						{/* Forgot Password */}
						<TouchableOpacity style={styles.forgotPassword}>
							<Text style={styles.forgotPasswordText}>Forgot password?</Text>
						</TouchableOpacity>

						{/* Login Button */}
						<TouchableOpacity
							style={styles.loginButton}
							onPress={handleLogin}
							disabled={loading}
						>
							<LinearGradient
								colors={["#8A2BE2", "#FF69B4"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.gradientButton}
							>
								{loading ? (
									<Text style={styles.buttonText}>Signing in...</Text>
								) : (
									<Text style={styles.buttonText}>Sign In</Text>
								)}
							</LinearGradient>
						</TouchableOpacity>

						{/* Divider */}
						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or</Text>
							<View style={styles.dividerLine} />
						</View>

						{/* Social Login */}
						<View style={styles.socialButtons}>
							<TouchableOpacity style={styles.socialButton}>
								<Ionicons name="logo-google" size={20} color="#ea4335" />
								<Text style={styles.socialButtonText}>Google</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.socialButton}>
								<Ionicons name="logo-apple" size={20} color="#000" />
								<Text style={styles.socialButtonText}>Apple</Text>
							</TouchableOpacity>
						</View>

						{/* Sign Up Link */}
						<View style={styles.signUpContainer}>
							<Text style={styles.signUpText}>Don't have an account? </Text>
							<TouchableOpacity onPress={() => navigation.navigate("Register")}>
								<Text style={styles.signUpLink}>Sign up</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	backgroundPattern: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		opacity: 0.03,
	},
	keyboardView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 40,
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 8,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#f3f4f6",
		justifyContent: "center",
		alignItems: "center",
	},
	logoSection: {
		alignItems: "center",
		paddingVertical: 40,
	},
	logoContainer: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 16,
		marginBottom: 16,
	},
	logoText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#fff",
	},
	tagline: {
		fontSize: 16,
		color: "#6b7280",
		fontWeight: "500",
	},
	formSection: {
		paddingHorizontal: 24,
		flex: 1,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#1f2937",
		marginBottom: 8,
		textAlign: "center",
	},
	subtitleText: {
		fontSize: 16,
		color: "#6b7280",
		textAlign: "center",
		marginBottom: 32,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f9fafb",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	inputIcon: {
		marginRight: 12,
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		color: "#1f2937",
	},
	eyeButton: {
		padding: 4,
	},
	forgotPassword: {
		alignSelf: "flex-end",
		marginBottom: 24,
	},
	forgotPasswordText: {
		color: "#8A2BE2",
		fontSize: 14,
		fontWeight: "500",
	},
	loginButton: {
		borderRadius: 12,
		overflow: "hidden",
		marginBottom: 24,
	},
	gradientButton: {
		paddingVertical: 16,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	divider: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 24,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: "#e5e7eb",
	},
	dividerText: {
		marginHorizontal: 16,
		color: "#9ca3af",
		fontSize: 14,
	},
	socialButtons: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 32,
	},
	socialButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "#fff",
		gap: 8,
	},
	socialButtonText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
	signUpContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	signUpText: {
		color: "#6b7280",
		fontSize: 14,
	},
	signUpLink: {
		color: "#8A2BE2",
		fontSize: 14,
		fontWeight: "600",
	},
});
