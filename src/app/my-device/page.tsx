'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingScreen from '@/components/LoadingScreen';
import Navigation from '@/components/Navigation';
import { formatDateTime } from '@/lib/dateFormat';

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
  issues: Array<{
    severity: string;
    type: string;
    message: string;
  }>;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
}

export default function MyDevicePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [myDevices, setMyDevices] = useState<HealthScan[]>([]);
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
        // Group scans by deviceId and get the latest scan for each device
        const deviceMap = new Map<string, HealthScan>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const deviceId = data.deviceId;
          const scanTime = data.scanTimestamp?.toDate?.() || new Date(0);

          // If this device isn't in the map yet, or if this scan is newer, add/update it
          const existing = deviceMap.get(deviceId);
          const existingTime = existing?.scanTimestamp || new Date(0);

          if (!existing || scanTime.getTime() > existingTime.getTime()) {
            deviceMap.set(deviceId, {
              id: doc.id,
              ...data,
              scanTimestamp: scanTime,
            } as HealthScan);
          }
        });

        // Convert map to array and sort by most recent scan
        const devices = Array.from(deviceMap.values()).sort((a, b) =>
          b.scanTimestamp.getTime() - a.scanTimestamp.getTime()
        );

        setMyDevices(devices);
        setHasAppInstalled(true);
      } else {
        setMyDevices([]);
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
      <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8" style={{
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

        <div className="max-w-4xl mx-auto relative z-10">
        {/* Welcome Header */}
        <div className="backdrop-blur-2xl bg-green-300/60 border-4 border-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">
            WELCOME · {user?.email?.split('@')[0].toUpperCase()}! 👋
          </h1>
          <p className="text-gray-600 mt-3 text-sm font-normal">Monitor your device health status</p>
        </div>

        {/* Device Health Data - Show if app IS installed */}
        {hasAppInstalled && myDevices.length > 0 ? (
          <div className="space-y-6">
            {/* Show info if multiple devices */}
            {myDevices.length > 1 && (
              <div className="backdrop-blur-2xl bg-blue-100/60 border-4 border-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-blue-900 font-semibold">
                  📱 You have {myDevices.length} devices registered (Desktop, Laptop, etc.)
                </p>
              </div>
            )}

            {/* Loop through all devices */}
            {myDevices.map((myDevice, deviceIndex) => (
              <div key={myDevice.id} className="space-y-6">
                {/* Device Header */}
                <div className="backdrop-blur-2xl bg-purple-100/60 border-4 border-white rounded-lg shadow-lg p-4">
                  <h3 className="text-xl font-semibold text-gray-800 tracking-wide uppercase">
                    💻 Device {deviceIndex + 1} {myDevices.length > 1 ? `(${myDevice.osVersion.includes('10') ? 'Desktop' : myDevice.osVersion.includes('11') ? 'Laptop' : 'Computer'})` : ''}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">Device ID: {myDevice.deviceId.substring(0, 8)}...</p>
                </div>

                {/* Status Card */}
                <div className={`backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg overflow-hidden border-l-8 ${
                  myDevice.overallStatus === 'Healthy' ? 'border-l-green-500' :
                  myDevice.overallStatus === 'Warning' ? 'border-l-yellow-500' : 'border-l-red-500'
                }`}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-3xl font-semibold text-gray-800 tracking-wide uppercase">DEVICE · HEALTH · STATUS</h2>
                        <p className="text-sm text-gray-600 mt-3 font-normal">
                          Last scan: {formatDateTime(myDevice.scanTimestamp)}
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
                <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-semibold text-gray-800 tracking-wide uppercase mb-4">SECURITY · STATUS</h3>
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
                  <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg p-6">
                    <h3 className="text-2xl font-semibold text-gray-800 tracking-wide uppercase mb-4">
                      ISSUES · DETECTED ({myDevice.issues.length})
                    </h3>
                    <div className="space-y-3">
                      {myDevice.issues.map((issue, index: number) => (
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
                <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-semibold text-gray-800 tracking-wide uppercase mb-4">SYSTEM · INFORMATION</h3>
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
            ))}
          </div>
        ) : !hasAppInstalled && (
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-3xl font-semibold text-gray-800 tracking-wide uppercase mb-4">NO · SCAN · DATA · YET</h2>
            <p className="text-gray-600 mb-6 font-normal">
              Download and install the monitoring app to start tracking your device health.
            </p>
            <button
              onClick={() => router.push('/download')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download App
            </button>
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
