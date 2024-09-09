import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import starIcon from '../../assets/star.png';
import halfStarIcon from '../../assets/rating.png';


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

function PropertyPage({ route }) {
  const { property } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Image source={property.image} style={styles.propertyImage} />
      <View style={styles.propertyDetails}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyTitle}>{property.title}</Text>
          <View style={styles.ratingContainer}>
            <RatingStars rating={property.rating} />
            <Text style={styles.ratingText}>{property.rating}</Text>
          </View>
        </View>
        <Text style={styles.propertyLocation}>{property.location}</Text>
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          Enjoy a comfortable stay in this cozy apartment located in the heart of New York City. Featuring modern amenities and a charming decor, this property is perfect for your next trip.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenitiesContainer}>
          <View style={styles.amenityItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.amenityText}>WiFi</Text>
          </View>
          <View style={styles.amenityItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.amenityText}>Kitchen</Text>
          </View>
          <View style={styles.amenityItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.amenityText}>Air Conditioning</Text>
          </View>
          <View style={styles.amenityItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.amenityText}>TV</Text>
          </View>
          <View style={styles.amenityItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.amenityText}>Balcony</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.bookingSection}>
          <Text style={styles.bookingPrice}>{property.price}</Text>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  propertyImage: {
    width: '100%',
    height: 300,
  },
  propertyDetails: {
    padding: 20,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 5,
  },
  propertyLocation: {
    fontSize: 16,
    color: '#666',
    marginVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  amenityText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 5,
  },
  bookingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  bookingPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default PropertyPage;

