import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const ReviewScreen = ({ route, navigation }) => {
  const { propertyId, propertyName, existingReview, isRental, isPerNight } =
    route.params;
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (existingReview) {
      setReviewText(existingReview.comment);
      setReviewRating(existingReview.rating);
    }
    fetchUsername();
  }, [existingReview]);

  const fetchUsername = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);
      setUsername(userData.username);
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  const getRatingLabel = (rating) => {
    if (rating === 5) return "Excellent!";
    if (rating === 4) return "Very Good!";
    if (rating === 3) return "Good";
    if (rating === 2) return "Fair";
    if (rating === 1) return "Poor";
    return "Select your rating";
  };

  const handleSubmitReview = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      if (!accessToken || !csrfToken) {
        throw new Error("No access token or CSRF token found");
      }

      const API_BASE_URL = "https://yakubu.pythonanywhere.com";
      const method = existingReview ? "PATCH" : "POST";
      const url = existingReview
        ? `${API_BASE_URL}/api/v1/reviews/${existingReview.id}/`
        : `${API_BASE_URL}/api/v1/reviews/`;
      console.log(url);
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
        body: JSON.stringify({
          property_id: propertyId,
          property_type: isRental
            ? "rental"
            : isPerNight
              ? "per_night"
              : "sale",
          rating: reviewRating,
          comment: reviewText,
        }),
      });
      console.log(response);
      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      Alert.alert("Success", "Your review has been submitted!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("PropertyPage", { propertyId }),
        },
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingReview ? "Edit Review" : "Write a Review"}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.propertyName}>{propertyName}</Text>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setReviewRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= reviewRating ? "star" : "star-outline"}
                  size={36}
                  color={star <= reviewRating ? "#FFD700" : "#D1D5DB"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>{getRatingLabel(reviewRating)}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Your Review</Text>
          <TextInput
            style={styles.reviewInput}
            multiline
            placeholder="Share your experience with this property..."
            value={reviewText}
            onChangeText={setReviewText}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {reviewText.length}/500 characters
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!reviewRating || !reviewText.trim()) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReview}
          disabled={!reviewRating || !reviewText.trim()}
        >
          <Text style={styles.submitButtonText}>Submit Review</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
    color: "#1F2937",
  },
  content: {
    padding: 16,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 24,
  },
  ratingSection: {
    marginBottom: 32,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#4B5563",
    marginTop: 8,
  },
  reviewSection: {
    marginBottom: 32,
  },
  reviewLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 16,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    height: 160,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  characterCount: {
    textAlign: "right",
    color: "#6B7280",
    marginTop: 8,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ReviewScreen;
