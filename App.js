import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Import the custom icons
import binocularsIcon from './assets/binoculars.png';
import wishlistIcon from './assets/wishlist.png';
import inboxIcon from './assets/mail-inbox-app.png';
import profileIcon from './assets/user.png';
import raxanLogo from './assets/raxan-logo.jpeg';
import starIcon from './assets/star.png';
import halfStarIcon from './assets/rating.png';

// Import property images
import room1 from './assets/room1.jpg';
import room2 from './assets/room2.jpg';
import room3 from './assets/room3.jpg';
import room4 from './assets/room4.jpg';

// Import the ProfileScreen and PropertyPage components
import ProfileScreen from './ProfileScreen';
import PropertyPage from './PropertyPage';
import { LoginScreen, SignupScreen } from './AuthScreens'; // Assuming you save the new code in AuthScreens.js




const featuredProperties = [
  { id: '1', image: room1, title: 'Cozy Apartment', location: 'New York', price: '$120/night', rating: 4.5 },
  { id: '2', image: room2, title: 'Luxury Villa', location: 'Los Angeles', price: '$350/night', rating: 4.8 },
  { id: '3', image: room3, title: 'Modern Condo', location: 'Miami', price: '$200/night', rating: 4.2 },
  { id: '4', image: room4, title: 'Rustic Cabin', location: 'Colorado', price: '$150/night', rating: 4.7 },
];

function RatingStars({ rating }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <View style={styles.ratingContainer}>
      {[...Array(fullStars)].map((_, index) => (
        <Image key={`full-star-${index}`} source={starIcon} style={styles.starIcon} />
      ))}
      {hasHalfStar && (
        <Image source={halfStarIcon} style={[styles.starIcon, styles.halfStar]} />
      )}
    </View>
  );
}

function HomeScreen({ navigation }) {
  const renderProperty = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => navigation.navigate('PropertyPage', { property: item })}
    >
      <Image source={item.image} style={styles.propertyImage} />
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
      <View style={styles.profileHeader}>
        <Text style={styles.profileName}>RAXAN HOMES</Text>
        <Image source={raxanLogo} style={styles.profileLogo} />
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
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
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function WishlistScreen() {
  return (
    <View style={styles.container}>
      <Text>Wishlist</Text>
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
  return (
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
          options={{ title: 'Property Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconSource;

          if (route.name === 'Explore') {
            iconSource = binocularsIcon;
          } else if (route.name === 'Wishlist') {
            iconSource = wishlistIcon;
          } else if (route.name === 'Inbox') {
            iconSource = inboxIcon;
          } else if (route.name === 'Profile') {
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
        activeTintColor: '#4CAF50',
        inactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen name="Explore" component={HomeScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileLogo: {
    width: 40,
    height: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    margin: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 10,
    color: '#333',
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  propertyInfo: {
    padding: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  propertyLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  propertyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    width: 16,
    height: 16,
    marginRight: 2,
  },
  halfStar: {
    tintColor: '#4CAF50',
  },
});
