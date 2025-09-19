import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache with timestamps
let analyticsCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 60 * 1000; // 60 seconds

// Mock data for analytics - in production, this would fetch from your database
function generateAnalyticsData() {
  const currentYear = new Date().getFullYear();

  // Sample device data - replace with actual database queries
  const devices = [
    { id: '1', department: 'MARKETING', deviceType: 'Laptop', status: 'Working', operatingSystem: 'Windows 11', processor: 'Intel i7', ram: '16GB', storage: '512GB SSD', graphics: 'Intel Iris' },
    { id: '2', department: 'RUBIX', deviceType: 'Desktop', status: 'Broken', operatingSystem: 'Windows 10', processor: 'Intel i5', ram: '8GB', storage: '1TB HDD', graphics: 'NVIDIA GTX' },
    { id: '3', department: 'CONVEY', deviceType: 'Mobile', status: 'Working', operatingSystem: 'iOS 17', processor: 'Apple A17', ram: '8GB', storage: '256GB', graphics: 'Apple GPU' },
    { id: '4', department: 'ACCOUNT', deviceType: 'Tablet', status: 'Needs Repair', operatingSystem: 'Android 14', processor: 'Snapdragon', ram: '6GB', storage: '128GB', graphics: 'Adreno' },
    { id: '5', department: 'HR', deviceType: 'Laptop', status: 'Working', operatingSystem: 'macOS Sonoma', processor: 'Apple M2', ram: '16GB', storage: '512GB SSD', graphics: 'Apple M2' },
  ];

  // OS release year mapping
  const osReleaseYears: Record<string, number> = {
    'windows 11': 2021,
    'windows 10': 2015,
    'macos sonoma': 2023,
    'macos ventura': 2022,
    'ios 17': 2023,
    'ios 16': 2022,
    'android 14': 2023,
    'android 13': 2022,
  };

  // Calculate device status distribution
  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate device type distribution
  const typeCounts = devices.reduce((acc, device) => {
    acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate OS age data
  const osAgeCounts = devices.reduce((acc, device) => {
    const osKey = device.operatingSystem.toLowerCase();
    const releaseYear = osReleaseYears[osKey];
    if (releaseYear) {
      const age = Math.max(0, currentYear - releaseYear);
      acc[device.operatingSystem] = age;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate department distribution
  const departmentCounts = devices.reduce((acc, device) => {
    acc[device.department] = (acc[device.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate mock issues trend data (last 12 months)
  const issuesTrend = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      broken: Math.floor(Math.random() * 5) + 1,
      needsRepair: Math.floor(Math.random() * 3) + 1,
      working: Math.floor(Math.random() * 10) + 15,
    };
  });

  // Calculate KPI metrics
  const totalDevices = devices.length;
  const workingDevices = devices.filter(d => d.status === 'Working').length;
  const upgradePercentage = Math.round((workingDevices / totalDevices) * 100);

  // OS distribution percentages
  const windowsDevices = devices.filter(d => d.operatingSystem.toLowerCase().includes('windows')).length;
  const iosDevices = devices.filter(d => d.operatingSystem.toLowerCase().includes('ios')).length;
  const androidDevices = devices.filter(d => d.operatingSystem.toLowerCase().includes('android')).length;

  return {
    statusDistribution: statusCounts,
    deviceTypeDistribution: typeCounts,
    osAgeData: osAgeCounts,
    departmentDistribution: departmentCounts,
    issuesTrend,
    kpiMetrics: {
      upgradePercentage,
      upgradeStats: {
        upgraded: workingDevices,
        total: totalDevices,
      },
      osDistribution: {
        Windows: Math.round((windowsDevices / totalDevices) * 100),
        iOS: Math.round((iosDevices / totalDevices) * 100),
        Android: Math.round((androidDevices / totalDevices) * 100),
      },
    },
    totalDevices,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();

    // Check if we have valid cached data
    if (analyticsCache && (now - analyticsCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...analyticsCache.data,
        cached: true,
        cacheAge: Math.floor((now - analyticsCache.timestamp) / 1000),
      });
    }

    // Generate fresh analytics data
    const analyticsData = generateAnalyticsData();

    // Update cache
    analyticsCache = {
      data: analyticsData,
      timestamp: now,
    };

    return NextResponse.json({
      ...analyticsData,
      cached: false,
      cacheAge: 0,
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}