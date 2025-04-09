import React, { useState, useEffect } from "react";
import {
  StyleSheet,
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RaxanLogo from "../../assets/logo__1_-removebg-preview.png";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

// ForgotPasswordScreen Component
function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCSRFToken] = useState("");

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
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
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        Alert.alert("Success", `OTP has been sent to ${maskedEmail}`);
        navigation.navigate("OTPVerification", { email });
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image source={RaxanLogo} style={styles.logo} />
            <Text style={styles.logoText}>Raxan Homes</Text>
          </View>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address to receive a password reset OTP
          </Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// OTPVerificationScreen Component
function ForgotOTPVerificationScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCSRFToken] = useState("");

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
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
          email: email,
          otp: parseInt(otp),
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Password has been reset successfully", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image source={RaxanLogo} style={styles.logo} />
            <Text style={styles.logoText}>Raxan Homes</Text>
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the OTP sent to your email and set a new password
          </Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="key-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#666"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  inputContainer: {
    width: "80%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkText: {
    color: "#4CAF50",
    fontSize: 16,
    marginTop: 20,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  googleButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 20,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  linkText: {
    color: "#4CAF50",
    textDecorationLine: "underline",
  },
  disabledButton: {
    backgroundColor: "#a0a0a0",
  },
  eyeIcon: {
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    alignItems: "center",
    // Add shadow for better visibility
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  closeButton: {
    marginTop: 15,
  },
  closeButtonText: {
    color: "#666",
    fontSize: 16,
  },
  forgotPasswordLink: {
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },
});

export { ForgotPasswordScreen, ForgotOTPVerificationScreen };
