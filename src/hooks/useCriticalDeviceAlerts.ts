import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationService } from '@/lib/notificationService';

interface DeviceScan {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
  scanTimestamp: Date;
  issues?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export function useCriticalDeviceAlerts(userId: string | undefined, isAdmin: boolean) {
  const notifiedDevices = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!userId || !isAdmin) {
      return;
    }

    console.log('🔔 Critical device alert system initialized for admin:', userId);

    // Query for critical device scans
    const scansQuery = query(
      collection(db, 'device_scans'),
      where('overallStatus', '==', 'Critical')
    );

    const unsubscribe = onSnapshot(scansQuery, (snapshot) => {
      // Skip notifications on first load (don't notify for existing critical devices)
      if (isFirstLoad.current) {
        snapshot.docs.forEach((doc) => {
          notifiedDevices.current.add(doc.id);
        });
        isFirstLoad.current = false;
        console.log('📊 Found', snapshot.docs.length, 'existing critical devices (not notifying)');
        return;
      }

      // Check for new critical devices
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const scanId = change.doc.id;
          const data = change.doc.data();

          // Only notify if we haven't notified for this device yet
          if (!notifiedDevices.current.has(scanId)) {
            const scan: DeviceScan = {
              id: scanId,
              deviceId: data.deviceId || 'Unknown',
              staffName: data.staffName || 'Unknown',
              staffEmail: data.staffEmail || 'Unknown',
              department: data.department || 'Unknown',
              overallStatus: data.overallStatus,
              scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
              issues: data.issues || [],
            };

            // Send notification
            sendCriticalDeviceAlert(scan);

            // Mark as notified
            notifiedDevices.current.add(scanId);
          }
        }
      });
    });

    return () => {
      unsubscribe();
      console.log('🔔 Critical device alert system stopped');
    };
  }, [userId, isAdmin]);
}

function sendCriticalDeviceAlert(scan: DeviceScan) {
  const title = '🚨 Critical Device Detected!';
  const criticalIssues = scan.issues?.filter(issue =>
    issue.severity === 'critical' || issue.severity === 'high'
  ) || [];

  const issuesText = criticalIssues.length > 0
    ? criticalIssues.map(i => i.message).join(', ')
    : 'Multiple critical issues detected';

  const body = `${scan.staffName} (${scan.department}) - ${issuesText}`;

  console.log('🚨 CRITICAL DEVICE ALERT:', {
    device: scan.deviceId,
    staff: scan.staffName,
    department: scan.department,
    issues: criticalIssues.length,
  });

  // Send browser notification
  notificationService.sendBrowserNotification(title, body, {
    data: {
      deviceId: scan.deviceId,
      staffEmail: scan.staffEmail,
      url: '/device-health',
    },
  });

  // Also play a sound (optional)
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play().catch(_err => console.log('Could not play sound'));
  } catch {
    console.log('Audio notification not supported');
  }
}
