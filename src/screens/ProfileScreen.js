import React, { useState, useEffect, useRef } from "react";
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
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef(null);
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
  const handleViewMyBookings = () => {
    navigation.navigate("BookingsScreen");
  };
  const handleSettingsPress = () => {
    navigation.navigate("Settings");
  };

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
        throw new Error("Failed to fetch profile");
      }
      const profileData = await response.json();
      setProfile(profileData);
      await AsyncStorage.setItem("userType", profileData.user_type);

      // Fetch subscription plans
      const plansResponse = await fetch(
        `${API_BASE_URL}/api/v1/subscription-plans/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const plansData = await plansResponse.json();
      setSubscriptionPlans(plansData);

      // Check if user has no subscription
      if (profileData.subscription === null) {
        setShowSubscriptionModal(true);
      }

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

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSubscribe = async (planId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/initiate-subscription/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
          body: JSON.stringify({ plan_id: planId }),
        },
      );

      const data = await response.json();
      if (data.payment_url && data.reference) {
        setPaymentUrl(data.payment_url);
        setPaymentReference(data.reference);
        setShowWebView(true);
      } else {
        Alert.alert(
          "Error",
          "Failed to initiate subscription. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error initiating subscription:", error);
      Alert.alert(
        "Error",
        "An error occurred while initiating the subscription. Please try again.",
      );
    }
  };

  const handleWebViewClose = async () => {
    setShowWebView(false);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const csrfToken = await AsyncStorage.getItem("csrfToken");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/verify-subscription/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
          body: JSON.stringify({ reference: paymentReference }),
        },
      );

      const data = await response.json();
      if (data.message === "Subscription updated successfully") {
        Alert.alert(
          "Success",
          "Your subscription has been updated successfully.",
        );
        // Reload the profile data and close the subscription modal
        await fetchProfileData();
        setShowSubscriptionModal(false);
      } else {
        Alert.alert(
          "Error",
          "Failed to verify subscription. Please contact support.",
        );
      }
    } catch (error) {
      console.error("Error verifying subscription:", error);
      Alert.alert(
        "Error",
        "An error occurred while verifying the subscription. Please try again.",
      );
    }
  };

  const WebViewModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showWebView}
      onRequestClose={handleWebViewClose}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            padding: 10,
          }}
        >
          <TouchableOpacity
            onPress={handleWebViewClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: paymentUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={(navState) => {
            // You can add logic here to detect when the payment is complete
            // and automatically close the WebView if needed
          }}
        />
      </SafeAreaView>
    </Modal>
  );

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

  const renderSubscriptionPlan = ({ item }) => (
    <View style={styles.planCard}>
      <Text style={styles.planName}>{item.name}</Text>
      <Text style={styles.planPrice}>KSH {item.price}</Text>
      <Text style={styles.planLimit}>
        {item.properties_for_sale_limit === 0
          ? "Unlimited listings"
          : `${item.properties_for_sale_limit} listings`}
      </Text>
      {profile?.subscription === item.id ? (
        <View style={styles.subscribedButton}>
          <Text style={styles.subscribedButtonText}>Subscribed</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => handleSubscribe(item.id)}
        >
          <Text style={styles.subscribeButtonText}>Subscribe</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SubscriptionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSubscriptionModal}
      onRequestClose={() => setShowSubscriptionModal(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Choose Your Plan</Text>
          <View style={styles.tabContainer}>
            {subscriptionPlans.map((plan, index) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.tab, activeTab === index && styles.activeTab]}
                onPress={() => setActiveTab(index)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === index && styles.activeTabText,
                  ]}
                >
                  {plan.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.planContent}>
            {subscriptionPlans[activeTab] && (
              <>
                <Text style={styles.planName}>
                  {subscriptionPlans[activeTab].name} Plan
                </Text>
                <Text style={styles.planPrice}>
                  KSH {subscriptionPlans[activeTab].price}/month
                </Text>
                <View style={styles.planFeatures}>
                  <Text style={styles.featureTitle}>Features:</Text>
                  <Text style={styles.feature}>
                    •{" "}
                    {subscriptionPlans[activeTab].properties_for_sale_limit ===
                    0
                      ? "Unlimited listings"
                      : `${subscriptionPlans[activeTab].properties_for_sale_limit} listings per month`}
                  </Text>
                  {subscriptionPlans[activeTab].name === "PREMIUM" && (
                    <>
                      <Text style={styles.feature}>• Featured listings</Text>
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
          {profile?.subscription === subscriptionPlans[activeTab]?.id ? (
            <View style={styles.subscribedButton}>
              <Text style={styles.subscribedButtonText}>Subscribed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(subscriptionPlans[activeTab].id)}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setShowSubscriptionModal(false)}
          >
            <Text style={styles.skipButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewAuthor}>{item.author}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFA000" />
          <Text style={styles.reviewRating}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.reviewContent}>{item.content}</Text>
    </View>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={["#1B263B", "#1c3640"]}
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
        <TouchableOpacity
          style={[styles.addPlaceButton, styles.viewBookingsButton]}
          onPress={handleViewMyBookings}
        >
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.addPlaceText}>View My Bookings</Text>
        </TouchableOpacity>

        {profile?.user_type === "SELLER" && (
          <>
            <TouchableOpacity
              style={styles.addPlaceButton}
              onPress={handleAddPlace}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.addPlaceText}>Add your place</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addPlaceButton, styles.viewListingsButton]}
              onPress={handleViewMyListings}
            >
              <Ionicons name="list-outline" size={24} color="#fff" />
              <Text style={styles.addPlaceText}>View My Listings</Text>
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
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
      <SubscriptionModal />
      <WebViewModal />
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
  subscribeButton: {
    backgroundColor: "#0d1b21",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  subscribedButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  subscribedButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "#0d1b21",
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default ProfileScreen;
