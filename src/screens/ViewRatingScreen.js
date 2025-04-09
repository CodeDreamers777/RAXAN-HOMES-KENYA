import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const ViewRatingsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ratings } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh function
  const onRefresh = () => {
    setRefreshing(true);
    // Here you would typically fetch fresh data
    // For example: fetchRatings().then(() => setRefreshing(false));

    // Simulating a network request with a timeout
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderRatingStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color="#F39C12" // Changed from #FFA000 to a more complementary gold
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderRatingItem = ({ item }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.reviewerInfo}>
          <Image
            source={
              item.reviewer.profile_picture
                ? { uri: `${API_BASE_URL}${item.reviewer.profile_picture}` }
                : require("../../assets/user-profile.jpg")
            }
            style={styles.reviewerImage}
          />
          <Text style={styles.reviewerName}>{item.reviewer.username}</Text>
        </View>
        <View style={styles.ratingInfo}>
          {renderRatingStars(item.rating)}
          <Text style={styles.ratingDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <View style={styles.ratingContent}>
        <Text style={styles.ratingText}>{item.comment}</Text>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={64} color="#7F8C8D" />
      <Text style={styles.emptyText}>No ratings yet</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Property Ratings</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{ratings.length}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.statNumber}>
                {ratings.length > 0
                  ? (
                      ratings.reduce((acc, curr) => acc + curr.rating, 0) /
                      ratings.length
                    ).toFixed(1)
                  : "0.0"}
              </Text>
              <Ionicons
                name="star"
                size={16}
                color="#F39C12"
                style={styles.averageStar}
              />
            </View>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
        </View>
      </View>
      {ratings.length > 0 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, styles.filterButtonInactive]}
          >
            <Text style={styles.filterButtonTextInactive}>5 Stars</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, styles.filterButtonInactive]}
          >
            <Text style={styles.filterButtonTextInactive}>Recent</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ECF0F1" />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Ratings & Reviews</Text>
        {ratings.length > 0 && (
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="options-outline" size={22} color="#ECF0F1" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={ratings}
        renderItem={renderRatingItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2C3E50"]}
            tintColor="#2C3E50"
            title="Refreshing..."
            titleColor="#2C3E50"
          />
        }
      />
      {ratings.length > 0 && (
        <TouchableOpacity style={styles.addReviewButton}>
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addReviewButtonText}>Add Review</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECF0F1", // Light background that complements the dark blue theme
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#2C3E50", // New primary color
    borderBottomWidth: 1,
    borderBottomColor: "#34495E", // Slightly lighter shade for border
  },
  backButton: {
    padding: 8,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ECF0F1",
    flex: 1,
    textAlign: "center",
  },
  sortButton: {
    padding: 8,
  },
  headerContainer: {
    backgroundColor: "#FFF",
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  headerContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50", // Matching the theme color
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#BDC3C7",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  statLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    marginTop: 4,
  },
  averageRatingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  averageStar: {
    marginBottom: 5,
    marginLeft: 2,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#2C3E50",
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonInactive: {
    backgroundColor: "#ECF0F1",
    borderWidth: 1,
    borderColor: "#BDC3C7",
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  filterButtonTextInactive: {
    color: "#7F8C8D",
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for the floating button
  },
  ratingCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#2C3E50",
  },
  ratingHeader: {
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#ECF0F1",
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  ratingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  ratingDate: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  ratingContent: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F5",
  },
  ratingText: {
    fontSize: 16,
    color: "#34495E",
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 16,
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    color: "#7F8C8D",
    marginTop: 16,
  },
  addReviewButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2C3E50",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addReviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ViewRatingsScreen;
