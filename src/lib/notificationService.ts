import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import app from './firebase';

const VAPID_KEY = 'BARbPSm7QAGT-XsJw0epNKQI4N5b_yvevpRlYgndZtbiB_nLVvckROxtg58WsKzKV2bZX-l1X0aaKMWKW3ywaxg';

export const notificationService = {
  // Request notification permission and get FCM token
  async requestPermission(userId: string): Promise<string | null> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Get FCM token
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (token) {
        // Save token to user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmToken: token,
          notificationsEnabled: true,
          tokenUpdatedAt: new Date(),
        });

        console.log('FCM Token saved:', token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return null;
    }
  },

  // Listen for foreground messages (when app is open)
  onForegroundMessage(callback: (payload: any) => void) {
    try {
      const messaging = getMessaging(app);

      return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);

        // Show browser notification even when app is open
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'Device Management System', {
            body: payload.notification?.body || 'New notification',
            icon: '/icon-192.png',
            tag: 'repair-notification',
          });
        }

        callback(payload);
      });
    } catch (error) {
      console.error('Error setting up foreground message listener:', error);
      return () => {}; // Return empty cleanup function
    }
  },

  // Check if notifications are enabled for user
  async isNotificationEnabled(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.notificationsEnabled === true && Notification.permission === 'granted';
      }

      return false;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  },

  // Disable notifications for user
  async disableNotifications(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationsEnabled: false,
        fcmToken: null,
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  },
};
