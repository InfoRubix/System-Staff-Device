# Desktop App Build Guide

## Building the Device Monitor Desktop App

This guide explains how to build the Tauri desktop application with the updated security fixes.

---

## Prerequisites

1. **Rust toolchain** installed
   - Download from: https://rustup.rs/
   - Verify: `rustc --version`

2. **Node.js** and npm installed
   - Verify: `node --version` and `npm --version`

3. **Environment variables configured**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase credentials

---

## Important: Environment Variables

The desktop app now reads Firebase credentials from **environment variables at BUILD TIME** (not runtime).

Make sure your `.env` file contains:

```env
TAURI_FIREBASE_PROJECT_ID=your_project_id
TAURI_FIREBASE_API_KEY=your_api_key_here
```

These will be embedded into the compiled binary during the build process using Rust's `env!()` macro.

---

## Build Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Desktop App

**Option A - Full Production Build:**
```bash
npm run tauri:build
```

This will:
- Build the Next.js web app (static export)
- Compile the Rust backend with your environment variables
- Create the installer in `src-tauri/target/release/bundle/`

**Option B - Development Mode:**
```bash
npm run tauri:dev
```

This opens a development window with hot-reload.

---

## Where to Find the Built App

After running `npm run tauri:build`, the installer will be in:

**Windows:**
- `src-tauri/target/release/bundle/nsis/Device Monitor_1.5.0_x64-setup.exe`

**macOS:**
- `src-tauri/target/release/bundle/dmg/Device Monitor_1.5.0_x64.dmg`

**Linux:**
- `src-tauri/target/release/bundle/deb/device-monitor_1.5.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/device-monitor_1.5.0_amd64.AppImage`

---

## Troubleshooting

### Error: "environment variable not found at compile time"

**Problem:** You're missing `TAURI_FIREBASE_PROJECT_ID` or `TAURI_FIREBASE_API_KEY` in your `.env` file.

**Solution:**
1. Make sure `.env` exists in the project root
2. Check that it contains both variables:
   ```env
   TAURI_FIREBASE_PROJECT_ID=system-staff-device
   TAURI_FIREBASE_API_KEY=AIzaSyA...
   ```
3. Restart your terminal/IDE
4. Try building again

### Build takes a long time

**This is normal!** The first build compiles all Rust dependencies and can take 5-15 minutes depending on your machine.

Subsequent builds will be much faster (1-3 minutes) thanks to caching.

### "cargo check" fails

Make sure you have:
1. Rust installed (`rustc --version`)
2. All dependencies installed (`npm install`)
3. `.env` file with correct variables

---

## Security Note

The built `.exe` file will have your Firebase credentials **embedded inside it**. This is secure because:

1. The credentials are for the **Firebase Web API** (not admin SDK)
2. Firebase security rules protect the database on the server side
3. The API key is safe to distribute in client apps (per Firebase documentation)
4. Only authorized operations (defined in Firestore rules) will succeed

However, **do NOT commit** the `.exe` file to GitHub (already excluded in `.gitignore`).

---

## Changing Firebase Credentials

If you need to update Firebase credentials after building:

1. Update `.env` file with new credentials
2. Rebuild the app: `npm run tauri:build`
3. Distribute the new `.exe` to users

There's no way to change credentials without rebuilding (they're compiled into the binary).

---

## Next Steps

After building:
1. Test the `.exe` on a clean Windows machine
2. Upload to your website's download page
3. Update download link in `src/app/download/page.tsx`
4. Deploy website to Netlify

---

Last Updated: November 16, 2025
