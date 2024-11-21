import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FilterModal from "./FilterModal";

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

function HomePage({ navigation }) {
  const [properties, setProperties] = useState({
    properties_for_sale: [],
    rental_properties: [],
    per_night_properties: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    priceRange: [0, 100000000],
    yearBuilt: [1900, new Date().getFullYear()],
    propertyType: null,
    bedrooms: [0, 10],
    bathrooms: [0, 10],
  });
  const [wishlist, setWishlist] = useState(new Set());

  const formatPrice = (price) => {
    return price
      ? `KSh ${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      : "N/A";
  };

  useEffect(() => {
    fetchCSRFToken();
    loadWishlistFromStorage();
    fetchProperties();
  }, []);

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      await AsyncStorage.setItem("csrfToken", data.csrfToken);
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
    }
  };

  const loadWishlistFromStorage = async () => {
    try {
      const storedWishlist = await AsyncStorage.getItem("wishlist");
      if (storedWishlist) {
        setWishlist(new Set(JSON.parse(storedWishlist)));
      }
    } catch (error) {
      console.error("Error loading wishlist from storage:", error);
    }
  };

  const saveWishlistToStorage = async (newWishlist) => {
    try {
      await AsyncStorage.setItem(
        "wishlist",
        JSON.stringify(Array.from(newWishlist)),
      );
    } catch (error) {
      console.error("Error saving wishlist to storage:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/properties/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("This is the data");
      console.log(data);

      // Fetch wishlist from the server
      const wishlistResponse = await fetch(`${API_BASE_URL}/api/v1/wishlist/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Referer: API_BASE_URL,
        },
      });
      console.log(wishlistResponse);

      if (!wishlistResponse.ok) {
        throw new Error("Failed to fetch wishlist");
      }

      const wishlistData = await wishlistResponse.json();
      const newWishlist = new Set(wishlistData.map((item) => item.property_id));

      // Update local storage and state with the new wishlist
      setWishlist(newWishlist);
      saveWishlistToStorage(newWishlist);

      // Update properties with wishlist status
      const updatedProperties = {
        properties_for_sale: data.properties_for_sale.map((prop) => ({
          ...prop,
          is_in_wishlist: newWishlist.has(prop.id),
        })),
        rental_properties: data.rental_properties.map((prop) => ({
          ...prop,
          is_in_wishlist: newWishlist.has(prop.id),
        })),
        per_night_properties: data.per_night_properties.map((prop) => ({
          ...prop,
          is_in_wishlist: newWishlist.has(prop.id),
        })),
      };

      setProperties(updatedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProperties().then(() => setRefreshing(false));
  }, []);

  const getFilteredProperties = () => {
    let baseProperties = [];
    if (filters.type === "sale") {
      baseProperties = [...properties.properties_for_sale];
    } else if (filters.type === "rental") {
      baseProperties = [...properties.rental_properties];
    } else if (filters.type === "per_night") {
      baseProperties = [...properties.per_night_properties];
    } else {
      baseProperties = [
        ...properties.properties_for_sale,
        ...properties.rental_properties,
        ...properties.per_night_properties,
      ];
    }

    // Filter properties based on criteria
    const filteredProperties = baseProperties.filter((prop) => {
      const price = prop.price_per_month || prop.price_per_night || prop.price;
      const matchesPrice =
        price >= filters.priceRange[0] && price <= filters.priceRange[1];

      const matchesType =
        !filters.propertyType || prop.property_type === filters.propertyType;

      const matchesYear =
        !prop.year_built ||
        (prop.year_built >= filters.yearBuilt[0] &&
          prop.year_built <= filters.yearBuilt[1]);

      const matchesBedrooms =
        prop.bedrooms >= filters.bedrooms[0] &&
        prop.bedrooms <= filters.bedrooms[1];

      const matchesBathrooms =
        prop.bathrooms >= filters.bathrooms[0] &&
        prop.bathrooms <= filters.bathrooms[1];

      return (
        matchesPrice &&
        matchesType &&
        matchesYear &&
        matchesBedrooms &&
        matchesBathrooms
      );
    });

    // Sort properties to show featured ones first
    return filteredProperties.sort((a, b) => {
      if (a.is_featured === b.is_featured) {
        return 0;
      }
      return a.is_featured ? -1 : 1;
    });
  };

  const handleWishlistToggle = async (item) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const method = wishlist.has(item.id) ? "DELETE" : "POST";

      // Determine property type
      const propertyType = item.price_per_night
        ? "per_night"
        : item.price_per_month
          ? "rental"
          : "sale";

      const response = await fetch(`${API_BASE_URL}/api/v1/wishlist/`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          property_type: propertyType,
          property_id: item.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update wishlist");
      }

      // Update the local wishlist state
      const newWishlist = new Set(wishlist);
      if (wishlist.has(item.id)) {
        newWishlist.delete(item.id);
      } else {
        newWishlist.add(item.id);
      }
      setWishlist(newWishlist);
      saveWishlistToStorage(newWishlist);

      // Update the local state to reflect the change
      setProperties((prevProperties) => ({
        ...prevProperties,
        properties_for_sale: prevProperties.properties_for_sale.map((prop) =>
          prop.id === item.id
            ? { ...prop, is_in_wishlist: !prop.is_in_wishlist }
            : prop,
        ),
        rental_properties: prevProperties.rental_properties.map((prop) =>
          prop.id === item.id
            ? { ...prop, is_in_wishlist: !prop.is_in_wishlist }
            : prop,
        ),
      }));
    } catch (error) {
      console.error("Error updating wishlist:", error);
      Alert.alert("Error", "Failed to update wishlist. Please try again.");
    }
  };

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const applyFilters = () => {
    toggleModal();
  };

  const handleFilterOptionPress = (option) => {
    setFilters({ ...filters, type: option });
    toggleModal();
  };

  const renderPropertyCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.propertyCard,
        item.is_featured && styles.featuredPropertyCard,
      ]}
      onPress={() =>
        navigation.navigate("PropertyPage", { propertyId: item.id })
      }
    >
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Ionicons
            name="star"
            size={16}
            color="#000"
            style={styles.featuredIcon}
          />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
      <Image
        source={
          item.images && item.images.length > 0
            ? { uri: `${API_BASE_URL}${item.images[0].image}` }
            : require("../../assets/room1.jpg")
        }
        style={styles.propertyImage}
      />
      <TouchableOpacity
        style={styles.wishlistButton}
        onPress={() => handleWishlistToggle(item)}
      >
        <Ionicons
          name={wishlist.has(item.id) ? "heart" : "heart-outline"}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <View style={styles.propertyInfo}>
        <Text
          style={styles.propertyTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        <Text
          style={styles.propertyLocation}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.location}
        </Text>
        <View style={styles.propertyDetails}>
          <RatingStars rating={item.rating || 0} />
          <View style={styles.priceContainer}>
            {item.price_per_night && (
              <Text style={[styles.priceText, styles.pricePerNight]}>
                {formatPrice(item.price_per_night)}/Night
              </Text>
            )}
            {item.price_per_month && (
              <Text style={[styles.priceText, styles.pricePerMonth]}>
                {formatPrice(item.price_per_month)}/Month
              </Text>
            )}
            {item.price && (
              <Text style={[styles.priceText, styles.pricePerSale]}>
                {formatPrice(item.price)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={24}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          placeholderTextColor="#666"
        />
      </View>
      <View style={styles.filterOptionsContainer}>
        <TouchableOpacity
          style={[
            styles.filterOption,
            filters.type === "all" && styles.activeFilterOption,
          ]}
          onPress={() => handleFilterOptionPress("all")}
        >
          <Text
            style={[
              styles.filterOptionText,
              filters.type === "all" && styles.activeFilterOptionText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterOption,
            filters.type === "sale" && styles.activeFilterOption,
          ]}
          onPress={() => handleFilterOptionPress("sale")}
        >
          <Text
            style={[
              styles.filterOptionText,
              filters.type === "sale" && styles.activeFilterOptionText,
            ]}
          >
            For Sale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterOption,
            filters.type === "rental" && styles.activeFilterOption,
          ]}
          onPress={() => handleFilterOptionPress("rental")}
        >
          <Text
            style={[
              styles.filterOptionText,
              filters.type === "rental" && styles.activeFilterOptionText,
            ]}
          >
            Rental
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterOption,
            filters.type === "per_night" && styles.activeFilterOption,
          ]}
          onPress={() => handleFilterOptionPress("per_night")}
        >
          <Text
            style={[
              styles.filterOptionText,
              filters.type === "per_night" && styles.activeFilterOptionText,
            ]}
          >
            Per Night
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getFilteredProperties()}
        renderItem={renderPropertyCard}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4a90e2"]}
            tintColor="#4a90e2"
          />
        }
        contentContainerStyle={styles.listContainer}
      />
      <FilterModal
        modalVisible={modalVisible}
        toggleModal={toggleModal}
        filters={filters}
        setFilters={setFilters}
        applyFilters={applyFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  wishlistButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 8,
  },
  priceTag: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  priceText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  pricePerNight: {
    color: "#4a90e2",
  },
  pricePerMonth: {
    color: "#228B22",
  },
  pricePerSale: {
    color: "#FF6347",
  },
  propertyInfo: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  propertyLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  propertyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
  },
  filterOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  activeFilterOption: {
    backgroundColor: "#4a90e2",
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  activeFilterOptionText: {
    color: "#fff",
  },
  featuredPropertyCard: {
    borderColor: "#FFD700",
    borderWidth: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  featuredBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  featuredIcon: {
    marginRight: 4,
  },
  featuredText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
});

export default HomePage;
