'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import YearMonthFilter from '@/components/YearMonthFilter';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateTime } from '@/lib/dateFormat';

interface CompletedRepair {
  id: string;
  deviceId: string;
  staffName: string;
  department: string;
  issueType: string;
  description: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  completedDate: Date;
  assignedDate: Date;
  technicianNotes?: string;
}

export default function RepairHistoryPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [completedRepairs, setCompletedRepairs] = useState<CompletedRepair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<CompletedRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Check authentication
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || (user as any)?.role !== 'technician') {
        router.push('/');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Load completed repairs with REAL-TIME updates
  useEffect(() => {
    if (!user || (user as any).role !== 'technician') return;

    setIsLoading(true);

    // Use onSnapshot for real-time updates (no orderBy to avoid index requirement)
    const q = query(
      collection(db, 'assigned_repairs'),
      where('technicianEmail', '==', user.email),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repairs: CompletedRepair[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        repairs.push({
          id: doc.id,
          deviceId: data.deviceId,
          staffName: data.staffName,
          department: data.department,
          issueType: data.issueType,
          description: data.description,
          severity: data.severity,
          completedDate: data.completedDate?.toDate(),
          assignedDate: data.assignedDate?.toDate(),
          technicianNotes: data.technicianNotes
        });
      });

      // Sort by completedDate in JavaScript (newest first)
      repairs.sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());

      setCompletedRepairs(repairs);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading completed repairs:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter by year/month
  useEffect(() => {
    if (selectedYear === 'all') {
      setFilteredRepairs(completedRepairs);
      return;
    }

    const filtered = completedRepairs.filter(repair => {
      const completedDate = repair.completedDate;
      const completedYear = completedDate.getFullYear().toString();
      const completedMonth = completedDate.getMonth().toString();

      if (completedYear !== selectedYear) return false;
      if (selectedMonth === 'all') return true;
      return completedMonth === selectedMonth;
    });

    setFilteredRepairs(filtered);
  }, [completedRepairs, selectedYear, selectedMonth]);

  const handleFilterChange = (year: string, month: string) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Calculate stats from filtered repairs
  const thisWeekCount = filteredRepairs.filter(r => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return r.completedDate >= weekAgo;
  }).length;

  const thisMonthCount = filteredRepairs.filter(r => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return r.completedDate >= monthAgo;
  }).length;

  const avgCompletionTime = filteredRepairs.length > 0
    ? filteredRepairs.reduce((acc, r) => {
        const timeDiff = r.completedDate.getTime() - r.assignedDate.getTime();
        const hours = timeDiff / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / filteredRepairs.length
    : 0;

  // Generate Professional PDF Report for Repair History (TABLE FORMAT)
  const generateReport = async () => {
    try {
      // Import jsPDF library
      const jsPDFModule: any = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const { pdfService } = await import('../../services/pdfService');

      const doc = new jsPDF('p', 'mm', 'a4');
      const technicianName = user?.displayName || user?.email || 'Unknown';
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      // Brand Colors
      const primaryColor: [number, number, number] = [25, 118, 210]; // Blue
      const secondaryColor: [number, number, number] = [100, 100, 100]; // Gray
      const lightGray: [number, number, number] = [245, 245, 245];
      const borderColor: [number, number, number] = [200, 200, 200];

      // ===== HEADER =====
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text('REPAIR HISTORY REPORT', pageWidth / 2, yPos, { align: 'center' });

      yPos += 12;
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont(undefined, 'normal');
      doc.text(`Technician: ${technicianName}`, 20, yPos);

      yPos += 5;
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-GB')}`, 20, yPos);

      yPos += 5;
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
      doc.text(`Period: ${periodText}`, 20, yPos);

      yPos += 12;

      // ===== STATISTICS BOXES =====
      const boxWidth = (pageWidth - 50) / 4;
      const boxHeight = 25;
      const boxStartY = yPos;

      const stats = [
        { label: 'Total Completed', value: filteredRepairs.length.toString(), color: [16, 185, 129] as [number, number, number] },
        { label: 'This Week', value: thisWeekCount.toString(), color: [59, 130, 246] as [number, number, number] },
        { label: 'This Month', value: thisMonthCount.toString(), color: [139, 92, 246] as [number, number, number] },
        { label: 'Avg. Time', value: avgCompletionTime.toFixed(1) + 'h', color: [245, 158, 11] as [number, number, number] }
      ];

      stats.forEach((stat, index) => {
        const boxX = 20 + (index * (boxWidth + 3));

        // Box background
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(boxX, boxStartY, boxWidth, boxHeight, 'F');

        // Box border
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxStartY, boxWidth, boxHeight);

        // Label
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(stat.label, boxX + boxWidth / 2, boxStartY + 8, { align: 'center' });

        // Value
        doc.setFontSize(16);
        doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.setFont(undefined, 'bold');
        doc.text(stat.value, boxX + boxWidth / 2, boxStartY + 18, { align: 'center' });
      });

      yPos = boxStartY + boxHeight + 15;

      // ===== COMPLETED REPAIRS TABLE =====
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text(`Completed Repairs (${filteredRepairs.length})`, 20, yPos);

      yPos += 12;

      if (filteredRepairs.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(211, 47, 47);
        doc.setFont(undefined, 'normal');
        doc.text('No completed repairs found in this time range.', pageWidth / 2, yPos + 20, { align: 'center' });
      } else {
        // Prepare table data (WITHOUT severity, device ID, duration)
        const tableData = filteredRepairs.map(repair => {
          return {
            staff: `${repair.staffName} (${repair.department})`,
            issueType: repair.issueType,
            description: repair.description,
            notes: repair.technicianNotes || '',
            assigned: formatDateTime(repair.assignedDate),
            completed: formatDateTime(repair.completedDate)
          };
        });

        // Define columns (WITHOUT severity, device ID, duration) - Staff first, then Issue Type
        const columns = [
          { key: 'staff', header: 'Staff (Dept)', width: 1.5 },
          { key: 'issueType', header: 'Issue Type', width: 1.5 },
          { key: 'description', header: 'Issue Description', width: 2.5 },
          { key: 'notes', header: 'Notes', width: 1.5 },
          { key: 'assigned', header: 'Assigned', width: 1.5 },
          { key: 'completed', header: 'Completed', width: 1.5 }
        ];

        // Use PDF service to add professional table
        pdfService.addProfessionalTable(doc, tableData, columns, yPos);
      }


      // Save PDF
      const filename = `Repair_History_${technicianName.replace(/\s+/g, '_')}_${periodText.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
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
      <style jsx global>{`
        @media print {
          /* Hide navigation and buttons when printing */
          nav, button, .no-print {
            display: none !important;
          }

          /* Clean background for printing */
          body {
            background: white !important;
          }

          /* Remove blur effects */
          .backdrop-blur-2xl {
            backdrop-filter: none !important;
            background: white !important;
          }

          /* Better page breaks */
          .space-y-4 > div {
            page-break-inside: avoid;
          }

          /* Add header to each page */
          @page {
            margin: 2cm;
          }

          /* Show repair history title on print */
          .print-title {
            display: block !important;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
        }

        .print-title {
          display: none;
        }
      `}</style>
      <Navigation />
      <div className="min-h-screen relative overflow-hidden py-8 px-4 sm:px-6 lg:px-8" style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f4ff 50%, #e8eeff 100%)',
      }}>
        {/* Background bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full">
            <div className="w-full h-full bg-gradient-to-br from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full">
            <div className="w-full h-full bg-gradient-to-tl from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">REPAIR · HISTORY</h1>
                <p className="mt-3 text-sm text-gray-600 font-normal">
                  Your completed repairs and performance stats
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateReport}
                  disabled={filteredRepairs.length === 0}
                  className="px-4 py-2 border-4 font-medium rounded-lg transition-colors flex items-center gap-2 md:bg-purple-100 md:border-purple-300 md:hover:bg-purple-200 md:hover:border-purple-400 md:text-purple-700 md:hover:text-purple-800 bg-purple-600 border-purple-700 text-white disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  GENERATE REPORT
                </button>
              </div>
            </div>
          </div>

          {/* Year/Month Filter */}
          <YearMonthFilter onFilterChange={handleFilterChange} />

          {/* Performance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{filteredRepairs.length}</p>
            </div>
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{thisWeekCount}</p>
            </div>
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{thisMonthCount}</p>
            </div>
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Avg. Time</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{avgCompletionTime.toFixed(1)}h</p>
            </div>
          </div>

          {/* Completed Repairs List */}
          {isLoading ? (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Completed Repairs</h2>
              <p className="text-gray-600">You haven&apos;t completed any repairs in this time range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepairs.map((repair) => (
                <div key={repair.id} className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{repair.issueType}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Staff:</strong> {repair.staffName} ({repair.department})
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Device:</strong> {repair.deviceId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        repair.severity === 'urgent' ? 'bg-red-100 text-red-700' :
                        repair.severity === 'high' ? 'bg-yellow-100 text-yellow-700' :
                        repair.severity === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {repair.severity.toUpperCase()}
                      </span>
                      <p className="text-sm text-green-600 font-semibold mt-2">✅ COMPLETED</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700"><strong>Issue:</strong> {repair.description}</p>
                  </div>

                  {repair.technicianNotes && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-gray-800 mb-1">📝 Your Notes:</p>
                      <p className="text-sm text-gray-700">{repair.technicianNotes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                    <span>Assigned: {formatDateTime(repair.assignedDate)}</span>
                    <span>Completed: {formatDateTime(repair.completedDate)}</span>
                    <span className="font-semibold text-green-600">
                      Time: {((repair.completedDate.getTime() - repair.assignedDate.getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
