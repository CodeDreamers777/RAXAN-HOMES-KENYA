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
const PRIMARY_COLOR = "#2E7D32"; // Dark green
const SECONDARY_COLOR = "#4CAF50"; // Medium green
const ACCENT_COLOR = "#8BC34A"; // Light green
const BACKGROUND_COLOR = "#F5F5F5";
const TEXT_PRIMARY = "#212121";
const TEXT_SECONDARY = "#757575";

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
          color="#FFD700"
        />
      ))}
      {hasHalfStar && <Ionicons name="star-half" size={16} color="#FFD700" />}
      {[...Array(5 - Math.ceil(rating))].map((_, index) => (
        <Ionicons
          key={`empty-star-${index}`}
          name="star-outline"
          size={16}
          color="#FFD700"
        />
      ))}
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
      <Image
        source={require("../../assets/room1.jpg")}
        style={styles.propertyImage}
      />
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image }}
            style={styles.propertyImage}
            onError={(e) =>
              console.log(`Image load error for ${image}:`, e.nativeEvent.error)
            }
          />
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
    <Ionicons name={icon} size={22} color={PRIMARY_COLOR} />
    <Text style={styles.detailText}>{text}</Text>
  </View>
));

// Amenity Item Component
const AmenityItem = React.memo(({ name }) => (
  <View style={styles.amenityItem}>
    <Ionicons name="checkmark-circle" size={18} color={SECONDARY_COLOR} />
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
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPropertyDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data state
  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No property data available</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPropertyDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
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
        {/* Property Images */}
        <ImageCarousel images={property.images} />

        {/* Property Info Card */}
        <View style={styles.propertyInfoCard}>
          {/* Title and Location */}
          <Text style={styles.propertyTitle}>{property.name}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={18} color={PRIMARY_COLOR} />
            <Text
              style={styles.propertyLocation}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {property.location}
            </Text>
            <TouchableOpacity style={styles.mapButton} onPress={handleSeeOnMap}>
              <Text style={styles.mapButtonText}>View Map</Text>
            </TouchableOpacity>
          </View>

          {/* Price and Rating */}
          <View style={styles.propertyDetails}>
            {isPerNight ? (
              <View>
                <Text style={styles.propertyPrice}>
                  {formatPrice(property.price_per_night)}/Night
                </Text>
                <Text style={styles.propertySubtitle}>
                  {property.min_nights} night minimum stay
                </Text>
                {property.max_nights > 0 && (
                  <Text style={styles.propertySubtitle}>
                    {property.max_nights} night maximum stay
                  </Text>
                )}
              </View>
            ) : isRental ? (
              <Text style={styles.propertyPrice}>
                {formatPrice(property.price_per_month)}/Month
              </Text>
            ) : (
              <Text style={styles.propertyPrice}>
                {formatPrice(property.price)}
              </Text>
            )}
            <RatingStars rating={property.rating || 0} />
          </View>

          {/* Check-in/Check-out for Per Night Properties */}
          {isPerNight && (
            <View style={styles.checkInOutContainer}>
              <View style={styles.checkInOutItem}>
                <Ionicons name="time-outline" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.checkInOutText}>
                  Check-in: {property.check_in_time}
                </Text>
              </View>
              <View style={styles.checkInOutItem}>
                <Ionicons name="time-outline" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.checkInOutText}>
                  Check-out: {property.check_out_time}
                </Text>
              </View>
            </View>
          )}

          {/* Property Description */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.propertyDescription}>
              {property.description}
            </Text>
          </View>

          {/* Property Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Property Details</Text>
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

          {/* Amenities */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Amenities</Text>
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
              pinColor={PRIMARY_COLOR}
            />
          </MapView>
          <TouchableOpacity
            style={styles.closeMapButton}
            onPress={() => setShowMap(false)}
          >
            <Ionicons name="close-circle" size={24} color="#fff" />
            <Text style={styles.closeMapButtonText}>Close</Text>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: BACKGROUND_COLOR,
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  propertyImage: {
    width,
    height: 280,
    resizeMode: "cover",
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
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  propertyInfoCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  propertyLocation: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    flex: 1,
    marginLeft: 4,
    marginRight: 8,
  },
  mapButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 12,
  },
  propertyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  propertySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row",
  },
  checkInOutContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  checkInOutItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkInOutText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginLeft: 6,
  },
  sectionContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  propertyDescription: {
    fontSize: 14,
    lineHeight: 22,
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
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
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
    marginBottom: 10,
  },
  amenityText: {
    marginLeft: 8,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chatButton: {
    backgroundColor: SECONDARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  bookButton: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
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
