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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import raxanLogo from "./assets/raxan-logo.jpeg";

const API_BASE_URL = "https://k031s30h-8000.euw.devtunnels.ms";

const fetchCSRFToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        if (
          data.Message === "User already logged in" ||
          data.Message === "User logged in successfully"
        ) {
          if (data.access) {
            await AsyncStorage.setItem("accessToken", data.access);
          } else {
            console.warn("Access token is undefined. Not storing in AsyncStorage.");
          }
          navigation.navigate("Home");
        }
      } else {
        Alert.alert(
          "Login Failed",
          "Please check your credentials and try again."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Error",
        "An error occurred while logging in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={raxanLogo} style={styles.logo} />
        <Text style={styles.logoText}>RAXAN HOMES</Text>
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
            secureTextEntry
          />
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SignupScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          username,
          password,
          confirm_password: confirmPassword,
          phone_number: phoneNumber,
          email,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Account created successfully", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        if (
          data.username &&
          data.username.includes("Username already exists")
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
        "An error occurred while signing up. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={raxanLogo} style={styles.logo} />
        <Text style={styles.logoText}>RAXAN HOMES</Text>
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
            secureTextEntry
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
            placeholder="Confirm Password"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
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
});

export { LoginScreen, SignupScreen };
