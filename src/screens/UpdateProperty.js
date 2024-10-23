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
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const DEFAULT_LATITUDE = -1.286389; // Nairobi, Kenya
const DEFAULT_LONGITUDE = 36.817223; // Nairobi, Kenya

function UpdateProperty({ route, navigation }) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const [showMap, setShowMap] = useState(false);
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
    }
  };
  const fetchPropertyDetails = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Referer: API_BASE_URL,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch property details");
      const data = await response.json();
      console.log(data);
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

  useEffect(() => {
    fetchPropertyDetails();
    fetchCSRFToken();
  }, []);
  const handleLocationPress = () => {
    setShowMap(true);
  };
  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setProperty({
      ...property,
      latitude,
      longitude,
      location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    });
    setShowMap(false);
  };

  const renderLocationInput = () => (
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
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (showMap) {
    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: property.latitude || DEFAULT_LATITUDE,
          longitude: property.longitude || DEFAULT_LONGITUDE,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
      >
        <Marker
          coordinate={{
            latitude: property.latitude || DEFAULT_LATITUDE,
            longitude: property.longitude || DEFAULT_LONGITUDE,
          }}
        />
      </MapView>
    );
  }

  const getImageUri = (img) => {
    if (typeof img.image === "string" && img.image.includes("/media/")) {
      return `${API_BASE_URL}${img.image}`;
    } else if (img.uri) {
      return img.uri;
    } else if (typeof img.image === "string") {
      return img.image;
    }
    return ""; // Fallback to empty string if no valid URI is found
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const formData = new FormData();
      formData.append("name", property.name);
      formData.append("description", property.description);
      formData.append("location", property.location);
      formData.append("property_type", property.property_type);
      formData.append("bedrooms", property.bedrooms.toString());
      formData.append("bathrooms", property.bathrooms.toString());
      formData.append("area", property.area);
      formData.append(
        "amenities",
        JSON.stringify(property.amenities.map((a) => a.name)),
      );

      if ("price_per_month" in property) {
        formData.append("price_per_month", property.price_per_month);
        formData.append("number_of_units", property.number_of_units.toString());
        formData.append("is_available", property.is_available.toString());
      } else {
        formData.append("price", property.price);
        formData.append("year_built", property.year_built.toString());
        formData.append("is_sold", property.is_sold.toString());
      }

      const existingImages = [];
      const newImages = [];

      if (Array.isArray(property.images)) {
        property.images.forEach((image) => {
          if (image && typeof image === "object") {
            if (
              image.id &&
              typeof image.image === "string" &&
              image.image.indexOf("/media/") === 0
            ) {
              existingImages.push(image.id);
            } else if (
              typeof image.image === "string" &&
              (image.image.indexOf("file://") === 0 ||
                image.image.indexOf("content://") === 0)
            ) {
              const filename = image.image.split("/").pop();
              newImages.push({
                uri: image.image,
                type: "image/jpeg",
                name: filename,
              });
            }
          }
        });
      }

      formData.append("existing_images", JSON.stringify(existingImages));

      newImages.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });

      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
          credentials: "include",
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

    if (!result.canceled) {
      setProperty({
        ...property,
        images: [
          ...property.images,
          { id: Date.now(), uri: result.assets[0].uri },
        ],
      });
    }
  };

  const removeImage = (imageId) => {
    setProperty({
      ...property,
      images: property.images.filter((img) => img.id !== imageId),
    });
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setProperty({
        ...property,
        amenities: [
          ...property.amenities,
          { id: Date.now(), name: newAmenity.trim() },
        ],
      });
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenityId) => {
    setProperty({
      ...property,
      amenities: property.amenities.filter((a) => a.id !== amenityId),
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const isRental = "price_per_month" in property;

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

      {renderLocationInput()}

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

      {isRental ? (
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
              value={property.number_of_units?.toString()}
              onChangeText={(text) =>
                setProperty({
                  ...property,
                  number_of_units: parseInt(text) || 0,
                })
              }
              placeholder="Number of Units"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Is Available</Text>
            <Switch
              value={property.is_available}
              onValueChange={(value) =>
                setProperty({ ...property, is_available: value })
              }
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

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Is Sold</Text>
            <Switch
              value={property.is_sold}
              onValueChange={(value) =>
                setProperty({ ...property, is_sold: value })
              }
            />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.amenitiesContainer}>
        {property.amenities.map((amenity) => (
          <View key={amenity.id} style={styles.amenityItem}>
            <Text>{amenity.name}</Text>
            <TouchableOpacity onPress={() => removeAmenity(amenity.id)}>
              <Ionicons name="close-circle" size={20} color="#FF0000" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.addAmenityContainer}>
        <TextInput
          style={styles.addAmenityInput}
          value={newAmenity}
          onChangeText={setNewAmenity}
          placeholder="Add new amenity"
        />
        <TouchableOpacity style={styles.addAmenityButton} onPress={addAmenity}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Property Images</Text>
      <View style={styles.imageContainer}>
        {property.images.map((img) => (
          <View key={img.id} style={styles.imageWrapper}>
            <Image source={{ uri: getImageUri(img) }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(img.id)}
            >
              <Ionicons name="close-circle" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
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
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  amenityItem: {
    backgroundColor: "#e0e0e0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

export default UpdateProperty;
