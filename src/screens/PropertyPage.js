import React, { useState, useEffect } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const { width } = Dimensions.get("window");

function RatingStars({ rating }) {
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
}

const ImageCarousel = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const slide = Math.ceil(
            nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width,
          );
          if (slide !== activeIndex) {
            setActiveIndex(slide);
          }
        }}
      >
        {images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: `${API_BASE_URL}${image.image}` }}
            style={styles.propertyImage}
          />
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex ? styles.paginationDotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const PropertyScreen = ({ route, navigation }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [reference, setReference] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingId, setBookingId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [username, setUsername] = useState("");
  const [hasBooking, setHasBooking] = useState(false);

  const { propertyId } = route.params;

  useEffect(() => {
    fetchPropertyDetails();
  }, []);

  const checkBookingStatus = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);

      // Get the current user's username from AsyncStorage
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
      console.log(data);
      setHasBooking(data.has_booking);
    } catch (error) {
      console.error("Error checking booking status:", error);
      setHasBooking(false);
    }
  };

  // Modify the existing useEffect to also check booking status when property data is loaded
  useEffect(() => {
    if (property) {
      fetchCurrentUserReview();
      checkBookingStatus();
    }
  }, [property]);

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
  const handleScheduleViewing = () => {
    navigation.navigate("ScheduleViewing", {
      propertyId: propertyId, // Make sure propertyId is defined in your component
    });
  };

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

  const fetchPropertyDetails = async () => {
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
      console.log(data);
      setProperty(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/initiate-payment/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          property_id: propertyId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate payment");
      }

      const data = await response.json();
      console.log("Payment URL received:", data.authorization_url);
      setPaymentUrl(data.authorization_url);
      setReference(data.reference);
      setShowPaymentWebView(true);
    } catch (error) {
      console.error("Error initiating payment:", error);
      Alert.alert("Error", error.message);
    }
  };

  const closeWebView = () => {
    setShowPaymentWebView(false);
    confirmBooking();
  };

  const confirmBooking = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const requestBody = { reference: reference };
      console.log("Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/v1/confirm-booking/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(responseData, null, 2));

      if (response.ok) {
        if (responseData.success) {
          setBookingStatus("success");
          setBookingMessage("Your booking has been confirmed successfully.");
          setBookingId(responseData.booking_id); // Store the booking ID
        } else {
          setBookingStatus("pending");
          setBookingMessage(
            "Your booking is pending. Please check back later for confirmation.",
          );
        }
      } else {
        switch (response.status) {
          case 400:
            setBookingStatus("invalid");
            setBookingMessage(
              "Invalid booking request. Please check your details and try again.",
            );
            break;
          case 401:
            setBookingStatus("unauthorized");
            setBookingMessage(
              "You are not authorized to make this booking. Please log in and try again.",
            );
            break;
          case 404:
            setBookingStatus("not_found");
            setBookingMessage(
              "The booking or property could not be found. Please try again or contact support.",
            );
            break;
          case 409:
            setBookingStatus("conflict");
            setBookingMessage(
              "This property is no longer available for the selected dates.",
            );
            break;
          default:
            setBookingStatus("error");
            setBookingMessage(
              "An unexpected error occurred. Please try again or contact support.",
            );
        }
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
      setBookingStatus("error");
      setBookingMessage(
        "An error occurred while confirming your booking. Please try again or contact support.",
      );
    } finally {
      setShowResultModal(true);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    if (bookingStatus === "success") {
      navigation.navigate("BookingConfirmation", { bookingId: bookingId });
    } else if (bookingStatus === "pending") {
      navigation.navigate("BookingsList");
    }
  };

  const fetchCurrentUserReview = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      // Fetch the current user's username
      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);
      const currentUsername = userData.username;
      console.log(currentUsername);
      setUsername(currentUsername);

      let propertyType;
      if (property) {
        if ("price_per_month" in property) {
          propertyType = "rental";
        } else if ("price_per_night" in property) {
          propertyType = "per_night";
        } else {
          propertyType = "sale";
        }
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
      console.log(data);
      if (data && data.length > 0) {
        setUserReview(data[0]);
      }
    } catch (error) {
      console.error("Error fetching user review:", error);
    }
  };

  const renderActionButton = () => {
    const isRental = "price_per_month" in property;
    const isPerNight = "price_per_night" in property;

    return (
      <View style={styles.actionButtonContainer}>
        {isPerNight ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPerNight]}
            onPress={() =>
              navigation.navigate("BookingScreen", { propertyId: propertyId })
            }
          >
            <Text style={styles.actionButtonText}>Book Now</Text>
          </TouchableOpacity>
        ) : isRental ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPerMonth]}
            onPress={handleBookNow}
          >
            <Text style={styles.actionButtonText}>Book Now</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScheduleViewing}
          >
            <Text style={styles.actionButtonText}>Book Viewing</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Replace the ReviewButton component with this:
  const ReviewButton = () => {
    if (!hasBooking) {
      return null; // Don't render anything if user hasn't booked
    }

    return (
      <TouchableOpacity
        style={styles.modernReviewButton}
        onPress={() =>
          navigation.navigate("Review", {
            propertyId: property.id,
            propertyName: property.name,
            existingReview: userReview,
            isRental: "price_per_month" in property,
            isPerNight: "price_per_night" in property, // New flag for per-night properties
          })
        }
      >
        <View style={styles.modernReviewButtonContent}>
          <Ionicons
            name={userReview ? "star" : "create-outline"}
            size={24}
            color="#fff"
          />
          <Text style={styles.modernReviewButtonText}>
            {userReview ? "View Your Review" : "Write a Review"}
          </Text>
        </View>
        <View style={styles.buttonShine} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No property data available</Text>
      </View>
    );
  }

  const isRental = "price_per_month" in property;
  const isPerNight = "price_per_night" in property;

  // Function to format price in Kenyan Shillings
  const formatPrice = (price) => {
    const roundedPrice = Math.round(Number(price));
    return `KSh ${roundedPrice.toLocaleString("en-KE")}`;
  };

  return (
    <ScrollView style={styles.container}>
      {property.images && property.images.length > 0 ? (
        <ImageCarousel images={property.images} />
      ) : (
        <Image
          source={require("../../assets/room1.jpg")}
          style={styles.propertyImage}
        />
      )}
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{property.name}</Text>
        <View style={styles.locationContainer}>
          <Text
            style={styles.propertyLocation}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {property.location}
          </Text>
          <TouchableOpacity style={styles.mapButton} onPress={handleSeeOnMap}>
            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>
        </View>
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
          ) : (
            <Text style={styles.propertyPrice}>
              {formatPrice(property.price)}
            </Text>
          )}
          <RatingStars rating={property.rating || 0} />
        </View>

        {isPerNight && (
          <View style={styles.checkInOutContainer}>
            <View style={styles.checkInOutItem}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <Text style={styles.checkInOutText}>
                Check-in: {property.check_in_time}
              </Text>
            </View>
            <View style={styles.checkInOutItem}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <Text style={styles.checkInOutText}>
                Check-out: {property.check_out_time}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.propertyDescription}>{property.description}</Text>
        </View>
        <View style={styles.amenitiesContainer}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {property.amenities.map((amenity) => (
              <View key={amenity.id} style={styles.amenityItem}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#4CAF50"
                />
                <Text style={styles.amenityText}>{amenity.name}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="bed-outline" size={24} color="#666" />
              <Text style={styles.detailText}>
                {property.bedrooms} Bedrooms
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="water-outline" size={24} color="#666" />
              <Text style={styles.detailText}>
                {property.bathrooms} Bathrooms
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="resize-outline" size={24} color="#666" />
              <Text style={styles.detailText}>{property.area} sq ft</Text>
            </View>
            {isPerNight && (
              <View style={styles.detailItem}>
                <Ionicons name="home-outline" size={24} color="#666" />
                <Text style={styles.detailText}>
                  {property.number_of_units} Units
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatWithHost}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          <Text style={styles.chatButtonText}>Chat with Host</Text>
        </TouchableOpacity>
        {renderActionButton()}
      </View>
      {/* Add the new Review Button */}
      <ReviewButton />

      {/* Add the new Review Modal */}

      <Modal visible={showPaymentWebView} animationType="slide">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.closeButton} onPress={closeWebView}>
            <Ionicons name="close" size={24} color="#000" />
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
      <Modal visible={showMap} animationType="slide">
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT} // Changed from PROVIDER_GOOGLE
            mapType="standard" // Changed from hybrid
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
            />
          </MapView>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowMap(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal visible={showResultModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {bookingStatus === "success"
                ? "Booking Confirmed"
                : "Booking Status"}
            </Text>
            <Text style={styles.modalMessage}>{bookingMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseResultModal}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
  },
  propertyImage: {
    width: width,
    height: 300,
    resizeMode: "cover",
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  paginationDotActive: {
    backgroundColor: "#fff",
  },
  propertyInfo: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  propertyLocation: {
    fontSize: 16,
    color: "#666",
    flex: 1,
    marginRight: 10,
  },
  propertyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B6B",
  },
  ratingContainer: {
    flexDirection: "row",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  propertyDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
  },
  amenitiesContainer: {
    marginBottom: 20,
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
    color: "#333",
  },
  detailsContainer: {
    marginBottom: 20,
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
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  actionButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  bookingSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  bookingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  guestsInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  hostSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 16,
  },
  hostTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  hostName: {
    fontSize: 16,
    marginBottom: 12,
  },
  chatButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mapButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  doneButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  doneButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  reviewButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  reviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modernModalContent: {
    backgroundColor: "#fff",
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
  },
  modernModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#1F2937",
  },
  modernRatingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    transform: [{ scale: 1 }],
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 20,
  },
  modernInputContainer: {
    marginBottom: 24,
  },
  modernReviewInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
    fontSize: 16,
  },
  characterCount: {
    textAlign: "right",
    color: "#9CA3AF",
    marginTop: 8,
    fontSize: 12,
  },
  modernButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modernSubmitButton: {
    flex: 1,
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modernSubmitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  modernSubmitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modernCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modernCancelButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "bold",
  },
  modernReviewButton: {
    backgroundColor: "#10B981",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
  },
  modernReviewButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modernReviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  buttonShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ skewX: "-20deg" }, { translateX: -200 }],
  },
  dateLabel: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 8,
    marginTop: 16,
  },
  dateButton: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  notesLabel: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    minHeight: 120,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modernModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  notesInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    minHeight: 120,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
  },
  propertySubtitle: {
    fontSize: 16,
    color: "#666",
  },
  checkInOutContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  checkInOutItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkInOutText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
  },
});

export default PropertyScreen;
