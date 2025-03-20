import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

// Import default user profile image
import defaultUserProfileImage from "../../assets/user-profile.jpg";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

// Green theme colors
const COLORS = {
  primary: "#2E7D32", // Dark green
  primaryDark: "#1B5E20", // Darker green for gradients
  primaryLight: "#4CAF50", // Medium green
  secondary: "#A5D6A7", // Light green
  background: "#F1F8E9", // Very light green/off-white
  text: "#1B5E20", // Very dark green
  textSecondary: "#33691E", // Dark olive green
  textLight: "#E8F5E9", // Very light green for text on dark backgrounds
  border: "#81C784", // Medium light green
  white: "#FFFFFF",
  error: "#D32F2F", // Red for errors and logout
  accent: "#66BB6A", // Medium green for accents
  highlight: "#C8E6C9", // Very light green for highlights
  buttonGradientStart: "#43A047", // Start of button gradient
  buttonGradientEnd: "#2E7D32", // End of button gradient
};

const fetchCSRFToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

function ProfileScreen() {
  const [csrfToken, setCSRFToken] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [reviews, setReviews] = useState([]);
  const navigation = useNavigation();

  const handleAddPlace = () => {
    navigation.navigate("AddProperty");
  };

  const handleViewMyListings = () => {
    navigation.navigate("ViewMyListings");
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfile", { profile });
  };
  const handlePerNightBookings = () => {
    navigation.navigate("PerNightBookings");
  };

  const handleViewMyBookings = () => {
    navigation.navigate("BookingsScreen");
  };

  const handleForSaleBookings = () => {
    navigation.navigate("ViewingsList");
  };
  const handleSettingsPress = () => {
    navigation.navigate("Settings");
  };
  const handleViewRatings = () => {
    // Navigate to a new screen to display all ratings
    navigation.navigate("ViewRatings", { ratings: reviews });
  };

  const fetchProfileData = async () => {
    try {
      const token = await fetchCSRFToken();
      setCSRFToken(token);
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      console.log(accessToken);
      if (!accessToken) {
        throw new Error("No access token found");
      }
      const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Referer: API_BASE_URL,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const profileData = await response.json();
      setProfile(profileData);
      console.log(profileData);

      // Save user type to AsyncStorage
      await AsyncStorage.setItem("userType", profileData.user_type);

      // Save entire user profile data to AsyncStorage
      await AsyncStorage.setItem("userData", JSON.stringify(profileData));

      const reviewsResponse = await fetch(
        `${API_BASE_URL}/api/v1/properties/user_property_reviews/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const reviewsData = await reviewsResponse.json();
      console.log(reviewsData);
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        credentials: "include",
      });

      const data = await response.json();
      console.log(data);

      if (data.success) {
        await AsyncStorage.removeItem("accessToken");
        navigation.navigate("Login");
      } else {
        Alert.alert(
          "Logout Failed",
          data.message ||
            "An error occurred while logging out. Please try again.",
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert(
        "Error",
        "An error occurred while logging out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  };
  const imageUrl = profile?.profile_picture
    ? `${API_BASE_URL}${profile.profile_picture}`
    : null;
  console.log("Image URL:", imageUrl);

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.profileHeader}
    >
      <Image
        source={
          profile?.profile_picture
            ? { uri: `${API_BASE_URL}${profile.profile_picture}` }
            : defaultUserProfileImage
        }
        style={styles.profileImage}
      />
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{profile?.username || "N/A"}</Text>
        <Text style={styles.profileEmail}>{profile?.email || "N/A"}</Text>
        <Text style={styles.profilePhone}>
          {profile?.phone_number || "Phone not provided"}
        </Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="pencil" size={18} color={COLORS.white} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderFooter = () => (
    <>
      <View style={styles.profileSection}>
        {/* Only show ratings button for sellers */}
        {profile?.user_type === "SELLER" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.ratingsButton]}
            onPress={handleViewRatings}
          >
            <Ionicons name="star-outline" size={24} color={COLORS.white} />
            <Text style={styles.actionButtonText}>View All Ratings</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.forSaleBookingsButton]}
          onPress={handleForSaleBookings}
        >
          <Ionicons name="home-outline" size={24} color={COLORS.white} />
          <Text style={styles.actionButtonText}>View Bookings</Text>
        </TouchableOpacity>

        {profile?.user_type === "SELLER" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.addPlaceButton]}
              onPress={handleAddPlace}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={COLORS.white}
              />
              <Text style={styles.actionButtonText}>Add your place</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewListingsButton]}
              onPress={handleViewMyListings}
            >
              <Ionicons name="list-outline" size={24} color={COLORS.white} />
              <Text style={styles.actionButtonText}>View My Listings</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        data={[]}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  editProfileText: {
    fontSize: 16,
    color: COLORS.white,
    marginLeft: 5,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: COLORS.text,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  addPlaceButton: {
    backgroundColor: COLORS.primary,
  },
  viewListingsButton: {
    backgroundColor: COLORS.primaryDark,
  },
  forSaleBookingsButton: {
    backgroundColor: COLORS.primaryLight,
  },
  ratingsButton: {
    backgroundColor: "#8BC34A", // Lighter green for ratings button
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsText: {
    fontSize: 18,
    color: COLORS.text,
    flex: 1,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  reviewItem: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewRating: {
    fontSize: 14,
    color: "#8BC34A", // Light green for ratings
    marginLeft: 5,
  },
  reviewContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  viewBookingsButton: {
    backgroundColor: COLORS.primaryLight,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  planContent: {
    width: "100%",
    marginBottom: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  feature: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
});

export default ProfileScreen;
