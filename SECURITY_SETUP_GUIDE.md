# 🔒 Security Setup Guide

This guide covers all security measures implemented for the Device Monitor system.

## ✅ Completed Security Measures

### 1. Firestore Security Rules (CRITICAL) ✅

**Status:** Configured and deployed

**What it does:**
- Blocks unauthorized access to database
- Requires authentication for all operations
- Enforces role-based access control (admin vs regular users)

**Location:** `firestore.rules`

**How to verify:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Firestore Database → Rules
3. You should see rules requiring authentication

---

### 2. Environment Variables Protection ✅

**Status:** Secured

**What we did:**
- ✅ `.env` is in `.gitignore` (never committed)
- ✅ Created `.env.example` for team reference
- ✅ Firebase API keys are not exposed in git history

**Files:**
- `.gitignore` - Contains `.env*` pattern
- `.env.example` - Template for team members

---

### 3. Security Headers ✅

**Status:** Configured

**What it protects:**
- **X-Frame-Options:** Prevents clickjacking
- **X-Content-Type-Options:** Prevents MIME sniffing attacks
- **X-XSS-Protection:** Enables browser XSS filter
- **Content-Security-Policy:** Restricts resource loading
- **Referrer-Policy:** Controls referrer information
- **Permissions-Policy:** Blocks camera/mic/location access

**Files:**
- `next.config.js` - Headers configuration
- `public/_headers` - Netlify/static hosting headers
- `netlify.toml` - Deployment configuration

---

### 4. Firebase App Check (Rate Limiting) ✅

**Status:** Code ready, needs activation

**What it does:**
- Blocks API abuse and spam
- Rate limits requests automatically
- Uses reCAPTCHA v3 (invisible to users)
- Protects Firestore and Auth from bots

**Location:** `src/lib/firebase.ts`

**TO ACTIVATE (Required):**

#### Step 1: Get reCAPTCHA v3 Key
1. Go to https://www.google.com/recaptcha/admin
2. Click **+** to create new site
3. Settings:
   - Label: `Device Monitor App`
   - Type: **reCAPTCHA v3**
   - Domains: `localhost` + your production domain
4. Copy the **Site Key**

#### Step 2: Enable in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **system-staff-device**
3. Click **Build** → **App Check**
4. Click **Register app** → **Web**
5. Paste your reCAPTCHA Site Key
6. Enable enforcement for:
   - ✅ Cloud Firestore
   - ✅ Firebase Authentication

#### Step 3: Add Key to .env
```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_actual_site_key_here
```

**Verification:**
- Check browser console for: `✅ Firebase App Check initialized`
- If you see warning, add the key to `.env`

---

### 5. HTTPS Configuration ✅

**Status:** Configured for deployment

**For Netlify (Recommended):**
- ✅ Automatic HTTPS with free SSL certificate
- ✅ HTTP → HTTPS redirect configured in `netlify.toml`
- ✅ HSTS header forces HTTPS

**How to deploy:**
1. Push code to GitHub
2. Connect repo to [Netlify](https://netlify.com)
3. Deploy settings:
   - Build command: `npm run build`
   - Publish directory: `out`
4. HTTPS is automatic!

---

## ⚠️ Manual Setup Required

### 1. Firebase API Key Restrictions (HIGH PRIORITY)

**Why:** Prevent API abuse - anyone can currently use your API key for their own projects

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **system-staff-device**
3. Navigate to **APIs & Services** → **Credentials**
4. Find **Browser key (auto created by Firebase)**
5. Click ✏️ **Edit**

**Application Restrictions:**
- Select: **HTTP referrers (web sites)**
- Add these:
  ```
  http://localhost:3000/*
  http://localhost:*
  https://your-domain.com/*
  https://*.your-domain.com/*
  ```
  (Replace `your-domain.com` with actual domain)

**API Restrictions:**
- Select: **Restrict key**
- Enable only these APIs:
  - ✅ Cloud Firestore API
  - ✅ Firebase Authentication API
  - ✅ Firebase Installations API
  - ✅ Identity Toolkit API
  - ✅ Token Service API
  - ✅ Google Analytics API

6. Click **Save**

---

## 🛡️ Additional Recommendations

### 1. Admin Role System (Not Yet Implemented)

**Current Issue:**
Admin check is client-side only (`AuthContext.tsx:16-19`):
```typescript
const isAdmin = (email: string | null): boolean => {
  if (!email) return false;
  return email === 'admin@company.com' || email.startsWith('admin@');
};
```

**Problem:** Anyone can fake being admin by editing localStorage

**Future Fix:**
- Store `role` field in Firestore users collection
- Check role server-side (Firestore rules already support this)
- Verify role from database, not email pattern

---

### 2. Regular Security Audits

**Monthly checklist:**
- [ ] Review Firestore security rules
- [ ] Check Firebase usage for anomalies
- [ ] Update dependencies: `npm audit`
- [ ] Review user accounts for suspicious activity
- [ ] Check App Check metrics in Firebase Console

---

### 3. Backup Strategy

**Firestore Backup:**
1. Go to Firebase Console → Firestore Database
2. Click **Import/Export** tab
3. Schedule automated backups (paid plan)

**OR manually:**
```bash
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

---

## 📊 Security Checklist

| Security Feature | Status | Priority | Action Required |
|-----------------|--------|----------|-----------------|
| **Firestore Rules** | ✅ Done | Critical | Already deployed |
| **Environment Variables** | ✅ Done | High | None |
| **Security Headers** | ✅ Done | High | None (auto-applied on deploy) |
| **Firebase App Check** | ⏳ Pending | High | Get reCAPTCHA key + enable |
| **API Key Restrictions** | ⏳ Pending | High | Restrict in Google Cloud |
| **HTTPS** | ✅ Ready | High | Auto on Netlify deploy |
| **Admin Role Fix** | ❌ Not Done | Medium | Future enhancement |
| **Regular Audits** | ⏳ Ongoing | Medium | Setup monthly schedule |
| **Backups** | ❌ Not Done | Low | Setup when scaling |

---

## 🚀 Quick Start Deployment

1. **Complete Firebase API restrictions** (15 min)
2. **Get reCAPTCHA key** (5 min)
3. **Enable Firebase App Check** (5 min)
4. **Add reCAPTCHA key to `.env`**
5. **Push to GitHub**
6. **Deploy to Netlify** (5 min)

Total time: ~30 minutes

---

## 📞 Support

If you encounter security issues:
1. Check Firebase Console for error messages
2. Check browser console for warnings
3. Review this guide's troubleshooting section

## 🔗 Resources

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Netlify Security](https://docs.netlify.com/security/secure-access-to-sites/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

---

**Last Updated:** 2025-11-03
**Security Level:** Medium (will be High after Firebase API restriction + App Check)
