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

    const q = query(
      collection(db, 'device_scans'),
      where('staffEmail', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const deviceMap = new Map<string, HealthScan>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const deviceId = data.deviceId;
          const scanTime = data.scanTimestamp?.toDate?.() || new Date(0);

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

  const userName = user?.email?.split('@')[0] || 'User';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monitor your device health status</p>
          </div>

          {/* Device Health Data */}
          {hasAppInstalled && myDevices.length > 0 ? (
            <div className="space-y-4">
              {/* Multiple devices notice */}
              {myDevices.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
                  <p className="text-sm text-gray-600">
                    {myDevices.length} devices registered
                  </p>
                </div>
              )}

              {/* Loop through devices */}
              {myDevices.map((myDevice, deviceIndex) => (
                <div key={myDevice.id} className="space-y-4">
                  {/* Device Header + Status */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Status indicator bar */}
                    <div className={`h-1 ${
                      myDevice.overallStatus === 'Healthy' ? 'bg-green-500' :
                      myDevice.overallStatus === 'Warning' ? 'bg-amber-400' : 'bg-red-500'
                    }`} />

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">
                              Device {myDevices.length > 1 ? deviceIndex + 1 : ''}
                            </h2>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              myDevice.overallStatus === 'Healthy' ? 'bg-green-50 text-green-700' :
                              myDevice.overallStatus === 'Warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {myDevice.overallStatus}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Last scan: {formatDateTime(myDevice.scanTimestamp)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                          {myDevice.deviceId.substring(0, 8)}
                        </p>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-4">
                        <MetricBar label="CPU Usage" value={myDevice.cpuUsage} max={100} unit="%"
                          color={myDevice.cpuUsage > 80 ? 'red' : myDevice.cpuUsage > 60 ? 'amber' : 'green'} />

                        <MetricBar label="RAM Usage" value={myDevice.ramUsage} max={100} unit="%"
                          color={myDevice.ramUsage > 85 ? 'red' : myDevice.ramUsage > 70 ? 'amber' : 'green'} />

                        <MetricBar label="Free Disk Space" value={myDevice.diskSpaceFree} max={500} unit="GB"
                          color={myDevice.diskSpaceFree < 20 ? 'red' : myDevice.diskSpaceFree < 50 ? 'amber' : 'green'} />

                        {myDevice.batteryHealth && (
                          <MetricBar label="Battery Health" value={myDevice.batteryHealth} max={100} unit="%"
                            color={myDevice.batteryHealth < 50 ? 'red' : myDevice.batteryHealth < 70 ? 'amber' : 'green'} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security Status */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Security</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Antivirus</p>
                        <p className={`text-sm font-medium ${myDevice.antivirusStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                          {myDevice.antivirusStatus}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Firewall</p>
                        <p className={`text-sm font-medium ${myDevice.firewallStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                          {myDevice.firewallStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {myDevice.issues && myDevice.issues.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
                        Issues ({myDevice.issues.length})
                      </h3>
                      <div className="space-y-2">
                        {myDevice.issues.map((issue, index: number) => (
                          <div key={index} className={`rounded-xl p-4 ${
                            issue.severity === 'critical' ? 'bg-red-50' :
                            issue.severity === 'high' ? 'bg-orange-50' :
                            issue.severity === 'medium' ? 'bg-amber-50' :
                            'bg-gray-50'
                          }`}>
                            <p className="text-sm font-medium text-gray-900">{issue.type}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{issue.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System Info */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">System Info</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">OS Version</p>
                        <p className="text-sm font-medium text-gray-900">{myDevice.osVersion}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Department</p>
                        <p className="text-sm font-medium text-gray-900">{myDevice.department}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !hasAppInstalled && (
            /* No scan data - Download prompt */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No scan data yet</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Download and install the monitoring app to start tracking your device health.
              </p>
              <button
                onClick={() => router.push('/download')}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-3 px-6 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  color: 'green' | 'amber' | 'red'
}) {
  const percentage = (value / max) * 100;
  const colors = {
    green: 'bg-green-500',
    amber: 'bg-amber-400',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900 tabular-nums">{value.toFixed(1)} {unit}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${colors[color]} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}></div>
      </div>
    </div>
  );
}
