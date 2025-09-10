# Netlify Deployment Guide

## Issues Fixed

### 1. Node.js Version Compatibility
- **Problem**: Firebase v12.2.1 requires Node.js 20+, but Netlify was using 18.20.8
- **Solution**: Updated to Node.js 20 in both `netlify.toml` and `.nvmrc`

### 2. TypeScript Configuration
- **Problem**: `next.config.ts` required TypeScript to be available during build initialization
- **Solution**: Converted to `next.config.js` to avoid TypeScript dependency during build setup

### 3. Tailwind CSS Configuration
- **Problem**: Using Tailwind CSS v4 with `@tailwindcss/postcss` plugin caused module resolution issues
- **Solution**: Downgraded to stable Tailwind CSS v3.4.1 with traditional PostCSS configuration

### 4. Build Configuration
- **Problem**: npm ci can be restrictive with package versions
- **Solution**: Changed to `npm install` for more flexibility

## Current Configuration

### netlify.toml
```toml
[build]
  command = "npm install && npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NODE_ENV = "production"
```

### .nvmrc
```
20
```

### .npmrc
```
auto-install-peers=true
fund=false
audit=false
engine-strict=false
```

### postcss.config.mjs
```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

### tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Environment Variables Required

Set these in Netlify dashboard under Site Settings > Environment Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com/
```

## Deployment Steps

1. **Commit all changes** to your Git repository
2. **Push to GitHub** - Netlify will auto-deploy
3. **Set environment variables** in Netlify dashboard
4. **Monitor build logs** for any remaining issues

## Build Process

1. Netlify installs Node.js 20
2. Runs `npm install` to get all dependencies including TypeScript
3. Runs `next build` which compiles TypeScript files
4. Deploys the `.next` folder
5. Next.js plugin handles routing and serverless functions

## Common Issues

- **Firebase warnings**: The EBADENGINE warnings are just warnings and won't break the build
- **TypeScript not found**: Fixed by using `.js` config file instead of `.ts`
- **Node version mismatch**: Fixed by specifying Node 20 in multiple places

## Verification

After deployment:
1. Check that the login page loads
2. Verify Firebase connection works
3. Test device management functionality
4. Check mobile responsiveness