'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCriticalDeviceAlerts } from '@/hooks/useCriticalDeviceAlerts';

export default function CriticalDeviceMonitor() {
  const { user, isAdmin } = useAuth();

  // Monitor for critical devices and send alerts
  useCriticalDeviceAlerts(user?.uid, isAdmin);

  // This component doesn't render anything
  return null;
}
