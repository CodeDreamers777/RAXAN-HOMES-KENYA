import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const { width } = Dimensions.get("window");

// New color scheme
const COLORS = {
  primary: "#2C3E50", // Dark blue/slate
  secondary: "#3498DB", // Bright blue
  accent: "#E74C3C", // Red for delete actions
  background: "#F5F7FA", // Light background
  card: "#FFFFFF", // White card
  text: {
    primary: "#2C3E50", // Main text
    secondary: "#7F8C8D", // Secondary text
    light: "#FFFFFF", // Light text
  },
  border: "#ECF0F1", // Light border
};

function ViewMyListings() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/user_properties/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await response.json();
      const allProperties = [
        ...(data.rental_properties || []).map((p) => ({
          ...p,
          type: "rental",
        })),
        ...(data.properties_for_sale || []).map((p) => ({
          ...p,
          type: "sale",
        })),
        ...(data.per_night_properties || []).map((p) => ({
          ...p,
          type: "per_night",
        })),
      ];
      setProperties(allProperties);
    } catch (error) {
      console.error("Error fetching listings:", error);
      Alert.alert("Error", "Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (propertyId) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete property");
      }

      setProperties(properties.filter((p) => p.id !== propertyId));
      Alert.alert("Success", "Property deleted successfully");
    } catch (error) {
      console.error("Error deleting property:", error);
      Alert.alert("Error", "Failed to delete property. Please try again.");
    }
  };

  const getPropertyTypeLabel = (type) => {
    switch (type) {
      case "rental":
        return "Rental";
      case "sale":
        return "For Sale";
      case "per_night":
        return "Per Night";
      default:
        return "";
    }
  };

  const renderPropertyItem = ({ item }) => (
    <View style={styles.propertyItem}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("UpdateProperty", { propertyId: item.id })
        }
      >
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.images[0],
            }}
            style={styles.propertyImage}
            onError={(e) =>
              console.log("Image load error:", e.nativeEvent.error)
            }
          />
          <View style={styles.propertyBadge}>
            <Text style={styles.propertyBadgeText}>
              {getPropertyTypeLabel(item.type)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.propertyInfo}>
        <Text
          style={styles.propertyTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        <Text style={styles.propertyPrice}>
          {item.price_per_month
            ? `$${item.price_per_month}/month`
            : item.price_per_night
              ? `$${item.price_per_night}/night`
              : `$${item.price}`}
        </Text>
        <View style={styles.propertyMeta}>
          <View style={styles.metaItem}>
            <Ionicons
              name="bed-outline"
              size={16}
              color={COLORS.text.secondary}
            />
            <Text style={styles.propertyMetaText}>{item.bedrooms}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="water-outline"
              size={16}
              color={COLORS.text.secondary}
            />
            <Text style={styles.propertyMetaText}>{item.bathrooms}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="square-outline"
              size={16}
              color={COLORS.text.secondary}
            />
            <Text style={styles.propertyMetaText}>{item.size} sqft</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("UpdateProperty", { propertyId: item.id })
            }
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={COLORS.text.light}
            />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              setPropertyToDelete(item);
              setDeleteModalVisible(true);
            }}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={COLORS.text.light}
            />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const filteredProperties = properties.filter(
    (property) => activeTab === "all" || property.type === activeTab,
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your Properties</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddProperty")}
        >
          <Ionicons name="add" size={24} color={COLORS.text.light} />
        </TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.activeTabText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "rental" && styles.activeTab]}
          onPress={() => setActiveTab("rental")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "rental" && styles.activeTabText,
            ]}
          >
            Rental
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "sale" && styles.activeTab]}
          onPress={() => setActiveTab("sale")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "sale" && styles.activeTabText,
            ]}
          >
            For Sale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "per_night" && styles.activeTab]}
          onPress={() => setActiveTab("per_night")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "per_night" && styles.activeTabText,
            ]}
          >
            Per Night
          </Text>
        </TouchableOpacity>
      </View>
      {filteredProperties.length > 0 ? (
        <FlatList
          data={filteredProperties}
          renderItem={renderPropertyItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons
            name="home-outline"
            size={64}
            color={COLORS.text.secondary}
          />
          <Text style={styles.noListingsText}>
            You have no properties in this category
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate("AddProperty")}
          >
            <Text style={styles.emptyStateButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Ionicons
              name="warning-outline"
              size={56}
              color={COLORS.accent}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Delete Property</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this property? This action cannot
              be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonCancel]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonDelete]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  deleteProperty(propertyToDelete.id);
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
    padding: 5,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: "500",
  },
  activeTabText: {
    color: COLORS.text.light,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  propertyItem: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  propertyImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  propertyBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  propertyBadgeText: {
    color: COLORS.text.light,
    fontSize: 12,
    fontWeight: "bold",
  },
  propertyInfo: {
    padding: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  propertyPrice: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: "bold",
    marginBottom: 10,
  },
  propertyMeta: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 15,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  propertyMetaText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 5,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: COLORS.text.light,
    fontWeight: "bold",
    marginLeft: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noListingsText: {
    fontSize: 18,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  emptyStateButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: COLORS.text.light,
    fontSize: 16,
    fontWeight: "bold",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalView: {
    width: width * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.text.primary,
  },
  modalText: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    borderRadius: 10,
    padding: 12,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCancel: {
    backgroundColor: "#E0E0E0",
    marginRight: 10,
  },
  buttonDelete: {
    backgroundColor: COLORS.accent,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteButtonText: {
    color: COLORS.text.light,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ViewMyListings;
