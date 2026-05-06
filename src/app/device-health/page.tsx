'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import DeviceHealthDashboard from '@/components/DeviceHealthDashboard';
import Navigation from '@/components/Navigation';
import YearMonthFilter from '@/components/YearMonthFilter';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HealthIssue {
  type: 'hardware' | 'software' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface HealthScan {
  id: string;
  deviceId: string;
  staffName: string;
  department: string;
  scanTimestamp: Date;
  cpuUsage: number;
  cpuTemp?: number;
  ramUsage: number;
  diskSpaceFree: number;
  diskHealth: 'Good' | 'Warning' | 'Critical';
  batteryHealth?: number;
  wifiSignalStrength?: number;
  wifiLinkSpeed?: number;
  wifiSsid?: string;
  wifiStatus?: string;
  osVersion: string;
  antivirusStatus: 'Active' | 'Inactive' | 'Not Installed';
  firewallStatus: 'Active' | 'Inactive';
  lastUpdate?: Date;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
  issues: HealthIssue[];
}

export default function DeviceHealthPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const _router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [healthScans, setHealthScans] = useState<HealthScan[]>([]);
  const [filteredScans, setFilteredScans] = useState<HealthScan[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Fetch health scans from Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScans: HealthScan[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // Extract WiFi info from network_info (if exists)
        let wifiSignal, wifiSpeed, wifiSsid, wifiStatus;
        if (data.network_info) {
          // Find WiFi interface
          for (const [_interfaceName, info] of Object.entries(data.network_info)) {
            const networkInfo = info as any;
            if (networkInfo.interface_type === 'WiFi') {
              wifiSignal = networkInfo.wifi_signal_strength;
              wifiSpeed = networkInfo.wifi_link_speed;
              wifiSsid = networkInfo.wifi_ssid;
              wifiStatus = networkInfo.wifi_status;
              break; // Use first WiFi interface found
            }
          }
        }

        allScans.push({
          id: doc.id,
          ...data,
          scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
          wifiSignalStrength: wifiSignal,
          wifiLinkSpeed: wifiSpeed,
          wifiSsid: wifiSsid,
          wifiStatus: wifiStatus,
        } as HealthScan);
      });

      // Group scans by deviceId and keep only the latest scan for each device
      const latestScansMap = new Map<string, HealthScan>();
      allScans.forEach(scan => {
        const existing = latestScansMap.get(scan.deviceId);
        if (!existing || scan.scanTimestamp > existing.scanTimestamp) {
          latestScansMap.set(scan.deviceId, scan);
        }
      });

      // Convert map to array
      const scans = Array.from(latestScansMap.values());
      setHealthScans(scans);
    });

    return () => unsubscribe();
  }, []);

  // Filter scans by year/month
  useEffect(() => {
    if (selectedYear === 'all') {
      setFilteredScans(healthScans);
      return;
    }

    const filtered = healthScans.filter(scan => {
      const scanDate = scan.scanTimestamp;
      const scanYear = scanDate.getFullYear().toString();
      const scanMonth = scanDate.getMonth().toString();

      if (scanYear !== selectedYear) return false;
      if (selectedMonth === 'all') return true;
      return scanMonth === selectedMonth;
    });

    setFilteredScans(filtered);
  }, [healthScans, selectedYear, selectedMonth]);

  const handleFilterChange = (year: string, month: string) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Export to PDF function
  const exportToPDF = async () => {
    setExporting(true);

    try {
      // Import the professional PDF service
      const { pdfService } = await import('@/services/pdfService');

      // Calculate period text
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      let periodText = 'All Time';
      if (selectedYear !== 'all') {
        if (selectedMonth !== 'all') {
          periodText = `${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
        } else {
          periodText = selectedYear;
        }
      }

      // Calculate statistics from filtered scans
      const stats = {
        total: filteredScans.length,
        healthy: filteredScans.filter((s) => s.overallStatus === 'Healthy').length,
        warning: filteredScans.filter((s) => s.overallStatus === 'Warning').length,
        critical: filteredScans.filter((s) => s.overallStatus === 'Critical').length,
      };

      // Generate the professional PDF report
      const success = await pdfService.exportDeviceHealthReport(
        filteredScans,
        stats,
        periodText
      );

      if (!success) {
        throw new Error('PDF generation failed');
      }

    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Only start the timer if we're actually navigating to this page
      if (isNavigating) {
        console.log('Device Health Page - Starting navigation loading timer');

        // Consistent loading time for all devices
        const loadingTime = 800; // 0.8 seconds standard loading time

        console.log('Device Health Page - Starting with standard loading time:', loadingTime);

        const readyTimer = setTimeout(() => {
          console.log('Device Health Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime);

        return () => {
          console.log('Device Health Page - Clearing ready timer');
          clearTimeout(readyTimer);
        };
      } else {
        console.log('Device Health Page - Direct access, loading immediately');
        // If not navigating (direct page access), load immediately
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      console.log('Device Health Page - All conditions met, starting finish timer');
      const finishTimer = setTimeout(() => {
        console.log('Device Health Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        setShowLoadingScreen(false);
      }, 1000);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading for direct page access (not from navigation)
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Device Health Overview</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor real-time health status and click on any card to filter devices
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportToPDF}
                  disabled={exporting || filteredScans.length === 0}
                  className="px-4 py-2 bg-gray-900 text-white font-medium rounded-xl transition-colors flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Year/Month Filter */}
          <YearMonthFilter onFilterChange={handleFilterChange} />

          <DeviceHealthDashboard scans={filteredScans} />
        </div>
      </div>
    </>
  );
}
