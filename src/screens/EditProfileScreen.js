import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

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

function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = route.params;

  const [username, setUsername] = useState(profile.username);
  const [profilePicture, setProfilePicture] = useState(profile.profile_picture);
  const [csrfToken, setCSRFToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCSRFToken = async () => {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
    };
    getCSRFToken();
  }, []);

  const handleSave = async () => {
    if (!csrfToken) {
      Alert.alert("Error", "CSRF token not available. Please try again.");
      return;
    }

    setIsLoading(true);
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const formData = new FormData();
      formData.append("username", username);

      if (profilePicture) {
        // If it's a new image selected from the device
        if (
          profilePicture.startsWith("file://") ||
          profilePicture.startsWith("content://")
        ) {
          const filename = profilePicture.split("/").pop();
          formData.append("profile_picture", {
            uri: profilePicture,
            type: "image/jpeg", // or determine dynamically if needed
            name: filename || "profile.jpg",
          });
        }
      }

      console.log("FormData contents:", Object.fromEntries(formData._parts)); // Debug log

      const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          "Content-Type": "multipart/form-data", // Add this header
          Accept: "application/json",
          Referer: API_BASE_URL,
        },
        body: formData,
      });

      const responseData = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", responseData);

      if (!response.ok) {
        throw new Error(responseData.detail || "Failed to update profile");
      }

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", `Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handleChoosePhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to grant camera roll permissions to change your profile picture.",
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      // Note: newer versions of expo-image-picker use 'canceled' instead of 'cancelled'
      setProfilePicture(pickerResult.assets[0].uri); // Updated to handle newer expo-image-picker response format
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleChoosePhoto}>
        <Image
          source={
            profilePicture
              ? profilePicture.startsWith("file://") ||
                profilePicture.startsWith("content://")
                ? { uri: profilePicture }
                : { uri: `${API_BASE_URL}${profilePicture}` }
              : require("../../assets/user-profile.jpg")
          }
          style={styles.profileImage}
        />
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Enter username"
      />

      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.disabledButton]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 10,
  },
  changePhotoText: {
    textAlign: "center",
    color: "#4CAF50",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#a5d6a7",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditProfileScreen;
