import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const BookingScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guests, setGuests] = useState(1);
  const [isCheckInDatePickerVisible, setCheckInDatePickerVisible] =
    useState(false);
  const [isCheckOutDatePickerVisible, setCheckOutDatePickerVisible] =
    useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [bookingReference, setBookingReference] = useState(null);
  const [isWebViewVisible, setWebViewVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleCheckInDatePicker = () => {
    setCheckInDatePickerVisible(true);
  };

  const handleCheckOutDatePicker = () => {
    setCheckOutDatePickerVisible(true);
  };

  const handleCheckInDateConfirm = (date) => {
    setCheckInDate(date);
    setCheckInDatePickerVisible(false);
  };

  const handleCheckOutDateConfirm = (date) => {
    setCheckOutDate(date);
    setCheckOutDatePickerVisible(false);
  };

  const handleGuestsChange = (value) => {
    setGuests(value);
  };

  const handleBookNow = async () => {
    if (!checkInDate || !checkOutDate || guests <= 0) {
      setErrorMessage(
        "Please fill in all required fields to proceed with the booking.",
      );
      return;
    }

    try {
      setIsLoading(true);
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const requestBody = {
        property_id: propertyId,
        check_in_date: moment(checkInDate).format("YYYY-MM-DD"),
        check_out_date: moment(checkOutDate).format("YYYY-MM-DD"),
        guests: guests,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/v1/per-night/initiate-payment/`,
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

      if (!response.ok) {
        const errorData = await response.json(); // Parse the JSON error response
        const errorMessage = errorData.error || "Failed to initiate booking";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Booking initiated:", data);

      setPaymentUrl(data.authorization_url);
      setBookingReference(data.reference);
      setShowPaymentWebView(true);
    } catch (error) {
      console.error("Error initiating booking:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebViewClose = () => {
    setWebViewVisible(false);
  };

  const handleWebViewNavigationStateChange = (event) => {
    if (event.url.includes("success")) {
      handleConfirmBooking();
    }
  };

  const handleConfirmBooking = async () => {
    try {
      setIsLoading(true);
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      // Construct the URL with the reference as a query parameter
      const url = `${API_BASE_URL}/api/v1/per-night/confirm-payment/?reference=${encodeURIComponent(bookingReference)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        const errorData = await response.json(); // Parse the JSON error response
        const errorMessage = errorData.error || "Failed to confirm booking";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Booking confirmed:", data);
      setWebViewVisible(false);
      navigation.navigate("SuccessScreen", { bookingId: data.booking_id });
    } catch (error) {
      console.error("Error confirming booking:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeWebView = () => {
    setShowPaymentWebView(false);
    handleConfirmBooking(); // Call handleConfirmBooking when the close button is clicked
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Check-in Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={handleCheckInDatePicker}
        >
          <Text style={styles.dateButtonText}>
            {checkInDate
              ? moment(checkInDate).format("MMM D, YYYY")
              : "Select Date"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isCheckInDatePickerVisible}
          mode="date"
          onConfirm={handleCheckInDateConfirm}
          onCancel={() => setCheckInDatePickerVisible(false)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Check-out Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={handleCheckOutDatePicker}
        >
          <Text style={styles.dateButtonText}>
            {checkOutDate
              ? moment(checkOutDate).format("MMM D, YYYY")
              : "Select Date"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isCheckOutDatePickerVisible}
          mode="date"
          onConfirm={handleCheckOutDateConfirm}
          onCancel={() => setCheckOutDatePickerVisible(false)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Guests</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={guests.toString()}
          onChangeText={handleGuestsChange}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonLoading]}
        onPress={handleBookNow}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Book Now</Text>
        )}
      </TouchableOpacity>

      {showPaymentWebView && (
        <Modal visible={showPaymentWebView} animationType="slide">
          <View style={styles.webViewContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeWebView}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <WebView
              source={{ uri: paymentUrl }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn("WebView error: ", nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn(
                  "WebView received error status code: ",
                  nativeEvent.statusCode,
                );
              }}
            />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priceSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  priceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: "#4B5563",
  },
  priceValue: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "bold",
  },
  confirmButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  closeButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  submitButtonLoading: {
    backgroundColor: "#FF8C8C",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#E53E3E",
    fontSize: 14,
  },
});

export default BookingScreen;
