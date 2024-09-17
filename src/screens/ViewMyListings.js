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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const { width } = Dimensions.get("window");

function ViewMyListings() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const navigation = useNavigation();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
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
      ];
      setProperties(allProperties);
    } catch (error) {
      console.error("Error fetching listings:", error);
      Alert.alert("Error", "Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderPropertyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyItem}
      onPress={() =>
        navigation.navigate("UpdateProperty", { propertyId: item.id })
      }
    >
      <Image
        source={{
          uri: `${API_BASE_URL}${item.images[0]?.image}`,
        }}
        style={styles.propertyImage}
      />
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{item.name}</Text>
        <Text style={styles.propertyPrice}>
          {item.price_per_month
            ? `$${item.price_per_month}/month`
            : `$${item.price}`}
        </Text>
        <View style={styles.propertyMeta}>
          <Text style={styles.propertyMetaText}>
            <Ionicons name="bed-outline" size={16} color="#666" />{" "}
            {item.bedrooms}
          </Text>
          <Text style={styles.propertyMetaText}>
            <Ionicons name="water-outline" size={16} color="#666" />{" "}
            {item.bathrooms}
          </Text>
          <Text style={styles.propertyMetaText}>
            <Ionicons name="square-outline" size={16} color="#666" />{" "}
            {item.size} sqft
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredProperties = properties.filter(
    (property) => activeTab === "all" || property.type === activeTab,
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Listed Properties</Text>
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
        <Text style={styles.noListingsText}>
          You have no listed properties in this category.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  activeTab: {
    borderBottomColor: "#4CAF50",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  listContainer: {
    paddingBottom: 20,
  },
  propertyItem: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  propertyInfo: {
    padding: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  propertyPrice: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
    marginBottom: 10,
  },
  propertyMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  propertyMetaText: {
    fontSize: 14,
    color: "#666",
  },
  noListingsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});

export default ViewMyListings;
