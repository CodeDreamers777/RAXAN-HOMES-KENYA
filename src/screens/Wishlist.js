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

// Updated color scheme based on #2C3E50
const COLORS = {
  primary: "#2C3E50", // Deep blue-grey (main brand color)
  primaryLight: "#3D5A73", // Lighter blue-grey
  primaryDark: "#1A2530", // Darker blue-grey
  secondary: "#ECF0F1", // Very light grey with slight blue tint
  accent: "#E74C3C", // Red accent for removal/alerts
  highlight: "#3498DB", // Bright blue for highlights/CTAs
  text: "#2C3E50", // Dark text (same as primary)
  textLight: "#7F8C8D", // Light grey text for secondary information
  background: "#F5F7FA", // Light background with slight blue tint
  card: "#FFFFFF", // White card background
  border: "#D6DBDF", // Light border color
  skeleton: "#E0E0E0", // Skeleton loading color
  success: "#2ECC71", // Green for success states
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
        <View style={[styles.typeTag, getTypeTagStyle(type)]}>
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

// Helper function to get different tag styles based on property type
const getTypeTagStyle = (type) => {
  switch (type) {
    case "Rental":
      return { backgroundColor: COLORS.primary };
    case "Per Night":
      return { backgroundColor: COLORS.highlight };
    case "For Sale":
      return { backgroundColor: COLORS.primaryLight };
    default:
      return { backgroundColor: COLORS.primary };
  }
};

// Memoized empty state component with updated styles
const EmptyWishlistView = memo(({ refreshing, onRefresh }) => (
  <ScrollView
    contentContainerStyle={styles.emptyContainer}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[COLORS.highlight]}
        tintColor={COLORS.highlight}
      />
    }
  >
    <View style={styles.emptyIconContainer}>
      <Ionicons
        name="heart-outline"
        size={80}
        color={COLORS.textLight}
        style={styles.emptyIcon}
      />
    </View>
    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
    <Text style={styles.emptyMessage}>
      Properties you save will appear here
    </Text>
    <TouchableOpacity style={styles.browseButton} onPress={onRefresh}>
      <Text style={styles.browseButtonText}>Browse Properties</Text>
    </TouchableOpacity>
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
        <ActivityIndicator size="large" color={COLORS.highlight} />
        <Text style={styles.loadingText}>Loading your wishlist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        {wishlistItems.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.itemCount}>{wishlistItems.length}</Text>
          </View>
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
              colors={[COLORS.highlight]}
              progressBackgroundColor="#ffffff"
              tintColor={COLORS.highlight}
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  countBadge: {
    backgroundColor: COLORS.highlight,
    height: 28,
    width: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCount: {
    fontSize: 14,
    color: "#FFFFFF",
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
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: {
    marginBottom: 0,
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
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: COLORS.highlight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  browseButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  pullToRefreshText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 16,
  },
  wishlistItem: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
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
    color: COLORS.highlight,
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
