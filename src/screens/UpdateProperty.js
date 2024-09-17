import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

function UpdateProperty({ route, navigation }) {
  const { propertyId, propertyType } = route.params;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPropertyDetails();
  }, []);

  const fetchPropertyDetails = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch property details");
      const data = await response.json();
      setProperty(data);
    } catch (error) {
      console.error("Error fetching property details:", error);
      Alert.alert(
        "Error",
        "Failed to load property details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(property),
        },
      );
      if (!response.ok) throw new Error("Failed to update property");
      Alert.alert("Success", "Property updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating property:", error);
      Alert.alert("Error", "Failed to update property. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.cancelled) {
      setProperty({
        ...property,
        images: [...property.images, { id: Date.now(), image: result.uri }],
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Update Property</Text>

      <View style={styles.inputContainer}>
        <Ionicons
          name="home-outline"
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={property.name}
          onChangeText={(text) => setProperty({ ...property, name: text })}
          placeholder="Property Name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="document-text-outline"
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={property.description}
          onChangeText={(text) =>
            setProperty({ ...property, description: text })
          }
          placeholder="Description"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="location-outline"
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={property.location}
          onChangeText={(text) => setProperty({ ...property, location: text })}
          placeholder="Location"
        />
      </View>

      <View style={styles.pickerContainer}>
        <Ionicons
          name="business-outline"
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <Picker
          selectedValue={property.property_type}
          onValueChange={(itemValue) =>
            setProperty({ ...property, property_type: itemValue })
          }
          style={styles.picker}
        >
          <Picker.Item label="House" value="HOUSE" />
          <Picker.Item label="Apartment" value="APARTMENT" />
          <Picker.Item label="Villa" value="VILLA" />
        </Picker>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="bed-outline"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={property.bedrooms?.toString()}
            onChangeText={(text) =>
              setProperty({ ...property, bedrooms: parseInt(text) || 0 })
            }
            placeholder="Bedrooms"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Ionicons
            name="water-outline"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={property.bathrooms?.toString()}
            onChangeText={(text) =>
              setProperty({ ...property, bathrooms: parseInt(text) || 0 })
            }
            placeholder="Bathrooms"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="resize-outline"
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={property.area}
          onChangeText={(text) => setProperty({ ...property, area: text })}
          placeholder="Area (sqft)"
          keyboardType="numeric"
        />
      </View>

      {propertyType === "rental" ? (
        <>
          <View style={styles.inputContainer}>
            <Ionicons
              name="cash-outline"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={property.price_per_month}
              onChangeText={(text) =>
                setProperty({ ...property, price_per_month: text })
              }
              placeholder="Price per month"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="people-outline"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={property.max_guests?.toString()}
              onChangeText={(text) =>
                setProperty({ ...property, max_guests: parseInt(text) || 0 })
              }
              placeholder="Max Guests"
              keyboardType="numeric"
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <Ionicons
              name="cash-outline"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={property.price}
              onChangeText={(text) => setProperty({ ...property, price: text })}
              placeholder="Price"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={property.year_built?.toString()}
              onChangeText={(text) =>
                setProperty({ ...property, year_built: parseInt(text) || 0 })
              }
              placeholder="Year Built"
              keyboardType="numeric"
            />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Property Images</Text>
      <View style={styles.imageContainer}>
        {property.images.map((img) => (
          <Image
            key={img.id}
            source={{ uri: `${API_BASE_URL}${img.image}` }}
            style={styles.image}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleImagePick}>
        <Ionicons
          name="camera-outline"
          size={24}
          color="#fff"
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>Add Image</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.updateButton]}
        onPress={handleUpdate}
        disabled={updating}
      >
        <Ionicons
          name="save-outline"
          size={24}
          color="#fff"
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>
          {updating ? "Updating..." : "Update Property"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  icon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  picker: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  image: {
    width: "48%",
    aspectRatio: 16 / 9,
    marginBottom: 10,
    borderRadius: 8,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  updateButton: {
    backgroundColor: "#2196F3",
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default UpdateProperty;
