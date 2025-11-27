// This file provides app information that syncs with tauri.conf.json
import tauriConfig from '../../src-tauri/tauri.conf.json';

export const APP_INFO = {
  // Automatically pulled from tauri.conf.json
  version: tauriConfig.version,
  productName: tauriConfig.productName,

  // File information (update when rebuilding the app)
  fileSize: '70 MB',
  fileSizeMB: 70,

  // What's new in this version
  releaseDate: 'November 2025',
  features: [
    '🔧 Fixed static export compatibility - All pages now work correctly with Tauri build',
    '🎯 Improved active window detection - Accurately tracks which app you are currently using',
    '📱 Smart running processes - Shows only user apps, filtered system processes',
    '📡 Enhanced network detection - WiFi, Ethernet, USB tethering, and mobile hotspot support',
    '🔒 Fixed security detection - Firewall and antivirus status now properly recognized',
    '⚡ Faster page loading - User Management and all admin pages load smoothly',
    '🎨 Updated Repair History design - Consistent visual style across all pages',
  ],

  // Technical details
  platform: 'Windows',
  supportedOS: 'Windows 7, 8, 10, or 11',
  minDiskSpace: '100 MB free space', // Updated for v1.5.0
  installedSize: '85 MB', // Actual installed size for v1.5.0
  minRAM: '2 GB',
  internetRequired: true,

  // Download details
  fileName: 'DeviceMonitorSetup.exe',
  downloadPath: '/downloads/DeviceMonitorSetup.exe',

  // Feature highlights
  highlights: [
    {
      icon: '🔄',
      title: 'Automatic monitoring',
      description: 'Scans your computer every 2 weeks automatically',
    },
    {
      icon: '🔇',
      title: 'Zero disruption',
      description: 'Runs silently in background without interruptions',
    },
    {
      icon: '🏥',
      title: 'Comprehensive health checks',
      description: 'Monitors CPU, RAM, disk, battery, and antivirus status',
    },
    {
      icon: '⚠️',
      title: 'Early warnings',
      description: 'Detect potential issues before device failures',
    },
    {
      icon: '⚡',
      title: 'Lightweight & fast',
      description: `Only ${70} MB download, uses minimal system resources`,
    },
  ],

  // Privacy & security
  privacy: [
    'Only collects technical data (CPU, RAM, disk space)',
    'No personal files, browsing history, or screenshots',
    'Data encrypted during transfer (HTTPS)',
    'Helps IT team maintain your device proactively',
  ],

  // Support information
  support: {
    email: 'it-support@company.com',
    scanFrequency: 'Every 2 weeks',
    scanDuration: '2-3 minutes',
    ramUsage: '20-40 MB',
  },
};

export default APP_INFO;
