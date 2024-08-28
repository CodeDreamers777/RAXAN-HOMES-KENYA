import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import default user profile image
import defaultUserProfileImage from './assets/user-profile.jpg';

const API_BASE_URL = "https://k031s30h-8000.euw.devtunnels.ms";

const fetchCSRFToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

function ProfileScreen() {
  const [showModal, setShowModal] = useState(false);
  const [csrfToken, setCSRFToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = await fetchCSRFToken();
        setCSRFToken(token);

        const accessToken = await AsyncStorage.getItem('accessToken');
        if (!accessToken) {
          throw new Error('No access token found');
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await response.json();
        console.log(profileData);
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/v1/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.removeItem('accessToken');
        navigation.navigate('Login');
      } else {
        Alert.alert('Logout Failed', data.message || 'An error occurred while logging out. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An error occurred while logging out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image 
          source={profile?.profile_picture ? { uri: profile.profile_picture } : defaultUserProfileImage} 
          style={styles.profileImage} 
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.username || 'N/A'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || 'N/A'}</Text>
          <Text style={styles.profilePhone}>{profile?.phone_number || 'Phone not provided'}</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={18} color="#4CAF50" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.addPlaceButton}>
          <Text style={styles.addPlaceText}>Add your place</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.settingsButton}>
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profile</Text>
          </View>
          <View style={styles.modalContent}>
            <Image 
              source={profile?.profile_picture ? { uri: profile.profile_picture } : defaultUserProfileImage} 
              style={styles.profileImage} 
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.user?.username || 'N/A'}</Text>
              <Text style={styles.profileEmail}>{profile?.email || 'N/A'}</Text>
              <Text style={styles.profilePhone}>{profile?.phone_number || 'Phone not provided'}</Text>
              <TouchableOpacity style={styles.editProfileButton}>
                <Ionicons name="pencil" size={18} color="#4CAF50" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f2f2f2",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  editProfileText: {
    fontSize: 16,
    color: "#4CAF50",
    marginLeft: 5,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  addPlaceButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addPlaceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  settingsText: {
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#e53935",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    color: "#333",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ProfileScreen;
