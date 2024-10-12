import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const WishlistScreen = ({ navigation }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/wishlist/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wishlist");
      }

      const wishlistData = await response.json();
      const propertiesResponse = await fetch(
        `${API_BASE_URL}/api/v1/properties/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!propertiesResponse.ok) {
        throw new Error("Failed to fetch properties");
      }

      const propertiesData = await propertiesResponse.json();

      const enhancedWishlistItems = wishlistData.map((wishlistItem) => {
        const property = [
          ...propertiesData.properties_for_sale,
          ...propertiesData.rental_properties,
        ].find((p) => p.name === wishlistItem.property_name);
        return { ...wishlistItem, ...property, is_in_wishlist: true };
      });

      setWishlistItems(enhancedWishlistItems);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      Alert.alert("Error", "Failed to fetch wishlist. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemoveFromWishlist = async (item) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const requestBody = {
        property_type:
          item.property_type === "rentalproperty" ? "rental" : "sale",
        property_id: item.id,
      };

      console.log("Request Body:", JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/v1/wishlist/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to remove from wishlist");
      }

      // Update local state immediately for responsive UI
      setWishlistItems((prevItems) =>
        prevItems.filter((i) => i.id !== item.id),
      );
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      Alert.alert("Error", "Failed to remove from wishlist. Please try again.");
    }
  };

  const renderWishlistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.wishlistItem}
      onPress={() =>
        navigation.navigate("PropertyPage", { propertyId: item.id })
      }
    >
      <Image
        source={
          item.images && item.images.length > 0
            ? { uri: `${API_BASE_URL}${item.images[0].image}` }
            : require("../../assets/room1.jpg")
        }
        style={styles.propertyImage}
      />
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{item.property_name}</Text>
        <Text style={styles.propertyType}>
          {item.property_type === "rentalproperty" ? "Rental" : "For Sale"}
        </Text>
        <Text style={styles.propertyPrice}>
          {item.price_per_month
            ? `$${item.price_per_month}/Month`
            : `$${item.price}`}
        </Text>
        <Text style={styles.addedAt}>
          Added: {new Date(item.added_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFromWishlist(item)}
      >
        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Wishlist</Text>
      {wishlistItems.length === 0 ? (
        <Text style={styles.emptyMessage}>Your wishlist is empty.</Text>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 16,
  },
  wishlistItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  propertyImage: {
    width: 100,
    height: 100,
    resizeMode: "cover",
  },
  propertyInfo: {
    flex: 1,
    padding: 12,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  propertyType: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a90e2",
    marginBottom: 4,
  },
  addedAt: {
    fontSize: 12,
    color: "#999",
  },
  removeButton: {
    padding: 12,
    justifyContent: "center",
  },
  emptyMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});

export default WishlistScreen;
