'use client';

import { useNavigation } from '../contexts/NavigationContext';
import { useEffect, useState } from 'react';

export default function NavigationLoadingScreen() {
  const { isNavigating, navigationTarget, showLoadingScreen } = useNavigation();
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progressive loading effect for data analysis
  useEffect(() => {
    console.log('NavigationLoadingScreen - Effect triggered:', { showLoadingScreen, navigationTarget });

    if (!showLoadingScreen) {
      console.log('NavigationLoadingScreen - Not showing loading screen, resetting state');
      setLoadingStep(0);
      setProgress(0);
      return;
    }

    if (navigationTarget === '/data-analysis') {
      console.log('NavigationLoadingScreen - Setting up data analysis loading');

      // Enhanced device detection for better timing
      const userAgent = navigator.userAgent;
      const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
      const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
      const isDesktop = !isPhone && !isTablet;

      // Match the page loading times + finish time
      let baseTime;
      if (isPhone) {
        baseTime = 6000; // 6 seconds for phones
      } else if (isTablet) {
        baseTime = 5500; // 5.5 seconds for tablets
      } else if (isLaptop) {
        baseTime = 5000; // 5 seconds for laptops
      } else {
        baseTime = 4500; // 4.5 seconds for desktop
      }

      const totalTime = baseTime + 1500; // Add finish time (1500ms)

      console.log('NavigationLoadingScreen - Device type and total loading time:', { isPhone, isTablet, isLaptop, isDesktop, totalTime });

      const steps = [
        { delay: 0, step: 0, progress: 0 },
        { delay: Math.round(totalTime * 0.18), step: 1, progress: 20 },
        { delay: Math.round(totalTime * 0.36), step: 2, progress: 40 },
        { delay: Math.round(totalTime * 0.54), step: 3, progress: 60 },
        { delay: Math.round(totalTime * 0.72), step: 4, progress: 80 },
        { delay: Math.round(totalTime * 0.85), step: 5, progress: 95 },
        { delay: Math.round(totalTime * 0.97), step: 6, progress: 100 }
      ];

      const timers = steps.map(({ delay, step, progress: stepProgress }) =>
        setTimeout(() => {
          console.log('NavigationLoadingScreen - Step update:', { step, progress: stepProgress });
          setLoadingStep(step);
          setProgress(stepProgress);
        }, delay)
      );

      return () => {
        console.log('NavigationLoadingScreen - Cleaning up timers');
        timers.forEach(timer => clearTimeout(timer));
      };
    } else {
      console.log('NavigationLoadingScreen - Setting up dashboard loading');

      // Enhanced device detection for dashboard too
      const userAgent = navigator.userAgent;
      const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
      const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
      const isDesktop = !isPhone && !isTablet;

      // Match the dashboard page loading times + finish time
      let baseTime;
      if (isPhone) {
        baseTime = 4000; // 4 seconds for phones
      } else if (isTablet) {
        baseTime = 3500; // 3.5 seconds for tablets
      } else if (isLaptop) {
        baseTime = 3000; // 3 seconds for laptops
      } else {
        baseTime = 2500; // 2.5 seconds for desktop
      }

      const totalTime = baseTime + 1000; // Add finish time (1000ms)

      console.log('NavigationLoadingScreen - Dashboard total loading time:', totalTime);

      // Simplified progress for dashboard but with proper timing
      const steps = [
        { delay: 0, progress: 0 },
        { delay: Math.round(totalTime * 0.25), progress: 25 },
        { delay: Math.round(totalTime * 0.50), progress: 50 },
        { delay: Math.round(totalTime * 0.75), progress: 75 },
        { delay: Math.round(totalTime * 0.90), progress: 90 },
        { delay: Math.round(totalTime * 0.98), progress: 100 }
      ];

      const timers = steps.map(({ delay, progress }) =>
        setTimeout(() => {
          console.log('NavigationLoadingScreen - Dashboard progress:', progress);
          setProgress(progress);
        }, delay)
      );

      return () => {
        console.log('NavigationLoadingScreen - Cleaning up dashboard timers');
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [showLoadingScreen, navigationTarget]);

  if (!showLoadingScreen) return null;

  const getLoadingMessage = () => {
    // Detect device type for loading messages
    const userAgent = navigator.userAgent;
    const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);

    if (navigationTarget === '/data-analysis') {
      const messages = [
        `Initializing Data Analysis${isPhone ? ' (Mobile)' : isTablet ? ' (Tablet)' : ''}...`,
        'Connecting to Database...',
        'Fetching Device Data...',
        'Processing Analytics...',
        'Generating Charts...',
        'Finalizing Dashboard...',
        'Ready!'
      ];
      return messages[loadingStep] || messages[0];
    }

    switch (navigationTarget) {
      case '/dashboard':
        return `Loading Dashboard${isPhone ? ' (Mobile)' : isTablet ? ' (Tablet)' : ''}...`;
      default:
        return 'Loading...';
    }
  };

  const getLoadingDescription = () => {
    if (navigationTarget === '/data-analysis') {
      const descriptions = [
        'Setting up analysis environment',
        'Establishing secure connection',
        'Retrieving latest device information',
        'Computing performance metrics',
        'Creating visual representations',
        'Preparing interactive dashboard',
        'Analysis ready to view'
      ];
      return descriptions[loadingStep] || descriptions[0];
    }

    switch (navigationTarget) {
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
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Progress Percentage */}
        {navigationTarget === '/data-analysis' && (
          <div className="text-xs text-gray-400 font-medium">
            {progress}% Complete
          </div>
        )}
      </div>
    </div>
  );
}