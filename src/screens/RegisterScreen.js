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

export default function RegisterScreen({ navigation }) {
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const { register } = useAuth();

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleRegister = async () => {
		const { firstName, lastName, email, password, confirmPassword } = formData;

		if (!firstName || !lastName || !email || !password || !confirmPassword) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		if (password !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		if (password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters long");
			return;
		}

		try {
			setLoading(true);
			await register(firstName, lastName, email, password);
		} catch (error) {
			Alert.alert("Registration Failed", error.message || "Please try again");
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
						<Text style={styles.tagline}>
							Join the smart inventory revolution
						</Text>
					</View>

					{/* Form Section */}
					<View style={styles.formSection}>
						<Text style={styles.welcomeText}>Create Account</Text>
						<Text style={styles.subtitleText}>
							Start managing your inventory smarter today
						</Text>

						{/* Name Inputs */}
						<View style={styles.nameRow}>
							<View style={[styles.inputContainer, styles.halfInput]}>
								<View style={styles.inputIcon}>
									<Ionicons name="person-outline" size={20} color="#9ca3af" />
								</View>
								<TextInput
									style={styles.textInput}
									placeholder="First name"
									placeholderTextColor="#9ca3af"
									value={formData.firstName}
									onChangeText={(value) =>
										handleInputChange("firstName", value)
									}
									autoCapitalize="words"
								/>
							</View>
							<View style={[styles.inputContainer, styles.halfInput]}>
								<View style={styles.inputIcon}>
									<Ionicons name="person-outline" size={20} color="#9ca3af" />
								</View>
								<TextInput
									style={styles.textInput}
									placeholder="Last name"
									placeholderTextColor="#9ca3af"
									value={formData.lastName}
									onChangeText={(value) => handleInputChange("lastName", value)}
									autoCapitalize="words"
								/>
							</View>
						</View>

						{/* Email Input */}
						<View style={styles.inputContainer}>
							<View style={styles.inputIcon}>
								<Ionicons name="mail-outline" size={20} color="#9ca3af" />
							</View>
							<TextInput
								style={styles.textInput}
								placeholder="Email address"
								placeholderTextColor="#9ca3af"
								value={formData.email}
								onChangeText={(value) => handleInputChange("email", value)}
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
								value={formData.password}
								onChangeText={(value) => handleInputChange("password", value)}
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

						{/* Confirm Password Input */}
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
								placeholder="Confirm password"
								placeholderTextColor="#9ca3af"
								value={formData.confirmPassword}
								onChangeText={(value) =>
									handleInputChange("confirmPassword", value)
								}
								secureTextEntry={!showConfirmPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								style={styles.eyeButton}
								onPress={() => setShowConfirmPassword(!showConfirmPassword)}
							>
								<Ionicons
									name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
									size={20}
									color="#9ca3af"
								/>
							</TouchableOpacity>
						</View>

						{/* Terms and Conditions */}
						<View style={styles.termsContainer}>
							<Text style={styles.termsText}>
								By creating an account, you agree to our{" "}
								<Text style={styles.termsLink}>Terms of Service</Text> and{" "}
								<Text style={styles.termsLink}>Privacy Policy</Text>
							</Text>
						</View>

						{/* Register Button */}
						<TouchableOpacity
							style={styles.registerButton}
							onPress={handleRegister}
							disabled={loading}
						>
							<LinearGradient
								colors={["#8A2BE2", "#FF69B4"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.gradientButton}
							>
								{loading ? (
									<Text style={styles.buttonText}>Creating account...</Text>
								) : (
									<Text style={styles.buttonText}>Create Account</Text>
								)}
							</LinearGradient>
						</TouchableOpacity>

						{/* Divider */}
						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or</Text>
							<View style={styles.dividerLine} />
						</View>

						{/* Social Register */}
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

						{/* Sign In Link */}
						<View style={styles.signInContainer}>
							<Text style={styles.signInText}>Already have an account? </Text>
							<TouchableOpacity onPress={() => navigation.navigate("Login")}>
								<Text style={styles.signInLink}>Sign in</Text>
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
	nameRow: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 16,
	},
	halfInput: {
		flex: 1,
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
	termsContainer: {
		marginBottom: 24,
	},
	termsText: {
		fontSize: 12,
		color: "#6b7280",
		lineHeight: 18,
		textAlign: "center",
	},
	termsLink: {
		color: "#8A2BE2",
		fontWeight: "500",
	},
	registerButton: {
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
	signInContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	signInText: {
		color: "#6b7280",
		fontSize: 14,
	},
	signInLink: {
		color: "#8A2BE2",
		fontSize: 14,
		fontWeight: "600",
	},
});
