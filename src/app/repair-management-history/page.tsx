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

  // Load expanded staff from URL (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const staffParam = params.get('staff');
      if (staffParam) {
        setExpandedStaff(staffParam);
      }
    }
  }, []);

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

        <div className="max-w-7xl mx-auto relative z-10 py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-8 mb-8">
            <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">
              REPAIR · HISTORY
            </h1>
            <p className="mt-3 text-sm text-gray-600 font-normal">All fixed and completed repairs</p>
          </div>

          {/* Filters */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Staff name, email, issue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                />
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
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
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                >
                  <option value="all">All Categories</option>
                  <option value="hardware">Hardware</option>
                  <option value="security">Security</option>
                </select>
              </div>

              {/* Year/Month Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Period</label>
                <YearMonthFilter
                  onFilterChange={(year, month) => {
                    setSelectedYear(year);
                    setSelectedMonth(month);
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t-2 border-white/50">
              <p className="text-sm text-gray-700 font-medium">
                Showing <span className="font-bold text-blue-600">{filteredRepairs.length}</span> of{' '}
                <span className="font-bold text-blue-600">{fixedRepairs.length}</span> fixed repairs
              </p>
            </div>
          </div>

          {/* Grouped Staff Repairs List */}
          {groupedStaffRepairs.length === 0 ? (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-wide">No Fixed Repairs</h3>
              <p className="text-gray-600 font-medium">No repairs have been marked as fixed yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedStaffRepairs.map((staffGroup) => (
                <div key={staffGroup.staffEmail} className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Staff Header - Clickable */}
                  <button
                    onClick={() => {
                      const newExpanded = expandedStaff === staffGroup.staffEmail ? null : staffGroup.staffEmail;
                      setExpandedStaff(newExpanded);
                      router.push(newExpanded ? `/repair-management-history?staff=${encodeURIComponent(staffGroup.staffEmail)}` : '/repair-management-history');
                    }}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/40 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md border-2 border-white">
                          <span className="text-xl font-bold text-white">{staffGroup.staffName.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{staffGroup.staffName}</h3>
                          <p className="text-sm text-gray-600 font-medium">{staffGroup.staffEmail} • {staffGroup.department}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{staffGroup.totalRepairs}</p>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Fixed Repairs</p>
                      </div>
                      <svg
                        className={`w-6 h-6 text-gray-600 transition-transform ${
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
                    <div className="border-t-4 border-white p-6 bg-white/20 space-y-4">
                      {staffGroup.repairs.map((repair) => (
                        <div key={repair.id} className="backdrop-blur-xl bg-white/50 border-2 border-white rounded-xl shadow-lg p-5">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {/* Left Side - Issue Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">{categoryIcons[repair.category]}</span>
                                <h4 className="text-base font-bold text-gray-900 uppercase tracking-wide">{repair.issueType}</h4>
                                <span className={`px-3 py-1 rounded-xl text-xs font-bold border-2 uppercase ${severityColors[repair.severity]}`}>
                                  {repair.severity}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700 space-y-2 ml-12">
                                <p>
                                  <span className="font-bold text-gray-800">Device ID:</span> <span className="font-medium">{repair.deviceId}</span>
                                </p>
                                {repair.originalIssue && (
                                  <p>
                                    <span className="font-bold text-gray-800">Issue:</span> <span className="font-medium">{repair.originalIssue}</span>
                                  </p>
                                )}
                                {repair.assignedTechnician && (
                                  <p>
                                    <span className="font-bold text-gray-800">Technician:</span> <span className="font-medium">{repair.assignedTechnician}</span>
                                  </p>
                                )}
                                {repair.technicianNotes && (
                                  <p>
                                    <span className="font-bold text-gray-800">Notes:</span> <span className="font-medium">{repair.technicianNotes}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Side - Status */}
                            <div className="text-right">
                              <div className="inline-flex items-center gap-3 px-4 py-3 bg-green-100 border-2 border-green-300 rounded-xl shadow-sm">
                                <span className="text-2xl">✅</span>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-green-800 uppercase tracking-wide">FIXED</p>
                                  <p className="text-xs text-green-700 font-medium mt-1">{formatDate(repair.fixedAt)}</p>
                                  {repair.fixedBy && <p className="text-xs text-green-700 font-medium">by {repair.fixedBy}</p>}
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
