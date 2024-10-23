import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const BookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchUserTypeAndBookings();
  }, []);

  const fetchUserTypeAndBookings = async () => {
    try {
      const storedUserType = await AsyncStorage.getItem("userType");
      setUserType(storedUserType);
      await fetchBookings(storedUserType);
    } catch (error) {
      console.error("Error fetching user type and bookings:", error);
      Alert.alert("Error", "Failed to load user data. Please try again.");
      setLoading(false);
    }
  };

  const fetchBookings = async (userType) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const endpoint = userType === "SELLER" ? "host/bookings" : "bookings";
      const response = await fetch(`${API_BASE_URL}/api/v1/${endpoint}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      Alert.alert("Error", "Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookingPress = (booking) => {
    navigation.navigate("BookingDetailScreen", { bookingId: booking.id });
  };

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingItem}
      onPress={() => handleBookingPress(item)}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.propertyName}>{item.property_name}</Text>
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              { color: item.is_confirmed ? "#4CAF50" : "#FFC107" },
            ]}
          >
            {item.is_confirmed ? "Confirmed" : "Pending"}
          </Text>
        </View>
      </View>
      {userType === "SELLER" && (
        <Text style={styles.clientEmail}>Guest: {item.client_email}</Text>
      )}
      <Text style={styles.propertyId}>Property ID: {item.property_id}</Text>
      <View style={styles.bookingFooter}>
        <Text style={styles.totalAmount}>
          Total: ${parseFloat(item.total_price).toFixed(2)}
        </Text>
        <Text style={styles.bookingDate}>
          Booked: {formatDate(item.created_at)}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={24}
        color="#0d1b21"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {userType === "SELLER" ? "My Property Bookings" : "My Bookings"}
        </Text>
      </View>
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No bookings found.</Text>
        }
      />
    </SafeAreaView>
  );
};

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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  listContainer: {
    padding: 16,
  },
  bookingItem: {
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
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0d1b21",
    flex: 1,
    marginRight: 8,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  guestEmail: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  guestCount: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0d1b21",
  },
  bookingDate: {
    fontSize: 14,
    color: "#757575",
  },
  emptyText: {
    fontSize: 18,
    color: "#757575",
    textAlign: "center",
    marginTop: 32,
  },
  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
  clientEmail: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  propertyId: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  },
});

export default BookingsScreen;
