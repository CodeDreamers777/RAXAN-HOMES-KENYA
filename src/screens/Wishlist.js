import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants for theme colors - matching the filter modal green theme
const COLORS = {
  primary: "#2E7D32", // Forest green
  primaryLight: "#4CAF50", // Regular green
  primaryDark: "#1B5E20", // Dark green
  secondary: "#E8F5E9", // Very light green
  text: "#263238", // Dark text
  textLight: "#546E7A", // Light text for secondary information
  background: "#F5F8F5", // Light greenish background
  card: "#FFFFFF", // White card background
  border: "#C8E6C9", // Light green border
  accent: "#FF5252", // Red accent for removal
  skeleton: "#E0E0E0", // Skeleton loading color
};

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

// Memoized WishlistItem component for better performance
const WishlistItem = memo(({ item, onRemove, onPress }) => {
  // Determine property type and price display
  const getPropertyTypeAndPrice = () => {
    if (item.price_per_month) {
      return {
        type: "Rental",
        price: `$${item.price_per_month}/month`,
        icon: "home-outline",
      };
    } else if (item.price_per_night) {
      return {
        type: "Per Night",
        price: `$${item.price_per_night}/night`,
        icon: "bed-outline",
      };
    } else {
      return {
        type: "For Sale",
        price: `$${item.price}`,
        icon: "pricetag-outline",
      };
    }
  };

  const { type, price, icon } = getPropertyTypeAndPrice();

  return (
    <TouchableOpacity
      style={styles.wishlistItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <View style={styles.propertyImage}>
          <Ionicons name="image-outline" size={36} color={COLORS.textLight} />
        </View>
        <View style={styles.typeTag}>
          <Ionicons name={icon} size={14} color="#fff" style={styles.tagIcon} />
          <Text style={styles.typeTagText}>{type}</Text>
        </View>
      </View>

      <View style={styles.propertyInfo}>
        <Text
          style={styles.propertyName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.property_name}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={COLORS.textLight}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location || "Location not available"}
          </Text>
        </View>

        <Text style={styles.propertyPrice}>{price}</Text>

        <View style={styles.featuresRow}>
          {item.bedrooms && (
            <View style={styles.featureItem}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.featureText}>{item.bedrooms}</Text>
            </View>
          )}

          {item.bathrooms && (
            <View style={styles.featureItem}>
              <Ionicons
                name="water-outline"
                size={14}
                color={COLORS.textLight}
              />
              <Text style={styles.featureText}>{item.bathrooms}</Text>
            </View>
          )}

          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={COLORS.textLight}
            />
            <Text style={styles.addedAt}>
              {new Date(item.added_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="heart" size={22} color={COLORS.accent} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// Memoized empty state component
const EmptyWishlistView = memo(({ refreshing, onRefresh }) => (
  <ScrollView
    contentContainerStyle={styles.emptyContainer}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[COLORS.primary]}
        tintColor={COLORS.primary}
      />
    }
  >
    <Ionicons
      name="heart-outline"
      size={80}
      color={COLORS.primaryLight}
      style={styles.emptyIcon}
    />
    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
    <Text style={styles.emptyMessage}>
      Properties you save will appear here
    </Text>
    <Text style={styles.pullToRefreshText}>Pull down to refresh</Text>
  </ScrollView>
));

const WishlistScreen = ({ navigation }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const accessTokenData = await AsyncStorage.getItem("accessToken");

      if (!accessTokenData) {
        Alert.alert("Not Logged In", "Please log in to view your wishlist", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { value: accessToken } = JSON.parse(accessTokenData);
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
        if (response.status === 401) {
          // Handle expired token
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please log in again.",
            [{ text: "OK", onPress: () => navigation.navigate("Login") }],
          );
          return;
        }
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
          ...propertiesData.per_night_properties,
        ].find((p) => p.name === wishlistItem.property_name);
        return { ...wishlistItem, ...property, is_in_wishlist: true };
      });

      setWishlistItems(enhancedWishlistItems);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      Alert.alert("Error", "Failed to fetch wishlist. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Refresh wishlist when screen comes into focus
      fetchWishlist();
    });

    return unsubscribe;
  }, [navigation, fetchWishlist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemoveFromWishlist = async (item) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        "Remove from Wishlist",
        `Are you sure you want to remove "${item.property_name}" from your wishlist?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const accessTokenData =
                  await AsyncStorage.getItem("accessToken");
                const { value: accessToken } = JSON.parse(accessTokenData);
                const csrfToken = await AsyncStorage.getItem("csrfToken");
                if (!accessToken || !csrfToken) {
                  throw new Error("No access token or CSRF token found");
                }

                let propertyType;
                if (item.price_per_month) {
                  propertyType = "rental";
                } else if (item.price_per_night) {
                  propertyType = "per_night";
                } else if (item.price) {
                  propertyType = "sale";
                } else {
                  throw new Error("Unknown property type");
                }

                const requestBody = {
                  property_type: propertyType,
                  property_id: item.id,
                };

                const response = await fetch(
                  `${API_BASE_URL}/api/v1/wishlist/`,
                  {
                    method: "DELETE",
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
                  throw new Error("Failed to remove from wishlist");
                }

                // Update local state immediately for responsive UI
                setWishlistItems((prevItems) =>
                  prevItems.filter((i) => i.id !== item.id),
                );
              } catch (error) {
                console.error("Error removing from wishlist:", error);
                Alert.alert(
                  "Error",
                  "Failed to remove from wishlist. Please try again.",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error during wishlist removal:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your wishlist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        {wishlistItems.length > 0 && (
          <Text style={styles.itemCount}>{wishlistItems.length} items</Text>
        )}
      </View>

      {wishlistItems.length === 0 ? (
        <EmptyWishlistView refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={({ item }) => (
            <WishlistItem
              item={item}
              onRemove={handleRemoveFromWishlist}
              onPress={() =>
                navigation.navigate("PropertyPage", { propertyId: item.id })
              }
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              progressBackgroundColor="#ffffff"
              tintColor={COLORS.primary}
              title="Refreshing..."
              titleColor={COLORS.primary}
            />
          }
          ListFooterComponent={
            wishlistItems.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Pull down to refresh your wishlist
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  itemCount: {
    fontSize: 14,
    color: COLORS.primaryLight,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 500,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
  },
  pullToRefreshText: {
    fontSize: 14,
    color: COLORS.primaryLight,
    textAlign: "center",
    marginTop: 16,
  },
  wishlistItem: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: 110,
    height: 110,
    position: "relative",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  typeTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tagIcon: {
    marginRight: 3,
  },
  typeTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  propertyInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
    flex: 1,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 3,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  addedAt: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 3,
  },
  removeButton: {
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});

export default memo(WishlistScreen);
