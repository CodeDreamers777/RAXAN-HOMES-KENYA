import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

// Green theme colors
const COLORS = {
  primary: "#2E7D32", // Dark green
  primaryLight: "#4CAF50", // Medium green
  secondary: "#A5D6A7", // Light green
  background: "#F1F8E9", // Very light green/off-white
  text: "#1B5E20", // Very dark green
  textSecondary: "#33691E", // Dark olive green
  border: "#81C784", // Medium light green
  white: "#FFFFFF",
  error: "#D32F2F", // Red for errors
};

const ScheduleViewingScreen = ({ route, navigation }) => {
  const { propertyId, propertyType } = route.params;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewingNotes, setViewingNotes] = useState("");

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const submitViewing = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      // Map property types from your frontend to backend expected values
      const propertyTypeMap = {
        sale: "sale",
        rental: "rental",
        pernight: "pernight",
      };

      const mappedPropertyType = propertyTypeMap[propertyType] || "sale";

      const requestBody = {
        property_type: mappedPropertyType,
        property_id: propertyId,
        viewing_date: selectedDate.toISOString(),
        notes: viewingNotes.trim(),
      };

      console.log("Request Body:", requestBody);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/property-viewings/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
          body: JSON.stringify(requestBody),
        },
      );

      const responseData = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", responseData);

      if (!response.ok) {
        // Extract error message from response
        const errorMessage =
          responseData.error ||
          (typeof responseData === "object"
            ? JSON.stringify(responseData)
            : "Unknown error");
        throw new Error(errorMessage);
      }

      Alert.alert("Success", "Your viewing has been scheduled successfully!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("ViewingsList");
          },
        },
      ]);
    } catch (error) {
      console.error("Error booking viewing:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to book viewing. Please try again.",
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Schedule Property Viewing</Text>

            <Text style={styles.label}>Select Viewing Date:</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.label}>Add Notes (Optional):</Text>
            <TextInput
              style={[styles.inputField, styles.notesInput]}
              multiline
              numberOfLines={4}
              placeholder="Enter any notes or special requests for the viewing..."
              placeholderTextColor="#689F38"
              value={viewingNotes}
              onChangeText={setViewingNotes}
              textAlignVertical="top"
              keyboardType="default"
              returnKeyType="done"
              blurOnSubmit={false}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitViewing}
              >
                <Text style={styles.submitButtonText}>Confirm Viewing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  notesInput: {
    minHeight: 120,
    fontSize: 16,
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ScheduleViewingScreen;
