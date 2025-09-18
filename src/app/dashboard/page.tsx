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

        // Enhanced device detection for better timing
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
        const isDesktop = !isPhone && !isTablet;

        // Longer loading times for dashboard too
        let loadingTime;
        if (isPhone) {
          loadingTime = 4000; // 4 seconds for phones
        } else if (isTablet) {
          loadingTime = 3500; // 3.5 seconds for tablets
        } else if (isLaptop) {
          loadingTime = 3000; // 3 seconds for laptops
        } else {
          loadingTime = 2500; // 2.5 seconds for desktop
        }

        console.log('Dashboard Page - Device type and loading time:', { isPhone, isTablet, isLaptop, isDesktop, loadingTime });

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
      // Add a longer delay for final transition steps
      const finishTimer = setTimeout(() => {
        console.log('Dashboard Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        // Hide the loading screen only after everything is ready
        setShowLoadingScreen(false);
      }, 1000); // Increased from 300ms to 1000ms for more visible completion

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}