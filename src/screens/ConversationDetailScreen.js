import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const ConversationDetailScreen = ({ route, navigation }) => {
  const { otherUserId, otherUserName } = route.params;
  const [messages, setMessages] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userType, setUserType] = useState(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const flatListRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const clientOptions = [
    "What is the rental price or sale price?",
    "Is this property still available?",
    "Can you provide more details about the property?",
    "When can I schedule a viewing?",
    "Do you offer any discounts on rent or purchase price?",
  ];

  const sellerOptions = [
    "Thank you for your interest in the property!",
    "Yes, the property is currently available.",
    "The price is negotiable for serious buyers/renters.",
    "You can schedule a viewing at your convenience.",
    "Would you like to proceed with a rental or purchase inquiry?",
  ];

  useEffect(() => {
    const getUserType = async () => {
      const type = await AsyncStorage.getItem("userType");
      setUserType(type);
    };
    getUserType();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: otherUserName,
      headerStyle: {
        backgroundColor: "#4CAF50",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "bold",
      },
    });
  }, [navigation, otherUserName]);

  const fetchMessages = useCallback(
    async (isInitialFetch = false) => {
      try {
        const accessTokenData = await AsyncStorage.getItem("accessToken");
        const { value: accessToken } = JSON.parse(accessTokenData);
        const csrfToken = await AsyncStorage.getItem("csrfToken");

        let url = `${API_BASE_URL}/api/v1/conversations/${otherUserId}/`;
        if (!isInitialFetch && lastMessageTimestampRef.current) {
          url += `?after=${encodeURIComponent(lastMessageTimestampRef.current)}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRFToken": csrfToken,
            Referer: API_BASE_URL,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fetchedMessages = await response.json();

        if (isInitialFetch) {
          setMessages(fetchedMessages);
          setIsInitialLoading(false);
        } else if (fetchedMessages.length > 0) {
          setMessages((prevMessages) => {
            const newMessages = fetchedMessages.filter(
              (newMsg) =>
                !prevMessages.some(
                  (existingMsg) => existingMsg.id === newMsg.id,
                ),
            );
            return [...prevMessages, ...newMessages];
          });
        }

        if (fetchedMessages.length > 0) {
          lastMessageTimestampRef.current =
            fetchedMessages[fetchedMessages.length - 1].timestamp;
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        if (isInitialFetch) {
          setIsInitialLoading(false);
        }
      }
    },
    [otherUserId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMessages(true);
      const interval = setInterval(() => fetchMessages(false), 5000);
      return () => clearInterval(interval);
    }, [fetchMessages]),
  );

  const sendMessage = async (content) => {
    if (isSending) return;

    setIsSending(true);
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      const response = await fetch(`${API_BASE_URL}/api/v1/send-message/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRFToken": csrfToken,
          Referer: API_BASE_URL,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiver_id: otherUserId,
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sentMessageResponse = await response.json();
      if (sentMessageResponse && sentMessageResponse.content) {
        const sentMessage = {
          id: Date.now(),
          content: sentMessageResponse.content,
          sender: { id: "self" },
          timestamp: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, sentMessage]);
        lastMessageTimestampRef.current = sentMessage.timestamp;

        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } else {
        console.error("Received invalid message data:", sentMessageResponse);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
      setIsOptionsVisible(false);
      setInputMessage("");
    }
  };

  const renderMessageItem = ({ item }) => (
    <Animated.View
      style={[
        styles.messageItem,
        item.sender.id === otherUserId
          ? styles.receivedMessage
          : styles.sentMessage,
      ]}
    >
      <BlurView intensity={80} tint="light" style={styles.messageBlur}>
        <Text style={styles.messageContent}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </BlurView>
    </Animated.View>
  );

  const toggleOptions = () => {
    setIsOptionsVisible(!isOptionsVisible);
    Animated.timing(animatedHeight, {
      toValue: isOptionsVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
    }
  };

  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <LinearGradient colors={["#E8F5E9", "#C8E6C9"]} style={styles.gradient}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
        />
        <Animated.View
          style={[
            styles.inputContainer,
            {
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={toggleOptions}
            style={styles.optionsToggle}
          >
            <Text style={styles.optionsToggleText}>
              {isOptionsVisible ? "Hide Options" : "Show Options"}
            </Text>
            <Ionicons
              name={isOptionsVisible ? "chevron-up" : "chevron-down"}
              size={24}
              color="#4CAF50"
            />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.optionsDropdown,
              {
                maxHeight: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 300],
                }),
                opacity: animatedHeight,
              },
            ]}
          >
            {(userType === "CLIENT" ? clientOptions : sellerOptions).map(
              (option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => sendMessage(option)}
                  disabled={isSending}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ),
            )}
          </Animated.View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    paddingVertical: 20,
  },
  messageItem: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: "80%",
  },
  messageBlur: {
    borderRadius: 20,
    overflow: "hidden",
    padding: 12,
  },
  sentMessage: {
    alignSelf: "flex-end",
  },
  receivedMessage: {
    alignSelf: "flex-start",
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
  },
  optionsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  optionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  optionsToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginRight: 5,
  },
  optionsDropdown: {
    overflow: "hidden",
  },
  optionButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 25,
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ConversationDetailScreen;
