"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SpotlightTour from "./SpotlightTour";

// Create context for the onboarding
const OnboardingTourContext = createContext();

export const useOnboardingTour = () => useContext(OnboardingTourContext);

export const OnboardingTourProvider = ({
  children,
  steps = [],
  screenName,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is new on mount
  useEffect(() => {
    checkIfNewUser();
  }, []);

  // Show tour when screen comes into focus if user is new
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        "Screen focused. isNewUser:",
        isNewUser,
        "isLoading:",
        isLoading,
        "screenName:",
        screenName,
      );
      if (isNewUser && !isLoading && screenName === "Explore") {
        console.log("Starting tour on screen focus");
        startTour();
      }
    }, [isNewUser, isLoading, screenName]),
  );

  // Check if user is new by looking for is_new_user in AsyncStorage
  const checkIfNewUser = async () => {
    try {
      const isNewUserValue = await AsyncStorage.getItem("is_new_user");
      console.log("Is new user value from storage:", isNewUserValue);

      // If is_new_user doesn't exist, assume user is new
      if (isNewUserValue === null) {
        console.log("No is_new_user value found, setting as new user");
        setIsNewUser(true);
        await AsyncStorage.setItem("is_new_user", "true");
      } else {
        console.log("Setting isNewUser to:", isNewUserValue === "true");
        setIsNewUser(isNewUserValue === "true");
      }
    } catch (error) {
      console.error("Error checking if user is new:", error);
      setIsNewUser(true); // Default to showing tour if there's an error
    } finally {
      setIsLoading(false);
    }
  };

  // Start the tour
  const startTour = () => {
    console.log("Starting tour");
    setIsVisible(true);
  };

  // End the tour
  const endTour = async () => {
    setIsVisible(false);
    try {
      await AsyncStorage.setItem("is_new_user", "false");
      setIsNewUser(false);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  // Restart the tour manually
  const restartTour = async () => {
    try {
      await AsyncStorage.setItem("is_new_user", "true");
      setIsNewUser(true);
      startTour();
    } catch (error) {
      console.error("Error restarting tour:", error);
    }
  };

  return (
    <OnboardingTourContext.Provider
      value={{
        isVisible,
        startTour,
        endTour,
        restartTour,
        isNewUser,
      }}
    >
      {children}
      <SpotlightTour
        steps={steps}
        visible={isVisible}
        onFinish={endTour}
        onSkip={endTour}
      />
    </OnboardingTourContext.Provider>
  );
};

export default OnboardingTourProvider;
