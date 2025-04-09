import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RaxanLogo from "../../assets/IOIO LOGO 2.png";
import { LinearGradient } from "expo-linear-gradient";
import {
  API_BASE_URL,
  fetchCSRFToken,
  fetchProfileData,
} from "../utils/apiUtils";
import { setTokenWithExpiry } from "../utils/storageUtils";
import ForgotPasswordModal from "./ForgotPasswordModal";
import OtpResetModal from "./OtpResetModal";

// Updated color scheme to match the ProfileScreen
const COLORS = {
  primary: "#2C3E50", // Deep blue-gray (primary color)
  primaryDark: "#1F2E3C", // Darker blue-gray for gradients
  primaryLight: "#3498DB", // Medium blue (secondary color)
  secondary: "#1ABC9C", // Teal/aqua (accent color)
  background: "#F5F7FA", // Light gray with blue undertone
  text: "#2C3E50", // Deep blue-gray for text
  textSecondary: "#34495E", // Slightly lighter blue-gray for secondary text
  textLight: "#ECF0F1", // Very light gray for text on dark backgrounds
  border: "#BDC3C7", // Medium light gray with blue undertone
  white: "#FFFFFF",
  error: "#E74C3C", // Red for errors and logout
};

export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // States for forgot password flow
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        if (data.message === "User already logged in") {
          // User is already logged in, redirect to home
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        } else if (data.requires_verification) {
          // Navigate to OTP verification screen
          navigation.navigate("OtpVerification", { email: data.email });
        } else if (data.success) {
          // Save last_login and is_new_user to AsyncStorage
          await AsyncStorage.setItem(
            "last_login",
            data.last_login ? data.last_login.toString() : "",
          );
          await AsyncStorage.setItem(
            "is_new_user",
            JSON.stringify(data.is_new_user),
          );

          // Continue with existing login flow
          await setTokenWithExpiry(data.access);
          await fetchProfileData(data.access);
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        } else {
          // Handle invalid credentials
          Alert.alert(
            "Login Failed",
            "Invalid credentials. Please check your email and password.",
          );
        }
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.message ||
          "An error occurred while logging in. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/forgot-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const maskedEmail = forgotPasswordEmail.replace(
          /(.{2})(.*)(@.*)/,
          "$1***$3",
        );
        Alert.alert("Success", `OTP has been sent to ${maskedEmail}`);
        setShowForgotPasswordModal(false);
        setShowOtpModal(true);
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to send OTP. Please try again.",
        );
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: parseInt(otp),
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Password has been reset successfully", [
          {
            text: "OK",
            onPress: () => {
              setShowOtpModal(false);
              // Clear all states
              setOtp("");
              setNewPassword("");
              setConfirmNewPassword("");
              setForgotPasswordEmail("");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to reset password. Please try again.",
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* New LinearGradient Header similar to ProfileScreen */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerContainer}
          >
            <View style={styles.logoSection}>
              <Image source={RaxanLogo} style={styles.logo} />
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>IOIO</Text>
                <Text style={styles.companyTagline}>
                  Find your perfect home
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Rest of the form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color="#2C3E50"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color="#2C3E50"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#2C3E50"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password link */}
            <TouchableOpacity
              onPress={() => setShowForgotPasswordModal(true)}
              style={styles.forgotPasswordLink}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Include the modal components */}
            <ForgotPasswordModal
              visible={showForgotPasswordModal}
              onClose={() => setShowForgotPasswordModal(false)}
              email={forgotPasswordEmail}
              setEmail={setForgotPasswordEmail}
              handleSubmit={handleForgotPassword}
              isLoading={isLoading}
            />

            <OtpResetModal
              visible={showOtpModal}
              onClose={() => setShowOtpModal(false)}
              otp={otp}
              setOtp={setOtp}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmNewPassword={confirmNewPassword}
              setConfirmNewPassword={setConfirmNewPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmNewPassword={showConfirmNewPassword}
              setShowConfirmNewPassword={setShowConfirmNewPassword}
              handleSubmit={handleResetPassword}
              isLoading={isLoading}
            />

            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.linkText}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  // New header styles matching ProfileScreen
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  companyInfo: {
    marginLeft: 20,
  },
  companyName: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 5,
  },
  companyTagline: {
    fontSize: 16,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  // Form container styles
  formContainer: {
    padding: 20,
    paddingTop: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: COLORS.text,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 18,
  },
  forgotPasswordLink: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 16,
    textAlign: "center",
    margin: 10,
  },
};
