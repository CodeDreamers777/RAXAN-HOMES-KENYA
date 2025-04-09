import React, { useState } from "react";
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
import RaxanLogo from "../../assets/IOIO LOGO 2.png";
import { fetchCSRFToken } from "../utils/apiUtils";
import { styles } from "./styles";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

export function OtpVerificationScreen({ route, navigation }) {
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
            <Text style={styles.logoText}>IOIO</Text>
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
            style={[styles.button, { backgroundColor: "#2C3E50" }]}
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
