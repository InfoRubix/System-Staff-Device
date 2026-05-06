'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useEffect, useState } from 'react';
import LoginForm from '../../components/LoginForm';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const [componentsReady, setComponentsReady] = useState(false);

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Only start the timer if we're actually navigating to this page
      if (isNavigating) {
        console.log('Dashboard Page - Starting navigation loading timer');

        // Consistent loading time for all devices
        const loadingTime = 800; // 0.8 seconds standard loading time

        console.log('Dashboard Page - Starting with standard loading time:', loadingTime);

        // Add a longer delay to ensure components are mounted and data is loaded
        const readyTimer = setTimeout(() => {
          console.log('Dashboard Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime); // Significantly increased loading time

        return () => {
          console.log('Dashboard Page - Clearing ready timer');
          clearTimeout(readyTimer);
        };
      } else {
        console.log('Dashboard Page - Direct access, loading immediately');
        // If not navigating (direct page access), load immediately
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      console.log('Dashboard Page - All conditions met, starting finish timer');
      // Quick finish transition
      const finishTimer = setTimeout(() => {
        console.log('Dashboard Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        // Hide the loading screen only after everything is ready
        setShowLoadingScreen(false);
      }, 300); // Fast transition

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Skip auth loading if we're already showing navigation loading
  // Only show auth loading for direct page access (not from navigation)
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}
