# Security Documentation

## Overview
This Device Management System implements **7 layers of security** to protect sensitive data and prevent unauthorized access.

---

## Security Layers

### 1. Authentication & Authorization
- **Firebase Authentication** with email/password
- **Role-Based Access Control (RBAC)**: `super_admin`, `technician`, `user`
- Session persistence with `browserLocalPersistence`
- Real-time auth state monitoring

### 2. Database Security (Firestore Rules)
- Granular collection-level permissions
- Owner-based access control (users only see their own data)
- Server-side validation of all operations
- Default deny-all rule

### 3. Network Security (HTTPS/TLS)
- **Strict-Transport-Security (HSTS)** header with 2-year max-age
- Automatic HTTP to HTTPS redirect
- TLS encryption for all Firebase connections
- Secure WebSocket (wss://) for real-time updates

### 4. Client-Side Security Headers
- **X-Frame-Options: DENY** - Prevents clickjacking
- **X-Content-Type-Options: nosniff** - Prevents MIME sniffing
- **X-XSS-Protection** - Browser XSS protection
- **Content-Security-Policy (CSP)** - Restricts resource loading
- **Permissions-Policy** - Blocks camera, microphone, geolocation

### 5. Input Validation & Sanitization
- HTML5 input validation (type checking, required fields)
- Password minimum length enforcement (6+ characters)
- Email format validation
- Department selection from predefined Firestore list
- No `dangerouslySetInnerHTML` or `eval()` usage

### 6. API & Secret Protection
- Environment variables for all sensitive credentials
- `.env` files excluded from git
- Firebase App Check with reCAPTCHA v3
- **NO hardcoded credentials** in source code

### 7. Desktop App Security (Tauri)
- **Rust backend** (memory-safe language)
- Limited command exposure via whitelist
- Device token authentication (UUID-based)
- Windows security integration (antivirus/firewall detection)
- DevTools disabled in production builds

---

## Setup Instructions

### 1. Environment Variables

Before building the project, create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Then fill in your actual Firebase credentials in `.env`:

```env
# Web App - Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# reCAPTCHA v3 Site Key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Tauri Desktop App - Firebase Configuration
# IMPORTANT: These must match your Firebase project settings
TAURI_FIREBASE_PROJECT_ID=your_project_id
TAURI_FIREBASE_API_KEY=your_api_key_here
```

### 2. Building the Desktop App

The Tauri desktop app reads Firebase credentials from environment variables at **BUILD TIME**.

**On Windows (PowerShell):**
```powershell
# Make sure .env file exists with correct values
npm run tauri:build
```

**On Windows (Command Prompt):**
```cmd
npm run tauri:build
```

**On Linux/macOS:**
```bash
npm run tauri:build
```

The `env!()` macro in Rust will automatically read `TAURI_FIREBASE_PROJECT_ID` and `TAURI_FIREBASE_API_KEY` from your environment during compilation.

---

## Files to NEVER Commit to GitHub

The following files contain sensitive information and are already protected by `.gitignore`:

### Critical Security Files
- `.env` - Contains all API keys and credentials
- `.env.local`, `.env.development`, `.env.production`
- `*-firebase-adminsdk-*.json` - Firebase service account keys
- `serviceAccountKey.json`

### Build Artifacts
- `src-tauri/target/` - May contain embedded secrets
- `*.exe`, `*.msi`, `*.dmg` - Desktop app installers (large binaries)

### Local App Data
- `device_token.txt` - Desktop app device tokens
- `last_scan.txt` - Scan timestamps

---

## Firebase Security Rules

All Firestore collections are protected by security rules. Key protections:

```javascript
// Users can only read their own profile
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
}

// Devices linked to staff email
match /devices/{deviceId} {
  allow read: if request.auth.token.email == resource.data.staffEmail || isAdmin();
}

// Only assigned technician or admin can access repairs
match /assigned_repairs/{repairId} {
  allow read, update: if request.auth.token.email == resource.data.technicianEmail || isAdmin();
}
```

---

## Security Checklist Before Deployment

- [ ] `.env` file created with actual credentials
- [ ] `.env` is in `.gitignore` (already done)
- [ ] Firebase security rules deployed
- [ ] reCAPTCHA v3 configured for Firebase App Check
- [ ] HTTPS enabled on hosting platform (Netlify)
- [ ] Desktop app built with environment variables
- [ ] No hardcoded credentials in source code (already removed)

---

## Reporting Security Issues

If you discover a security vulnerability, please email your security team immediately. Do NOT create a public GitHub issue.

---

## Last Updated
November 16, 2025
