import React, { useState, useEffect, createContext, useContext } from "react";
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
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the custom icons
import binocularsIcon from "./assets/binoculars.png";
import wishlistIcon from "./assets/wishlist.png";
import inboxIcon from "./assets/mail-inbox-app.png";
import profileIcon from "./assets/user.png";
import raxanLogo from "./assets/raxan-logo.jpeg";
import starIcon from "./assets/star.png";
import halfStarIcon from "./assets/rating.png";

// Import property images
import room1 from "./assets/room1.jpg";
import room2 from "./assets/room2.jpg";
import room3 from "./assets/room3.jpg";
import room4 from "./assets/room4.jpg";

// Import the ProfileScreen and PropertyPage components
import ProfileScreen from "./ProfileScreen";
import PropertyPage from "./PropertyPage";
import { LoginScreen, SignupScreen } from "./AuthScreens";

// Create a Wishlist Context
const WishlistContext = createContext();

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

function HomeScreen({ navigation }) {
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

function WishlistScreen() {
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);

  const renderWishlistItem = ({ item }) => (
    <View style={styles.wishlistItem}>
      <Image source={item.image} style={styles.wishlistPropertyImage} />
      <View style={styles.wishlistPropertyInfo}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <Text style={styles.propertyLocation}>{item.location}</Text>
        <Text style={styles.propertyPrice}>{item.price}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFromWishlist(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {wishlist.length === 0 ? (
        <View style={styles.emptyWishlist}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function InboxScreen() {
  return (
    <View style={styles.container}>
      <Text>Inbox</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function App() {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const storedWishlist = await AsyncStorage.getItem('wishlist');
      if (storedWishlist !== null) {
        setWishlist(JSON.parse(storedWishlist));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const toggleWishlist = async (property) => {
    const isInWishlist = wishlist.some((item) => item.id === property.id);
    let updatedWishlist;

    if (isInWishlist) {
      updatedWishlist = wishlist.filter((item) => item.id !== property.id);
    } else {
      updatedWishlist = [...wishlist, property];
    }

    setWishlist(updatedWishlist);
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  const removeFromWishlist = async (propertyId) => {
    const updatedWishlist = wishlist.filter((item) => item.id !== propertyId);
    setWishlist(updatedWishlist);
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, removeFromWishlist }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PropertyPage"
            component={PropertyPage}
            options={{ title: "Property Details" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </WishlistContext.Provider>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconSource;

          if (route.name === "Explore") {
            iconSource = binocularsIcon;
          } else if (route.name === "Wishlist") {
            iconSource = wishlistIcon;
          } else if (route.name === "Inbox") {
            iconSource = inboxIcon;
          } else if (route.name === "Profile") {
            iconSource = profileIcon;
          }

          return (
            <Image
              source={iconSource}
              style={{ width: size, height: size, tintColor: color }}
            />
          );
        },
      })}
      tabBarOptions={{
        activeTintColor: "#4CAF50",
        inactiveTintColor: "gray",
      }}
    >
      <Tab.Screen name="Explore" component={HomeScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
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
  wishlistItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  wishlistPropertyImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  wishlistPropertyInfo: {
    flex: 1,
    padding: 16,
  },
  removeButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  emptyWishlist: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginTop: 16,
  },
});

export default App;
