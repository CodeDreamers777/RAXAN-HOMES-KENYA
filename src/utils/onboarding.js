import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Check if the user is new by looking for is_new_user in AsyncStorage
 * @returns {Promise<boolean>} True if user is new, false otherwise
 */
export const checkIfNewUser = async () => {
  try {
    const isNewUserValue = await AsyncStorage.getItem("is_new_user");

    // If is_new_user doesn't exist, assume user is new
    if (isNewUserValue === null) {
      await AsyncStorage.setItem("is_new_user", "true");
      return true;
    }

    return isNewUserValue === "true";
  } catch (error) {
    console.error("Error checking if user is new:", error);
    return true; // Default to showing tour if there's an error
  }
};

/**
 * Mark the user as not new in AsyncStorage
 * @returns {Promise<void>}
 */
export const markUserAsNotNew = async () => {
  try {
    await AsyncStorage.setItem("is_new_user", "false");
  } catch (error) {
    console.error("Error marking user as not new:", error);
  }
};

/**
 * Mark the user as new in AsyncStorage to restart the tour
 * @returns {Promise<void>}
 */
export const restartTour = async () => {
  try {
    await AsyncStorage.setItem("is_new_user", "true");
  } catch (error) {
    console.error("Error restarting tour:", error);
  }
};
