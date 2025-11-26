'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/components/Navigation';

interface DeviceScan {
  deviceId: string;
  staffEmail: string;
  staffName: string;
  department: string;
  scanTimestamp: any;
  active_window?: string;
  running_processes?: string[];
  activity_status?: string;
  last_input_time?: number;
}

interface StaffMember {
  id: string;
  email: string;
  name: string;
  department: string;
}

interface StaffActivity {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
  currentApp: string;
  lastActivity: Date;
  runningProcesses: string[];
  lastInputTime?: number;
}

export default function ActivityTrackingPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [allActivity, setAllActivity] = useState<StaffActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Load all staff members from staff collection
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList: StaffMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        staffList.push({
          id: doc.id,
          email: data.email,
          name: data.name,
          department: data.department || 'Unknown'
        });
      });
      setAllStaff(staffList);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Load device scans and match with staff
  useEffect(() => {
    if (!isAdmin || allStaff.length === 0) return;

    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Get latest scan for each device
      const latestScans = new Map<string, DeviceScan>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deviceId = data.deviceId;
        const scanTime = data.scanTimestamp?.toDate?.()?.getTime() || 0;

        const existing = latestScans.get(deviceId);
        const existingTime = existing?.scanTimestamp?.toDate?.()?.getTime() || 0;

        if (!existing || scanTime > existingTime) {
          latestScans.set(deviceId, {
            deviceId: data.deviceId,
            staffEmail: data.staffEmail,
            staffName: data.staffName,
            department: data.department,
            scanTimestamp: data.scanTimestamp,
            active_window: data.active_window,
            running_processes: data.running_processes || [],
            activity_status: data.activity_status || 'inactive',
            last_input_time: data.last_input_time
          });
        }
      });

      // Create activity list by matching staff with their latest scans
      const activityList: StaffActivity[] = [];

      allStaff.forEach((staff) => {
        // Find scan data for this staff member
        let staffScan: DeviceScan | undefined;
        latestScans.forEach((scan) => {
          if (scan.staffEmail === staff.email) {
            staffScan = scan;
          }
        });

        activityList.push({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          department: staff.department,
          status: staffScan?.activity_status || 'inactive',
          currentApp: staffScan?.active_window || 'No data',
          lastActivity: staffScan?.scanTimestamp?.toDate() || new Date(),
          runningProcesses: staffScan?.running_processes || [],
          lastInputTime: staffScan?.last_input_time
        });
      });

      setAllActivity(activityList);
    });

    return () => unsubscribe();
  }, [isAdmin, allStaff]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  // Filter logic
  const getFilteredActivity = () => {
    let filtered = allActivity;

    // Department filter
    if (deptFilter !== 'all') {
      filtered = filtered.filter(activity => activity.department === deptFilter);
    }

    // Search filter
    if (searchTerm !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchLower) ||
        activity.email.toLowerCase().includes(searchLower) ||
        activity.department.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredActivity = getFilteredActivity();

  // Group by department
  const groupedActivity = filteredActivity.reduce((acc, activity) => {
    const dept = activity.department || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(activity);
    return acc;
  }, {} as Record<string, StaffActivity[]>);

  // Get unique departments for filter
  const departments = Array.from(new Set(allActivity.map(a => a.department))).sort();

  // Stats
  const activeCount = allActivity.filter(a => a.status === 'active').length;
  const idleCount = allActivity.filter(a => a.status === 'idle').length;
  const inactiveCount = allActivity.filter(a => a.status === 'inactive').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'idle': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Navigation />
      {/* Glassmorphism Background - Light Blue-White */}
      <div className="min-h-screen relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f4ff 50%, #e8eeff 100%)',
      }}>
        {/* Blurred Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full">
            <div className="w-full h-full bg-gradient-to-br from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>
          <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full">
            <div className="w-full h-full bg-gradient-to-tl from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10 py-8 px-4 sm:px-6 lg:px-8">
          {/* Banner Section */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">
                  ACTIVITY · TRACKING
                </h1>
                <p className="mt-3 text-sm text-gray-600 font-normal">
                  Monitor real-time staff activity and productivity. Expand cards to view running processes.
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-2xl bg-white/30 border-2 border-white/50 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Total Staff</p>
                <p className="text-5xl font-normal mt-2 text-gray-800">{allStaff.length}</p>
              </div>
            </div>

            <div className="backdrop-blur-2xl bg-white/30 border-2 border-white/50 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Active</p>
                <p className="text-5xl font-normal mt-2 text-green-600">{activeCount}</p>
              </div>
            </div>

            <div className="backdrop-blur-2xl bg-white/30 border-2 border-white/50 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Idle</p>
                <p className="text-5xl font-normal mt-2 text-yellow-600">{idleCount}</p>
              </div>
            </div>

            <div className="backdrop-blur-2xl bg-white/30 border-2 border-white/50 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Inactive</p>
                <p className="text-5xl font-normal mt-2 text-red-600">{inactiveCount}</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Search Staff</label>
                <input
                  type="text"
                  placeholder="Search by name, email or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Department Filter</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Activity List */}
          <div className="space-y-6">
            {Object.keys(groupedActivity).length === 0 ? (
              <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-12 text-center">
                <p className="text-gray-600 font-medium">No staff activity found. Staff need to login to Desktop Monitor App first.</p>
              </div>
            ) : (
              Object.entries(groupedActivity).sort(([a], [b]) => a.localeCompare(b)).map(([department, staff]) => (
                <div key={department}>
                  <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide mb-3 px-2">{department}</h2>
                  <div className="space-y-3">
                    {staff.sort((a, b) => a.name.localeCompare(b.name)).map((activity) => (
                      <div key={activity.id} className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Staff Header */}
                        <button
                          onClick={() => setExpandedStaff(expandedStaff === activity.id ? null : activity.id)}
                          className="w-full p-6 flex items-center justify-between hover:bg-white/40 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md border-2 border-white">
                                <span className="text-xl font-bold text-white">{activity.name.charAt(0)}</span>
                              </div>
                              {/* Status indicator dot */}
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${getSeverityColor(activity.status)}`}></div>
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                              <p className="text-sm text-gray-600">{activity.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className={`px-4 py-2 rounded-xl text-xs font-bold border-2 uppercase ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                              <p className="text-xs text-gray-600 mt-2 font-medium">
                                {activity.currentApp.length > 35 ? activity.currentApp.substring(0, 35) + '...' : activity.currentApp}
                              </p>
                            </div>
                            <svg
                              className={`w-6 h-6 text-gray-600 transition-transform ${
                                expandedStaff === activity.id ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Running Processes */}
                        {expandedStaff === activity.id && (
                          <div className="border-t-4 border-white p-6 bg-white/20">
                            <div className="mb-6 backdrop-blur-xl bg-white/50 border-2 border-white rounded-xl p-4">
                              <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wide text-sm">Current Activity</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 font-medium">Active Window:</span>
                                  <span className="font-semibold text-gray-900">{activity.currentApp}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 font-medium">Status:</span>
                                  <span className={`font-semibold ${activity.status === 'active' ? 'text-green-600' : activity.status === 'idle' ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {activity.status.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 font-medium">Last Scan:</span>
                                  <span className="font-semibold text-gray-900">{activity.lastActivity.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wide text-sm">Running Processes ({activity.runningProcesses.length})</h4>
                            {activity.runningProcesses.length === 0 ? (
                              <p className="text-sm text-gray-600 font-medium">No process data available</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                                {activity.runningProcesses.map((process, idx) => (
                                  <div key={idx} className="px-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                                    {process}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
