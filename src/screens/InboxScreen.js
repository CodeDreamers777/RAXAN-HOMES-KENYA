import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// Constants - Updated color scheme based on #2C3E50
const API_BASE_URL = "https://yakubu.pythonanywhere.com";
const COLORS = {
  primary: "#2C3E50", // Deep blue-grey (main brand color)
  primaryLight: "#3D5A73", // Lighter blue-grey
  primaryDark: "#1A2530", // Darker blue-grey
  secondary: "#ECF0F1", // Very light grey with slight blue tint
  accent: "#E74C3C", // Red accent for removal/alerts
  highlight: "#3498DB", // Bright blue for highlights/CTAs
  text: "#2C3E50", // Dark text (same as primary)
  textLight: "#7F8C8D", // Light grey text for secondary information
  background: "#F5F7FA", // Light background with slight blue tint
  card: "#FFFFFF", // White card background
  border: "#D6DBDF", // Light border color
  unread: "#EBF5FB", // Light blue background for unread messages
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";

  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    // Today - show time
    return messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffInDays === 1) {
    // Yesterday
    return "Yesterday";
  } else if (diffInDays < 7) {
    // This week - show day name
    return messageDate.toLocaleDateString([], { weekday: "short" });
  } else {
    // Older - show date
    return messageDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
};

// Conversation Item Component
const ConversationItem = React.memo(({ item, onPress }) => {
  if (!item.conversationPartner) {
    return null;
  }

  // Determine if the message is unread (this is a placeholder - implement based on your API)
  const isUnread = false; // Replace with actual unread status logic

  return (
    <TouchableOpacity
      style={[styles.conversationItem, isUnread && styles.unreadConversation]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri:
              item.conversationPartner.profile_picture ||
              "https://via.placeholder.com/50",
          }}
          style={styles.profilePicture}
          defaultSource={require("../../assets/default-avatar.jpg")} // Add a default avatar image to your assets
        />
        {isUnread && <View style={styles.unreadIndicator} />}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.nameTimeRow}>
          <Text style={styles.username} numberOfLines={1}>
            {item.conversationPartner.username || "Unknown User"}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text
          style={[styles.lastMessage, isUnread && styles.unreadMessage]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.content || "No message"}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Empty Inbox Component
const EmptyInbox = React.memo(({ refreshing, onRefresh }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.highlight]}
          progressBackgroundColor="#ffffff"
          tintColor={COLORS.highlight}
        />
      }
    >
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={80}
            color={COLORS.primaryLight}
          />
        </View>
        <Text style={styles.emptyTitle}>No Conversations Yet</Text>
        <Text style={styles.emptyText}>
          When you start chatting with property owners or tenants, your
          conversations will appear here.
        </Text>
        <TouchableOpacity style={styles.newMessageButton} activeOpacity={0.8}>
          <Text style={styles.newMessageButtonText}>Start a Conversation</Text>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#FFF"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
        <Text style={styles.pullToRefreshText}>Pull down to refresh</Text>
      </Animated.View>
    </ScrollView>
  );
});

const InboxScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID
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

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const accessTokenData = await AsyncStorage.getItem("accessToken");
      if (!accessTokenData) {
        throw new Error("No access token found");
      }

      const { value: accessToken } = JSON.parse(accessTokenData);
      const csrfToken = await AsyncStorage.getItem("csrfToken");

      // If we don't have the current user ID yet, get it
      if (!currentUserId) {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setCurrentUserId(parsedUserData.id || parsedUserData.user_id);
        }
      }

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
      console.log(data);

      // Group conversations by unique conversation partners
      const groupedConversations = groupConversationsByPartner(data);

      // Sort conversations by timestamp (newest first)
      const sortedConversations = Object.values(groupedConversations).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );

      setConversations(sortedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Group conversations by unique conversation partners
  const groupConversationsByPartner = useCallback(
    (data) => {
      return data.reduce((acc, message) => {
        // Skip if we don't have current user ID
        if (!currentUserId) {
          console.warn("Current user ID not available yet");
          return acc;
        }

        // Determine conversation partner (the other person, not the current user)
        let conversationPartner;

        if (message.sender.id === currentUserId) {
          // If current user is the sender, the partner is the receiver
          conversationPartner = message.receiver;
        } else {
          // If current user is the receiver, the partner is the sender
          conversationPartner = message.sender;
        }

        if (!conversationPartner) {
          console.error(
            "Conversation partner is undefined for message:",
            message,
          );
          return acc;
        }

        const conversationId = conversationPartner.id;

        // Keep the most recent message for each conversation
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
    },
    [currentUserId],
  );

  // Initial data loading
  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  // Set up navigation listener to refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (currentUserId) {
        fetchConversations();
      }
    });

    return unsubscribe;
  }, [navigation, fetchConversations, currentUserId]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  // Navigate to conversation detail
  const handleConversationPress = useCallback(
    (item) => {
      navigation.navigate("ConversationDetail", {
        conversation: item,
        otherUserId: item.conversationPartner.id,
        otherUserName: item.conversationPartner.username,
      });
    },
    [navigation],
  );

  // Render conversation item
  const renderItem = useCallback(
    ({ item }) => (
      <ConversationItem
        item={item}
        onPress={() => handleConversationPress(item)}
      />
    ),
    [handleConversationPress],
  );

  // Extract key for FlatList
  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.highlight} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.accent} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchConversations}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <EmptyInbox refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.highlight]}
              progressBackgroundColor="#ffffff"
              tintColor={COLORS.highlight}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}

      {/* Floating Action Button - only show if there are conversations */}
      {conversations.length > 0 && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: COLORS.highlight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 80, // Space for the floating action button
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 500,
  },
  emptyIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    maxWidth: 300,
  },
  newMessageButton: {
    backgroundColor: COLORS.highlight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  newMessageButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  pullToRefreshText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 16,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadConversation: {
    backgroundColor: COLORS.unread, // Light blue background for unread messages
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  profilePicture: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary, // Placeholder color while loading
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.highlight,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nameTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.highlight,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default InboxScreen;
