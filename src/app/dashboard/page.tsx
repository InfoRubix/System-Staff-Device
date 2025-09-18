'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useEffect, useState } from 'react';
import LoginForm from '../../components/LoginForm';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded } = useNavigation();
  const [componentsReady, setComponentsReady] = useState(false);

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Add a small delay to ensure components are mounted and data is loaded
      const readyTimer = setTimeout(() => {
        setComponentsReady(true);
        setPageLoaded();
      }, 500); // Wait for components to mount and render

      return () => clearTimeout(readyTimer);
    }
  }, [loading, isAuthenticated, setPageLoaded]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      // Add a short delay to ensure smooth transition
      const finishTimer = setTimeout(() => {
        finishNavigation();
      }, 300);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation]);

  // If we're navigating, don't render anything (let the NavigationLoadingScreen handle it)
  if (isNavigating) {
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