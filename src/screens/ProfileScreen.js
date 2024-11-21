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

  const renderHeader = () => (
    <LinearGradient
      colors={["#2d6a4f", "#1b4332"]}
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
          <Ionicons name="pencil" size={18} color="#fff" />
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
            <Ionicons name="star-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>View All Ratings</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.viewBookingsButton]}
          onPress={handleViewMyBookings}
        >
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.viewBookingsButton]}
          onPress={handlePerNightBookings}
        >
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>View Per Night Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.forSaleBookingsButton]}
          onPress={handleForSaleBookings}
        >
          <Ionicons name="home-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>For Sale Bookings</Text>
        </TouchableOpacity>

        {profile?.user_type === "SELLER" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.addPlaceButton]}
              onPress={handleAddPlace}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Add your place</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewListingsButton]}
              onPress={handleViewMyListings}
            >
              <Ionicons name="list-outline" size={24} color="#fff" />
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
          <Ionicons name="settings-outline" size={24} color="#333" />
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
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
        <ActivityIndicator size="large" color="#0d1b21" />
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
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: "#e0e0e0",
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 16,
    color: "#e0e0e0",
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
    color: "#fff",
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
    color: "#333",
  },
  addPlaceButton: {
    backgroundColor: "#0d1b21",
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
  viewListingsButton: {
    backgroundColor: "#1c3640",
  },
  addPlaceText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
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
  },
  settingsText: {
    fontSize: 18,
    color: "#333",
    flex: 1,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: "#e53935",
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
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  reviewItem: {
    backgroundColor: "#fff",
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
    color: "#333",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewRating: {
    fontSize: 14,
    color: "#FFA000",
    marginLeft: 5,
  },
  reviewContent: {
    fontSize: 14,
    color: "#666",
  },
  viewBookingsButton: {
    backgroundColor: "#2c5282",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
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
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#0d1b21",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#0d1b21",
    fontWeight: "bold",
  },
  planContent: {
    width: "100%",
    marginBottom: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0d1b21",
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 18,
    color: "#4a4a4a",
    marginBottom: 20,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  feature: {
    fontSize: 16,
    color: "#4a4a4a",
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: "#0d1b21",
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
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  ratingsButton: {
    backgroundColor: "#FFA000", // Golden color to match the star theme
  },
  addPlaceButton: {
    backgroundColor: "#0d1b21",
  },
  viewListingsButton: {
    backgroundColor: "#1c3640",
  },
  viewBookingsButton: {
    backgroundColor: "#2c5282",
  },
  forSaleBookingsButton: {
    backgroundColor: "#1e40af", // Deep blue color to differentiate from other booking button
  },
});

export default ProfileScreen;
