import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://yakubu.pythonanywhere.com";

const InboxScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const accessTokenData = await AsyncStorage.getItem("accessToken");
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched data:", JSON.stringify(data, null, 2));

      // Group conversations by unique conversation partners
      const groupedConversations = data.reduce((acc, message) => {
        let conversationPartner;
        if (message.sender.id === message.receiver.id) {
          conversationPartner = message.receiver;
        } else {
          const firstMessage = Object.values(acc)[0];
          conversationPartner =
            message.sender.id === firstMessage?.sender.id
              ? message.receiver
              : message.sender;
        }

        if (!conversationPartner) {
          console.error(
            "Conversation partner is undefined for message:",
            message,
          );
          return acc;
        }

        const conversationId = conversationPartner.id;

        if (
          !acc[conversationId] ||
          new Date(message.timestamp) > new Date(acc[conversationId].timestamp)
        ) {
          acc[conversationId] = {
            ...message,
            conversationPartner,
          };
        }
        return acc;
      }, {});

      const conversationList = Object.values(groupedConversations);
      console.log(
        "Grouped conversations:",
        JSON.stringify(conversationList, null, 2),
      );
      setConversations(conversationList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const renderConversationItem = ({ item }) => {
    if (!item.conversationPartner) {
      console.error("Conversation partner is undefined for item:", item);
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          navigation.navigate("ConversationDetail", {
            conversation: item,
            otherUserId: item.conversationPartner.id,
            otherUsername: item.conversationPartner.username,
          })
        }
      >
        <Image
          source={{
            uri:
              item.conversationPartner.profile_picture ||
              "https://via.placeholder.com/50",
          }}
          style={styles.profilePicture}
        />
        <View style={styles.textContainer}>
          <Text style={styles.username}>
            {item.conversationPartner.username || "Unknown User"}
          </Text>
          <Text style={styles.lastMessage}>{item.content || "No message"}</Text>
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No conversations yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
});

export default InboxScreen;
