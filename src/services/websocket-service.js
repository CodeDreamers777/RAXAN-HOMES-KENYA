import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Dynamically import notifications to avoid initialization issues
let Notifications;
if (Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");

    // Configure notifications for foreground
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (error) {
    console.warn("Expo Notifications not available:", error);
  }
}

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageListeners = [];
    this.connectionListeners = [];
    this.API_BASE_URL = "https://yakubu.pythonanywhere.com";
  }

  async connect() {
    try {
      // Get user data and tokens
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        console.log("No user data found, cannot connect to WebSocket");
        return;
      }

      const parsedUserData = JSON.parse(userData);
      const userId = parsedUserData.id || parsedUserData.user_id;

      const accessTokenData = await AsyncStorage.getItem("accessToken");
      if (!accessTokenData) {
        console.log("No access token found, cannot connect to WebSocket");
        return;
      }

      const { value: accessToken } = JSON.parse(accessTokenData);

      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
      }

      // Create WebSocket connection
      // Convert HTTP/HTTPS to WS/WSS
      const wsBaseUrl = this.API_BASE_URL.replace(/^http/, "ws");
      const wsUrl = `${wsBaseUrl}/ws/messages/?token=${accessToken}`;
      console.log(wsUrl);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connection established");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);

          if (data.type === "new_message") {
            // Notify all registered listeners
            this.notifyMessageListeners(data.message);

            // Show notification if the message is from someone else
            if (data.message.sender_id !== userId) {
              this.showNotification(data.message);
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        this.isConnected = false;
        this.notifyConnectionListeners(false);

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log("Max reconnect attempts reached");
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000, "User disconnected");
      this.socket = null;
      this.isConnected = false;
    }
  }

  addMessageListener(listener) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  addConnectionListener(listener) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  notifyMessageListeners(message) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error("Error in message listener:", error);
      }
    });
  }

  notifyConnectionListeners(isConnected) {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  async showNotification(message) {
    if (!Notifications) {
      console.log("Notifications not available");
      return;
    }

    try {
      // Request permissions (if not already granted)
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Permission for notifications not granted!");
        return;
      }

      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.sender_username || "New Message",
          body: message.content,
          data: { data: message },
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }

  // Send a message through WebSocket if connected
  sendMessage(message) {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
