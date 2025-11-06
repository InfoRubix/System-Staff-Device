'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import DeviceHealthDashboard from '@/components/DeviceHealthDashboard';
import Navigation from '@/components/Navigation';

export default function DeviceHealthPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const _router = useRouter();
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
        console.log('Device Health Page - Starting navigation loading timer');

        // Enhanced device detection for better timing
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
        const isDesktop = !isPhone && !isTablet;

        // Loading times for device health
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

        console.log('Device Health Page - Device type and loading time:', { isPhone, isTablet, isLaptop, isDesktop, loadingTime });

        const readyTimer = setTimeout(() => {
          console.log('Device Health Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime);

        return () => {
          console.log('Device Health Page - Clearing ready timer');
          clearTimeout(readyTimer);
        };
      } else {
        console.log('Device Health Page - Direct access, loading immediately');
        // If not navigating (direct page access), load immediately
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      console.log('Device Health Page - All conditions met, starting finish timer');
      const finishTimer = setTimeout(() => {
        console.log('Device Health Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        setShowLoadingScreen(false);
      }, 1000);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading for direct page access (not from navigation)
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Banner Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Device Health Overview</h1>
              <p className="mt-2 text-sm text-gray-600">
                Monitor real-time health status and click on any card to filter devices
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                <span>📊</span>
                Generate Report
              </button>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                <span>📥</span>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <DeviceHealthDashboard />
        </div>
      </div>
    </>
  );
}
