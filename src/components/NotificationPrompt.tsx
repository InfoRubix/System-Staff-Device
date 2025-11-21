'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { notificationService } from '@/lib/notificationService';

export default function NotificationPrompt() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      // Only show for super admins, not on login/signup pages
      const isLoginOrSignup = pathname === '/' || pathname === '/signup';

      if (!isAdmin || !user || isLoginOrSignup) {
        setShowPrompt(false);
        return;
      }

      // Check if notifications are already enabled
      const isEnabled = await notificationService.isNotificationEnabled(user.uid);

      // Check if user dismissed the prompt before
      const dismissed = localStorage.getItem('notification-prompt-dismissed');

      // Show prompt if not enabled and not dismissed
      setShowPrompt(!isEnabled && !dismissed && Notification.permission !== 'denied');
    };

    checkNotificationStatus();
  }, [isAdmin, user, pathname]);

  const handleEnable = async () => {
    if (!user) return;

    setIsEnabling(true);
    try {
      const token = await notificationService.requestPermission(user.uid);

      if (token) {
        alert('✅ Push notifications enabled! You will receive alerts for urgent repair issues.');
        setShowPrompt(false);
      } else {
        alert('❌ Failed to enable notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('❌ Failed to enable notifications. Please try again.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">Enable Push Notifications</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get instant alerts when urgent repair issues are detected, even when you&apos;re not on the site.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isEnabling}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isEnabling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enabling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enable
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
