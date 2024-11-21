import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Card } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const PerNightBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);
      const userType = userData.user_type.toLowerCase();
      console.log(userType);

      const response = await fetch(
        `https://Yakubu.pythonanywhere.com/api/v1/per-night-bookings/?user_type=${userType}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      console.log(data);
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBookingItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text style={styles.propertyName}>{item.property_name}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "confirmed" ? "#e7f3ff" : "#fff0e6",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === "confirmed" ? "#0077e6" : "#ff8c00" },
              ]}
            >
              {item.status_display}
            </Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <View style={styles.dateBox}>
            <MaterialCommunityIcons
              name="calendar-arrow-right"
              size={20}
              color="#4a4a4a"
            />
            <View>
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateText}>
                {new Date(item.check_in_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.dateBox}>
            <MaterialCommunityIcons
              name="calendar-arrow-left"
              size={20}
              color="#4a4a4a"
            />
            <View>
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateText}>
                {new Date(item.check_out_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="moon-waning-crescent"
              size={16}
              color="#4a4a4a"
            />
            <Text style={styles.infoText}>{item.total_nights} nights</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="account-group"
              size={16}
              color="#4a4a4a"
            />
            <Text style={styles.infoText}>{item.guests} guests</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="cash" size={16} color="#4a4a4a" />
            <Text style={styles.infoText}>${item.total_price}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <MaterialCommunityIcons name="account" size={16} color="#4a4a4a" />
            <Text style={styles.contactText}>{item.host_username}</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialCommunityIcons name="email" size={16} color="#4a4a4a" />
            <Text style={styles.contactText}>{item.client_email}</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialCommunityIcons name="phone" size={16} color="#4a4a4a" />
            <Text style={styles.contactText}>{item.client_phone_number}</Text>
          </View>
        </View>
        <Text style={styles.createdAt}>
          Booked on: {new Date(item.created_at).toLocaleString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077e6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: "#ffffff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#4a4a4a",
    marginLeft: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 4,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#4a4a4a",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4a4a4a",
  },
  createdAt: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
  },
});

export default PerNightBookings;
