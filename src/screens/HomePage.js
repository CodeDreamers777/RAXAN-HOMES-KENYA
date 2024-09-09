import React, { useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WishlistContext } from "../../App";

// Import property images
import room1 from "../../assets/room1.jpg";
import room2 from "../../assets/room2.jpg";
import room3 from "../../assets/room3.jpg";
import room4 from "../../assets/room4.jpg";
import starIcon from "../../assets/star.png";
import halfStarIcon from "../../assets/rating.png";

const featuredProperties = [
  {
    id: "1",
    image: room1,
    title: "Cozy Apartment",
    location: "New York",
    price: "$120/night",
    rating: 4.5,
  },
  {
    id: "2",
    image: room2,
    title: "Luxury Villa",
    location: "Los Angeles",
    price: "$350/night",
    rating: 4.8,
  },
  {
    id: "3",
    image: room3,
    title: "Modern Condo",
    location: "Miami",
    price: "$200/night",
    rating: 4.2,
  },
  {
    id: "4",
    image: room4,
    title: "Rustic Cabin",
    location: "Colorado",
    price: "$150/night",
    rating: 4.7,
  },
];

function RatingStars({ rating }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <View style={styles.ratingContainer}>
      {[...Array(fullStars)].map((_, index) => (
        <Image
          key={`full-star-${index}`}
          source={starIcon}
          style={styles.starIcon}
        />
      ))}
      {hasHalfStar && (
        <Image
          source={halfStarIcon}
          style={[styles.starIcon, styles.halfStar]}
        />
      )}
    </View>
  );
}

function HomePage({ navigation }) {
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  const renderProperty = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => navigation.navigate("PropertyPage", { property: item })}
    >
      <Image source={item.image} style={styles.propertyImage} />
      <TouchableOpacity
        style={styles.wishlistButton}
        onPress={() => toggleWishlist(item)}
      >
        <Ionicons
          name={wishlist.some((prop) => prop.id === item.id) ? "heart" : "heart-outline"}
          size={24}
          color="#FF6B6B"
        />
      </TouchableOpacity>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <Text style={styles.propertyLocation}>{item.location}</Text>
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyPrice}>{item.price}</Text>
          <RatingStars rating={item.rating} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={24}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          placeholderTextColor="#666"
        />
      </View>
      <Text style={styles.sectionTitle}>Featured Properties</Text>
      <FlatList
        data={featuredProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  propertyCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  propertyImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  wishlistButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 50,
    padding: 5,
  },
  propertyInfo: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  propertyLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  propertyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  ratingContainer: {
    flexDirection: "row",
  },
  starIcon: {
    width: 16,
    height: 16,
    marginRight: 2,
  },
  halfStar: {
    tintColor: "#FF6B6B",
  },
});

export default HomePage;
