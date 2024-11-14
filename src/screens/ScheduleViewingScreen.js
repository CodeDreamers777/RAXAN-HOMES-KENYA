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

const ScheduleViewingScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
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
          body: JSON.stringify({
            property: propertyId,
            viewing_date: selectedDate.toISOString(),
            notes: viewingNotes.trim(),
          }),
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

            <Text style={styles.dateLabel}>Select Viewing Date:</Text>
            <TouchableOpacity
              style={styles.dateButton}
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

            <Text style={styles.notesLabel}>Add Notes (Optional):</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="Enter any notes or special requests for the viewing..."
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
    backgroundColor: "white",
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
    color: "#1F2937",
    marginBottom: 24,
    textAlign: "center",
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    minHeight: 120,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ScheduleViewingScreen;
