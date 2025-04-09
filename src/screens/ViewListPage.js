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

// Simplified color palette based on #2C3E50
const COLORS = {
  primary: "#2C3E50",
  primaryLight: "#34495E",
  primaryDark: "#1A2530",
  accent: "#3498DB",
  background: "#F5F7FA",
  cardBg: "#FFFFFF",
  text: "#2C3E50",
  textLight: "#7F8C8D",
  border: "#E0E0E0",
  buttonText: "#FFFFFF",
};

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
      <View style={styles.cardHeader}>
        <Text style={styles.propertyName}>{item.property_name}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.dateText}>
          {format(new Date(item.viewing_date), "PPP p")}
        </Text>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {(item.status === "PENDING" || userType === "SELLER") && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedViewing(item);
              setNewDate(new Date(item.viewing_date));
              setNewNotes(item.notes || "");
              setNewStatus(item.status);
              setModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>

          {item.status === "PENDING" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
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
              <Text style={styles.actionButtonText}>Cancel</Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No viewings scheduled</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Viewing</Text>
            </View>

            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.fieldLabel}>Date & Time</Text>
                <Text style={styles.dateValue}>{format(newDate, "PPP p")}</Text>
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
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.pickerContainer}>
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
                </View>
              )}

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add notes about this viewing"
                  placeholderTextColor={COLORS.textLight}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleUpdateViewing}
              >
                <Text style={styles.modalButtonText}>Save</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  propertyName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  statusContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  notesContainer: {
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 10,
    marginHorizontal: 6,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    color: COLORS.buttonText,
    fontWeight: "600",
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  modalContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  dateSelector: {
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateValue: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  picker: {
    height: 50,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelModalButton: {
    backgroundColor: COLORS.primaryLight,
  },
  saveModalButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ViewingListPage;
