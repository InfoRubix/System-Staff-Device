// This file provides app information that syncs with tauri.conf.json
import tauriConfig from '../../src-tauri/tauri.conf.json';

export const APP_INFO = {
  // Automatically pulled from tauri.conf.json
  version: tauriConfig.version,
  productName: tauriConfig.productName,

  // File information (update when rebuilding the app)
  fileSize: '59 MB',
  fileSizeMB: 59,

  // What's new in this version
  releaseDate: 'November 2024',
  features: [
    '🎨 New pixel art login interface - Modern visual design',
    '📌 System tray icon - Runs in background, close window to minimize to tray',
    '💻 Automatic device detection - Correctly identifies Laptop vs Desktop',
    '🚀 Auto-start on boot - Starts automatically when Windows boots',
    '🔧 Bug fixes and performance improvements',
    '✅ Enhanced account security - Validates user status before each scan',
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
      description: `Only ${59} MB download, uses minimal system resources`,
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
