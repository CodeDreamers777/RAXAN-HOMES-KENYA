"use client";

import { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const TourStep = ({
  step,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger haptic feedback when step changes
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [step]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrev();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSkip();
  };

  if (!step) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{step.title}</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {step.icon && (
          <Ionicons
            name={step.icon}
            size={40}
            color="#4CAF50"
            style={styles.icon}
          />
        )}
        <Text style={styles.description}>{step.description}</Text>
      </View>

      <View style={styles.footer}>
        {!isFirstStep && (
          <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.navButton, styles.nextButton]}
        >
          <Text style={styles.navButtonText}>
            {isLastStep ? "Finish" : "Next"}
          </Text>
          <Ionicons
            name={isLastStep ? "checkmark" : "arrow-forward"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    flex: 1,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: "#757575",
    fontWeight: "500",
  },
  content: {
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginHorizontal: 8,
  },
  spacer: {
    flex: 1,
  },
});

export default TourStep;
