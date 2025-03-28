"use client";

import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const TourHighlight = ({ targetRef, isVisible }) => {
  const [targetMeasurements, setTargetMeasurements] = React.useState(null);
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible && targetRef?.current) {
      targetRef.current.measureInWindow((x, y, width, height) => {
        setTargetMeasurements({ x, y, width, height });
      });

      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(animatedScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, targetRef]);

  if (!targetMeasurements) return null;

  const { x, y, width: targetWidth, height: targetHeight } = targetMeasurements;

  // Add some padding around the target element
  const padding = 8;
  const highlightX = x - padding;
  const highlightY = y - padding;
  const highlightWidth = targetWidth + padding * 2;
  const highlightHeight = targetHeight + padding * 2;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: animatedOpacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.cutout}>
        <Animated.View
          style={[
            styles.highlight,
            {
              left: highlightX,
              top: highlightY,
              width: highlightWidth,
              height: highlightHeight,
              transform: [{ scale: animatedScale }],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  cutout: {
    width,
    height,
    backgroundColor: "transparent",
  },
  highlight: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#4CAF50",
    borderRadius: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default TourHighlight;
