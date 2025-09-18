'use client';

import { useNavigation } from '../contexts/NavigationContext';
import { useEffect, useState } from 'react';

export default function NavigationLoadingScreen() {
  const { isNavigating, navigationTarget } = useNavigation();
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progressive loading effect for data analysis
  useEffect(() => {
    if (!isNavigating) {
      setLoadingStep(0);
      setProgress(0);
      return;
    }

    if (navigationTarget === '/data-analysis') {
      // Progressive loading steps for data analysis
      // Align with page timing: 2500ms + 800ms = 3300ms total
      const steps = [
        { delay: 0, step: 0, progress: 0 },
        { delay: 600, step: 1, progress: 20 },
        { delay: 1200, step: 2, progress: 40 },
        { delay: 1800, step: 3, progress: 60 },
        { delay: 2400, step: 4, progress: 80 },
        { delay: 2800, step: 5, progress: 95 },
        { delay: 3200, step: 6, progress: 100 }
      ];

      const timers = steps.map(({ delay, step, progress: stepProgress }) =>
        setTimeout(() => {
          setLoadingStep(step);
          setProgress(stepProgress);
        }, delay)
      );

      return () => timers.forEach(timer => clearTimeout(timer));
    } else {
      // Simpler loading for dashboard
      const timer = setTimeout(() => setProgress(100), 500);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, navigationTarget]);

  if (!isNavigating) return null;

  const getLoadingMessage = () => {
    if (navigationTarget === '/data-analysis') {
      const messages = [
        'Initializing Data Analysis...',
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
        return 'Loading Dashboard...';
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