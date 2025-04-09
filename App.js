"use client";

import React from "react";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkIfNewUser } from "./src/utils/onboarding";

// Import screens and components
import HomePage from "./src/screens/HomePage";
import ProfileScreen from "./src/screens/ProfileScreen";
import PropertyPage from "./src/screens/PropertyPage";
import { Login, SignUp, OtpVerification } from "./src/screens/AuthScreens";
import AddPropertyPage from "./src/screens/AddProperty";
import ViewMyListings from "./src/screens/ViewMyListings";
import UpdateProperty from "./src/screens/UpdateProperty";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import WishlistScreen from "./src/screens/Wishlist";
import BookingConfirmation from "./src/screens/BookingConfirmation";
import BookingsScreen from "./src/screens/BookingsScreen";
import BookingDetailScreen from "./src/screens/BookingDetailScreen";
import InboxScreen from "./src/screens/InboxScreen";
import ConversationDetailScreen from "./src/screens/ConversationDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import WebViewScreen from "./src/screens/Webview";
import ViewRatingsScreen from "./src/screens/ViewRatingScreen";
import ScheduleViewingScreen from "./src/screens/ScheduleViewingScreen";
import ViewingListPage from "./src/screens/ViewListPage";
import BookingScreen from "./src/screens/BookingPerNight";
import {
  ForgotPasswordScreen,
  ForgotOTPVerificationScreen,
} from "./src/screens/ForgotPasswordScreen";
import ReviewScreen from "./src/screens/ReviewScreen";
import PerNightBookings from "./src/screens/PerNightBookings";

// Updated theme colors for a modern look
const PRIMARY_COLOR = "#2C3E50"; // Deep blue-gray
const SECONDARY_COLOR = "#3498DB"; // Medium blue
const ACCENT_COLOR = "#1ABC9C"; // Teal/aqua
const INACTIVE_COLOR = "#95A5A6"; // Light gray with blue undertone
const BACKGROUND_COLOR = "#FFFFFF"; // White

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get("window");

