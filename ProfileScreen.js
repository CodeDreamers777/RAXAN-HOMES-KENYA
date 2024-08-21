import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import user profile image
import userProfileImage from './assets/user-profile.jpg';

function ProfileScreen() {
  const [showModal, setShowModal] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image source={userProfileImage} style={styles.profileImage} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>John Doe</Text>
          <Text style={styles.profileLocation}>New York, NY</Text>
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
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
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
            <Image source={userProfileImage} style={styles.profileImage} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>John Doe</Text>
              <Text style={styles.profileLocation}>New York, NY</Text>
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
    backgroundColor: '#f2f2f2',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  profileLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 5,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  addPlaceButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addPlaceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
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
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#e53935',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
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
