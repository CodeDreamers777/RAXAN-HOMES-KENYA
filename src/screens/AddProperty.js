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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const AddPropertyPage = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [propertyCategory, setPropertyCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [isAvailable, setIsAvailable] = useState("yes");
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [csrfToken, setCSRFToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    fetchCSRFToken();
    getAccessToken();
  }, []);

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

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!accessToken) {
      Alert.alert("Error", "No access token found. Please log in again.");
      return;
    }

    // Validate required fields
    const requiredFields = [
      propertyCategory,
      propertyType,
      name,
      description,
      price,
      location,
      bedrooms,
      bathrooms,
      area,
    ];

    if (propertyCategory === "rental") {
      requiredFields.push(maxGuests);
    } else if (propertyCategory === "sale") {
      requiredFields.push(yearBuilt);
    }

    if (requiredFields.some((field) => !field) || amenities.length === 0) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("property_category", propertyCategory);
    formData.append("property_type", propertyType);
    formData.append("name", name);
    formData.append("description", description);
    formData.append("location", location);
    formData.append("bedrooms", bedrooms);
    formData.append("bathrooms", bathrooms);
    formData.append("area", area);
    formData.append("amenities", JSON.stringify(amenities));

    if (propertyCategory === "rental") {
      formData.append("price_per_month", price);
      formData.append("max_guests", maxGuests);
      formData.append("is_available", isAvailable === "yes");
    } else {
      formData.append("price", price);
      formData.append("year_built", yearBuilt);
    }

images.forEach((image, index) => {
  const filename = image.split('/').pop(); // Extract the filename from the URI
  formData.append("uploaded_images", {
    uri: image,
    type: "image/jpeg",
    name: filename, // Use the actual filename
  });
});
    console.log(formData);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/properties/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          "Content-Type": "multipart/form-data",
          Referer: API_BASE_URL,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Property added successfully:", data);
        Alert.alert("Success", "Property added successfully!", [
          { text: "OK", onPress: () => navigation.navigate("Profile") },
        ]);
      } else {
        const errorData = await response.json();
        console.error("Error adding property:", errorData);
        Alert.alert(
          "Error",
          "Failed to add property. Please check all fields and try again.",
        );
      }
    } catch (error) {
      console.error("Error submitting property:", error);
      Alert.alert(
        "Error",
        "An error occurred while adding the property. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate an array of years from 1900 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) =>
    (currentYear - i).toString(),
  );
  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.header}>Add Property</Text>

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
            onValueChange={(itemValue) => setPropertyCategory(itemValue)}
          >
            <Picker.Item label="Select Property Category" value="" />
            <Picker.Item label="Rental" value="rental" />
            <Picker.Item label="For Sale" value="sale" />
          </Picker>
        </View>

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
          </Picker>
        </View>

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
              propertyCategory === "rental" ? "Price per Month" : "Sale Price"
            }
            placeholderTextColor="#a0a0a0"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>

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
              {years.map((year) => (
                <Picker.Item key={year} label={year} value={year} />
              ))}
            </Picker>
          </View>
        )}

        {propertyCategory === "rental" && (
          <>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="group"
                size={24}
                color="#4CAF50"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="Max Guests"
                placeholderTextColor="#a0a0a0"
                value={maxGuests}
                onChangeText={setMaxGuests}
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

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="list"
            size={24}
            color="#4CAF50"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Amenities (comma-separated)"
            placeholderTextColor="#a0a0a0"
            value={amenities.join(", ")}
            onChangeText={(text) =>
              setAmenities(text.split(",").map((item) => item.trim()))
            }
          />
        </View>

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

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
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
});

export default AddPropertyPage;
