import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_EXPIRATION_DAYS } from "./apiUtils";

export const setTokenWithExpiry = async (token) => {
  const now = new Date();
  const item = {
    value: token,
    expiry: now.getTime() + TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  };
  await AsyncStorage.setItem("accessToken", JSON.stringify(item));
};

export const getToken = async () => {
  const itemStr = await AsyncStorage.getItem("accessToken");
  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date();
  if (now.getTime() > item.expiry) {
    await AsyncStorage.removeItem("accessToken");
    return null;
  }
  return item.value;
};

export const saveUserData = async (profileData) => {
  // Save user type to AsyncStorage
  await AsyncStorage.setItem("userType", profileData.user_type);
  // Save entire user profile data to AsyncStorage
  await AsyncStorage.setItem("userData", JSON.stringify(profileData));
};
