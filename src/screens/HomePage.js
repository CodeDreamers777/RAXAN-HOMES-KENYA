"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FilterModal from "./FilterModal";
import { FlashList } from "@shopify/flash-list";
import {
  OnboardingProvider,
  useOnboarding,
} from "../components/OnboardingTour";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const { width } = Dimensions.get("window");
const COLORS = {
  primary: "#2C3E50", // Dark blue-gray (main brand color)
  primaryLight: "#34495E", // Lighter version of primary
  primaryDark: "#1A2530", // Darker version of primary
  accent: "#3498DB", // Blue accent color
  accentLight: "#5DADE2", // Lighter accent for highlights
  success: "#2ECC71", // Green for success states
  warning: "#F39C12", // Orange for warnings
  error: "#E74C3C", // Red for errors
  gray: "#95A5A6", // Gray for subtle elements
  lightGray: "#ECF0F1", // Light gray for backgrounds
  white: "#FFFFFF", // White
  black: "#333333", // Soft black
  featuredBadge: "#F1C40F", // Yellow for featured badge
  pricePerNight: "#3498DB", // Blue for per night prices
  pricePerMonth: "#2C3E50", // Primary color for monthly prices
  pricePerSale: "#E74C3C", // Red for sales prices
};

// Extracted as a separate component for better performance
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

