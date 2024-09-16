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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

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

  const { propertyId } = route.params;

  useEffect(() => {
    fetchPropertyDetails();
  }, []);

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
        console.log(response.json());
        throw new Error("Failed to fetch property details");
      }

      const data = await response.json();
      setProperty(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
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
        <Text style={styles.propertyLocation}>{property.location}</Text>
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyPrice}>
            {isRental
              ? `$${property.price_per_month}/Month`
              : `$${property.price}`}
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
          {isRental && (
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.detailText}>
                Max {property.max_guests} guests
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            /* Handle booking or buying */
          }}
        >
          <Text style={styles.actionButtonText}>
            {isRental ? "Book Now" : "Buy Now"}
          </Text>
        </TouchableOpacity>
      </View>
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
});

export default PropertyScreen;
