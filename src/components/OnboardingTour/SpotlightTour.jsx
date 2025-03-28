"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const PRIMARY_COLOR = "#2E7D32"; // Dark green
const SECONDARY_COLOR = "#4CAF50"; // Medium green

const SpotlightTour = ({
  steps,
  visible,
  onFinish,
  onSkip,
  startAtStep = 0,
}) => {
  const [currentStep, setCurrentStep] = useState(startAtStep);
  const [elementMeasurements, setElementMeasurements] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState("bottom");
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spotlightAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  // Refs for measurements
  const viewRef = useRef(null);

  // Debug visibility
  useEffect(() => {
    console.log("SpotlightTour visibility changed:", visible);
    console.log("Current step:", currentStep);
    console.log("Steps:", steps);
  }, [visible, currentStep, steps]);

  // Handle back button press
  useEffect(() => {
    const handleBackPress = () => {
      if (visible) {
        handlePrev();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () =>
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
  }, [visible, currentStep]);

  // Initialize animations when visibility changes
  useEffect(() => {
    if (visible) {
      console.log("Tour is visible, measuring elements for step:", currentStep);
      measureElement();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(spotlightAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Measure element position when step changes
  useEffect(() => {
    if (visible) {
      console.log("Step changed, measuring element for step:", currentStep);
      measureElement();
    }
  }, [currentStep, visible]);

  // Measure the target element's position
  const measureElement = () => {
    const currentStepData = steps[currentStep];

    // If this step doesn't have a targetRef (like the welcome step), just show the tooltip in the center
    if (!currentStepData || !currentStepData.targetRef) {
      console.log("No target ref for step:", currentStep);
      setElementMeasurements(null);

      // For steps without a targetRef, still show the tooltip
      Animated.spring(tooltipAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!currentStepData.targetRef.current) {
      console.log(
        "Target ref exists but current is null for step:",
        currentStep,
      );
      setElementMeasurements(null);

      // For steps with a targetRef that isn't attached yet, still show the tooltip
      Animated.spring(tooltipAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
      return;
    }

    console.log("Measuring element for step:", currentStep);

    try {
      currentStepData.targetRef.current.measureInWindow(
        (x, y, width, height) => {
          // Check if any of the measurements are undefined or NaN
          if (
            x === undefined ||
            y === undefined ||
            width === undefined ||
            height === undefined ||
            isNaN(x) ||
            isNaN(y) ||
            isNaN(width) ||
            isNaN(height)
          ) {
            console.log("Invalid measurements received:", {
              x,
              y,
              width,
              height,
            });
            setElementMeasurements(null);

            // Still show the tooltip even if measurements fail
            Animated.spring(tooltipAnim, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }).start();
            return;
          }

          console.log("Element measurements:", { x, y, width, height });
          const measurements = { x, y, width, height };
          setElementMeasurements(measurements);

          // Determine tooltip position (top or bottom)
          const screenCenter = Dimensions.get("window").height / 2;
          const elementCenter = y + height / 2;

          // Check if element is in the bottom third of the screen to avoid tab bar overlap
          const bottomThird = Dimensions.get("window").height * 0.7;
          const isInBottomThird = y > bottomThird;

          // If element is in the bottom third, show tooltip above
          // Otherwise, if element is in the top half, show tooltip below, else show above
          setTooltipPosition(
            isInBottomThird
              ? "top"
              : elementCenter < screenCenter
                ? "bottom"
                : "top",
          );

          // Animate the tooltip
          Animated.spring(tooltipAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        },
      );
    } catch (error) {
      console.error("Error measuring element:", error);
      setElementMeasurements(null);

      // Still show the tooltip even if measurements fail
      Animated.spring(tooltipAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle next step
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep < steps.length - 1) {
      // Reset animations for new step
      tooltipAnim.setValue(0);
      spotlightAnim.setValue(0.5);

      // Move to next step
      setCurrentStep(currentStep + 1);

      // Start animations for new step
      Animated.spring(spotlightAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
    } else {
      // End the tour
      markTourAsCompleted();
      onFinish();
    }
  };

  // Handle previous step
  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep > 0) {
      // Reset animations for new step
      tooltipAnim.setValue(0);
      spotlightAnim.setValue(0.5);

      // Move to previous step
      setCurrentStep(currentStep - 1);

      // Start animations for new step
      Animated.spring(spotlightAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }
  };

  // Handle skip
  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markTourAsCompleted();
    onSkip();
  };

  // Mark tour as completed in AsyncStorage
  const markTourAsCompleted = async () => {
    try {
      await AsyncStorage.setItem("is_new_user", "false");
    } catch (error) {
      console.error("Error marking tour as completed:", error);
    }
  };

  // Setup swipe gesture handler
  const swipeGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationX > 50) {
      handlePrev();
    } else if (event.translationX < -50) {
      handleNext();
    }
  });

  // Setup tap gesture handler
  const tapGesture = Gesture.Tap().onEnd(() => {
    handleNext();
  });

  // Combine gestures
  const gesture = Gesture.Exclusive(swipeGesture, tapGesture);

  // If no steps or not visible, don't render anything
  if (!steps.length || !visible) return null;

  const currentStepData = steps[currentStep];
  const padding = 8; // Padding around the spotlight

  // Calculate spotlight position and size
  const getSpotlightStyle = () => {
    if (!elementMeasurements) {
      return { display: "none" };
    }

    const padding = 8; // Padding around the spotlight

    // Ensure all values are valid numbers
    const x =
      typeof elementMeasurements.x === "number" ? elementMeasurements.x : 0;
    const y =
      typeof elementMeasurements.y === "number" ? elementMeasurements.y : 0;
    const width =
      typeof elementMeasurements.width === "number"
        ? elementMeasurements.width
        : 0;
    const height =
      typeof elementMeasurements.height === "number"
        ? elementMeasurements.height
        : 0;

    // Only create the spotlight if we have valid measurements
    if (width <= 0 || height <= 0) {
      return { display: "none" };
    }

    return {
      position: "absolute",
      left: x - padding,
      top: y - padding,
      width: width + padding * 2,
      height: height + padding * 2,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: PRIMARY_COLOR,
      backgroundColor: "transparent",
      // Add a subtle glow effect
      shadowColor: PRIMARY_COLOR,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 10,
    };
  };

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!elementMeasurements) {
      // If no element measurements, position the tooltip in the center of the screen
      return {
        top: height / 3,
        left: 20,
        right: 20,
      };
    }

    // Ensure all values are valid numbers
    const x =
      typeof elementMeasurements.x === "number" ? elementMeasurements.x : 0;
    const y =
      typeof elementMeasurements.y === "number" ? elementMeasurements.y : 0;
    const elemWidth =
      typeof elementMeasurements.width === "number"
        ? elementMeasurements.width
        : 0;
    const elemHeight =
      typeof elementMeasurements.height === "number"
        ? elementMeasurements.height
        : 0;

    const padding = 8;

    // Adjust for bottom tab bar - ensure tooltip doesn't go below safe area
    const bottomSafeArea = height - insets.bottom - 100; // 100px buffer for tab bar

    if (tooltipPosition === "bottom") {
      const proposedTop = y + elemHeight + padding + 16;

      // If tooltip would go below the safe area, position it above the element instead
      if (proposedTop > bottomSafeArea) {
        return {
          bottom: height - y + padding + 16,
          left: 20,
          right: 20,
        };
      }

      return {
        top: proposedTop,
        left: 20,
        right: 20,
      };
    } else {
      return {
        bottom: height - y + padding + 16,
        left: 20,
        right: 20,
      };
    }
  };

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <Animated.View
        ref={viewRef}
        style={[styles.container, { opacity: fadeAnim }]}
      >
        {/* Blurred background */}
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Spotlight cutout - only show if we have measurements */}
        {elementMeasurements && (
          <Animated.View
            style={[
              getSpotlightStyle(),
              {
                transform: [
                  {
                    scale: spotlightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Tooltip */}
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.tooltip,
              getTooltipPosition(),
              {
                opacity: tooltipAnim,
                transform: [
                  {
                    translateY: tooltipAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [tooltipPosition === "bottom" ? 20 : -20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.tooltipDescription}>
              {currentStepData.description}
            </Text>

            {/* Progress indicators */}
            <View style={styles.progressContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View style={styles.navigationContainer}>
              {currentStep > 0 && (
                <TouchableOpacity style={styles.navButton} onPress={handlePrev}>
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.navButtonText}>Previous</Text>
                </TouchableOpacity>
              )}

              <View style={styles.spacer} />

              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>
                  {currentStep === steps.length - 1 ? "Finish" : "Next"}
                </Text>
                <Ionicons
                  name={
                    currentStep === steps.length - 1
                      ? "checkmark"
                      : "arrow-forward"
                  }
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Tap anywhere text */}
        <Text style={[styles.tapAnywhere, { bottom: insets.bottom + 20 }]}>
          Swipe left/right or tap to navigate
        </Text>
      </Animated.View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    position: "absolute",
  },
  tooltipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    flex: 1,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: "#757575",
    fontWeight: "500",
  },
  tooltipDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  navigationContainer: {
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
    backgroundColor: PRIMARY_COLOR,
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
  tapAnywhere: {
    position: "absolute",
    alignSelf: "center",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
});

export default SpotlightTour;
