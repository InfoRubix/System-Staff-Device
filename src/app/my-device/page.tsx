'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingScreen from '@/components/LoadingScreen';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

interface HealthScan {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  scanTimestamp: Date;
  cpuUsage: number;
  ramUsage: number;
  diskSpaceFree: number;
  batteryHealth?: number;
  osVersion: string;
  antivirusStatus: 'Active' | 'Inactive' | 'Not Installed';
  firewallStatus: 'Active' | 'Inactive';
  issues: any[];
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
}

export default function MyDevicePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [myDevice, setMyDevice] = useState<HealthScan | null>(null);
  const [hasAppInstalled, setHasAppInstalled] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    } else if (!authLoading && isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!user?.email) return;

    // Listen to device scans for this user's email
    // Note: Removed orderBy to avoid needing composite index, will sort in-memory instead
    const q = query(
      collection(db, 'device_scans'),
      where('staffEmail', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Sort by timestamp in-memory to get the latest scan
        const sortedDocs = snapshot.docs.sort((a, b) => {
          const aTime = a.data().scanTimestamp?.toDate?.() || new Date(0);
          const bTime = b.data().scanTimestamp?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

        const data = sortedDocs[0].data();
        setMyDevice({
          id: sortedDocs[0].id,
          ...data,
          scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
        } as HealthScan);
        setHasAppInstalled(true);
      } else {
        setMyDevice(null);
        setHasAppInstalled(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Monitor your device health status</p>
        </div>

        {/* Download Banner - Show if app NOT installed */}
        {!hasAppInstalled && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 mb-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">📥</span>
                  <h2 className="text-2xl font-bold">Download Monitoring App</h2>
                </div>
                <p className="text-blue-100 mb-4">
                  Install the Device Monitor app to enable automatic health scans every 2 weeks.
                  The app runs silently in the background and sends your device health data here.
                </p>
                <ul className="text-sm text-blue-100 space-y-1 mb-4">
                  <li>✓ Auto-scan every 2 weeks</li>
                  <li>✓ Runs in background - no interruptions</li>
                  <li>✓ Early problem detection</li>
                  <li>✓ Only 8 MB size</li>
                </ul>
              </div>
              <div className="flex-shrink-0">
                <Link
                  href="/download"
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-lg shadow-lg transform transition hover:scale-105 inline-flex items-center gap-2 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Device Health Data - Show if app IS installed */}
        {hasAppInstalled && myDevice ? (
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${
              myDevice.overallStatus === 'Healthy' ? 'border-green-500' :
              myDevice.overallStatus === 'Warning' ? 'border-yellow-500' : 'border-red-500'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Device Health Status</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Last scan: {myDevice.scanTimestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-5xl">
                    {myDevice.overallStatus === 'Healthy' ? '✅' :
                     myDevice.overallStatus === 'Warning' ? '⚠️' : '🔴'}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-4">
                  <MetricBar label="CPU Usage" value={myDevice.cpuUsage} max={100} unit="%"
                    color={myDevice.cpuUsage > 80 ? 'red' : myDevice.cpuUsage > 60 ? 'yellow' : 'green'} />

                  <MetricBar label="RAM Usage" value={myDevice.ramUsage} max={100} unit="%"
                    color={myDevice.ramUsage > 85 ? 'red' : myDevice.ramUsage > 70 ? 'yellow' : 'green'} />

                  <MetricBar label="Free Disk Space" value={myDevice.diskSpaceFree} max={500} unit="GB"
                    color={myDevice.diskSpaceFree < 20 ? 'red' : myDevice.diskSpaceFree < 50 ? 'yellow' : 'green'} />

                  {myDevice.batteryHealth && (
                    <MetricBar label="Battery Health" value={myDevice.batteryHealth} max={100} unit="%"
                      color={myDevice.batteryHealth < 50 ? 'red' : myDevice.batteryHealth < 70 ? 'yellow' : 'green'} />
                  )}
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Antivirus</span>
                    <span className={`font-semibold ${myDevice.antivirusStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                      {myDevice.antivirusStatus}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Firewall</span>
                    <span className={`font-semibold ${myDevice.firewallStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                      {myDevice.firewallStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues */}
            {myDevice.issues && myDevice.issues.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Issues Detected ({myDevice.issues.length})
                </h3>
                <div className="space-y-3">
                  {myDevice.issues.map((issue: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      issue.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      issue.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <p className="font-medium text-gray-900">{issue.type}</p>
                      <p className="text-sm text-gray-700 mt-1">{issue.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">OS Version</p>
                  <p className="font-medium">{myDevice.osVersion}</p>
                </div>
                <div>
                  <p className="text-gray-600">Department</p>
                  <p className="font-medium">{myDevice.department}</p>
                </div>
              </div>
            </div>
          </div>
        ) : !hasAppInstalled && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Scan Data Yet</h2>
            <p className="text-gray-600 mb-6">
              Download and install the monitoring app to start tracking your device health.
            </p>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download App
            </Link>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

function MetricBar({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string;
  color: 'green' | 'yellow' | 'red'
}) {
  const percentage = (value / max) * 100;
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="font-semibold text-gray-900">{value.toFixed(1)} {unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className={`${colors[color]} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}></div>
      </div>
    </div>
  );
}
