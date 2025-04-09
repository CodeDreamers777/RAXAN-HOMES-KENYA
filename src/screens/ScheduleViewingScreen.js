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
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

// New color scheme based on #2C3E50
const COLORS = {
  primary: "#2C3E50", // Deep blue-gray (main theme color)
  primaryLight: "#34495E", // Slightly lighter blue-gray
  secondary: "#3498DB", // Bright blue
  background: "#ECF0F1", // Light gray background
  text: "#2C3E50", // Deep blue-gray for text
  textSecondary: "#7F8C8D", // Medium gray for secondary text
  border: "#BDC3C7", // Light gray for borders
  white: "#FFFFFF",
  error: "#E74C3C", // Red for errors
  accent: "#F39C12", // Gold accent (matching the stars from previous screen)
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
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={28} color={COLORS.white} />
              </View>

              <Text style={styles.cardTitle}>Select Viewing Date</Text>
              <TouchableOpacity
                style={styles.inputField}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateInputContent}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
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

              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.inputField, styles.notesInput]}
                multiline
                numberOfLines={4}
                placeholder="Enter any notes or special requests for the viewing..."
                placeholderTextColor={COLORS.textSecondary}
                value={viewingNotes}
                onChangeText={setViewingNotes}
                textAlignVertical="top"
                keyboardType="default"
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.text}
              />
              <Text style={styles.infoText}>
                Once scheduled, the property owner will be notified and may
                contact you to confirm.
              </Text>
            </View>

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
                <Text style={styles.submitButtonText}>Schedule Viewing</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  placeholder: {
    width: 40, // Same width as back button for balanced layout
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    paddingTop: 32,
  },
  iconContainer: {
    position: "absolute",
    top: -20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
  },
  notesInput: {
    minHeight: 120,
    fontSize: 16,
    color: COLORS.text,
  },
  infoCard: {
    backgroundColor: "#EBF5FB", // Light blue
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ScheduleViewingScreen;
