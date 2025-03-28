"use client";

import { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create the context with default values
const MessageContext = createContext({
  unreadCount: 0,
  conversations: [],
  isConnected: false,
  activeConversationId: null,
  fetchConversations: async () => {},
  setActiveConversation: () => {},
  markConversationAsRead: async () => {},
});

// Export the hook for using the context
export const useMessages = () => useContext(MessageContext);

// Export the provider component
export const MessageProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [websocketService, setWebsocketService] = useState(null);
  const API_BASE_URL = "https://yakubu.pythonanywhere.com";

  // Initialize websocket service dynamically to avoid circular dependencies
  useEffect(() => {
    const initWebsocketService = async () => {
      try {
        // Dynamically import the websocket service to avoid circular dependencies
        const service = require("../services/websocket-service").default;
        setWebsocketService(service);
      } catch (error) {
        console.error("Error initializing websocket service:", error);
      }
    };

    initWebsocketService();
  }, []);

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setCurrentUserId(parsedUserData.id || parsedUserData.user_id);
        }
      } catch (error) {
        console.error("Error getting current user ID:", error);
      }
    };

    getCurrentUserId();
  }, []);

  // Connect to WebSocket when websocketService is available
  useEffect(() => {
    if (websocketService && currentUserId) {
      websocketService.connect();

      // Add connection listener
      const removeConnectionListener = websocketService.addConnectionListener(
        (connected) => {
          setIsConnected(connected);
        },
      );

      // Add message listener
      const removeMessageListener = websocketService.addMessageListener(
        (message) => {
          handleNewMessage(message);
        },
      );

      // Clean up on unmount
      return () => {
        if (removeConnectionListener) removeConnectionListener();
        if (removeMessageListener) removeMessageListener();
        if (websocketService) websocketService.disconnect();
      };
    }
  }, [websocketService, currentUserId]);

  // Handle new messages
  const handleNewMessage = (message) => {
    if (!currentUserId) return;

    // Update conversations list with new message
    setConversations((prevConversations) => {
      // Determine if this is a new conversation or an existing one
      const conversationPartnerId =
        message.sender_id === currentUserId
          ? message.receiver_id
          : message.sender_id;

      const existingConversationIndex = prevConversations.findIndex(
        (conv) =>
          conv.conversationPartner &&
          conv.conversationPartner.id === conversationPartnerId,
      );

      // Create a new conversations array
      const newConversations = [...prevConversations];

      if (existingConversationIndex >= 0) {
        // Update existing conversation
        newConversations[existingConversationIndex] = {
          ...newConversations[existingConversationIndex],
          content: message.content,
          timestamp: message.timestamp,
          isRead: activeConversationId === conversationPartnerId,
        };
      } else {
        // Add new conversation
        newConversations.unshift({
          id: message.id,
          content: message.content,
          timestamp: message.timestamp,
          conversationPartner: {
            id:
              message.sender_id === currentUserId
                ? message.receiver_id
                : message.sender_id,
            username:
              message.sender_id === currentUserId
                ? message.receiver_username
                : message.sender_username,
            profile_picture:
              message.sender_id === currentUserId
                ? message.receiver_profile_picture
                : message.sender_profile_picture,
          },
          isRead: activeConversationId === conversationPartnerId,
        });
      }

      // Sort by timestamp (newest first)
      return newConversations.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );
    });

    // Update unread count if message is not from current user and not in active conversation
    if (
      message.sender_id !== currentUserId &&
      message.sender_id !== activeConversationId
    ) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  // Set active conversation (when user opens a conversation)
  const setActiveConversationHandler = (conversationId) => {
    setActiveConversationId(conversationId);

    // Mark messages in this conversation as read
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (
          conv.conversationPartner &&
          conv.conversationPartner.id === conversationId
        ) {
          return { ...conv, isRead: true };
        }
        return conv;
      });
    });

    // Recalculate unread count
    updateUnreadCount();
  };

  // Update unread count based on unread conversations
  const updateUnreadCount = () => {
    const count = conversations.filter(
      (conv) =>
        !conv.isRead &&
        conv.conversationPartner &&
        conv.conversationPartner.id !== activeConversationId,
    ).length;

    setUnreadCount(count);
  };

  // Fetch conversations from API
  const fetchConversations = async () => {
    if (!currentUserId) return;

    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      if (!accessTokenData) {
        throw new Error("No access token found");
      }

      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const response = await fetch(`${API_BASE_URL}/api/v1/conversations/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const data = await response.json();

      // Group conversations by unique conversation partners
      const groupedConversations = data.reduce((acc, message) => {
        if (!currentUserId) return acc;

        // Determine conversation partner (the other person, not the current user)
        let conversationPartner;

        if (message.sender.id === currentUserId) {
          // If current user is the sender, the partner is the receiver
          conversationPartner = message.receiver;
        } else {
          // If current user is the receiver, the partner is the sender
          conversationPartner = message.sender;
        }

        if (!conversationPartner) return acc;

        const conversationId = conversationPartner.id;

        // Keep the most recent message for each conversation
        if (
          !acc[conversationId] ||
          new Date(message.timestamp) > new Date(acc[conversationId].timestamp)
        ) {
          acc[conversationId] = {
            ...message,
            conversationPartner,
            isRead: message.is_read || message.sender.id === currentUserId,
          };
        }

        return acc;
      }, {});

      // Sort conversations by timestamp (newest first)
      const sortedConversations = Object.values(groupedConversations).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );

      setConversations(sortedConversations);

      // Update unread count
      const unreadMessages = sortedConversations.filter(
        (conv) =>
          !conv.isRead && conv.sender && conv.sender.id !== currentUserId,
      ).length;

      setUnreadCount(unreadMessages);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  };

  // Mark a conversation as read
  const markConversationAsRead = async (conversationPartnerId) => {
    if (!conversationPartnerId) return;

    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      if (!accessTokenData) return;

      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      // Call your API endpoint to mark messages as read
      await fetch(
        `${API_BASE_URL}/api/v1/mark-read/${conversationPartnerId}/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json",
            Referer: API_BASE_URL,
          },
        },
      );

      // Update local state
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (
            conv.conversationPartner &&
            conv.conversationPartner.id === conversationPartnerId
          ) {
            return { ...conv, isRead: true };
          }
          return conv;
        });
      });

      // Recalculate unread count
      updateUnreadCount();
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  const value = {
    unreadCount,
    conversations,
    isConnected,
    activeConversationId,
    fetchConversations,
    setActiveConversation: setActiveConversationHandler,
    markConversationAsRead,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};
