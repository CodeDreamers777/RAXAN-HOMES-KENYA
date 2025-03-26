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
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import RaxanLogo from "../../assets/logo__1_-removebg-preview.png";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const fetchCSRFToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    console.log(data);
    return data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

// OTP Verification Screen Component
function OtpVerificationScreen({ route, navigation }) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { email } = route.params;
  const [csrfToken, setCSRFToken] = useState("");

  const TOKEN_EXPIRATION_DAYS = 7;

  const setTokenWithExpiry = async (token) => {
    const now = new Date();
    const item = {
      value: token,
      expiry: now.getTime() + TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    };
    await AsyncStorage.setItem("accessToken", JSON.stringify(item));
  };

  const fetchProfileData = async (accessToken) => {
    try {
      const token = await fetchCSRFToken();
      setCSRFToken(token);

      const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const profileData = await response.json();

      // Save user type to AsyncStorage
      await AsyncStorage.setItem("userType", profileData.user_type);
      // Save entire user profile data to AsyncStorage
      await AsyncStorage.setItem("userData", JSON.stringify(profileData));

      return profileData;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  };

  const handleOtpVerification = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the OTP code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/verify-login-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (response.ok && data.success) {
        // Store tokens
        await setTokenWithExpiry(data.access);

        // Fetch and store profile data
        try {
          await fetchProfileData(data.access);
          console.log("Profile data fetched and stored successfully");
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
          Alert.alert(
            "Warning",
            "Logged in successfully but failed to fetch profile data. Some features may be limited.",
          );
        }

        // Navigate to Home
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        Alert.alert("Error", data.message || "Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
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

          <Text style={styles.otpTitle}>Enter Verification Code</Text>
          <Text style={styles.otpDescription}>
            Please enter the verification code sent to your email
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
                maxLength={6}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleOtpVerification}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // New states for forgot password flow
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_CLIENT_ID",
    androidClientId: "YOUR_ANDROID_CLIENT_ID",
    iosClientId: "YOUR_IOS_CLIENT_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      handleGoogleSignIn(authentication.accessToken);
    }
  }, [response]);

  const TOKEN_EXPIRATION_DAYS = 7;

  const setTokenWithExpiry = async (token) => {
    const now = new Date();
    const item = {
      value: token,
      expiry: now.getTime() + TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    };
    await AsyncStorage.setItem("accessToken", JSON.stringify(item));
  };

  const getToken = async () => {
    const itemStr = await AsyncStorage.getItem("accessToken");
    if (!itemStr) {
      return null;
    }
    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
      await AsyncStorage.removeItem("accessToken");
      return null;
    }
    return item.value;
  };

  const fetchProfileData = async (accessToken) => {
    try {
      const token = await fetchCSRFToken();
      setCSRFToken(token);

      const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const profileData = await response.json();

      // Save user type to AsyncStorage
      await AsyncStorage.setItem("userType", profileData.user_type);
      // Save entire user profile data to AsyncStorage
      await AsyncStorage.setItem("userData", JSON.stringify(profileData));

      return profileData;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  };

  // Updated handleLogin function in LoginScreen
  const handleLogin = async () => {
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
      console.log(data);

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
          // Handle direct login
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
  const handleGoogleSignIn = async (accessToken) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ google_access_token: accessToken }),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem("accessToken", data.access);
        navigation.replace("Home");
      } else {
        Alert.alert("Login Failed", data.Message || "Google sign-in failed");
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      Alert.alert(
        "Error",
        "An error occurred while signing in with Google. Please try again.",
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

  // Render forgot password modal
  const ForgotPasswordModal = () => (
    <Modal
      visible={showForgotPasswordModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowForgotPasswordModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Forgot Password</Text>
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
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
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
              style={styles.closeButton}
              onPress={() => setShowForgotPasswordModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  // Render OTP modal with fixed keyboard handling
  const OtpModal = () => (
    <Modal
      visible={showOtpModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowOtpModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
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
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showConfirmNewPassword}
              />
              <TouchableOpacity
                onPress={() =>
                  setShowConfirmNewPassword(!showConfirmNewPassword)
                }
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={
                    showConfirmNewPassword ? "eye-off-outline" : "eye-outline"
                  }
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
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
              style={styles.closeButton}
              onPress={() => setShowOtpModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

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
                color="#666"
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
                  color="#666"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
          {/* Add Forgot Password link */}
          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPasswordLink}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
          <ForgotPasswordModal />
          <OtpModal />
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignUpScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState("CLIENT");
  const [identificationType, setIdentificationType] = useState("ID");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_CLIENT_ID",
    androidClientId: "YOUR_ANDROID_CLIENT_ID",
    iosClientId: "YOUR_IOS_CLIENT_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      handleGoogleSignUp(authentication.accessToken);
    }
  }, [response]);

  const handleSignUp = async () => {
    if (!acceptedTerms) {
      Alert.alert(
        "Error",
        "You must accept the terms and conditions to sign up",
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (accountType === "SELLER" && !identificationNumber) {
      Alert.alert("Error", "Sellers must provide identification information");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          username,
          password,
          confirm_password: confirmPassword,
          phone_number: phoneNumber,
          email,
          user_type: accountType,
          identification_type:
            accountType === "SELLER" ? identificationType : null,
          identification_number:
            accountType === "SELLER" ? identificationNumber : null,
        }),
        credentials: "include",
      });

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        Alert.alert("Success", "Account created successfully", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        if (
          data.username &&
          data.username.includes("username already exists")
        ) {
          Alert.alert("Error", "Username already exists");
        } else {
          Alert.alert("Error", "Failed to create account. Please try again.");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert(
        "Error",
        "An error occurred while signing up. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };
  const openWebView = (url) => {
    navigation.navigate("WebView", { url });
  };
  const CustomCheckbox = ({ value, onValueChange }) => (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={styles.checkbox}
    >
      {value ? (
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
      ) : (
        <Ionicons name="ellipse-outline" size={24} color="#666" />
      )}
    </TouchableOpacity>
  );

  const handleGoogleSignUp = async (accessToken) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          google_access_token: accessToken,
          user_type: accountType,
          identification_type:
            accountType === "SELLER" ? identificationType : null,
          identification_number:
            accountType === "SELLER" ? identificationNumber : null,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Account created successfully", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert(
          "Error",
          data.Message || "Failed to create account. Please try again.",
        );
      }
    } catch (error) {
      console.error("Google Sign-Up error:", error);
      Alert.alert(
        "Error",
        "An error occurred while signing up with Google. Please try again.",
      );
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
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={24}
                color="#666"
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
                name="call-outline"
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#666"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
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
                placeholder="Confirm Password"
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
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={accountType}
                style={styles.picker}
                onValueChange={(itemValue) => setAccountType(itemValue)}
              >
                <Picker.Item label="Client" value="CLIENT" />
                <Picker.Item label="Seller" value="SELLER" />
              </Picker>
            </View>
            {accountType === "SELLER" && (
              <>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={identificationType}
                    style={styles.picker}
                    onValueChange={(itemValue) =>
                      setIdentificationType(itemValue)
                    }
                  >
                    <Picker.Item label="National ID" value="ID" />
                    <Picker.Item label="Passport" value="PASSPORT" />
                  </Picker>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="card-outline"
                    size={24}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={`${identificationType} Number`}
                    placeholderTextColor="#666"
                    value={identificationNumber}
                    onChangeText={setIdentificationNumber}
                  />
                </View>
              </>
            )}
          </View>
          <View style={styles.termsContainer}>
            <CustomCheckbox
              value={acceptedTerms}
              onValueChange={setAcceptedTerms}
            />
            <Text style={styles.termsText}>
              I accept the{" "}
              <Text
                style={styles.linkText}
                onPress={() =>
                  openWebView("https://raxanhomes.netlify.app/#terms")
                }
              >
                Terms of Use
              </Text>{" "}
              and{" "}
              <Text
                style={styles.linkText}
                onPress={() =>
                  openWebView("https://raxanhomes.netlify.app/#privacy")
                }
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, !acceptedTerms && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={isLoading || !acceptedTerms}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
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
});

// Additional styles for OTP screen
const additionalStyles = StyleSheet.create({
  otpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  otpDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

// Merge the additional styles with existing styles
Object.assign(styles, additionalStyles);

export { LoginScreen, SignUpScreen, OtpVerificationScreen };
