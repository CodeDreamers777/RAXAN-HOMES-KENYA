import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";

// Constants
const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const { width } = Dimensions.get("window");

// Updated Color Scheme
const PRIMARY_COLOR = "#2C3E50"; // Deep blue-gray (main color)
const SECONDARY_COLOR = "#34495E"; // Slightly lighter blue-gray
const ACCENT_COLOR = "#3498DB"; // Bright blue for accents and CTAs
const ACCENT_COLOR_SECONDARY = "#1ABC9C"; // Turquoise for secondary actions
const BACKGROUND_COLOR = "#F5F7FA"; // Light gray with blue tint
const CARD_BACKGROUND = "#FFFFFF"; // White for cards
const TEXT_PRIMARY = "#2C3E50"; // Dark blue for primary text
const TEXT_SECONDARY = "#7F8C8D"; // Medium gray for secondary text
const DIVIDER_COLOR = "#ECF0F1"; // Very light gray for dividers
const ERROR_COLOR = "#E74C3C"; // Red for errors

// Optimized RatingStars component using memo
const RatingStars = React.memo(({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <View style={styles.ratingContainer}>
      {[...Array(fullStars)].map((_, index) => (
        <Ionicons
          key={`full-star-${index}`}
          name="star"
          size={16}
          color="#F39C12" // Gold color for stars
        />
      ))}
      {hasHalfStar && <Ionicons name="star-half" size={16} color="#F39C12" />}
      {[...Array(5 - Math.ceil(rating))].map((_, index) => (
        <Ionicons
          key={`empty-star-${index}`}
          name="star-outline"
          size={16}
          color="#F39C12"
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
});

// Optimized ImageCarousel component
const ImageCarousel = React.memo(({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      const slide = Math.ceil(
        nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width,
      );
      if (slide !== activeIndex) {
        setActiveIndex(slide);
      }
    },
    [activeIndex],
  );

  // Preload images for better performance
  useEffect(() => {
    if (images && images.length > 0) {
      const preloadImages = async () => {
        const imagePromises = images.map((uri) => {
          return Image.prefetch(uri).catch((err) =>
            console.log(`Failed to prefetch: ${uri}`, err),
          );
        });
        await Promise.all(imagePromises);
      };
      preloadImages();
    }
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/room1.jpg")}
          style={styles.propertyImage}
        />
        <View style={styles.imageOverlay} />
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image
              source={{ uri: image }}
              style={styles.propertyImage}
              onError={(e) =>
                console.log(
                  `Image load error for ${image}:`,
                  e.nativeEvent.error,
                )
              }
            />
            <View style={styles.imageOverlay} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex && styles.activePaginationDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// Property Detail Item Component
const DetailItem = React.memo(({ icon, text }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon} size={22} color={ACCENT_COLOR} />
    <Text style={styles.detailText}>{text}</Text>
  </View>
));

// Amenity Item Component
const AmenityItem = React.memo(({ name }) => (
  <View style={styles.amenityItem}>
    <View style={styles.amenityIconContainer}>
      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
    </View>
    <Text style={styles.amenityText}>{name}</Text>
  </View>
));

const PropertyScreen = ({ route, navigation }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [username, setUsername] = useState("");
  const [hasBooking, setHasBooking] = useState(false);

  const { propertyId } = route.params;

  // Fetch property details
  const fetchPropertyDetails = useCallback(async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch property details");
      }

      const data = await response.json();
      setProperty(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Check booking status
  const checkBookingStatus = useCallback(async () => {
    if (!property) return;

    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);

      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);
      const currentUsername = userData.username;

      // Determine property type
      let propertyType;
      if ("price_per_night" in property) {
        propertyType = "per_night";
      } else if ("price_per_month" in property) {
        propertyType = "rental";
      } else {
        propertyType = "sale";
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/check-booking/${currentUsername}/${propertyId}/${propertyType}/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check booking status");
      }

      const data = await response.json();
      setHasBooking(data.has_booking);
    } catch (error) {
      console.error("Error checking booking status:", error);
      setHasBooking(false);
    }
  }, [property, propertyId]);

  // Fetch user review
  const fetchCurrentUserReview = useCallback(async () => {
    if (!property) return;

    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);
      const currentUsername = userData.username;
      setUsername(currentUsername);

      let propertyType;
      if ("price_per_month" in property) {
        propertyType = "rental";
      } else if ("price_per_night" in property) {
        propertyType = "per_night";
      } else {
        propertyType = "sale";
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/reviews/by_username/?username=${currentUsername}&property_id=${propertyId}&property_type=${propertyType}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user review");
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setUserReview(data[0]);
      }
    } catch (error) {
      console.error("Error fetching user review:", error);
    }
  }, [property, propertyId]);

  // Initial data loading
  useEffect(() => {
    fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  // Secondary data loading when property is available
  useEffect(() => {
    if (property) {
      fetchCurrentUserReview();
      checkBookingStatus();
    }
  }, [property, fetchCurrentUserReview, checkBookingStatus]);

  // Check location permission
  const checkLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to show the map.",
      );
      return false;
    }
    return true;
  };

  // Handle map view
  const handleSeeOnMap = async () => {
    if (property && property.latitude && property.longitude) {
      const hasPermission = await checkLocationPermission();
      if (hasPermission) {
        setShowMap(true);
      }
    } else {
      Alert.alert(
        "Error",
        "Location coordinates are not available for this property.",
      );
    }
  };

  // Handle chat with host
  const handleChatWithHost = () => {
    if (property && property.host) {
      navigation.navigate("ConversationDetail", {
        otherUserId: property.host.id,
        otherUserName: property.host.username,
        isNewConversation: true,
      });
    } else {
      Alert.alert("Error", "Host information is not available.");
    }
  };

  // Handle schedule viewing
  const handleScheduleViewing = () => {
    if (!property) return;

    // Determine property type
    let propertyType;
    if ("price_per_night" in property) {
      propertyType = "pernight";
    } else if ("price_per_month" in property) {
      propertyType = "rental";
    } else {
      propertyType = "sale";
    }

    navigation.navigate("ScheduleViewing", {
      propertyId: propertyId,
      propertyType: propertyType,
    });
  };

  // Format price in Kenyan Shillings
  const formatPrice = useCallback((price) => {
    const roundedPrice = Math.round(Number(price));
    return `KSh ${roundedPrice.toLocaleString("en-KE")}`;
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={ERROR_COLOR} />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPropertyDetails}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data state
  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="home-outline" size={48} color={TEXT_SECONDARY} />
        <Text style={styles.errorTitle}>Property Not Found</Text>
        <Text style={styles.errorText}>The property data is unavailable</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPropertyDetails}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isRental = "price_per_month" in property;
  const isPerNight = "price_per_night" in property;

  // Review Button Component
  const ReviewButton = () => {
    if (!hasBooking) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.reviewButton}
        onPress={() =>
          navigation.navigate("Review", {
            propertyId: property.id,
            propertyName: property.name,
            existingReview: userReview,
            isRental: isRental,
            isPerNight: isPerNight,
          })
        }
      >
        <View style={styles.reviewButtonContent}>
          <Ionicons
            name={userReview ? "star" : "create-outline"}
            size={22}
            color="#fff"
          />
          <Text style={styles.reviewButtonText}>
            {userReview ? "View Your Review" : "Write a Review"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={PRIMARY_COLOR} barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Property Images */}
        <ImageCarousel images={property.images} />

        {/* Property Info Card */}
        <View style={styles.propertyInfoCard}>
          {/* Title and Rating */}
          <View style={styles.titleRow}>
            <Text style={styles.propertyTitle}>{property.name}</Text>
            <RatingStars rating={property.rating || 0} />
          </View>

          {/* Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={18} color={ACCENT_COLOR} />
            <Text
              style={styles.propertyLocation}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {property.location}
            </Text>
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleSeeOnMap}
              >
                <Ionicons name="map-outline" size={14} color="#FFFFFF" />
                <Text style={styles.mapButtonText}>Map</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Price Section */}
          <View style={styles.priceCard}>
            {isPerNight ? (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price per night</Text>
                <Text style={styles.propertyPrice}>
                  {formatPrice(property.price_per_night)}
                </Text>
                <Text style={styles.propertySubtitle}>
                  {property.min_nights} night minimum
                  {property.max_nights > 0
                    ? ` • ${property.max_nights} max`
                    : ""}
                </Text>
              </View>
            ) : isRental ? (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Monthly rent</Text>
                <Text style={styles.propertyPrice}>
                  {formatPrice(property.price_per_month)}
                </Text>
              </View>
            ) : (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Sale price</Text>
                <Text style={styles.propertyPrice}>
                  {formatPrice(property.price)}
                </Text>
              </View>
            )}
          </View>

          {/* Check-in/Check-out for Per Night Properties */}
          {isPerNight && (
            <View style={styles.checkInOutContainer}>
              <View style={styles.checkInOutItem}>
                <Ionicons name="time-outline" size={20} color={ACCENT_COLOR} />
                <View>
                  <Text style={styles.checkInOutLabel}>Check-in</Text>
                  <Text style={styles.checkInOutTime}>
                    {property.check_in_time}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.checkInOutItem}>
                <Ionicons name="time-outline" size={20} color={ACCENT_COLOR} />
                <View>
                  <Text style={styles.checkInOutLabel}>Check-out</Text>
                  <Text style={styles.checkInOutTime}>
                    {property.check_out_time}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Property Details */}
          <View style={styles.detailsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.sectionTitle}>Property Features</Text>
            </View>
            <View style={styles.detailsGrid}>
              <DetailItem
                icon="bed-outline"
                text={`${property.bedrooms} Bedrooms`}
              />
              <DetailItem
                icon="water-outline"
                text={`${property.bathrooms} Bathrooms`}
              />
              <DetailItem
                icon="resize-outline"
                text={`${property.area} sq ft`}
              />
              {isPerNight && (
                <DetailItem
                  icon="home-outline"
                  text={`${property.number_of_units} Units`}
                />
              )}
            </View>
          </View>

          {/* Property Description */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.sectionTitle}>About this property</Text>
            </View>
            <Text style={styles.propertyDescription}>
              {property.description}
            </Text>
          </View>

          {/* Amenities */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="options-outline"
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.sectionTitle}>Amenities</Text>
            </View>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((amenity) => (
                <AmenityItem key={amenity.id} name={amenity.name} />
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleChatWithHost}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Chat with Host</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleScheduleViewing}
            >
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Book Viewing</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Review Button */}
        <ReviewButton />
      </ScrollView>

      {/* Map Modal */}
      <Modal visible={showMap} animationType="slide" transparent={false}>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: parseFloat(property.latitude),
              longitude: parseFloat(property.longitude),
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(property.latitude),
                longitude: parseFloat(property.longitude),
              }}
              title={property.name}
              description={property.location}
              pinColor={ACCENT_COLOR}
            />
          </MapView>
          <TouchableOpacity
            style={styles.closeMapButton}
            onPress={() => setShowMap(false)}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.closeMapButtonText}>Close Map</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BACKGROUND_COLOR,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: BACKGROUND_COLOR,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
    marginVertical: 12,
  },
  errorText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imageContainer: {
    position: "relative",
    height: 300,
  },
  imageWrapper: {
    width,
    height: 300,
    position: "relative",
  },
  propertyImage: {
    width,
    height: 300,
    resizeMode: "cover",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  backButton: {
    position: "absolute",
    zIndex: 10,
    top: Platform.OS === "ios" ? 50 : 30,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activePaginationDot: {
    backgroundColor: "#fff",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  propertyInfoCard: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 156, 18, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#F39C12",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  propertyLocation: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    flex: 1,
    marginLeft: 6,
    marginRight: 8,
  },
  mapButton: {
    backgroundColor: ACCENT_COLOR,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  priceCard: {
    backgroundColor: "rgba(52, 73, 94, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  priceContainer: {
    alignItems: "flex-start",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  propertySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  checkInOutContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 152, 219, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  checkInOutItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkInOutLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginLeft: 8,
  },
  checkInOutTime: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginLeft: 8,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: DIVIDER_COLOR,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginLeft: 6,
  },
  propertyDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: TEXT_SECONDARY,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    backgroundColor: "rgba(52, 152, 219, 0.05)",
    padding: 12,
    borderRadius: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_PRIMARY,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    marginBottom: 14,
  },
  amenityIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT_COLOR_SECONDARY,
    alignItems: "center",
    justifyContent: "center",
  },
  amenityText: {
    marginLeft: 10,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  chatButton: {
    backgroundColor: SECONDARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    flex: 1,
    marginRight: 8,
    elevation: 1,
  },
  bookButton: {
    backgroundColor: ACCENT_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  reviewButton: {
    backgroundColor: SECONDARY_COLOR,
    margin: 16,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
  },
  reviewButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  reviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  closeMapButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 16,
    backgroundColor: PRIMARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  closeMapButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default PropertyScreen;
