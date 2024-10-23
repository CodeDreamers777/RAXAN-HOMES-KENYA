import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const userType = await AsyncStorage.getItem("userType");

      if (!accessToken) {
        throw new Error("No access token found");
      }

      if (!userType) {
        throw new Error("User type not found");
      }

      const endpoint =
        userType === "CLIENT"
          ? `${API_BASE_URL}/api/v1/bookings/${bookingId}/`
          : `${API_BASE_URL}/api/v1/host/bookings/${bookingId}/`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      Alert.alert("Error", "Failed to load booking details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0d1b21" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.propertyName}>{booking.property_name}</Text>
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: booking.is_confirmed ? "#4CAF50" : "#FFC107" },
            ]}
          >
            <Text style={styles.statusText}>
              {booking.is_confirmed ? "Confirmed" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoItem
            icon="business"
            label="Property ID"
            value={booking.property_id}
          />
          <InfoItem
            icon="mail"
            label="Guest Email"
            value={booking.client_email}
          />
          <InfoItem
            icon="cash"
            label="Total Price"
            value={`$${parseFloat(booking.total_price).toFixed(2)}`}
          />
          <InfoItem
            icon="calendar"
            label="Booking Date"
            value={formatDate(booking.created_at)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={24} color="#0d1b21" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#0d1b21",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0d1b21",
    marginBottom: 8,
  },
  statusContainer: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoIcon: {
    width: 40,
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#0d1b21",
    fontWeight: "500",
  },
});

export default BookingDetailScreen;
