'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime } from '@/lib/dateFormat';

interface AssignedRepair {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  issueType: string;
  description: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  status: 'assigned' | 'in_progress' | 'completed';
  assignedDate: Date;
  assignedBy: string;
  technicianNotes?: string;
  completedDate?: Date;
}

export default function TechnicianDashboardPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [repairs, setRepairs] = useState<AssignedRepair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<AssignedRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'in_progress'>('all');
  const [expandedRepair, setExpandedRepair] = useState<string | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<{ [key: string]: string }>({});
  const [isSavingNote, setIsSavingNote] = useState<string | null>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Check authentication and role
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if ((user as any)?.role !== 'technician') {
        // Redirect non-technicians
        if ((user as any)?.role === 'super_admin') {
          router.push('/dashboard');
        } else {
          router.push('/my-device');
        }
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Load expanded repair from URL (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const repairParam = params.get('repair');
      if (repairParam) {
        setExpandedRepair(repairParam);
      }
    }
  }, []);

  // Load assigned repairs from Firestore
  useEffect(() => {
    if (!user || (user as any).role !== 'technician') return;

    const q = query(
      collection(db, 'assigned_repairs'),
      where('technicianEmail', '==', user.email),
      orderBy('assignedDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repairsList: AssignedRepair[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // EXCLUDE completed repairs - they should only show in Repair History page
        if (data.status === 'completed') {
          return; // Skip this repair
        }

        repairsList.push({
          id: doc.id,
          deviceId: data.deviceId,
          staffName: data.staffName,
          staffEmail: data.staffEmail,
          department: data.department,
          issueType: data.issueType,
          description: data.description,
          severity: data.severity,
          status: data.status,
          assignedDate: data.assignedDate?.toDate(),
          assignedBy: data.assignedBy,
          technicianNotes: data.technicianNotes,
          completedDate: data.completedDate?.toDate()
        });
      });

      setRepairs(repairsList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter repairs by status, search, severity, and date range
  useEffect(() => {
    let filtered = [...repairs];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }

    // Filter by search term (device ID, staff name, issue type, description)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.deviceId.toLowerCase().includes(searchLower) ||
        r.staffName.toLowerCase().includes(searchLower) ||
        r.issueType.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(r => {
        const assignedDate = r.assignedDate;

        if (dateRangeFilter === 'today') {
          return assignedDate >= today;
        } else if (dateRangeFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return assignedDate >= weekAgo;
        } else if (dateRangeFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return assignedDate >= monthAgo;
        }
        return true;
      });
    }

    setFilteredRepairs(filtered);
  }, [statusFilter, severityFilter, searchTerm, dateRangeFilter, repairs]);

  // Update repair status
  const handleUpdateStatus = async (repairId: string, newStatus: 'assigned' | 'in_progress' | 'completed') => {
    try {
      const repairRef = doc(db, 'assigned_repairs', repairId);

      // Get the repair data to find deviceId and issueType
      const { getDoc } = await import('firebase/firestore');
      const repairDoc = await getDoc(repairRef);
      const repairData = repairDoc.data();

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (newStatus === 'completed') {
        updateData.completedDate = new Date();

        // ALSO mark the corresponding repair in the repairs collection as fixed
        // This makes it show as FIXED in the super admin's repair management page
        if (repairData) {
          const { setDoc } = await import('firebase/firestore');
          const fixedRepairId = `${repairData.deviceId}-${repairData.staffEmail}-${repairData.issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const fixedRepairRef = doc(db, 'repairs', fixedRepairId);

          await setDoc(fixedRepairRef, {
            deviceId: repairData.deviceId,
            staffName: repairData.staffName,
            staffEmail: repairData.staffEmail,
            department: repairData.department,
            issueType: repairData.issueType,
            category: 'hardware', // Default category
            severity: repairData.severity,
            status: 'fixed',
            fixedAt: new Date(),
            fixedBy: `Technician: ${user?.displayName || user?.email}`,
            originalIssue: repairData.description
          });
        }
      }

      await updateDoc(repairRef, updateData);
      alert(`✅ Status updated to "${newStatus.replace('_', ' ')}"${newStatus === 'completed' ? ' - Super admin will see this as FIXED!' : ''}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Failed to update status. Please try again.');
    }
  };

  // Save technician notes
  const handleSaveNotes = async (repairId: string) => {
    const notes = technicianNotes[repairId] || '';
    if (!notes.trim()) {
      alert('⚠️ Please enter some notes before saving.');
      return;
    }

    setIsSavingNote(repairId);
    try {
      const repairRef = doc(db, 'assigned_repairs', repairId);
      await updateDoc(repairRef, {
        technicianNotes: notes.trim(),
        updatedAt: new Date()
      });

      alert('✅ Notes saved successfully!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('❌ Failed to save notes. Please try again.');
    } finally {
      setIsSavingNote(null);
    }
  };

  // Initialize notes when repair is expanded
  const handleToggleExpand = (repairId: string, existingNotes?: string) => {
    const newExpanded = expandedRepair === repairId ? null : repairId;
    setExpandedRepair(newExpanded);
    router.push(newExpanded ? `/technician-dashboard?repair=${encodeURIComponent(repairId)}` : '/technician-dashboard');

    if (newExpanded && existingNotes && !technicianNotes[repairId]) {
      setTechnicianNotes(prev => ({ ...prev, [repairId]: existingNotes }));
    }
  };

  // Calculate stats (completed repairs are excluded from dashboard)
  const assignedCount = repairs.filter(r => r.status === 'assigned').length;
  const inProgressCount = repairs.filter(r => r.status === 'in_progress').length;

  // Print individual repair ticket
  const _printRepairTicket = (repair: AssignedRepair) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Repair Ticket - ${repair.issueType}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            font-weight: bold;
          }
          .status-assigned { background: #FEF3C7; color: #92400E; }
          .status-in_progress { background: #DBEAFE; color: #1E40AF; }
          .status-completed { background: #D1FAE5; color: #065F46; }
          .severity-urgent { background: #FEE2E2; color: #991B1B; }
          .severity-high { background: #FEF3C7; color: #92400E; }
          .severity-medium { background: #DBEAFE; color: #1E40AF; }
          .severity-low { background: #F3F4F6; color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REPAIR TICKET</h1>
          <p>Technician: ${user?.displayName || user?.email}</p>
        </div>

        <div class="section">
          <p><span class="label">Issue Type:</span> ${repair.issueType}</p>
          <p><span class="label">Status:</span> <span class="status status-${repair.status}">${repair.status.replace('_', ' ').toUpperCase()}</span></p>
          <p><span class="label">Severity:</span> <span class="status severity-${repair.severity}">${repair.severity.toUpperCase()}</span></p>
        </div>

        <div class="section">
          <h3>Staff Information</h3>
          <p><span class="label">Name:</span> ${repair.staffName}</p>
          <p><span class="label">Email:</span> ${repair.staffEmail}</p>
          <p><span class="label">Department:</span> ${repair.department}</p>
          <p><span class="label">Device ID:</span> ${repair.deviceId}</p>
        </div>

        <div class="section">
          <h3>Issue Description</h3>
          <p>${repair.description}</p>
        </div>

        ${repair.technicianNotes ? `
          <div class="section">
            <h3>Technician Notes</h3>
            <p>${repair.technicianNotes}</p>
          </div>
        ` : ''}

        <div class="section">
          <p><span class="label">Assigned Date:</span> ${formatDateTime(repair.assignedDate)}</p>
          ${repair.completedDate ? `<p><span class="label">Completed Date:</span> ${formatDateTime(repair.completedDate)}</p>` : ''}
        </div>

        <div style="margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString('en-MY')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const severityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    medium: 'bg-blue-100 text-blue-700 border-blue-300',
    low: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  const statusColors = {
    assigned: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  if (loading || !user || (user as any).role !== 'technician') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen relative overflow-hidden py-8 px-4 sm:px-6 lg:px-8" style={{
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

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">TECHNICIAN · DASHBOARD</h1>
                <p className="mt-3 text-sm text-gray-600 font-normal">
                  Welcome back, <span className="font-semibold">{user.displayName || user.email}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{repairs.length}</div>
                <div className="text-sm text-gray-500">Total Repairs</div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setStatusFilter('assigned')}
              className={`backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6 transition-all duration-200 hover:shadow-lg text-left ${
                statusFilter === 'assigned' ? 'ring-4 ring-orange-300' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Assignments</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{assignedCount}</p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6 transition-all duration-200 hover:shadow-lg text-left ${
                statusFilter === 'in_progress' ? 'ring-4 ring-blue-300' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
                </div>
                <div className="text-4xl">⚙️</div>
              </div>
            </button>
          </div>

          {/* Search & Advanced Filters */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">🔍 Search & Filter</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Device ID, staff name, issue..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟡 High</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Active Filters Info */}
            {(searchTerm || severityFilter !== 'all' || dateRangeFilter !== 'all') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600">Active filters:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    Search: &quot;{searchTerm}&quot;
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {severityFilter !== 'all' && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                    Severity: {severityFilter}
                    <button onClick={() => setSeverityFilter('all')} className="ml-1 hover:text-yellow-900">×</button>
                  </span>
                )}
                {dateRangeFilter !== 'all' && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Date: {dateRangeFilter}
                    <button onClick={() => setDateRangeFilter('all')} className="ml-1 hover:text-green-900">×</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSeverityFilter('all');
                    setDateRangeFilter('all');
                  }}
                  className="px-2 py-1 rounded text-xs
                    md:bg-red-100 md:text-red-700 md:hover:bg-red-200
                    bg-red-600 text-white"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Filter Info */}
          {statusFilter !== 'all' && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Showing {filteredRepairs.length} {statusFilter.replace('_', ' ')} repair(s)
              </p>
              <button
                onClick={() => setStatusFilter('all')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Repairs List */}
          {isLoading ? (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading repairs...</p>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">
                {statusFilter === 'all' ? '📭' : '🔍'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No Active Repairs' : `No ${statusFilter.replace('_', ' ')} repairs`}
              </h2>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'You have no active repair assignments. Completed repairs are in "Repair History".'
                  : `You have no repairs with status "${statusFilter.replace('_', ' ')}".`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepairs.map((repair) => (
                <div
                  key={repair.id}
                  className={`backdrop-blur-2xl bg-white/30 rounded-lg shadow border-2 ${severityColors[repair.severity]} transition-all duration-200 hover:shadow-lg`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => handleToggleExpand(repair.id, repair.technicianNotes)}
                    className="w-full p-4 flex items-center justify-between text-left hover:opacity-80"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{repair.issueType}</h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${statusColors[repair.status]}`}>
                          {repair.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 text-xs font-bold rounded uppercase bg-red-600 text-white">
                          {repair.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Staff:</strong> {repair.staffName} ({repair.department})
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Assigned: {formatDateTime(repair.assignedDate)}
                      </p>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-600 transition-transform ${
                        expandedRepair === repair.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Details */}
                  {expandedRepair === repair.id && (
                    <div className="px-4 pb-4 border-t-2 pt-4 space-y-4">
                      {/* Issue Details */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-gray-900 mb-2">📋 Issue Description:</h4>
                        <p className="text-sm text-gray-700">{repair.description}</p>
                      </div>

                      {/* Device Info */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-semibold text-gray-900 mb-2">💻 Device Information:</h4>
                        <div className="text-sm space-y-1">
                          <p className="text-gray-700"><strong>Staff:</strong> {repair.staffName}</p>
                          <p className="text-gray-700"><strong>Email:</strong> {repair.staffEmail}</p>
                          <p className="text-gray-700"><strong>Department:</strong> {repair.department}</p>
                          <p className="text-gray-700"><strong>Device ID:</strong> <span className="font-mono">{repair.deviceId}</span></p>
                        </div>
                      </div>

                      {/* Technician Notes */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          📝 Your Notes:
                        </label>
                        <textarea
                          value={technicianNotes[repair.id] || ''}
                          onChange={(e) => setTechnicianNotes(prev => ({ ...prev, [repair.id]: e.target.value }))}
                          placeholder="Add your notes, findings, or updates here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleSaveNotes(repair.id)}
                            disabled={isSavingNote === repair.id}
                            className={`${
                              technicianNotes[repair.id]?.trim() && technicianNotes[repair.id] !== repair.technicianNotes
                                ? 'border-4 md:bg-green-100 md:border-green-300 md:hover:bg-green-200 md:hover:border-green-400 md:text-green-700 md:hover:text-green-800 bg-green-600 border-green-700 text-white'
                                : 'bg-gray-400 cursor-not-allowed text-white border-4 border-gray-400'
                            } px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
                          >
                            {isSavingNote === repair.id ? '💾 Saving...' : '✅ Save Notes'}
                          </button>
                        </div>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex gap-3 pt-4 border-t">
                        {repair.status === 'assigned' && (
                          <button
                            onClick={() => handleUpdateStatus(repair.id, 'in_progress')}
                            className="flex-1 border-4
                              md:bg-blue-100 md:border-blue-300 md:hover:bg-blue-200 md:hover:border-blue-400 md:text-blue-700 md:hover:text-blue-800
                              bg-blue-600 border-blue-700 text-white
                              px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            ⚙️ Start Working
                          </button>
                        )}
                        {repair.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(repair.id, 'completed')}
                            className="flex-1 border-4
                              md:bg-green-100 md:border-green-300 md:hover:bg-green-200 md:hover:border-green-400 md:text-green-700 md:hover:text-green-800
                              bg-green-600 border-green-700 text-white
                              px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            ✅ Mark Completed
                          </button>
                        )}
                        {repair.status === 'completed' && (
                          <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
                            <p className="text-sm text-green-700 font-medium">
                              ✅ Completed on {repair.completedDate ? formatDate(repair.completedDate) : 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
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
