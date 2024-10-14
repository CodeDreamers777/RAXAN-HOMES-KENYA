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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

  const { propertyId } = route.params;

  useEffect(() => {
    fetchPropertyDetails();
  }, []);

  const handleSeeOnMap = () => {
    if (property.latitude && property.longitude) {
      setShowMap(true);
    } else {
      Alert.alert(
        "Error",
        "Location coordinates are not available for this property.",
      );
    }
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
      const accessToken = await AsyncStorage.getItem("accessToken");
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
      console.log(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
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
      const accessToken = await AsyncStorage.getItem("accessToken");
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
  // Function to format price in Kenyan Shillings
  const formatPrice = (price) => {
    // Convert to number if it's a string, then round to nearest whole number
    const roundedPrice = Math.round(Number(price));
    // Format with thousands separator
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
          <Text style={styles.propertyLocation}>{property.location}</Text>
          <TouchableOpacity style={styles.mapButton} onPress={handleSeeOnMap}>
            <Text style={styles.mapButtonText}>See on Map</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyPrice}>
            {isRental
              ? `${formatPrice(property.price_per_month)}/Month`
              : formatPrice(property.price)}
          </Text>
          <RatingStars rating={property.rating || 0} />
        </View>
        <Text style={styles.propertyDescription}>{property.description}</Text>
        <View style={styles.amenitiesContainer}>
          <Text style={styles.amenitiesTitle}>Amenities:</Text>
          {property.amenities.map((amenity) => (
            <Text key={amenity.id} style={styles.amenity}>
              {amenity.name}
            </Text>
          ))}
        </View>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="bed-outline" size={24} color="#666" />
            <Text style={styles.detailText}>{property.bedrooms} Bedrooms</Text>
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
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatWithHost}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          <Text style={styles.chatButtonText}>Chat with Host</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleBookNow}>
          <Text style={styles.actionButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

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
            provider={PROVIDER_GOOGLE}
            mapType="hybrid"
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
    marginBottom: 8,
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
  propertyDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  amenitiesContainer: {
    marginBottom: 16,
  },
  amenitiesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  amenity: {
    fontSize: 16,
    marginBottom: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
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
    paddingHorizontal: 10,
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
});

export default PropertyScreen;
