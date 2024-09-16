import React, { useContext, useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WishlistContext } from "../../App";
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
  const { wishlist, toggleWishlist } = useContext(WishlistContext);
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
  });

  useEffect(() => {
    fetchProperties();
  }, []);

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
      setProperties(data);
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
      const price = prop.price_per_month || prop.price;
      const matchesPrice =
        parseFloat(price) >= filters.priceRange[0] &&
        parseFloat(price) <= filters.priceRange[1];
      const matchesType =
        !filters.propertyType || prop.property_type === filters.propertyType;
      const matchesYear =
        prop.year_built >= filters.yearBuilt[0] &&
        prop.year_built <= filters.yearBuilt[1];

      return matchesPrice && matchesType && matchesYear;
    });
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
        onPress={() => toggleWishlist(item)}
      >
        <Ionicons
          name={
            wishlist.some((prop) => prop.id === item.id)
              ? "heart"
              : "heart-outline"
          }
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
      <TouchableOpacity style={styles.filterButton} onPress={toggleModal}>
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>
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
  filterButton: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default HomePage;
