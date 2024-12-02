import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import MapView, { Marker, PROVIDER_OPENSTREETMAP } from "react-native-maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";
// Add Cloudinary configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/di0pfjgns/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

const AddPropertyPage = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [propertyCategory, setPropertyCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyStyle, setPropertyStyle] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [numberOfUnits, setNumberOfUnits] = useState("");
  const [isAvailable, setIsAvailable] = useState("yes");
  const [isFeatured, setIsFeatured] = useState("no");
  const [newAmenity, setNewAmenity] = useState("");
  const [amenityId, setAmenityId] = useState(1); // For generating unique IDs

  // Replace the existing amenities state with this new format
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [csrfToken, setCSRFToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [minNights, setMinNights] = useState("");
  const [maxNights, setMaxNights] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [rentalDeposit, setRentalDeposit] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    fetchCSRFToken();
    getAccessToken();
    initializeRevenueCat();

    // Check if running in Expo Go
    if (Constants.appOwnership === "expo") {
      setIsExpoGo(true);
    }
  }, []);

  const initializeRevenueCat = async () => {
    if (isExpoGo) return;

    try {
      if (Platform.OS === "android") {
        await Purchases.configure({ apiKey: "your-android-api-key" });
      } else if (Platform.OS === "ios") {
        await Purchases.configure({ apiKey: "your-ios-api-key" });
      }
    } catch (err) {
      console.warn("Error initializing RevenueCat:", err);
    }
  };

  const handleFeaturedPurchase = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Expo Go Limitation",
        "In-app purchases are not available in Expo Go. Please use a development build to test this feature.",
      );
      return;
    }

    setIsPurchasing(true);
    try {
      const purchaseResult = await Purchases.purchaseProduct(
        FEATURED_PROPERTY_PRODUCT_ID,
      );
      if (
        purchaseResult.customerInfo.entitlements.active[
          FEATURED_PROPERTY_PRODUCT_ID
        ]
      ) {
        console.log("Purchase successful");
        setIsFeatured("yes");
        Alert.alert("Success", "Your property is now featured!");
      }
    } catch (e) {
      if (!e.userCancelled) {
        console.error(e);
        Alert.alert(
          "Purchase Failed",
          "Unable to complete the featured listing purchase.",
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      setCSRFToken(data.csrfToken);
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
    }
  };
  // Add new amenity function
  const addAmenity = () => {
    if (newAmenity.trim()) {
      const amenity = {
        id: amenityId,
        name: newAmenity.trim(),
      };
      setAmenities([...amenities, amenity]);
      setAmenityId(amenityId + 1);
      setNewAmenity("");
    }
  };

  // Remove amenity function
  const removeAmenity = (id) => {
    setAmenities(amenities.filter((amenity) => amenity.id !== id));
  };

  const getAccessToken = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        setAccessToken(token);
      } else {
        Alert.alert("Error", "No access token found. Please log in again.");
      }
    } catch (error) {
      console.error("Error retrieving access token:", error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    try {
      // Compress the image
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: SaveFormat.JPEG },
      );

      const formData = new FormData();
      formData.append("file", {
        uri: manipulatedImage.uri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      throw error;
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isFeatured === "yes" && !isPurchasing) {
      if (isExpoGo) {
        Alert.alert(
          "Expo Go Limitation",
          "Featured listings are not available in Expo Go. Your listing will be submitted as a regular listing.",
        );
        setIsFeatured("no");
      } else {
        await handleFeaturedPurchase();
        return;
      }
    }

    if (!accessToken) {
      Alert.alert("Error", "No access token found. Please log in again.");
      return;
    }

    let requiredFields;
    if (propertyCategory === "rental") {
      requiredFields = [
        propertyType,
        name,
        description,
        location,
        bedrooms,
        bathrooms,
        area,
        price,
        numberOfUnits,
        isAvailable,
        isFeatured,
        amenities,
      ];
    } else if (propertyCategory === "sale") {
      requiredFields = [
        propertyType,
        name,
        description,
        location,
        bedrooms,
        bathrooms,
        area,
        price,
        yearBuilt,
        isFeatured,
        amenities,
      ];
    } else if (propertyCategory === "per_night") {
      requiredFields = [
        propertyStyle,
        name,
        description,
        location,
        bedrooms,
        bathrooms,
        area,
        pricePerNight,
        numberOfUnits,
        checkInTime,
        checkOutTime,
        minNights,
        maxNights,
        isAvailable,
        isFeatured,
        amenities,
      ];
    } else {
      setErrorMessage("Please select a valid property category.");
      return;
    }

    if (requiredFields.some((field) => !field) || amenities.length === 0) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      // Upload images to Cloudinary and get URLs
      const uploadedImageUrls = await Promise.all(
        images.map((image) => uploadImageToCloudinary(image)),
      );

      if (!uploadedImageUrls || uploadedImageUrls.length === 0) {
        throw new Error("Image upload failed. No URLs returned.");
      }

      // Extract amenity names
      const amenityNames = amenities.map((amenity) => amenity.name);
      // Build payload based on the property category
      const payload = {
        property_category: propertyCategory,
        property_type: propertyType,
        name,
        description,
        location,
        latitude: latitude || "",
        longitude: longitude || "",
        bedrooms,
        bathrooms,
        area,
        ...(propertyCategory === "rental" && { price_per_month: price }),
        ...(propertyCategory === "sale" && { price }),
        ...(propertyCategory === "sale" && { year_built: yearBuilt }),
        ...(propertyCategory === "per_night" && {
          price_per_night: pricePerNight,
        }),
        ...(propertyCategory === "per_night" && { check_in_time: checkInTime }),
        ...(propertyCategory === "per_night" && {
          check_out_time: checkOutTime,
        }),
        ...(propertyCategory === "per_night" && { min_nights: minNights }),
        ...(propertyCategory === "per_night" && { max_nights: maxNights }),
        ...(propertyCategory !== "sale" && {
          number_of_units: numberOfUnits || 0,
        }),
        is_available: isAvailable === "yes",
        is_featured: isFeatured === "yes",
        amenities: amenityNames, // Stringify amenities
        images: uploadedImageUrls,
      };
      console.log(payload);

      const response = await fetch(`${API_BASE_URL}/api/v1/properties/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,

          "Content-Type": "application/json",
          Referer: API_BASE_URL,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Property added successfully:", data);
        Alert.alert("Success", "Property added successfully!");
        navigation.goBack();
      } else {
        const errorData = await response.json();
        console.error("Error adding property:", errorData);
        Alert.alert("Error", "Failed to add the property. Please try again.");
      }
    } catch (error) {
      console.error("Error during submission:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openMap = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission to access location was denied");
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    setLatitude(currentLocation.coords.latitude);
    setLongitude(currentLocation.coords.longitude);
    setShowMap(true);
  };

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setLatitude(coordinate.latitude);
    setLongitude(coordinate.longitude);
  };

  const confirmLocation = async () => {
    try {
      let address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (address && address.length > 0) {
        setLocation(
          `${address[0].street}, ${address[0].city}, ${address[0].region}, ${address[0].country}`,
        );
      }
      setShowMap(false);
    } catch (error) {
      console.error("Error getting address:", error);
      Alert.alert("Error", "Failed to get address. Please try again.");
    }
  };
  // Replace the existing amenities input with this new UI
  const renderAmenitiesSection = () => (
    <View>
      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.amenitiesContainer}>
        {amenities.map((amenity) => (
          <View key={amenity.id} style={styles.amenityItem}>
            <Text style={styles.amenityText}>{amenity.name}</Text>
            <TouchableOpacity onPress={() => removeAmenity(amenity.id)}>
              <MaterialIcons name="close-circle" size={20} color="#FF0000" />
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
            placeholderTextColor="#a0a0a0"
          />
          <TouchableOpacity
            style={styles.addAmenityButton}
            onPress={addAmenity}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPropertyTypeOrStyle = () => {
    if (propertyCategory === "per_night") {
      return (
        <View>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="home"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <Picker
              selectedValue={propertyStyle}
              style={styles.picker}
              onValueChange={(itemValue) => setPropertyStyle(itemValue)}
            >
              <Picker.Item label="Select Property Style" value="" />
              <Picker.Item label="Entire Place" value="ENTIRE_PLACE" />
              <Picker.Item label="Private Room" value="PRIVATE_ROOM" />
              <Picker.Item label="Shared Room" value="SHARED_ROOM" />
            </Picker>
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons
              name="apartment"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Number of Units"
              placeholderTextColor="#a0a0a0"
              value={numberOfUnits}
              onChangeText={setNumberOfUnits}
              keyboardType="numeric"
            />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="home"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <Picker
            selectedValue={propertyType}
            style={styles.picker}
            onValueChange={(itemValue) => setPropertyType(itemValue)}
          >
            <Picker.Item label="Select Property Type" value="" />
            <Picker.Item label="Apartment" value="APT" />
            <Picker.Item label="House" value="HOUSE" />
            <Picker.Item label="Villa" value="VILLA" />
            <Picker.Item label="Land" value="LAND" />
            <Picker.Item label="Office Space" value="OFFICE" />
            <Picker.Item label="Event Center & Venues" value="EVENT" />
            <Picker.Item label="Short Let Property" value="SHORT_LET" />
          </Picker>
        </View>
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.header}>Add Property</Text>

        {isExpoGo && (
          <View style={styles.warningContainer}>
            <MaterialIcons name="warning" size={24} color="#FFA500" />
            <Text style={styles.warningText}>
              You are running in Expo Go. Some features, including in-app
              purchases, are limited.
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="category"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <Picker
            selectedValue={propertyCategory}
            style={styles.picker}
            onValueChange={(itemValue) => {
              setPropertyCategory(itemValue);
              setPropertyType("");
              setPropertyStyle("");
            }}
          >
            <Picker.Item label="Select Property Category" value="" />
            <Picker.Item label="Rental" value="rental" />
            <Picker.Item label="For Sale" value="sale" />
            <Picker.Item label="Per Night" value="per_night" />
          </Picker>
        </View>

        {renderPropertyTypeOrStyle()}

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="title"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Property Name"
            placeholderTextColor="#a0a0a0"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="description"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            placeholderTextColor="#a0a0a0"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="attach-money"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder={
              propertyCategory === "rental"
                ? "Price per Month"
                : propertyCategory === "per_night"
                  ? "Price per Night"
                  : "Sale Price"
            }
            placeholderTextColor="#a0a0a0"
            value={propertyCategory === "per_night" ? pricePerNight : price}
            onChangeText={
              propertyCategory === "per_night" ? setPricePerNight : setPrice
            }
            keyboardType="numeric"
          />
        </View>

        {propertyCategory === "rental" && (
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="attach-money"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Rental Deposit"
              placeholderTextColor="#a0a0a0"
              value={rentalDeposit}
              onChangeText={setRentalDeposit}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="location-on"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#a0a0a0"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity onPress={openMap} style={styles.mapButton}>
            <MaterialIcons name="map" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <MaterialIcons
              name="hotel"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Bedrooms"
              placeholderTextColor="#a0a0a0"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputContainer, styles.halfWidth]}>
            <MaterialIcons
              name="bathtub"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Bathrooms"
              placeholderTextColor="#a0a0a0"
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="square-foot"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Area (sq ft)"
            placeholderTextColor="#a0a0a0"
            value={area}
            onChangeText={setArea}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.featuredContainer}>
          <Picker
            selectedValue={isFeatured}
            style={styles.picker}
            onValueChange={(itemValue) => setIsFeatured(itemValue)}
            enabled={!isExpoGo}
          >
            <Picker.Item label="None Featured Property" value="no" />
            <Picker.Item label="Featured Property" value="yes" />
          </Picker>

          {isFeatured === "yes" && (
            <View style={styles.infoBox}>
              <MaterialIcons
                name="info"
                size={20}
                color="#1976D2"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                {isExpoGo
                  ? "Featured properties are not available in Expo Go."
                  : "Featured properties cost 999 KES per listing. You will be prompted to make the purchase before submitting."}
              </Text>
            </View>
          )}
        </View>

        {propertyCategory === "sale" && (
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="event"
              size={24}
              color="#4CAF50"
              style={styles.icon}
            />
            <Picker
              selectedValue={yearBuilt}
              style={styles.picker}
              onValueChange={(itemValue) => setYearBuilt(itemValue)}
            >
              <Picker.Item label="Select Year Built" value="" />
              {Array.from(
                { length: new Date().getFullYear() - 1899 },
                (_, i) => (
                  <Picker.Item
                    key={i}
                    label={(new Date().getFullYear() - i).toString()}
                    value={(new Date().getFullYear() - i).toString()}
                  />
                ),
              )}
            </Picker>
          </View>
        )}

        {propertyCategory === "rental" && (
          <>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="apartment"
                size={24}
                color="#4CAF50"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="Number of Units"
                placeholderTextColor="#a0a0a0"
                value={numberOfUnits}
                onChangeText={setNumberOfUnits}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="check-circle"
                size={24}
                color="#4CAF50"
                style={styles.icon}
              />
              <Picker
                selectedValue={isAvailable}
                style={styles.picker}
                onValueChange={(itemValue) => setIsAvailable(itemValue)}
              >
                <Picker.Item label="Is Available" value="yes" />
                <Picker.Item label="Not Available" value="no" />
              </Picker>
            </View>
          </>
        )}

        {propertyCategory === "per_night" && (
          <>
            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <MaterialIcons
                  name="access-time"
                  size={24}
                  color="#4CAF50"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Check-in Time (HH:MM)"
                  placeholderTextColor="#a0a0a0"
                  value={checkInTime}
                  onChangeText={setCheckInTime}
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <MaterialIcons
                  name="access-time"
                  size={24}
                  color="#4CAF50"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Check-out Time (HH:MM)"
                  placeholderTextColor="#a0a0a0"
                  value={checkOutTime}
                  onChangeText={setCheckOutTime}
                />
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <MaterialIcons
                  name="nights-stay"
                  size={24}
                  color="#4CAF50"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Min Nights"
                  placeholderTextColor="#a0a0a0"
                  value={minNights}
                  onChangeText={setMinNights}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <MaterialIcons
                  name="nights-stay"
                  size={24}
                  color="#4CAF50"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Max Nights"
                  placeholderTextColor="#a0a0a0"
                  value={maxNights}
                  onChangeText={setMaxNights}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="check-circle"
                size={24}
                color="#4CAF50"
                style={styles.icon}
              />
              <Picker
                selectedValue={isAvailable}
                style={styles.picker}
                onValueChange={(itemValue) => setIsAvailable(itemValue)}
              >
                <Picker.Item label="Is Available" value="yes" />
                <Picker.Item label="Not Available" value="no" />
              </Picker>
            </View>
          </>
        )}

        {renderAmenitiesSection()}

        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <MaterialIcons
            name="add-a-photo"
            size={24}
            color="#fff"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Add Images</Text>
        </TouchableOpacity>

        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Modal visible={showMap} animationType="slide">
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_OPENSTREETMAP}
              initialRegion={{
                latitude: latitude || 0,
                longitude: longitude || 0,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={handleMapPress}
            >
              {latitude && longitude && (
                <Marker
                  coordinate={{ latitude, longitude }}
                  title="Selected Location"
                />
              )}
            </MapView>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmLocation}
            >
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || isPurchasing) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={isLoading || isPurchasing}
        >
          {isLoading || isPurchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#4CAF50",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  icon: {
    padding: 10,
  },
  input: {
    flex: 1,
    color: "#333",
    paddingVertical: 10,
    paddingRight: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 10,
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  imageWrapper: {
    position: "relative",
    margin: 5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    padding: 4,
  },
  picker: {
    flex: 1,
    color: "#333",
  },
  mapButton: {
    padding: 10,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    alignItems: "center",
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#E53E3E",
    fontSize: 14,
  },
  featuredContainer: {
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    color: "#1976D2",
    flex: 1,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    marginLeft: 10,
    color: "#FF9800",
    flex: 1,
  },
  // Add new styles for amenities section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 12,
    marginTop: 20,
  },
  labeledInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4A5568",
    marginBottom: 8,
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
});

export default AddPropertyPage;