// Extracted as a separate component for better performance
const PropertyCard = React.memo(
  ({
    item,
    onPress,
    onWishlistToggle,
    wishlist,
    formatPrice,
    forwardedRef,
    wishlistButtonRef,
  }) => (
    <TouchableOpacity
      ref={forwardedRef}
      style={[
        styles.propertyCard,
        item.is_featured && styles.featuredPropertyCard,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Ionicons
            name="star"
            size={16}
            color="#333"
            style={styles.featuredIcon}
          />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
      <Image
        source={
          item.images && item.images.length > 0
            ? { uri: item.images[0] }
            : require("../../assets/room1.jpg")
        }
        style={styles.propertyImage}
        defaultSource={require("../../assets/room1.jpg")}
      />
      <TouchableOpacity
        ref={wishlistButtonRef}
        style={styles.wishlistButton}
        onPress={() => onWishlistToggle(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
  ),
);

// Forward ref for PropertyCard
const PropertyCardWithRef = React.forwardRef((props, ref) => (
  <PropertyCard {...props} forwardedRef={ref} />
));

// Home page content component
const HomePageContent = ({
  navigation,
  searchRef,
  filterOptionsRef,
  filterButtonRef,
  propertyCardRef,
  wishlistButtonRef,
  exploreTabRef,
  wishlistTabRef,
  inboxTabRef,
  profileTabRef,
}) => {
  const [properties, setProperties] = useState({
    properties_for_sale: [],
    rental_properties: [],
    per_night_properties: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    priceRange: [0, 100000000],
    yearBuilt: [1900, new Date().getFullYear()],
    propertyType: null,
    bedrooms: [0, 100],
    bathrooms: [0, 100],
  });
  const [wishlist, setWishlist] = useState(new Set());

  // Get onboarding context
  const { restartTour } = useOnboarding();

  const formatPrice = useCallback((price) => {
    return price
      ? `KSh ${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      : "N/A";
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await fetchCSRFToken();
        await loadWishlistFromStorage();
        await fetchProperties();
      } catch (error) {
        console.error("Error initializing data:", error);
        Alert.alert("Error", "Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
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
      throw error;
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
      throw error;
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

  // Function to handle token expiration
  const handleTokenExpiration = async (response) => {
    try {
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();

        // Check for specific token expiration error structure
        if (
          errorData.detail === "Given token not valid for any token type" &&
          errorData.code === "token_not_valid" &&
          errorData.messages &&
          errorData.messages.length > 0 &&
          errorData.messages[0].message === "Token is invalid or expired"
        ) {
          console.log("Token expired, redirecting to login...");

          // Clear tokens from storage
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");

          // Force navigation to login screen
          // We need to use a timeout to ensure the navigation happens outside of fetch promise
          setTimeout(() => {
            // Using a global navigation reference or NavigationService approach
            navigation.navigate("Login");
          }, 100);

          return true; // Token was expired and handled
        }
      }
      return false; // Not a token expiration error
    } catch (error) {
      console.error("Error handling potential token expiration:", error);
      return false;
    }
  };

  // Modified fetchProperties function with token expiration handling
  const fetchProperties = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      if (!accessTokenData) {
        throw new Error("No access token found");
      }

      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("Invalid access token format");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/properties/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        // Check if this is a token expiration error
        const isExpiredToken = await handleTokenExpiration(response);
        if (isExpiredToken) {
          return; // Stop execution if token was expired and handled
        }

        // Handle other types of errors
        throw new Error("Network response was not ok");
      }

      // Continue with regular response handling
      const data = await response.json();
      console.log(data);

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
        per_night_properties: data.per_night_properties.map((prop) => ({
          ...prop,
          is_in_wishlist: newWishlist.has(prop.id),
        })),
      };

      setProperties(updatedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      throw error;
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProperties()
      .then(() => setRefreshing(false))
      .catch(() => setRefreshing(false));
  }, []);

  const getFilteredProperties = useMemo(() => {
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

    // Filter by search text
    let filteredBySearch = baseProperties;
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filteredBySearch = baseProperties.filter(
        (prop) =>
          prop.name.toLowerCase().includes(searchLower) ||
          prop.location.toLowerCase().includes(searchLower) ||
          (prop.description &&
            prop.description.toLowerCase().includes(searchLower)),
      );
    }

    // Filter properties based on criteria
    const filteredProperties = filteredBySearch.filter((prop) => {
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
  }, [properties, filters, searchText]);

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

      // Optimistic update
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
        per_night_properties: prevProperties.per_night_properties.map((prop) =>
          prop.id === item.id
            ? { ...prop, is_in_wishlist: !prop.is_in_wishlist }
            : prop,
        ),
      }));

      // Make API call
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
    } catch (error) {
      console.error("Error updating wishlist:", error);
      Alert.alert("Error", "Failed to update wishlist. Please try again.");

      // Revert the optimistic update
      fetchProperties();
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
  };

  const navigateToProperty = useCallback(
    (item) => {
      navigation.navigate("PropertyPage", { propertyId: item.id });
    },
    [navigation],
  );

  // Handle restart tour button press
  const handleRestartTour = () => {
    restartTour();
  };

  // Log when refs are attached
  useEffect(() => {
    console.log("HomePageContent refs:");
    console.log("- searchRef:", !!searchRef.current);
    console.log("- filterOptionsRef:", !!filterOptionsRef.current);
    console.log("- filterButtonRef:", !!filterButtonRef.current);
    console.log("- propertyCardRef:", !!propertyCardRef.current);
    console.log("- wishlistButtonRef:", !!wishlistButtonRef.current);
    console.log("- exploreTabRef:", !!exploreTabRef?.current);
    console.log("- wishlistTabRef:", !!wishlistTabRef?.current);
    console.log("- inboxTabRef:", !!inboxTabRef?.current);
    console.log("- profileTabRef:", !!profileTabRef?.current);
  }, [
    searchRef.current,
    filterOptionsRef.current,
    filterButtonRef.current,
    propertyCardRef.current,
    wishlistButtonRef.current,
    exploreTabRef?.current,
    wishlistTabRef?.current,
    inboxTabRef?.current,
    profileTabRef?.current,
  ]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer} ref={searchRef}>
        <Ionicons
          name="search"
          size={24}
          color={COLORS.primary} // Update from "#228B22" to COLORS.primary
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location or description"
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterOptionsContainer} ref={filterOptionsRef}>
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

      <View style={styles.filterButtonContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={toggleModal}
          ref={filterButtonRef}
        >
          <Ionicons name="options-outline" size={18} color="#fff" />
          <Text style={styles.filterButtonText}>More Filters</Text>
        </TouchableOpacity>

        {/* Restart Tour Button */}
        <TouchableOpacity
          style={styles.restartTourButton}
          onPress={handleRestartTour}
        >
          <Ionicons name="help-circle-outline" size={18} color="#fff" />
          <Text style={styles.filterButtonText}>Restart Tour</Text>
        </TouchableOpacity>
      </View>

      {getFilteredProperties.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="search" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>No properties found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your filters or search term
          </Text>
        </View>
      ) : (
        <FlashList
          data={getFilteredProperties}
          renderItem={({ item, index }) => (
            <PropertyCardWithRef
              ref={index === 0 ? propertyCardRef : null}
              item={item}
              onPress={navigateToProperty}
              onWishlistToggle={handleWishlistToggle}
              wishlist={wishlist}
              formatPrice={formatPrice}
              wishlistButtonRef={index === 0 ? wishlistButtonRef : null}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          estimatedItemSize={300}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]} // Update from ["#228B22"]
              tintColor={COLORS.primary} // Update from "#228B22"
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FilterModal
        modalVisible={modalVisible}
        toggleModal={toggleModal}
        filters={filters}
        setFilters={setFilters}
        applyFilters={applyFilters}
      />
    </SafeAreaView>
  );
};

// Update the HomePage component to ensure refs are attached before the tour starts
function HomePage({ navigation }) {
  // Create refs for tour targets
  const searchRef = useRef(null);
  const filterOptionsRef = useRef(null);
  const filterButtonRef = useRef(null);
  const propertyCardRef = useRef(null);
  const wishlistButtonRef = useRef(null);

  // Refs for navigation tabs
  const exploreTabRef = useRef(null);
  const wishlistTabRef = useRef(null);
  const inboxTabRef = useRef(null);
  const profileTabRef = useRef(null);

  // Track if refs are ready
  const [refsReady, setRefsReady] = useState(false);

  // Check if refs are attached
  useEffect(() => {
    const checkRefs = () => {
      console.log("Checking refs:");
      console.log("- searchRef:", !!searchRef.current);
      console.log("- filterOptionsRef:", !!filterOptionsRef.current);
      console.log("- filterButtonRef:", !!filterButtonRef.current);
      console.log("- propertyCardRef:", !!propertyCardRef.current);
      console.log("- wishlistButtonRef:", !!wishlistButtonRef.current);
      console.log("- exploreTabRef:", !!exploreTabRef.current);
      console.log("- wishlistTabRef:", !!wishlistTabRef.current);
      console.log("- inboxTabRef:", !!inboxTabRef.current);
      console.log("- profileTabRef:", !!profileTabRef.current);

      if (
        searchRef.current &&
        filterOptionsRef.current &&
        filterButtonRef.current
      ) {
        console.log("Main refs are ready!");
        setRefsReady(true);
      } else {
        // Check again after a short delay
        setTimeout(checkRefs, 1000); // Increased from 500ms to 1000ms
      }
    };

    // Start checking refs after component mounts
    setTimeout(checkRefs, 1000); // Increased from 500ms to 1000ms
  }, []);

  // Define tour steps with refs
  // Define tour steps with refs and conditional inclusion
  const tourSteps = useMemo(() => {
    const steps = [
      // Welcome step - no targetRef needed
      {
        title: "Raxan Homes Guide",
        description:
          "Let's take a quick tour to help you get started with our app. Swipe left or right to navigate through the tour, or tap anywhere to continue.",
        icon: "home",
        // No targetRef for the welcome step
      },

      // Only include steps with refs that actually exist
      searchRef.current && {
        title: "Search Properties",
        description:
          "Use the search bar to find properties by name, location, or description. Type what you're looking for and we'll show you matching results.",
        icon: "search",
        targetRef: searchRef,
      },

      filterOptionsRef.current && {
        title: "Filter Options",
        description:
          "Quickly filter properties by type - view all properties, or focus on properties for sale, rental, or per-night stays.",
        icon: "filter",
        targetRef: filterOptionsRef,
      },

      filterButtonRef.current && {
        title: "Advanced Filters",
        description:
          "Need more specific results? Tap 'More Filters' to set price ranges, number of bedrooms, bathrooms, and more.",
        icon: "options",
        targetRef: filterButtonRef,
      },

      propertyCardRef.current && {
        title: "Property Cards",
        description:
          "Browse through property cards to see images, prices, and ratings.",
        icon: "card",
        targetRef: propertyCardRef,
      },

      wishlistButtonRef.current && {
        title: "Wishlist",
        description:
          "Like a property? Tap the heart icon to add it to your wishlist for easy access later.",
        icon: "heart",
        targetRef: wishlistButtonRef,
      },

      exploreTabRef?.current && {
        title: "Explore Tab",
        description:
          "This is where you are now! Browse all available properties and find your perfect home.",
        icon: "search",
        targetRef: exploreTabRef,
      },

      wishlistTabRef?.current && {
        title: "Wishlist Tab",
        description:
          "Access all your saved properties in one place. Tap to view your wishlist.",
        icon: "heart",
        targetRef: wishlistTabRef,
      },

      inboxTabRef?.current && {
        title: "Inbox Tab",
        description:
          "Communicate with property owners and manage your inquiries here.",
        icon: "chatbubble",
        targetRef: inboxTabRef,
      },

      profileTabRef?.current && {
        title: "Profile Tab",
        description:
          "View and edit your profile, manage your listings, and adjust your account settings.",
        icon: "person",
        targetRef: profileTabRef,
      },

      // Final step - no targetRef needed
      {
        title: "You're All Set!",
        description:
          "You're ready to start exploring properties! If you need to see this tour again, just tap the 'Restart Tour' button.",
        icon: "checkmark-circle",
        // No targetRef for the final step
      },
    ];

    // Filter out any falsy entries (steps with refs that don't exist)
    return steps.filter(Boolean);
  }, [
    // Add dependencies to ensure steps are recalculated when refs change
    searchRef.current,
    filterOptionsRef.current,
    filterButtonRef.current,
    propertyCardRef.current,
    wishlistButtonRef.current,
    exploreTabRef?.current,
    wishlistTabRef?.current,
    inboxTabRef?.current,
    profileTabRef?.current,
  ]);

  // Force restart the tour for testing
  useEffect(() => {
    const forceRestartTour = async () => {
      try {
        console.log("Force restarting tour for testing");
        await AsyncStorage.setItem("is_new_user", "true");
      } catch (error) {
        console.error("Error setting new user status:", error);
      }
    };

    forceRestartTour();
  }, []);

  // Log when refs change
  useEffect(() => {
    console.log("Refs updated in HomePage:");
    console.log("- searchRef:", !!searchRef.current);
    console.log("- filterOptionsRef:", !!filterOptionsRef.current);
    console.log("- filterButtonRef:", !!filterButtonRef.current);
    console.log("- propertyCardRef:", !!propertyCardRef.current);
    console.log("- wishlistButtonRef:", !!wishlistButtonRef.current);
    console.log("- exploreTabRef:", !!exploreTabRef.current);
    console.log("- wishlistTabRef:", !!wishlistTabRef.current);
    console.log("- inboxTabRef:", !!inboxTabRef.current);
    console.log("- profileTabRef:", !!profileTabRef.current);
  }, [
    searchRef.current,
    filterOptionsRef.current,
    filterButtonRef.current,
    propertyCardRef.current,
    wishlistButtonRef.current,
    exploreTabRef?.current,
    wishlistTabRef?.current,
    inboxTabRef?.current,
    profileTabRef?.current,
  ]);

  return (
    <OnboardingProvider steps={tourSteps} screenName="Explore">
      <HomePageContent
        navigation={navigation}
        searchRef={searchRef}
        filterOptionsRef={filterOptionsRef}
        filterButtonRef={filterButtonRef}
        propertyCardRef={propertyCardRef}
        wishlistButtonRef={wishlistButtonRef}
        exploreTabRef={exploreTabRef}
        wishlistTabRef={wishlistTabRef}
        inboxTabRef={inboxTabRef}
        profileTabRef={profileTabRef}
      />
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.primary,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    shadowColor: COLORS.black,
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
    color: "#333",
  },
  filterButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restartTourButton: {
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    color: "#fff",
    fontWeight: "500",
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
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
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  priceText: {
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  pricePerMonth: {
    color: COLORS.primary,
  },
  pricePerNight: {
    color: COLORS.pricePerNight,
  },
  pricePerSale: {
    color: COLORS.pricePerSale,
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
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  activeFilterOption: {
    backgroundColor: COLORS.primary,
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
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: COLORS.black,
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
    backgroundColor: COLORS.featuredBadge,
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
    color: "#333",
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});

export default HomePage;
