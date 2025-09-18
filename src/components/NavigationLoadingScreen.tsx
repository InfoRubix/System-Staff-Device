'use client';

import { useNavigation } from '../contexts/NavigationContext';

export default function NavigationLoadingScreen() {
  const { isNavigating, navigationTarget } = useNavigation();

  if (!isNavigating) return null;

  const getLoadingMessage = () => {
    switch (navigationTarget) {
      case '/data-analysis':
        return 'Loading Data Analysis...';
      case '/dashboard':
        return 'Loading Dashboard...';
      default:
        return 'Loading...';
    }
  };

  const getLoadingDescription = () => {
    switch (navigationTarget) {
      case '/data-analysis':
        return 'Preparing charts and analytics';
      case '/dashboard':
        return 'Loading department overview';
      default:
        return 'Please wait';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Main Loading Animation */}
        <div className="relative">
          {/* Outer spinning ring - slower animation */}
          <div className="h-16 w-16 border-4 border-blue-200 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
          {/* Inner spinning ring - slower reverse animation */}
          <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
          {/* Center dot - slower pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{animationDuration: '1.5s'}}></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-800 mb-2">
            {getLoadingMessage()}
          </div>
          <div className="text-sm text-gray-500">
            {getLoadingDescription()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" style={{animationDuration: '2s'}}></div>
        </div>
      </div>
    </div>
  );
}