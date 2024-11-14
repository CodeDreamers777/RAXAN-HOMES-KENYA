import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants for RevenueCat API keys
const REVENUE_CAT_API_KEYS = {
  ios: "YOUR_IOS_API_KEY",
  android: "YOUR_ANDROID_API_KEY",
};

const SubscriptionManager = ({
  profile,
  onSubscriptionUpdate,
  visible,
  onClose,
}) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      const apiKey = Platform.select(REVENUE_CAT_API_KEYS);
      await Purchases.configure({ apiKey });

      // Get available packages
      const offerings = await Purchases.getOfferings();
      if (
        offerings.current !== null &&
        offerings.current.availablePackages.length !== 0
      ) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error("Error initializing purchases:", error);
      Alert.alert("Error", "Failed to load subscription options");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (packageItem) => {
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(packageItem);

      if (typeof customerInfo.entitlements.active.premium !== "undefined") {
        // Update the backend about the successful subscription
        await updateBackendSubscription(packageItem);
        onSubscriptionUpdate();
        Alert.alert("Success", "Subscription activated successfully!");
        onClose();
      }
    } catch (error) {
      if (!error.userCancelled) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBackendSubscription = async (packageItem) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);

      const response = await fetch(
        "https://yakubu.pythonanywhere.com/api/v1/update-subscription/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            package_id: packageItem.identifier,
            platform: Platform.OS,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update backend subscription");
      }
    } catch (error) {
      console.error("Error updating backend:", error);
      // Don't throw here - the purchase was successful, we just failed to update backend
      // You might want to implement a retry mechanism
    }
  };

  const renderPackage = (pkg, index) => (
    <View key={pkg.identifier} style={styles.planCard}>
      <Text style={styles.planName}>{pkg.product.title}</Text>
      <Text style={styles.planPrice}>{pkg.product.priceString}/month</Text>
      <Text style={styles.planDescription}>{pkg.product.description}</Text>
      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={() => handleSubscribe(pkg)}
        disabled={loading}
      >
        <Text style={styles.subscribeButtonText}>
          {loading ? "Processing..." : "Subscribe"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Choose Your Plan</Text>
          <ScrollView style={styles.plansContainer}>
            {packages.map((pkg, index) => renderPackage(pkg, index))}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  plansContainer: {
    width: "100%",
  },
  planCard: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  planName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 18,
    color: "#666",
    marginBottom: 10,
  },
  planDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  subscribeButton: {
    backgroundColor: "#0d1b21",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    color: "#666",
    fontSize: 16,
  },
});

export default SubscriptionManager;
