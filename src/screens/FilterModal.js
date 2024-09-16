import React, { useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";

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
        i === index ? value : v,
      ),
    }));
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <View style={styles.modalContainer}>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filters</Text>

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

          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </ScrollView>
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
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  activeFilterOption: {
    backgroundColor: "#4a90e2",
  },
  filterOptionText: {
    color: "#333",
  },
  activeFilterOptionText: {
    color: "#fff",
  },
  rangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 16,
    flex: 1,
  },
  rangeText: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
});

export default FilterModal;
