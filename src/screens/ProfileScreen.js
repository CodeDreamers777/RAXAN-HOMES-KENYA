import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AddPropertyPage from "./AddProperty";

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
  const [showModal, setShowModal] = useState(false);
  const [csrfToken, setCSRFToken] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [rentalProperties, setRentalProperties] = useState([]);
  const [propertiesForSale, setPropertiesForSale] = useState([]);
  const [reviews, setReviews] = useState([]);
  const navigation = useNavigation();

  const handleAddPlace = () => {
    navigation.navigate("AddProperty");
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = await fetchCSRFToken();
        setCSRFToken(token);

        const accessToken = await AsyncStorage.getItem("accessToken");
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
          console.log(response);
          throw new Error("Failed to fetch profile");
        }

        const profileData = await response.json();
        console.log(profileData);
        setProfile(profileData);

        // Fetch favorite properties (for clients)
        if (profileData.user_type === "CLIENT") {
          const favoritesResponse = await fetch(
            `${API_BASE_URL}/api/v1/favorites/`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          const favoritesData = await favoritesResponse.json();
          setFavoriteProperties(favoritesData);
        }

        // Fetch listed properties (for sellers)
        if (profileData.user_type === "SELLER") {
          const listedResponse = await fetch(
            `${API_BASE_URL}/api/v1/properties/user_properties/`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          const listedData = await listedResponse.json();
          setRentalProperties(listedData.rental_properties || []);
          setPropertiesForSale(listedData.properties_for_sale || []);
        }

        // Fetch reviews (for both clients and sellers)
        const reviewsResponse = await fetch(
          `${API_BASE_URL}/api/v1/properties/user_property_reviews/`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/v1/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Authorization: `Bearer ${accessToken}`,
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

  const renderPropertyItem = ({ item }) => (
    <View style={styles.propertyItem}>
      <Image
        source={{
          uri: item.images[0]?.image || "https://via.placeholder.com/150",
        }}
        style={styles.propertyImage}
      />
      <Text style={styles.propertyTitle}>{item.name}</Text>
      <Text style={styles.propertyPrice}>
        {item.price_per_month
          ? `$${item.price_per_month}/month`
          : `$${item.price}`}
      </Text>
    </View>
  );

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewAuthor}>{item.author}</Text>
      <Text style={styles.reviewRating}>Rating: {item.rating}/5</Text>
      <Text style={styles.reviewContent}>{item.content}</Text>
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.profileHeader}>
        <Image
          source={
            profile?.profile_picture
              ? { uri: profile.profile_picture }
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
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={18} color="#4CAF50" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {profile?.user_type === "SELLER" && (
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.addPlaceButton}
            onPress={handleAddPlace}
          >
            <Text style={styles.addPlaceText}>Add your place</Text>
          </TouchableOpacity>
        </View>
      )}

      {profile?.user_type === "CLIENT" && favoriteProperties.length > 0 && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Favorite Properties</Text>
          <FlatList
            data={favoriteProperties}
            renderItem={renderPropertyItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {profile?.user_type === "SELLER" &&
        (rentalProperties.length > 0 || propertiesForSale.length > 0) && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Your Listed Properties</Text>
            {rentalProperties.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Rental Properties</Text>
                <FlatList
                  data={rentalProperties}
                  renderItem={renderPropertyItem}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}
            {propertiesForSale.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Properties For Sale</Text>
                <FlatList
                  data={propertiesForSale}
                  renderItem={renderPropertyItem}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}
          </View>
        )}

      {reviews.length > 0 && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Reviews</Text>
        </View>
      )}
    </>
  );

  const renderFooter = () => (
    <>
      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.settingsButton}>
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color="#333" />
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
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profile</Text>
          </View>
          <View style={styles.modalContent}>
            <Image
              source={
                profile?.profile_picture
                  ? { uri: profile.profile_picture }
                  : defaultUserProfileImage
              }
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.user?.username || "N/A"}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email || "N/A"}</Text>
              <Text style={styles.profilePhone}>
                {profile?.phone_number || "Phone not provided"}
              </Text>
              <TouchableOpacity style={styles.editProfileButton}>
                <Ionicons name="pencil" size={18} color="#4CAF50" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  editProfileText: {
    fontSize: 16,
    color: "#4CAF50",
    marginLeft: 5,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  addPlaceButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addPlaceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#e53935",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    color: "#333",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  propertyItem: {
    width: 200,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  propertyImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  propertyPrice: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  reviewItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  reviewRating: {
    fontSize: 14,
    color: "#FFA000",
    marginBottom: 5,
  },
  reviewContent: {
    fontSize: 14,
    color: "#666",
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
    color: "#666",
  },
});

export default ProfileScreen;
