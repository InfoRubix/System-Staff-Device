'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface NavigationContextType {
  isNavigating: boolean;
  navigationTarget: string | null;
  startNavigation: (target: string) => void;
  finishNavigation: () => void;
  setPageLoaded: () => void;
  isPageLoaded: boolean;
  showLoadingScreen: boolean;
  setShowLoadingScreen: (show: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  // Handle mobile-specific navigation issues
  useEffect(() => {
    // Reset navigation state on page visibility change (mobile tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isNavigating) {
        // If user comes back to tab and we're still navigating, reset
        const resetTimer = setTimeout(() => {
          if (isNavigating) {
            setIsNavigating(false);
            setNavigationTarget(null);
            setIsPageLoaded(false);
          }
        }, 5000); // Reset after 5 seconds if still navigating

        return () => clearTimeout(resetTimer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isNavigating]);

  const startNavigation = (target: string) => {
    console.log('NavigationContext - Starting navigation to:', target);
    setIsNavigating(true);
    setNavigationTarget(target);
    setIsPageLoaded(false);
    setShowLoadingScreen(true); // Show loading screen immediately
  };

  const setPageLoaded = () => {
    console.log('NavigationContext - Page loaded');
    setIsPageLoaded(true);
  };

  const finishNavigation = () => {
    console.log('NavigationContext - Finishing navigation');
    setIsNavigating(false);
    setNavigationTarget(null);
    setIsPageLoaded(false);
    // Don't hide loading screen yet - let the page control this
  };

  return (
    <NavigationContext.Provider value={{
      isNavigating,
      navigationTarget,
      startNavigation,
      finishNavigation,
      setPageLoaded,
      isPageLoaded,
      showLoadingScreen,
      setShowLoadingScreen,
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}