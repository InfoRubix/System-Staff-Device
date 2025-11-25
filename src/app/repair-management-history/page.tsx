'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/components/Navigation';
import YearMonthFilter from '@/components/YearMonthFilter';
import { formatDate } from '@/lib/dateFormat';

interface FixedRepair {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  issueType: string;
  category: 'hardware' | 'software' | 'security';
  severity: 'urgent' | 'high' | 'medium' | 'low';
  status: 'fixed' | 'completed';
  fixedAt: Date;
  fixedBy?: string;
  originalIssue?: string;
  assignedTechnician?: string;
  technicianNotes?: string;
}

interface GroupedStaffRepairs {
  staffEmail: string;
  staffName: string;
  department: string;
  repairs: FixedRepair[];
  totalRepairs: number;
  latestFixedDate: Date;
}

export default function RepairManagementHistoryPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [fixedRepairs, setFixedRepairs] = useState<FixedRepair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<FixedRepair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'hardware' | 'software' | 'security'>('all');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done
  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      if (isNavigating) {
        const timer = setTimeout(() => {
          setComponentsReady(true);
          setPageLoaded();
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isAdmin, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      const finishTimer = setTimeout(() => {
        finishNavigation();
        setShowLoadingScreen(false);
      }, 800);
      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Load fixed repairs from Firebase
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'repairs'),
      where('status', 'in', ['fixed', 'completed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repairs: FixedRepair[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        repairs.push({
          id: doc.id,
          deviceId: data.deviceId || 'Unknown',
          staffName: data.staffName || 'Unknown',
          staffEmail: data.staffEmail || 'Unknown',
          department: data.department || 'Unknown',
          issueType: data.issueType || 'Unknown Issue',
          category: data.category || 'hardware',
          severity: data.severity || 'medium',
          status: data.status || 'fixed',
          fixedAt: data.fixedAt?.toDate() || new Date(),
          fixedBy: data.fixedBy,
          originalIssue: data.originalIssue,
          assignedTechnician: data.assignedTechnician,
          technicianNotes: data.technicianNotes,
        });
      });

      // Sort by fixed date (newest first)
      repairs.sort((a, b) => b.fixedAt.getTime() - a.fixedAt.getTime());
      setFixedRepairs(repairs);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Filter repairs
  useEffect(() => {
    let filtered = [...fixedRepairs];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (repair) =>
          repair.staffName.toLowerCase().includes(term) ||
          repair.staffEmail.toLowerCase().includes(term) ||
          repair.department.toLowerCase().includes(term) ||
          repair.issueType.toLowerCase().includes(term)
      );
    }

    // Severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter((repair) => repair.severity === filterSeverity);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter((repair) => repair.category === filterCategory);
    }

    // Year/Month filter
    if (selectedYear !== 'all' || selectedMonth !== 'all') {
      filtered = filtered.filter((repair) => {
        const repairYear = repair.fixedAt.getFullYear().toString();
        const repairMonth = (repair.fixedAt.getMonth() + 1).toString();

        const yearMatch = selectedYear === 'all' || repairYear === selectedYear;
        const monthMatch = selectedMonth === 'all' || repairMonth === selectedMonth;

        return yearMatch && monthMatch;
      });
    }

    setFilteredRepairs(filtered);
  }, [fixedRepairs, searchTerm, filterSeverity, filterCategory, selectedYear, selectedMonth]);

  // Group filtered repairs by staff email
  const groupedStaffRepairs: GroupedStaffRepairs[] = (() => {
    const grouped = new Map<string, GroupedStaffRepairs>();

    filteredRepairs.forEach(repair => {
      const key = repair.staffEmail;

      if (!grouped.has(key)) {
        grouped.set(key, {
          staffEmail: repair.staffEmail,
          staffName: repair.staffName,
          department: repair.department,
          repairs: [],
          totalRepairs: 0,
          latestFixedDate: repair.fixedAt,
        });
      }

      const group = grouped.get(key)!;
      group.repairs.push(repair);
      group.totalRepairs++;

      // Update latest fixed date
      if (repair.fixedAt > group.latestFixedDate) {
        group.latestFixedDate = repair.fixedAt;
      }
    });

    // Convert to array and sort by latest fixed date (newest first)
    return Array.from(grouped.values()).sort((a, b) =>
      b.latestFixedDate.getTime() - a.latestFixedDate.getTime()
    );
  })();

  // Don't render while navigating
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const severityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  };

  const categoryIcons = {
    hardware: '🔧',
    software: '💻',
    security: '🔒',
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📜 Repair History</h1>
            <p className="text-gray-600">All fixed and completed repairs</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Staff name, email, issue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="hardware">Hardware</option>
                  <option value="security">Security</option>
                </select>
              </div>

              {/* Year/Month Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <YearMonthFilter
                  onFilterChange={(year, month) => {
                    setSelectedYear(year);
                    setSelectedMonth(month);
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredRepairs.length}</span> of{' '}
                <span className="font-semibold">{fixedRepairs.length}</span> fixed repairs
              </p>
            </div>
          </div>

          {/* Grouped Staff Repairs List */}
          {groupedStaffRepairs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Fixed Repairs</h3>
              <p className="text-gray-600">No repairs have been marked as fixed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedStaffRepairs.map((staffGroup) => (
                <div key={staffGroup.staffEmail} className="bg-white rounded-lg shadow">
                  {/* Staff Header - Clickable */}
                  <button
                    onClick={() => setExpandedStaff(expandedStaff === staffGroup.staffEmail ? null : staffGroup.staffEmail)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">{staffGroup.staffName.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{staffGroup.staffName}</h3>
                          <p className="text-sm text-gray-600">{staffGroup.staffEmail} • {staffGroup.department}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{staffGroup.totalRepairs}</p>
                        <p className="text-xs text-gray-500">Fixed Repairs</p>
                      </div>
                      <svg
                        className={`w-6 h-6 text-gray-400 transition-transform ${
                          expandedStaff === staffGroup.staffEmail ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Repairs List */}
                  {expandedStaff === staffGroup.staffEmail && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                      {staffGroup.repairs.map((repair) => (
                        <div key={repair.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {/* Left Side - Issue Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{categoryIcons[repair.category]}</span>
                                <h4 className="text-base font-semibold text-gray-900">{repair.issueType}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${severityColors[repair.severity]}`}>
                                  {repair.severity.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1 ml-11">
                                <p>
                                  <span className="font-medium">Device ID:</span> {repair.deviceId}
                                </p>
                                {repair.originalIssue && (
                                  <p>
                                    <span className="font-medium">Issue:</span> {repair.originalIssue}
                                  </p>
                                )}
                                {repair.assignedTechnician && (
                                  <p>
                                    <span className="font-medium">Technician:</span> {repair.assignedTechnician}
                                  </p>
                                )}
                                {repair.technicianNotes && (
                                  <p>
                                    <span className="font-medium">Notes:</span> {repair.technicianNotes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Side - Status */}
                            <div className="text-right">
                              <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
                                <span className="text-xl">✅</span>
                                <div className="text-left">
                                  <p className="text-xs font-semibold text-green-800">FIXED</p>
                                  <p className="text-xs text-green-700">{formatDate(repair.fixedAt)}</p>
                                  {repair.fixedBy && <p className="text-xs text-green-700">by {repair.fixedBy}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
