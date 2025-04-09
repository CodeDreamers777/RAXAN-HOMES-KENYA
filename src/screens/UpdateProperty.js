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
          color={COLORS.secondary}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.placeholder}
          {...inputProps}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (showMap) {
    return (
      <View style={styles.mapContainer}>
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
        <TouchableOpacity
          style={styles.mapCloseButton}
          onPress={() => setShowMap(false)}
        >
          <Ionicons name="close" size={24} color={COLORS.text.light} />
        </TouchableOpacity>
      </View>
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
      <View style={styles.formContainer}>
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
              color={COLORS.secondary}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={property.description}
              onChangeText={(text) =>
                setProperty({ ...property, description: text })
              }
              placeholder="Enter property description"
              placeholderTextColor={COLORS.text.placeholder}
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

            <View style={styles.rowContainer}>
              <View style={styles.halfColumn}>
                {renderLabeledInput(
                  "Check-in Time",
                  "time-outline",
                  property.check_in_time,
                  (text) => setProperty({ ...property, check_in_time: text }),
                  "HH:MM",
                )}
              </View>
              <View style={styles.halfColumn}>
                {renderLabeledInput(
                  "Check-out Time",
                  "time-outline",
                  property.check_out_time,
                  (text) => setProperty({ ...property, check_out_time: text }),
                  "HH:MM",
                )}
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.halfColumn}>
                {renderLabeledInput(
                  "Minimum Nights",
                  "calendar-outline",
                  property.min_nights?.toString(),
                  (text) =>
                    setProperty({
                      ...property,
                      min_nights: parseInt(text) || 0,
                    }),
                  "Min stay",
                  { keyboardType: "numeric" },
                )}
              </View>
              <View style={styles.halfColumn}>
                {renderLabeledInput(
                  "Maximum Nights",
                  "calendar-outline",
                  property.max_nights?.toString(),
                  (text) =>
                    setProperty({
                      ...property,
                      max_nights: parseInt(text) || 0,
                    }),
                  "Max stay",
                  { keyboardType: "numeric" },
                )}
              </View>
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
                  trackColor={{ false: COLORS.border, true: COLORS.secondary }}
                  thumbColor={
                    property.is_available ? COLORS.primary : "#f4f3f4"
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
                  trackColor={{ false: COLORS.border, true: COLORS.secondary }}
                  thumbColor={
                    property.is_available ? COLORS.primary : "#f4f3f4"
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
                  trackColor={{ false: COLORS.border, true: COLORS.secondary }}
                  thumbColor={property.is_sold ? COLORS.primary : "#f4f3f4"}
                />
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Amenities</Text>

        <View style={styles.amenitiesContainer}>
          {property.amenities.map((amenity) => (
            <View key={amenity.id} style={styles.amenityItem}>
              <Text style={styles.amenityText}>{amenity.name}</Text>
              <TouchableOpacity
                style={styles.removeAmenityButton}
                onPress={() => removeAmenity(amenity.id)}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.accent} />
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
              placeholderTextColor={COLORS.text.placeholder}
            />
            <TouchableOpacity
              style={styles.addAmenityButton}
              onPress={addAmenity}
            >
              <Ionicons name="add" size={22} color={COLORS.text.light} />
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
                <Ionicons name="close-circle" size={24} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={handleImagePick}
          >
            <Ionicons name="add-circle" size={32} color={COLORS.secondary} />
            <Text style={styles.addImageText}>Add Image</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color={COLORS.text.light} />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={22}
                  color={COLORS.text.light}
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Update Property</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

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
    placeholder: "#A0AEC0", // Placeholder text
  },
  border: "#ECF0F1", // Light border
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    padding: 20,
    paddingTop: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text.primary,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 15,
    color: COLORS.text.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: COLORS.text.secondary,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -8,
  },
  halfColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  labeledInputContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    elevation: 1,
  },
  amenityText: {
    color: COLORS.text.light,
    marginRight: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  removeAmenityButton: {
    marginLeft: 4,
  },
  addAmenityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addAmenityInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
    color: COLORS.text.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addAmenityButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  imageWrapper: {
    width: "48%",
    aspectRatio: 16 / 9,
    marginHorizontal: "1%",
    marginBottom: 12,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 15,
    padding: 2,
  },
  addImageButton: {
    width: "48%",
    aspectRatio: 16 / 9,
    marginHorizontal: "1%",
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(52, 152, 219, 0.05)",
  },
  addImageText: {
    color: COLORS.secondary,
    fontWeight: "600",
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  locationButton: {
    backgroundColor: COLORS.primary,
  },
  updateButton: {
    backgroundColor: COLORS.secondary,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.text.light,
    fontSize: 16,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default UpdateProperty;
