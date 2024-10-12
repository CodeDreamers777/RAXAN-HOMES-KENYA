import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import the custom icons
import binocularsIcon from "./assets/binoculars.png";
import wishlistIcon from "./assets/wishlist.png";
import inboxIcon from "./assets/mail-inbox-app.png";
import profileIcon from "./assets/user.png";

// Import screens and components
import HomePage from "./src/screens/HomePage";
import ProfileScreen from "./src/screens/ProfileScreen";
import PropertyPage from "./src/screens/PropertyPage";
import { LoginScreen, SignUpScreen } from "./src/screens/AuthScreens";
import AddPropertyPage from "./src/screens/AddProperty";
import ViewMyListings from "./src/screens/ViewMyListings";
import UpdateProperty from "./src/screens/UpdateProperty";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import WishlistScreen from "./src/screens/Wishlist";
import BookingConfirmation from "./src/screens/BookingConfirmation";
import BookingsScreen from "./src/screens/BookingsScreen";
import BookingDetailScreen from "./src/screens/BookingDetailScreen";
import InboxScreen from "./src/screens/InboxScreen"; // Import the new InboxScreen
import ConversationDetailScreen from "./src/screens/ConversationDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
      <Tab.Screen name="Explore" component={HomePage} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    checkAccessToken();
  }, []);

  const checkAccessToken = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      setAccessToken(token);
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking access token:", error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // You might want to show a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={accessToken ? "Home" : "Login"}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
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
        <Stack.Screen
          name="AddProperty"
          component={AddPropertyPage}
          options={{ title: "Add Property" }}
        />
        <Stack.Screen name="ViewMyListings" component={ViewMyListings} />
        <Stack.Screen name="UpdateProperty" component={UpdateProperty} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen
          name="BookingConfirmation"
          component={BookingConfirmation}
          options={{ title: "Booking Confirmation" }}
        />
        <Stack.Screen
          name="BookingsScreen"
          component={BookingsScreen}
          options={{ title: "BookingsScreen" }}
        />
        <Stack.Screen
          name="BookingDetailScreen"
          component={BookingDetailScreen}
          options={{ title: "BookingDetailScreen" }}
        />
        <Stack.Screen
          name="ConversationDetail"
          component={ConversationDetailScreen}
          options={({ route }) => ({ title: route.params.otherUserName })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
