import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { format } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const ViewingListPage = () => {
  const [viewings, setViewings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newNotes, setNewNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userType, setUserType] = useState(null);
  const [newStatus, setNewStatus] = useState("PENDING");

  const statusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  useEffect(() => {
    const getUserType = async () => {
      try {
        const userTypeData = await AsyncStorage.getItem("userType");
        setUserType(userTypeData);
      } catch (error) {
        console.error("Error getting user type:", error);
      }
    };
    getUserType();
    fetchViewings();
  }, []);

  const fetchViewings = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/property-viewings/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch viewings");

      const data = await response.json();
      setViewings(data);
    } catch (error) {
      console.error("Error fetching viewings:", error);
      Alert.alert("Error", "Failed to load viewings");
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchViewings().finally(() => setRefreshing(false));
  }, []);

  const handleUpdateViewing = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const updateData = {
        viewing_date: newDate.toISOString(),
        notes: newNotes,
      };

      // Only include status in update if user is a seller
      if (userType === "SELLER") {
        updateData.status = newStatus;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/property-viewings/${selectedViewing.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
          body: JSON.stringify(updateData),
        },
      );

      const responseData = await response.json();
      console.log(responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update viewing");
      }

      Alert.alert("Success", "Viewing updated successfully");
      setModalVisible(false);
      fetchViewings();
    } catch (error) {
      console.error("Error updating viewing:", error);
      Alert.alert("Error", error.message || "Failed to update viewing");
    }
  };

  const handleCancelViewing = async (viewingId) => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const response = await fetch(
        `${API_BASE_URL}/api/v1/property-viewings/${viewingId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
          body: JSON.stringify({
            status: "CANCELLED",
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to cancel viewing");

      Alert.alert("Success", "Viewing cancelled successfully");
      fetchViewings();
    } catch (error) {
      console.error("Error cancelling viewing:", error);
      Alert.alert("Error", "Failed to cancel viewing");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.propertyName}>{item.property_name}</Text>
      <Text style={styles.date}>
        Date: {format(new Date(item.viewing_date), "PPP p")}
      </Text>
      <Text style={styles.status}>Status: {item.status}</Text>
      {item.notes && <Text style={styles.notes}>Notes: {item.notes}</Text>}

      {(item.status === "PENDING" || userType === "SELLER") && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={() => {
              setSelectedViewing(item);
              setNewDate(new Date(item.viewing_date));
              setNewNotes(item.notes || "");
              setNewStatus(item.status);
              setModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Update</Text>
          </TouchableOpacity>

          {item.status === "PENDING" && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() =>
                Alert.alert(
                  "Cancel Viewing",
                  "Are you sure you want to cancel this viewing?",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes",
                      onPress: () => handleCancelViewing(item.id),
                    },
                  ],
                )
              }
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={viewings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No viewings scheduled</Text>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Viewing</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>Select Date: {format(newDate, "PPP p")}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newDate}
                mode="datetime"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selectedDate) {
                    setNewDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
              />
            )}

            {userType === "SELLER" && (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Status:</Text>
                <Picker
                  selectedValue={newStatus}
                  onValueChange={(itemValue) => setNewStatus(itemValue)}
                  style={styles.picker}
                >
                  {statusOptions.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            )}

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes"
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateViewing}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  notes: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  updateButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  dateButton: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginBottom: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
});

export default ViewingListPage;
