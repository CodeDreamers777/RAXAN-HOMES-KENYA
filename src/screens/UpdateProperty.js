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

  const renderLabeledInput = (
    label,
    iconName,
    value,
    onChangeText,
    placeholder,
    inputProps = {},
  ) => (
    <View style={styles.labeledInputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons
          name={iconName}
          size={24}
          color="#4CAF50"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          {...inputProps}
        />
      </View>
    </View>
  );

  const renderLocationInput = () => (
    <View style={styles.labeledInputContainer}>
      <Text style={styles.inputLabel}>Location</Text>
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
          placeholder="Enter location"
        />
        <TouchableOpacity
          onPress={handleLocationPress}
          style={styles.mapButton}
        >
          <Ionicons name="map-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
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
      formData.append("bedrooms", property.bedrooms.toString());
      formData.append("bathrooms", property.bathrooms.toString());
      formData.append("area", property.area);
      formData.append(
        "amenities",
        JSON.stringify(property.amenities.map((a) => a.name)),
      );

      if ("price_per_night" in property) {
        // Per-night property fields
        formData.append("price_per_night", property.price_per_night);
        formData.append("number_of_units", property.number_of_units.toString());
        formData.append("is_available", property.is_available.toString());
        formData.append("check_in_time", property.check_in_time);
        formData.append("check_out_time", property.check_out_time);
        formData.append("min_nights", property.min_nights.toString());
        formData.append("max_nights", property.max_nights.toString());
      } else if ("price_per_month" in property) {
        // Rental property fields
        formData.append("price_per_month", property.price_per_month);
        formData.append("number_of_units", property.number_of_units.toString());
        formData.append("is_available", property.is_available.toString());
      } else {
        // Sale property fields
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
  const isPerNight = "price_per_night" in property;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Update Property</Text>

      {renderLabeledInput(
        "Property Name",
        "home-outline",
        property.name,
        (text) => setProperty({ ...property, name: text }),
        "Enter property name",
      )}

      <View style={styles.labeledInputContainer}>
        <Text style={styles.inputLabel}>Description</Text>
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
            placeholder="Enter property description"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {renderLocationInput()}

      <View style={styles.row}>
        {renderLabeledInput(
          "Bedrooms",
          "bed-outline",
          property.bedrooms?.toString(),
          (text) => setProperty({ ...property, bedrooms: parseInt(text) || 0 }),
          "Number of bedrooms",
          { keyboardType: "numeric" },
        )}

        {renderLabeledInput(
          "Bathrooms",
          "water-outline",
          property.bathrooms?.toString(),
          (text) =>
            setProperty({ ...property, bathrooms: parseInt(text) || 0 }),
          "Number of bathrooms",
          { keyboardType: "numeric" },
        )}
      </View>

      {renderLabeledInput(
        "Area (sqft)",
        "resize-outline",
        property.area,
        (text) => setProperty({ ...property, area: text }),
        "Enter property area",
        { keyboardType: "numeric" },
      )}

      {isPerNight ? (
        <>
          {renderLabeledInput(
            "Price per Night",
            "cash-outline",
            property.price_per_night,
            (text) => setProperty({ ...property, price_per_night: text }),
            "Enter nightly rate",
            { keyboardType: "numeric" },
          )}

          {renderLabeledInput(
            "Number of Units",
            "people-outline",
            property.number_of_units?.toString(),
            (text) =>
              setProperty({
                ...property,
                number_of_units: parseInt(text) || 0,
              }),
            "Enter number of units",
            { keyboardType: "numeric" },
          )}

          {renderLabeledInput(
            "Check-in Time",
            "time-outline",
            property.check_in_time,
            (text) => setProperty({ ...property, check_in_time: text }),
            "Enter check-in time (HH:MM)",
          )}

          {renderLabeledInput(
            "Check-out Time",
            "time-outline",
            property.check_out_time,
            (text) => setProperty({ ...property, check_out_time: text }),
            "Enter check-out time (HH:MM)",
          )}

          <View style={styles.row}>
            {renderLabeledInput(
              "Minimum Nights",
              "calendar-outline",
              property.min_nights?.toString(),
              (text) =>
                setProperty({
                  ...property,
                  min_nights: parseInt(text) || 0,
                }),
              "Minimum stay",
              { keyboardType: "numeric" },
            )}

            {renderLabeledInput(
              "Maximum Nights",
              "calendar-outline",
              property.max_nights?.toString(),
              (text) =>
                setProperty({
                  ...property,
                  max_nights: parseInt(text) || 0,
                }),
              "Maximum stay",
              { keyboardType: "numeric" },
            )}
          </View>

          <View style={styles.labeledInputContainer}>
            <Text style={styles.inputLabel}>Availability</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Is Available</Text>
              <Switch
                value={property.is_available}
                onValueChange={(value) =>
                  setProperty({ ...property, is_available: value })
                }
              />
            </View>
          </View>
        </>
      ) : isRental ? (
        <>
          {renderLabeledInput(
            "Price per Month",
            "cash-outline",
            property.price_per_month,
            (text) => setProperty({ ...property, price_per_month: text }),
            "Enter monthly rent",
            { keyboardType: "numeric" },
          )}

          {renderLabeledInput(
            "Deposit Amount",
            "cash-outline",
            property.deposit,
            (text) => setProperty({ ...property, deposit: text }),
            "Enter deposit amount",
            { keyboardType: "numeric" },
          )}

          {renderLabeledInput(
            "Number of Units",
            "people-outline",
            property.number_of_units?.toString(),
            (text) =>
              setProperty({
                ...property,
                number_of_units: parseInt(text) || 0,
              }),
            "Enter number of units",
            { keyboardType: "numeric" },
          )}

          <View style={styles.labeledInputContainer}>
            <Text style={styles.inputLabel}>Availability</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Is Available</Text>
              <Switch
                value={property.is_available}
                onValueChange={(value) =>
                  setProperty({ ...property, is_available: value })
                }
              />
            </View>
          </View>
        </>
      ) : (
        <>
          {renderLabeledInput(
            "Price",
            "cash-outline",
            property.price,
            (text) => setProperty({ ...property, price: text }),
            "Enter property price",
            { keyboardType: "numeric" },
          )}

          {renderLabeledInput(
            "Year Built",
            "calendar-outline",
            property.year_built?.toString(),
            (text) =>
              setProperty({ ...property, year_built: parseInt(text) || 0 }),
            "Enter year of construction",
            { keyboardType: "numeric" },
          )}

          <View style={styles.labeledInputContainer}>
            <Text style={styles.inputLabel}>Property Status</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Is Sold</Text>
              <Switch
                value={property.is_sold}
                onValueChange={(value) =>
                  setProperty({ ...property, is_sold: value })
                }
              />
            </View>
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
      <View style={styles.labeledInputContainer}>
        <Text style={styles.inputLabel}>Add Amenity</Text>
        <View style={styles.addAmenityContainer}>
          <TextInput
            style={styles.addAmenityInput}
            value={newAmenity}
            onChangeText={setNewAmenity}
            placeholder="Enter new amenity"
          />
          <TouchableOpacity
            style={styles.addAmenityButton}
            onPress={addAmenity}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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
  labeledInputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
    fontWeight: "bold",
  },
  mapButton: {
    padding: 10,
  },
});

export default UpdateProperty;
