import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const DEFAULT_LATITUDE = -1.286389; // Nairobi, Kenya
const DEFAULT_LONGITUDE = 36.817223; // Nairobi, Kenya

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/di0pfjgns/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

const uploadImageToCloudinary = async (uri) => {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: uri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    console.log("Cloudinary upload response:", data);
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

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

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const formData = new FormData();
      formData.append("name", property.name);
      formData.append("description", property.description);
      formData.append("bedrooms", property.bedrooms.toString());
      formData.append("bathrooms", property.bathrooms.toString());
      formData.append("area", property.area);
      formData.append(
        "amenities",
        JSON.stringify(property.amenities.map((a) => a.name)),
      );

      if ("price_per_night" in property) {
        formData.append("price_per_night", property.price_per_night);
        formData.append("number_of_units", property.number_of_units.toString());
        formData.append("is_available", property.is_available.toString());
        formData.append("check_in_time", property.check_in_time);
        formData.append("check_out_time", property.check_out_time);
        formData.append("min_nights", property.min_nights.toString());
        formData.append("max_nights", property.max_nights.toString());
      } else if ("price_per_month" in property) {
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
        for (const image of property.images) {
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
              try {
                const cloudinaryUrl = await uploadImageToCloudinary(
                  image.image,
                );
                newImages.push(cloudinaryUrl);
              } catch (error) {
                console.error("Error uploading image to Cloudinary:", error);
                Alert.alert(
                  "Error",
                  "Failed to upload an image. Please try again.",
                );
              }
            }
          }
        }
      }

      formData.append("existing_images", JSON.stringify(existingImages));
      formData.append("new_images", JSON.stringify(newImages));

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
      setUpdating(true);
      try {
        const cloudinaryUrl = await uploadImageToCloudinary(
          result.assets[0].uri,
        );
        setProperty({
          ...property,
          images: [
            ...property.images,
            { id: Date.now(), image: cloudinaryUrl },
          ],
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert("Error", "Failed to upload image. Please try again.");
      } finally {
        setUpdating(false);
      }
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

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setProperty({
      ...property,
      latitude,
      longitude,
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
    containerStyle = {},
  ) => (
    <View style={[styles.labeledInputContainer, containerStyle]}>
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
    if (typeof img === "string") {
      return img;
    } else if (img?.uri) {
      return img.uri;
    } else if (typeof img?.image === "string") {
      return img.image;
    }
    return ""; // Fallback to empty string if no valid URI is found
  };

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

      <View style={styles.rowContainer}>
        <View style={styles.halfColumn}>
          {renderLabeledInput(
            "Bedrooms",
            "bed-outline",
            property.bedrooms?.toString(),
            (text) =>
              setProperty({ ...property, bedrooms: parseInt(text) || 0 }),
            "Bedrooms",
            { keyboardType: "numeric" },
          )}
        </View>
        <View style={styles.halfColumn}>
          {renderLabeledInput(
            "Bathrooms",
            "water-outline",
            property.bathrooms?.toString(),
            (text) =>
              setProperty({ ...property, bathrooms: parseInt(text) || 0 }),
            "Bathrooms",
            { keyboardType: "numeric" },
          )}
        </View>
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
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    color: "#2D3748",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 16,
    color: "#2D3748",
    letterSpacing: 0.5,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -8, // Compensate for the padding in halfColumn
  },
  halfColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  labeledInputContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#2D3748",
    fontWeight: "400",
    minWidth: 50, // Add minimum width
  },
  focusedInput: {
    borderColor: "#4CAF50",
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    padding: 12,
    color: "#4A5568",
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#2D3748",
    fontWeight: "400",
  },
  multilineInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  halfWidth: {
    width: "48%",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchLabel: {
    fontSize: 16,
    color: "#4A5568",
    fontWeight: "500",
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    padding: 8,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  amenityText: {
    color: "#4A5568",
    marginRight: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  addAmenityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addAmenityInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginRight: 8,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addAmenityButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  imageWrapper: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    padding: 4,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  updateButton: {
    backgroundColor: "#2196F3",
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  map: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
});

export default UpdateProperty;
