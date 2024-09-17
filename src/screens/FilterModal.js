import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const FilterModal = ({
  modalVisible,
  toggleModal,
  filters,
  setFilters,
  applyFilters,
}) => {
  const minPriceRef = useRef(null);
  const maxPriceRef = useRef(null);
  const minYearRef = useRef(null);
  const maxYearRef = useRef(null);

  const updateFilter = (filterName, index, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterName]: prevFilters[filterName].map((v, i) =>
        i === index ? value : v
      ),
    }));
  };

  useEffect(() => {
    if (filters.type !== "sale") {
      setFilters((prevFilters) => ({
        ...prevFilters,
        yearBuilt: [1900, new Date().getFullYear()],
      }));
    }
  }, [filters.type]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Status</Text>
              <View style={styles.filterOptions}>
                {["all", "rental", "sale"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      filters.type === type && styles.activeFilterOption,
                    ]}
                    onPress={() => setFilters({ ...filters, type })}
                  >
                    <Text
                      style={
                        filters.type === type
                          ? styles.activeFilterOptionText
                          : styles.filterOptionText
                      }
                    >
                      {type === "all"
                        ? "All"
                        : type === "rental"
                        ? "For Rent"
                        : "For Sale"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  ref={minPriceRef}
                  style={styles.rangeInput}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={filters.priceRange[0].toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    updateFilter("priceRange", 0, value);
                  }}
                />
                <Text style={styles.rangeText}>to</Text>
                <TextInput
                  ref={maxPriceRef}
                  style={styles.rangeInput}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={filters.priceRange[1].toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 1000000;
                    updateFilter("priceRange", 1, value);
                  }}
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Type</Text>
              <View style={styles.filterOptions}>
                {["HOUSE", "VILLA", "APARTMENT"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      filters.propertyType === type && styles.activeFilterOption,
                    ]}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        propertyType: filters.propertyType === type ? null : type,
                      })
                    }
                  >
                    <Text
                      style={
                        filters.propertyType === type
                          ? styles.activeFilterOptionText
                          : styles.filterOptionText
                      }
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {filters.type === "sale" && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Year Built Range</Text>
                <View style={styles.rangeInputContainer}>
                  <TextInput
                    ref={minYearRef}
                    style={styles.rangeInput}
                    placeholder="From"
                    keyboardType="numeric"
                    value={filters.yearBuilt[0].toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 1900;
                      updateFilter("yearBuilt", 0, value);
                    }}
                  />
                  <Text style={styles.rangeText}>to</Text>
                  <TextInput
                    ref={maxYearRef}
                    style={styles.rangeInput}
                    placeholder="To"
                    keyboardType="numeric"
                    value={filters.yearBuilt[1].toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || new Date().getFullYear();
                      updateFilter("yearBuilt", 1, value);
                    }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeFilterOption: {
    backgroundColor: "#4a90e2",
    borderColor: "#4a90e2",
  },
  filterOptionText: {
    color: "#333",
    fontWeight: "500",
  },
  activeFilterOptionText: {
    color: "#fff",
    fontWeight: "600",
  },
  rangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  rangeText: {
    marginHorizontal: 10,
    fontSize: 16,
    color: "#666",
  },
  applyButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
});

export default FilterModal;
