// Firebase Cloud Messaging Service Worker
// This runs in the background to receive push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCqHt_QWL5dSh5FJPdJhQZGPqN7vZxJ2xA",
  authDomain: "device-management-syst-9925a.firebaseapp.com",
  projectId: "device-management-syst-9925a",
  storageBucket: "device-management-syst-9925a.firebasestorage.app",
  messagingSenderId: "1055666175392",
  appId: "1:1055666175392:web:76bb40e0b1e4c6f2bb8e39",
  measurementId: "G-NK24HFNVL5"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title || 'Device Management System';
  const notificationOptions = {
    body: payload.notification.body || 'New repair issue detected',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'repair-notification',
    requireInteraction: true,
    data: {
      url: payload.data?.url || '/repair-management'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/repair-management';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
