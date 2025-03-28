"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationEmitter } from "../services/websocket-service";

const InAppNotification = ({ navigation }) => {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeout = useRef(null);

  useEffect(() => {
    // Make sure notificationEmitter exists before trying to use it
    if (
      !notificationEmitter ||
      typeof notificationEmitter.addListener !== "function"
    ) {
      console.warn("Notification emitter not available");
      return () => {};
    }

    // Listen for notifications
    const removeListener = notificationEmitter.addListener(
      (newNotification) => {
        setNotification(newNotification);
        showNotification();
      },
    );

    // Clean up
    return () => {
      if (removeListener && typeof removeListener === "function") {
        removeListener();
      }
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const showNotification = () => {
    // Clear any existing timeout
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    setVisible(true);

    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 4 seconds
    timeout.current = setTimeout(() => {
      hideNotification();
    }, 4000);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setNotification(null);
    });
  };

  const handlePress = () => {
    hideNotification();

    // Navigate to conversation if we have the data and navigation is available
    if (notification && notification.data && navigation) {
      const { sender_id, sender_username } = notification.data;

      if (sender_id && sender_username) {
        navigation.navigate("ConversationDetail", {
          otherUserId: sender_id,
          otherUserName: sender_username,
        });
      }
    }
  };

  if (!visible || !notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Ionicons name="close" size={20} color="#757575" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 10,
    left: 10,
    right: 10,
    zIndex: 999,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#212121",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: "#757575",
  },
  closeButton: {
    padding: 5,
  },
});

export default InAppNotification;
