'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  isNavigating: boolean;
  navigationTarget: string | null;
  startNavigation: (target: string) => void;
  finishNavigation: () => void;
  setPageLoaded: () => void;
  isPageLoaded: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const startNavigation = (target: string) => {
    setIsNavigating(true);
    setNavigationTarget(target);
    setIsPageLoaded(false);
  };

  const setPageLoaded = () => {
    setIsPageLoaded(true);
  };

  const finishNavigation = () => {
    setIsNavigating(false);
    setNavigationTarget(null);
    setIsPageLoaded(false);
  };

  return (
    <NavigationContext.Provider value={{
      isNavigating,
      navigationTarget,
      startNavigation,
      finishNavigation,
      setPageLoaded,
      isPageLoaded,
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