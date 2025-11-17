import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Set persistence to local storage for better auth state persistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

  // Initialize Firebase App Check with reCAPTCHA v3
  // This protects your app from abuse and rate limits API calls
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (recaptchaSiteKey && recaptchaSiteKey !== 'your_recaptcha_site_key_here') {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true // Automatically refresh tokens
      });
      console.log('✅ Firebase App Check initialized');
    } catch (error) {
      console.error('❌ Error initializing App Check:', error);
    }
  } else {
    console.warn('⚠️ App Check not initialized: Missing reCAPTCHA site key');
    console.warn('   Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to your .env file');
  }
}

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export firebaseConfig for creating secondary auth instances
export { firebaseConfig };

export default app;