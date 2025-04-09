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
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import RaxanLogo from "../../assets/IOIO LOGO 2.png";
import { fetchCSRFToken } from "../utils/apiUtils";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

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

export function SignUpScreen({ navigation }) {
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

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

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
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      ) : (
        <Ionicons name="ellipse-outline" size={24} color="#666" />
      )}
    </TouchableOpacity>
  );

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

          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={COLORS.primary}
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
                  color={COLORS.primary}
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
                  color={COLORS.primary}
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
                  color={COLORS.primary}
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
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={COLORS.primary}
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
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={24}
                    color={COLORS.primary}
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
                      color={COLORS.primary}
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
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLinkText}>
                Already have an account? Log in
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
  },
  inputContainer: {
    marginBottom: 10,
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
  pickerWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: COLORS.text,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  linkText: {
    color: COLORS.primaryLight,
    textDecorationLine: "underline",
  },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: 16,
    textAlign: "center",
    margin: 10,
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 18,
  },
};
