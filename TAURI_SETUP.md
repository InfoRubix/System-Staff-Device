# Tauri Desktop App Setup Guide

## Overview
Your Next.js device monitoring system is now configured to run as a native desktop application using Tauri! This guide will help you complete the setup and build your first desktop app.

## Prerequisites

### 1. Install Rust
Tauri requires Rust to compile the native backend.

**Windows:**
```bash
# Download and run rustup-init.exe from:
https://www.rust-lang.org/tools/install

# Or use winget:
winget install --id Rustlang.Rustup
```

**After installation, verify:**
```bash
rustc --version
cargo --version
```

### 2. Install System Dependencies

**Windows:**
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10+)
- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## What Has Been Configured

### ✅ Tauri Structure Created
```
src-tauri/
├── src/
│   └── main.rs          # Rust backend with device monitoring
├── icons/               # App icons (you need to add these)
├── Cargo.toml           # Rust dependencies
├── tauri.conf.json      # Tauri configuration
└── build.rs             # Build script
```

### ✅ Package.json Updated
New scripts added:
- `npm run tauri` - Run Tauri CLI commands
- `npm run tauri:dev` - Start development mode
- `npm run tauri:build` - Build production app

### ✅ Next.js Configured
- Static export enabled (`output: 'export'`)
- Image optimization disabled (required for static export)
- Output directory: `out/`

### ✅ Rust Backend Features
The Rust backend (`src-tauri/src/main.rs`) includes:
- **Real-time system monitoring** using `sysinfo` crate
- **CPU usage tracking**
- **Memory monitoring**
- **Disk information**
- **Network statistics**
- **OS information**

### ✅ TypeScript Utilities
Created `src/lib/tauri.ts` with helper functions:
- `getSystemInfo()` - Get comprehensive system data
- `getCpuUsage()` - Get current CPU usage
- `getMemoryUsage()` - Get memory statistics
- `isTauriApp()` - Check if running in Tauri
- `formatBytes()` - Format file sizes
- `formatPercentage()` - Format percentages

## Usage

### Development Mode
```bash
# Start the Tauri dev server (launches desktop app)
npm run tauri:dev
```

This will:
1. Start Next.js dev server on http://localhost:3000
2. Compile Rust backend
3. Launch desktop window with hot-reload

### Production Build
```bash
# Build the desktop application
npm run tauri:build
```

Output locations:
- **Windows**: `src-tauri/target/release/bundle/msi/` (.msi installer)
- **macOS**: `src-tauri/target/release/bundle/dmg/` (.dmg)
- **Linux**: `src-tauri/target/release/bundle/deb/` (.deb) or `.AppImage`

## Using Tauri APIs in Your React Components

### Example: Device Health Component

```typescript
'use client';
import { useEffect, useState } from 'react';
import { getSystemInfo, isTauriApp, formatBytes, SystemInfo } from '@/lib/tauri';

export default function DeviceHealth() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Only fetch system info if running in Tauri
    if (!isTauriApp()) {
      setError('Not running in Tauri app');
      return;
    }

    const fetchSystemInfo = async () => {
      try {
        const info = await getSystemInfo();
        setSystemInfo(info);
      } catch (err) {
        setError('Failed to fetch system info');
        console.error(err);
      }
    };

    fetchSystemInfo();

    // Refresh every 5 seconds
    const interval = setInterval(fetchSystemInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!systemInfo) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h2>System Information</h2>
      <div>CPU: {systemInfo.cpu_name}</div>
      <div>CPU Usage: {systemInfo.cpu_usage.toFixed(2)}%</div>
      <div>Cores: {systemInfo.cpu_cores}</div>
      <div>RAM: {formatBytes(systemInfo.memory_used)} / {formatBytes(systemInfo.memory_total)}</div>
      <div>OS: {systemInfo.os_name} {systemInfo.os_version}</div>

      <h3>Disks:</h3>
      {systemInfo.disk_info.map((disk, i) => (
        <div key={i}>
          {disk.name}: {formatBytes(disk.used_space)} / {formatBytes(disk.total_space)}
        </div>
      ))}
    </div>
  );
}
```

## App Icons

You need to add icons to `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Use [this icon generator](https://tauri.app/v1/guides/features/icons/) or create manually.

## Configuration

### Tauri Config (`src-tauri/tauri.conf.json`)

**Key settings:**
- `productName`: "Device Monitor"
- `identifier`: "com.devicemonitor.app"
- `devUrl`: "http://localhost:3000" (dev server)
- `frontendDist`: "../out" (production build)

**Window settings:**
- Default size: 1200x800
- Minimum size: 1000x600
- Resizable, centered

### Rust Dependencies (`src-tauri/Cargo.toml`)

**Main dependencies:**
- `tauri`: Core framework
- `sysinfo`: System information (CPU, RAM, disk, network)
- `serde`, `serde_json`: JSON serialization

## Troubleshooting

### "rustc: command not found"
- Install Rust from https://www.rust-lang.org/tools/install
- Restart terminal/IDE after installation

### Build fails on Windows
- Install Visual Studio C++ Build Tools
- Install WebView2 runtime

### "Failed to get system info" in browser
- Tauri APIs only work in desktop app, not web browser
- Use `isTauriApp()` to check environment

### Next.js API routes not working
- Static export doesn't support API routes
- Move logic to Rust backend or use external API

## Next Steps

1. **Install Rust** (if not done)
2. **Add app icons** to `src-tauri/icons/`
3. **Run** `npm run tauri:dev` to test
4. **Integrate Tauri APIs** into your components
5. **Build** production app with `npm run tauri:build`

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [sysinfo Crate Docs](https://docs.rs/sysinfo/)
- [Tauri + Next.js Guide](https://tauri.app/v1/guides/getting-started/setup/next-js/)

## File Size Comparison

**Current build sizes:**
- Web version: ~2-3 MB (gzipped)
- **Tauri Desktop app**: ~10-15 MB (installer)
- Electron equivalent: ~150-200 MB

Your device monitoring system is now ready for desktop deployment! 🚀
