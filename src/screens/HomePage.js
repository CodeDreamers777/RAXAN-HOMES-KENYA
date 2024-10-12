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
  });
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    priceRange: [0, 1000000],
    yearBuilt: [1900, new Date().getFullYear()],
    propertyType: null,
    bedrooms: [0, 10],
    bathrooms: [0, 10],
  });
  const [wishlist, setWishlist] = useState(new Set());

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
      const storedWishlist = await AsyncStorage.getItem('wishlist');
      if (storedWishlist) {
        setWishlist(new Set(JSON.parse(storedWishlist)));
      }
    } catch (error) {
      console.error("Error loading wishlist from storage:", error);
    }
  };

  const saveWishlistToStorage = async (newWishlist) => {
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(Array.from(newWishlist)));
    } catch (error) {
      console.error("Error saving wishlist to storage:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
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

      // Fetch wishlist from the server
      const wishlistResponse = await fetch(`${API_BASE_URL}/api/v1/wishlist/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Referer: API_BASE_URL,
        },
      });

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
    let filteredProps = [];

    if (filters.type === "rental") {
      filteredProps = properties.rental_properties || [];
    } else if (filters.type === "sale") {
      filteredProps = properties.properties_for_sale || [];
    } else {
      filteredProps = [
        ...(properties.rental_properties || []),
        ...(properties.properties_for_sale || []),
      ];
    }

    return filteredProps.filter((prop) => {
      const price =
        prop.price_per_month !== undefined ? prop.price_per_month : prop.price;
      const matchesPrice =
        parseFloat(price) >= filters.priceRange[0] &&
        parseFloat(price) <= filters.priceRange[1];
      const matchesType =
        !filters.propertyType || prop.property_type === filters.propertyType;
      const matchesYear =
        !prop.year_built ||
        (prop.year_built >= filters.yearBuilt[0] &&
          prop.year_built <= filters.yearBuilt[1]);
      const matchesBedrooms =
        prop.bedrooms >= filters.bedrooms[0] &&
        prop.bedrooms <= filters.bedrooms[1];

      return matchesPrice && matchesType && matchesYear && matchesBedrooms;
    });
  };

  const handleWishlistToggle = async (item) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const method = wishlist.has(item.id) ? "DELETE" : "POST";
      const propertyType = item.price_per_month ? "rental" : "sale";

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
            : prop
        ),
        rental_properties: prevProperties.rental_properties.map((prop) =>
          prop.id === item.id
            ? { ...prop, is_in_wishlist: !prop.is_in_wishlist }
            : prop
        ),
      }));
    } catch (error) {
      console.error("Error updating wishlist:", error);
      Alert.alert("Error", "Failed to update wishlist. Please try again.");
    }
  };

  const renderProperty = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyCard}
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
      <View style={styles.priceTag}>
        <Text style={styles.priceText}>
          {item.price_per_month
            ? `$${item.price_per_month}/Month`
            : `$${item.price}`}
        </Text>
      </View>
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
        </View>
      </View>
    </TouchableOpacity>
  );

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
      </View>
      <FlatList
        data={getFilteredProperties()}
        renderItem={renderProperty}
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
  priceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
});

export default HomePage;
