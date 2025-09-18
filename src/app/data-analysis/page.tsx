'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useEffect, useState } from 'react';
import LoginForm from '../../components/LoginForm';
import DataAnalysis from '../../components/DataAnalysis';

export default function DataAnalysisPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const [componentsReady, setComponentsReady] = useState(false);

  // Reset states when navigation starts
  useEffect(() => {
    console.log('Data Analysis Page - isNavigating changed:', isNavigating);
    if (isNavigating) {
      console.log('Data Analysis Page - Resetting component state for navigation');
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Only start the timer if we're actually navigating to this page
      if (isNavigating) {
        console.log('Data Analysis Page - Starting navigation loading timer');

        // Enhanced device detection for better timing
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
        const isDesktop = !isPhone && !isTablet;

        // Much longer loading times for better visibility
        let loadingTime;
        if (isPhone) {
          loadingTime = 6000; // 6 seconds for phones
        } else if (isTablet) {
          loadingTime = 5500; // 5.5 seconds for tablets
        } else if (isLaptop) {
          loadingTime = 5000; // 5 seconds for laptops
        } else {
          loadingTime = 4500; // 4.5 seconds for desktop
        }

        console.log('Data Analysis Page - Device type and loading time:', { isPhone, isTablet, isLaptop, isDesktop, loadingTime });

        // Add a much longer delay for data analysis to simulate proper data loading
        const readyTimer = setTimeout(() => {
          console.log('Data Analysis Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime); // Extended loading time for better user experience

        return () => {
          console.log('Data Analysis Page - Clearing ready timer');
          clearTimeout(readyTimer);
        };
      } else {
        console.log('Data Analysis Page - Direct access, loading immediately');
        // If not navigating (direct page access), load immediately
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    console.log('Data Analysis Page - Navigation state check:', {
      isNavigating,
      isPageLoaded,
      componentsReady
    });

    if (isNavigating && isPageLoaded && componentsReady) {
      console.log('Data Analysis Page - All conditions met, starting finish timer');
      // Add an even longer delay for final loading steps - visible completion
      const finishTimer = setTimeout(() => {
        console.log('Data Analysis Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        // Hide the loading screen only after everything is ready
        setShowLoadingScreen(false);
      }, 1500); // Increased from 800ms to 1500ms for more visible completion

      return () => {
        console.log('Data Analysis Page - Clearing finish timer');
        clearTimeout(finishTimer);
      };
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    console.log('Data Analysis Page - Not rendering, waiting for navigation to complete and components to be ready');
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

  return isAuthenticated ? <DataAnalysis /> : <LoginForm />;
}