'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import DeviceHealthDashboard from '@/components/DeviceHealthDashboard';
import Navigation from '@/components/Navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HealthScan {
  id: string;
  deviceId: string;
  staffName: string;
  department: string;
  scanTimestamp: Date;
  cpuUsage: number;
  ramUsage: number;
  diskSpaceFree: number;
  diskHealth: 'Good' | 'Warning' | 'Critical';
  batteryHealth?: number;
  antivirusStatus: string;
  firewallStatus: string;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
  issues: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export default function DeviceHealthPage() {
  const { isAuthenticated, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const _router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [healthScans, setHealthScans] = useState<HealthScan[]>([]);
  const [exporting, setExporting] = useState(false);

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
        allScans.push({
          id: doc.id,
          ...data,
          scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
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

      // Calculate statistics
      const stats = {
        total: healthScans.length,
        healthy: healthScans.filter((s) => s.overallStatus === 'Healthy').length,
        warning: healthScans.filter((s) => s.overallStatus === 'Warning').length,
        critical: healthScans.filter((s) => s.overallStatus === 'Critical').length,
      };

      // Generate the professional PDF report
      const success = await pdfService.exportDeviceHealthReport(
        healthScans,
        stats
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

        // Enhanced device detection for better timing
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
        const isDesktop = !isPhone && !isTablet;

        // Loading times for device health
        let loadingTime;
        if (isPhone) {
          loadingTime = 4000; // 4 seconds for phones
        } else if (isTablet) {
          loadingTime = 3500; // 3.5 seconds for tablets
        } else if (isLaptop) {
          loadingTime = 3000; // 3 seconds for laptops
        } else {
          loadingTime = 2500; // 2.5 seconds for desktop
        }

        console.log('Device Health Page - Device type and loading time:', { isPhone, isTablet, isLaptop, isDesktop, loadingTime });

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Checking authentication...</p>
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
      <div className="min-h-screen relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f4ff 50%, #e8eeff 100%)',
      }}>
        {/* Blurred Background Elements - Large Corner Bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top Left Corner - Large Blue Bubble with visible border */}
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full">
            <div className="w-full h-full bg-gradient-to-br from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>

          {/* Bottom Right Corner - Large Blue Bubble with visible border */}
          <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full">
            <div className="w-full h-full bg-gradient-to-tl from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Banner Section */}
        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">DEVICE · HEALTH · OVERVIEW</h1>
              <p className="mt-3 text-sm text-gray-600 font-normal">
                Monitor real-time health status and click on any card to filter devices
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToPDF}
                disabled={exporting || healthScans.length === 0}
                className="px-4 py-2 border-4 font-medium rounded-lg transition-colors flex items-center gap-2
                  md:bg-blue-100 md:border-blue-300 md:hover:bg-blue-200 md:hover:border-blue-400 md:text-blue-700 md:hover:text-blue-800
                  bg-blue-600 border-blue-700 text-white
                  disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  'GENERATE REPORT'
                )}
              </button>
            </div>
          </div>
        </div>

        <DeviceHealthDashboard />
        </div>
      </div>
    </>
  );
}
