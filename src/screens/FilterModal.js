import React, { useRef, useEffect, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Constants for theme colors
const COLORS = {
  primary: "#2E7D32", // Forest green
  primaryLight: "#4CAF50", // Regular green
  primaryDark: "#1B5E20", // Dark green
  secondary: "#E8F5E9", // Very light green
  text: "#263238", // Dark text
  textLight: "#546E7A", // Light text
  background: "#FFFFFF", // White background
  border: "#C8E6C9", // Light green border
  accent: "#81C784", // Medium green for accents
};

// Memoized filter option component for better performance
const FilterOption = memo(({ option, isActive, onPress, displayLabel }) => (
  <TouchableOpacity
    style={[styles.filterOption, isActive && styles.activeFilterOption]}
    onPress={onPress}
  >
    <Text
      style={isActive ? styles.activeFilterOptionText : styles.filterOptionText}
    >
      {displayLabel}
    </Text>
  </TouchableOpacity>
));

// Memoized range input component for better performance
const RangeInput = memo(
  ({ minRef, maxRef, values, onChange, placeholders }) => (
    <View style={styles.rangeInputContainer}>
      <TextInput
        ref={minRef}
        style={styles.rangeInput}
        placeholder={placeholders[0]}
        keyboardType="numeric"
        value={String(values[0])}
        onChangeText={(text) => {
          const value = parseInt(text) || 0;
          onChange(0, value);
        }}
        maxLength={7}
      />
      <Text style={styles.rangeText}>to</Text>
      <TextInput
        ref={maxRef}
        style={styles.rangeInput}
        placeholder={placeholders[1]}
        keyboardType="numeric"
        value={String(values[1])}
        onChangeText={(text) => {
          const value = parseInt(text) || values[1];
          onChange(1, value);
        }}
        maxLength={7}
      />
    </View>
  ),
);

const FilterModal = ({
  modalVisible,
  toggleModal,
  filters,
  setFilters,
  applyFilters,
}) => {
  // Refs for input fields
  const inputRefs = {
    minPrice: useRef(null),
    maxPrice: useRef(null),
    minYear: useRef(null),
    maxYear: useRef(null),
    minBedrooms: useRef(null),
    maxBedrooms: useRef(null),
    minBathrooms: useRef(null),
    maxBathrooms: useRef(null),
  };

  const updateFilter = (filterName, index, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterName]: prevFilters[filterName].map((v, i) =>
        i === index ? value : v,
      ),
    }));
  };

  // Update year built filter when property type changes
  useEffect(() => {
    if (filters.type !== "sale") {
      setFilters((prevFilters) => ({
        ...prevFilters,
        yearBuilt: [1900, new Date().getFullYear()],
      }));
    }
  }, [filters.type]);

  // Property status options mapping
  const propertyStatusOptions = [
    { value: "all", label: "All" },
    { value: "rental", label: "For Rent" },
    { value: "sale", label: "For Sale" },
    { value: "per_night", label: "Per Night" },
  ];

  // Property type options
  const propertyTypeOptions = [
    "HOUSE",
    "VILLA",
    "APT",
    "OFFICE",
    "EVENT",
    "SHORT_LET",
  ];

  // Format property type label
  const formatPropertyType = (type) =>
    type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ");

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
            <TouchableOpacity onPress={toggleModal} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity
              onPress={() => {
                // Reset filters logic
                setFilters({
                  type: "all",
                  priceRange: [0, 1000000],
                  propertyType: null,
                  yearBuilt: [1900, new Date().getFullYear()],
                  bedrooms: [0, 10],
                  bathrooms: [0, 10],
                });
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Status</Text>
              <View style={styles.filterOptions}>
                {propertyStatusOptions.map((option) => (
                  <FilterOption
                    key={option.value}
                    option={option.value}
                    isActive={filters.type === option.value}
                    onPress={() =>
                      setFilters({ ...filters, type: option.value })
                    }
                    displayLabel={option.label}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <RangeInput
                minRef={inputRefs.minPrice}
                maxRef={inputRefs.maxPrice}
                values={filters.priceRange}
                onChange={(index, value) =>
                  updateFilter("priceRange", index, value)
                }
                placeholders={["Min", "Max"]}
              />
              <View style={styles.priceSlider}>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${Math.min(100, (filters.priceRange[1] / 1000000) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Type</Text>
              <View style={styles.filterOptions}>
                {propertyTypeOptions.map((type) => (
                  <FilterOption
                    key={type}
                    option={type}
                    isActive={filters.propertyType === type}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        propertyType:
                          filters.propertyType === type ? null : type,
                      })
                    }
                    displayLabel={formatPropertyType(type)}
                  />
                ))}
              </View>
            </View>

            {filters.type === "sale" && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Year Built Range</Text>
                <RangeInput
                  minRef={inputRefs.minYear}
                  maxRef={inputRefs.maxYear}
                  values={filters.yearBuilt}
                  onChange={(index, value) =>
                    updateFilter("yearBuilt", index, value)
                  }
                  placeholders={["From", "To"]}
                />
              </View>
            )}

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Bedrooms</Text>
              <RangeInput
                minRef={inputRefs.minBedrooms}
                maxRef={inputRefs.maxBedrooms}
                values={filters.bedrooms}
                onChange={(index, value) =>
                  updateFilter("bedrooms", index, value)
                }
                placeholders={["Min", "Max"]}
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Bathrooms</Text>
              <RangeInput
                minRef={inputRefs.minBathrooms}
                maxRef={inputRefs.maxBathrooms}
                values={filters.bathrooms}
                onChange={(index, value) =>
                  updateFilter("bathrooms", index, value)
                }
                placeholders={["Min", "Max"]}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={applyFilters}
            activeOpacity={0.8}
          >
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "92%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scrollContent: {
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
  },
  resetButton: {
    padding: 6,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 14,
    color: COLORS.text,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  filterOptionText: {
    color: COLORS.text,
    fontWeight: "500",
    fontSize: 14,
  },
  activeFilterOptionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  rangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    flex: 1,
    backgroundColor: "#f9f9f9",
    color: COLORS.text,
  },
  rangeText: {
    marginHorizontal: 12,
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  priceSlider: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: 3,
    width: "100%",
  },
  sliderFill: {
    height: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 17,
    letterSpacing: 0.3,
  },
});

export default memo(FilterModal);
