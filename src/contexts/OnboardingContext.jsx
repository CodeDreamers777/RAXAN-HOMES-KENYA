"use client";

import React, { createContext, useContext, useRef, useState } from "react";

// Create a context to share refs between components
const OnboardingContext = createContext(null);

export const useOnboardingContext = () => useContext(OnboardingContext);

export const OnboardingContextProvider = ({ children }) => {
  // Create refs for tab buttons
  const exploreTabRef = useRef(null);
  const wishlistTabRef = useRef(null);
  const inboxTabRef = useRef(null);
  const profileTabRef = useRef(null);

  // State to track if refs are ready
  const [tabRefsReady, setTabRefsReady] = useState(false);

  // Function to mark refs as ready
  const markTabRefsReady = () => {
    setTabRefsReady(true);
    console.log("Tab refs marked as ready in context");
  };

  const value = {
    exploreTabRef,
    wishlistTabRef,
    inboxTabRef,
    profileTabRef,
    tabRefsReady,
    markTabRefsReady,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContextProvider;