// Custom Tab Bar Button Component
const TabBarButton = ({
  icon,
  label,
  isFocused,
  onPress,
  tabWidth,
  badgeCount = 0,
  forwardedRef,
}) => {
  // Animation values
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -4 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    // Animate when tab focus changes
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: isFocused ? 1.1 : 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(labelOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -4 : 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(dotOpacity, {
        toValue: isFocused ? 1 : 0,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(dotScale, {
        toValue: isFocused ? 1 : 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    // Trigger haptic feedback on press
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      ref={forwardedRef}
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.tabButton, { width: tabWidth }]}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={`${label} tab`}
    >
      <Animated.View
        style={[styles.tabButtonContent, { transform: [{ translateY }] }]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnimation }] },
          ]}
        >
          <Ionicons
            name={icon}
            size={24}
            color={isFocused ? ACCENT_COLOR : INACTIVE_COLOR}
          />

          {badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.Text
          style={[
            styles.tabLabel,
            {
              opacity: labelOpacity,
              color: isFocused ? PRIMARY_COLOR : INACTIVE_COLOR,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.tabIndicator,
          {
            opacity: dotOpacity,
            transform: [{ scale: dotScale }],
            backgroundColor: ACCENT_COLOR,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

// Forward ref for TabBarButton
const TabBarButtonWithRef = React.forwardRef((props, ref) => (
  <TabBarButton {...props} forwardedRef={ref} />
));

// Custom Tab Bar Component with MessageContext integration
const CustomTabBar = ({
  state,
  descriptors,
  navigation,
  exploreTabRef,
  wishlistTabRef,
  inboxTabRef,
  profileTabRef,
}) => {
  const insets = useSafeAreaInsets();
  const tabWidth = width / state.routes.length;

  // Animation for the floating effect
  const translateY = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Simplified badge count function
  const getBadgeCount = (routeName) => {
    // Remove any dynamic badge counting
    return 0;
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 30,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          transform: [{ translateY }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Light blur effect for iOS */}
      {Platform.OS === "ios" && <View style={styles.blurView} />}

      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Define icons for each tab
          let iconName;
          let label;

          if (route.name === "Explore") {
            iconName = isFocused ? "search" : "search-outline";
            label = "Explore";
          } else if (route.name === "Wishlist") {
            iconName = isFocused ? "heart" : "heart-outline";
            label = "Wishlist";
          } else if (route.name === "Inbox") {
            iconName = isFocused ? "chatbubble" : "chatbubble-outline";
            label = "Inbox";
          } else if (route.name === "Profile") {
            iconName = isFocused ? "person" : "person-outline";
            label = "Profile";
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Optional: Add transition animation when switching tabs
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
            // Optional: Add haptic feedback for long press
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          };

          // Determine which ref to use based on the tab name
          let tabRef = null;
          if (route.name === "Explore") tabRef = exploreTabRef;
          else if (route.name === "Wishlist") tabRef = wishlistTabRef;
          else if (route.name === "Inbox") tabRef = inboxTabRef;
          else if (route.name === "Profile") tabRef = profileTabRef;

          return (
            <TabBarButtonWithRef
              key={index}
              ref={tabRef}
              icon={iconName}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              tabWidth={tabWidth}
              badgeCount={getBadgeCount(route.name)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

function TabNavigator({
  exploreTabRef,
  wishlistTabRef,
  inboxTabRef,
  profileTabRef,
}) {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          exploreTabRef={exploreTabRef}
          wishlistTabRef={wishlistTabRef}
          inboxTabRef={inboxTabRef}
          profileTabRef={profileTabRef}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={HomePage}
        initialParams={{
          exploreTabRef,
          wishlistTabRef,
          inboxTabRef,
          profileTabRef,
        }}
      />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const TOKEN_EXPIRATION_DAYS = 7;

const getToken = async () => {
  const itemStr = await AsyncStorage.getItem("accessToken");
  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date();
  if (now.getTime() > item.expiry) {
    await AsyncStorage.removeItem("accessToken");
    return null;
  }
  return item.value;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const navigationRef = useRef(null);

  // Create refs for tab buttons
  const exploreTabRef = useRef(null);
  const wishlistTabRef = useRef(null);
  const inboxTabRef = useRef(null);
  const profileTabRef = useRef(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check access token
        const token = await getToken();
        setAccessToken(token);

        // Check if user is new for onboarding
        await checkIfNewUser();
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    // You might want to show a loading screen here
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar backgroundColor={PRIMARY_COLOR} barStyle="light-content" />
      <Stack.Navigator
        initialRouteName={accessToken ? "Home" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: PRIMARY_COLOR,
            elevation: 0, // for Android
            shadowOpacity: 0, // for iOS
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUp}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" options={{ headerShown: false }}>
          {(props) => (
            <TabNavigator
              {...props}
              exploreTabRef={exploreTabRef}
              wishlistTabRef={wishlistTabRef}
              inboxTabRef={inboxTabRef}
              profileTabRef={profileTabRef}
            />
          )}
        </Stack.Screen>
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
        <Stack.Screen
          name="ViewMyListings"
          component={ViewMyListings}
          options={{ title: "View My Listings" }}
        />
        <Stack.Screen
          name="UpdateProperty"
          component={UpdateProperty}
          options={{ title: "Update Property" }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ title: "Edit Profile" }}
        />
        <Stack.Screen
          name="BookingConfirmation"
          component={BookingConfirmation}
          options={{ title: "Booking Confirmation" }}
        />
        <Stack.Screen
          name="BookingsScreen"
          component={BookingsScreen}
          options={{ title: "My Bookings" }}
        />
        <Stack.Screen
          name="BookingDetailScreen"
          component={BookingDetailScreen}
          options={{ title: "Booking Details" }}
        />
        <Stack.Screen
          name="ConversationDetail"
          component={ConversationDetailScreen}
          options={({ route }) => ({ title: route.params.otherUserName })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="WebView"
          component={WebViewScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewRatings"
          component={ViewRatingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: "Forgot Password" }}
        />
        <Stack.Screen
          name="OtpVerification"
          component={OtpVerification}
          options={{ title: "OTP Verification" }}
        />

        <Stack.Screen
          name="ForgotOTPVerification"
          component={ForgotOTPVerificationScreen}
          options={{ title: "Forgot OTP Verification" }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ScheduleViewing"
          component={ScheduleViewingScreen}
          options={{
            title: "Schedule Viewing",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="ViewingsList"
          component={ViewingListPage}
          options={{ title: "Viewings List" }}
        />
        <Stack.Screen
          name="BookingScreen"
          component={BookingScreen}
          options={{ title: "Book Property" }}
        />
        <Stack.Screen
          name="PerNightBookings"
          component={PerNightBookings}
          options={{ title: "Per Night Bookings" }}
        />
      </Stack.Navigator>

      {/* Add the in-app notification component */}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === "ios" ? "rgba(248,250,252,0.85)" : null, // Lighter background for iOS blur
  },
  tabBarContent: {
    flexDirection: "row",
    backgroundColor:
      Platform.OS === "ios" ? "rgba(248,250,252,0.8)" : BACKGROUND_COLOR,
    marginHorizontal: 16,
    borderRadius: 28,
    height: 68, // Reduced height slightly
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#2C3E50",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: Platform.OS === "ios" ? 0.5 : 1,
    borderColor: "rgba(240,245,248,0.8)",
  },
  tabButton: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  tabButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%", // Ensure it takes full height
    flexDirection: "column", // Ensure vertical layout
  },
  iconContainer: {
    width: 30, // Reduced from 50
    height: 30, // Reduced from 50
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 2, // Add small space between icon and text
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1, // Reduced from 2
    textAlign: "center",
    maxWidth: 75,
    lineHeight: 12, // Add line height to control text spacing
  },
  tabIndicator: {
    width: 24,
    height: 3,
    backgroundColor: ACCENT_COLOR, // Changed to accent color
    position: "absolute",
    bottom: 8, // Adjusted from 10
    borderRadius: 1.5,
    alignSelf: "center",
  },
  badge: {
    position: "absolute",
    top: -5, // Adjusted from 0
    right: -5, // Adjusted from 0
    backgroundColor: "#E74C3C", // Red for notification, complements the blue scheme
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: BACKGROUND_COLOR,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default App;
