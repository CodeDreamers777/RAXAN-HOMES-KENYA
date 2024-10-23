import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const SettingsScreen = ({ navigation }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [showWebViewPayment, setShowWebViewPayment] = useState(false);
  const webViewRef = useRef(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeactivateAccountModal, setShowDeactivateAccountModal] =
    useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }
      const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const profileData = await response.json();
      setProfile(profileData);

      // Fetch subscription plans
      const plansResponse = await fetch(
        `${API_BASE_URL}/api/v1/subscription-plans/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const plansData = await plansResponse.json();
      setSubscriptionPlans(plansData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    }
  };
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }

    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const response = await fetch(`${API_BASE_URL}/api/v1/manage/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          action: "change_password",
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Password changed successfully");
        setShowPasswordModal(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Error", data.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      Alert.alert("Error", "An error occurred while changing the password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const response = await fetch(`${API_BASE_URL}/api/v1/manage/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "delete_account",
        }),
      });

      if (response.ok) {
        await AsyncStorage.removeItem("accessToken");
        Alert.alert(
          "Account Deleted",
          "Your account has been successfully deleted.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("Login");
              },
            },
          ],
        );
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "An error occurred while deleting the account");
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const response = await fetch(`${API_BASE_URL}/api/v1/manage/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "deactivate_account",
        }),
      });

      if (response.ok) {
        await AsyncStorage.removeItem("accessToken");
        Alert.alert(
          "Account Deactivated",
          "Your account has been deactivated. You can reactivate it by logging in again.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("Login");
              },
            },
          ],
        );
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to deactivate account");
      }
    } catch (error) {
      console.error("Error deactivating account:", error);
      Alert.alert("Error", "An error occurred while deactivating the account");
    }
  };

  const handleOpenWebView = (url) => {
    setWebViewUrl(url);
    setShowWebView(true);
  };

  const handleUpgradePlan = () => {
    setShowSubscriptionModal(true);
  };

  const handleSubscribe = async (planId) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
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
        setShowWebViewPayment(true);
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
    setShowWebViewPayment(false);
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowPasswordModal(true)}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            handleOpenWebView("https://raxanhomes.netlify.app/#terms")
          }
        >
          <Ionicons name="document-text-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Terms of Use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            handleOpenWebView("https://raxanhomes.netlify.app/#privacy")
          }
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleUpgradePlan}
        >
          <Ionicons name="arrow-up-circle-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Upgrade My Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowDeleteAccountModal(true)}
        >
          <Ionicons name="trash-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Delete Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowDeactivateAccountModal(true)}
        >
          <Ionicons name="power-outline" size={24} color="#333" />
          <Text style={styles.settingText}>Deactivate Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.warningText}>
              Warning: This action is irreversible. All your data will be
              permanently deleted.
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.buttonText}>Delete My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDeleteAccountModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deactivate Account Modal */}
      <Modal
        visible={showDeactivateAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeactivateAccountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deactivate Account</Text>
            <Text style={styles.warningText}>
              Your account will be deactivated. You can reactivate it by logging
              in again.
            </Text>
            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleDeactivateAccount}
            >
              <Text style={styles.buttonText}>Deactivate My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDeactivateAccountModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Old Password"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={handleChangePassword}
            >
              <Text style={styles.buttonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={styles.webViewContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowWebView(false)}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webView}
          />
        </SafeAreaView>
      </Modal>
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
                      {subscriptionPlans[activeTab]
                        .properties_for_sale_limit === 0
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
              <Text style={styles.skipButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WebView Payment Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showWebViewPayment}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  settingText: {
    fontSize: 18,
    marginLeft: 15,
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  changePasswordButton: {
    backgroundColor: "#0d1b21",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 10,
  },
  webView: {
    flex: 1,
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
  warningText: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  deactivateButton: {
    backgroundColor: "orange",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
});

export default SettingsScreen;
