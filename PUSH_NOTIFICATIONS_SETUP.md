# Push Notifications Setup Guide

## Step 1: Generate VAPID Key from Firebase Console

1. Go to **Firebase Console**: https://console.firebase.google.com
2. Select your project: **device-management-syst-9925a**
3. Click on **Settings** (gear icon) → **Project settings**
4. Go to **Cloud Messaging** tab
5. Scroll down to **Web Push certificates**
6. Click **Generate key pair**
7. Copy the generated key (starts with "B...")

## Step 2: Update the VAPID Key in Code

1. Open `src/lib/notificationService.ts`
2. Find line 6: `const VAPID_KEY = 'BPxQ8...'`
3. Replace with your generated key:
   ```typescript
   const VAPID_KEY = 'YOUR_GENERATED_KEY_HERE';
   ```

## Step 3: Enable Cloud Messaging API

1. In Firebase Console, go to **Cloud Messaging** tab
2. Make sure **Cloud Messaging API** is **enabled**
3. If it says "Upgrade to Firebase Cloud Messaging API (V1)", click **Manage**
4. Enable the API

## Step 4: Update Firestore Rules (Already Done ✅)

The rules already allow storing FCM tokens in user documents.

## Step 5: Test the Notifications

1. **Login as super admin**
2. You should see a popup asking to enable notifications
3. Click **"Enable"**
4. Browser will ask for permission → Click **"Allow"**
5. When a new urgent repair is detected, you'll get a notification!

## How It Works

### When Site is Open:
✅ Instant notifications when new repairs detected
✅ Shows count in notification badge
✅ Click notification → Opens repair management page

### When Site is Closed:
⚠️ Limited functionality (requires Firebase Cloud Functions for true background push)
✅ Notifications work when browser is open in background

## Security Notes

- ✅ Uses Firebase Cloud Messaging (Google's secure service)
- ✅ User must grant permission explicitly
- ✅ Tokens stored securely in Firestore
- ✅ Only super admins receive notifications
- ✅ No sensitive data in notification messages

## Troubleshooting

**Problem:** "Notification permission denied"
**Solution:** Check browser settings → Site Settings → Notifications → Allow

**Problem:** "No notifications appearing"
**Solution:**
1. Check if VAPID key is correct
2. Make sure you clicked "Enable" in the popup
3. Check browser console for errors

**Problem:** "Service worker not registering"
**Solution:**
1. Make sure file exists: `public/firebase-messaging-sw.js`
2. Check browser console for service worker errors
3. Try clearing cache and reloading

## Files Modified

- ✅ `src/lib/notificationService.ts` - Notification logic
- ✅ `src/components/NotificationPrompt.tsx` - Permission UI
- ✅ `src/components/Navigation.tsx` - Notification triggers
- ✅ `src/app/layout.tsx` - Added NotificationPrompt
- ✅ `public/firebase-messaging-sw.js` - Service worker

## Next Steps (Optional)

For true push notifications when site is completely closed:
1. Set up Firebase Cloud Functions
2. Create function to send push notifications
3. Trigger function when new repairs are created in Firestore

This requires upgrading to Firebase Blaze plan (pay-as-you-go).
