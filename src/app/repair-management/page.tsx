'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/components/Navigation';

interface RepairIssue {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  category: 'hardware' | 'software' | 'security';
  type: string;
  problem: string;
  symptoms: string[];
  impact: string;
  detectedDate: Date;
  fix: {
    title: string;
    steps: string[];
    partsNeeded: string[];
    estimatedTime: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  status: 'detected' | 'in_progress' | 'fixed';
}

export default function RepairManagementPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [issues, setIssues] = useState<RepairIssue[]>([]);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'medium'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [_showNotifyModal, _setShowNotifyModal] = useState(false);
  const [_selectedStaff, _setSelectedStaff] = useState<string[]>([]);
  const [_notificationMessage, _setNotificationMessage] = useState('');
  const [_isSendingNotification, _setIsSendingNotification] = useState(false);

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      // Only start the timer if we're actually navigating to this page
      if (isNavigating) {
        console.log('Repair Management Page - Starting navigation loading timer');

        // Enhanced device detection for better timing
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);
        const isDesktop = !isPhone && !isTablet;

        // Loading times for repair management
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

        console.log('Repair Management Page - Device type and loading time:', { isPhone, isTablet, isLaptop, isDesktop, loadingTime });

        const readyTimer = setTimeout(() => {
          console.log('Repair Management Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime);

        return () => {
          console.log('Repair Management Page - Clearing ready timer');
          clearTimeout(readyTimer);
        };
      } else {
        console.log('Repair Management Page - Direct access, loading immediately');
        // If not navigating (direct page access), load immediately
        setComponentsReady(true);
        setPageLoaded();
      }
    } else if (!loading && (!isAuthenticated || !isAdmin)) {
      // Handle non-admin or non-authenticated users
      if (!isAuthenticated) {
        router.push('/');
      } else if (!isAdmin) {
        router.push('/my-device');
      }
    }
  }, [loading, isAuthenticated, isAdmin, isNavigating, setPageLoaded, router]);

  // Finish navigation when page is fully loaded and components are ready
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      console.log('Repair Management Page - All conditions met, starting finish timer');
      const finishTimer = setTimeout(() => {
        console.log('Repair Management Page - Finishing navigation and hiding loading screen');
        finishNavigation();
        setShowLoadingScreen(false);
      }, 1000);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  useEffect(() => {
    if (!isAdmin) return;

    // Listen to device scans and analyze for issues
    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const detectedIssues: RepairIssue[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Analyze scan data and create issues
        const scanIssues = analyzeDeviceForIssues(data);
        detectedIssues.push(...scanIssues);
      });

      setIssues(detectedIssues);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Analyze device scan data for issues
  const analyzeDeviceForIssues = (scanData: any): RepairIssue[] => {
    const issues: RepairIssue[] = [];

    // RAM Critical
    if (scanData.ramUsage > 90) {
      issues.push({
        id: `${scanData.deviceId}-ram`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'urgent',
        category: 'hardware',
        type: 'RAM Critical / Memory Failure',
        problem: 'RAM usage critically high with possible memory errors',
        symptoms: [`RAM Usage: ${scanData.ramUsage}%`, 'System crashes', 'Slow performance'],
        impact: 'Computer may crash and lose data',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Upgrade or replace RAM',
          steps: [
            'Check which RAM slots are in use',
            'Identify RAM type (DDR3/DDR4)',
            'Purchase compatible RAM stick',
            'Install new RAM',
            'Run memory test to verify'
          ],
          partsNeeded: ['8GB or 16GB RAM stick (DDR4)'],
          estimatedTime: '30 minutes',
          difficulty: 'easy'
        },
        status: 'detected'
      });
    }

    // Disk Space Low
    if (scanData.diskSpaceFree < 20) {
      issues.push({
        id: `${scanData.deviceId}-disk`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.diskSpaceFree < 10 ? 'urgent' : 'high',
        category: 'hardware',
        type: 'Low Disk Space',
        problem: 'Hard disk space critically low',
        symptoms: [`Free Space: ${scanData.diskSpaceFree} GB`, 'Cannot save files', 'System slow'],
        impact: 'Cannot save work, computer may freeze',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Clean disk or upgrade storage',
          steps: [
            'Run Disk Cleanup tool',
            'Delete temporary files',
            'Move old files to network drive',
            'If still full, upgrade to larger SSD',
            'Reinstall Windows if needed'
          ],
          partsNeeded: ['512GB SSD (if upgrading)'],
          estimatedTime: '1-2 hours',
          difficulty: 'medium'
        },
        status: 'detected'
      });
    }

    // CPU Overheating
    if (scanData.cpuTemp && scanData.cpuTemp > 85) {
      issues.push({
        id: `${scanData.deviceId}-cpu`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.cpuTemp > 90 ? 'urgent' : 'high',
        category: 'hardware',
        type: 'CPU Overheating',
        problem: 'CPU temperature dangerously high',
        symptoms: [`CPU Temp: ${scanData.cpuTemp}°C`, 'Fan loud', 'Sudden shutdowns'],
        impact: 'CPU damage risk, unexpected shutdowns',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Clean cooling system',
          steps: [
            'Shutdown computer',
            'Clean fans with compressed air',
            'Remove dust from heatsink',
            'Replace thermal paste',
            'Check fan is spinning',
            'Use in air-conditioned room'
          ],
          partsNeeded: ['Thermal paste', 'Compressed air', 'Cooling pad (optional)'],
          estimatedTime: '1 hour',
          difficulty: 'medium'
        },
        status: 'detected'
      });
    }

    // Battery Degraded
    if (scanData.batteryHealth && scanData.batteryHealth < 50) {
      issues.push({
        id: `${scanData.deviceId}-battery`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.batteryHealth < 30 ? 'high' : 'medium',
        category: 'hardware',
        type: 'Battery Degraded',
        problem: 'Laptop battery health critically low',
        symptoms: [`Battery Health: ${scanData.batteryHealth}%`, 'Short battery life', 'Cannot unplug'],
        impact: 'Cannot use laptop without power cord',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Replace laptop battery',
          steps: [
            'Identify laptop model',
            'Order compatible battery',
            'Shutdown laptop',
            'Remove old battery',
            'Install new battery',
            'Calibrate battery'
          ],
          partsNeeded: ['Compatible laptop battery'],
          estimatedTime: '30 minutes',
          difficulty: 'easy'
        },
        status: 'detected'
      });
    }

    // Antivirus Disabled
    if (scanData.antivirusStatus !== 'Active') {
      issues.push({
        id: `${scanData.deviceId}-antivirus`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'urgent',
        category: 'security',
        type: 'Antivirus Disabled',
        problem: 'Antivirus protection not running',
        symptoms: ['Antivirus inactive', 'No malware protection', 'Security risk'],
        impact: 'Computer vulnerable to viruses and malware',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Enable and update antivirus',
          steps: [
            'Open Windows Security',
            'Enable Real-time protection',
            'Update virus definitions',
            'Run full system scan',
            'Schedule automatic scans'
          ],
          partsNeeded: [],
          estimatedTime: '15 minutes',
          difficulty: 'easy'
        },
        status: 'detected'
      });
    }

    // Firewall Disabled
    if (scanData.firewallStatus !== 'Active') {
      issues.push({
        id: `${scanData.deviceId}-firewall`,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'high',
        category: 'security',
        type: 'Firewall Disabled',
        problem: 'Windows Firewall is turned off',
        symptoms: ['Firewall inactive', 'Network vulnerable', 'Security risk'],
        impact: 'Computer vulnerable to network attacks',
        detectedDate: scanData.scanTimestamp?.toDate() || new Date(),
        fix: {
          title: 'Enable Windows Firewall',
          steps: [
            'Open Windows Security',
            'Go to Firewall & network protection',
            'Enable firewall for all networks',
            'Verify firewall is active'
          ],
          partsNeeded: [],
          estimatedTime: '5 minutes',
          difficulty: 'easy'
        },
        status: 'detected'
      });
    }

    return issues;
  };

  // Group issues by severity
  const urgentIssues = issues.filter(i => i.severity === 'urgent');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');

  // Apply filter and search
  const getFilteredIssues = () => {
    let filtered: RepairIssue[] = [];

    // First apply severity filter
    if (filter === 'all') {
      filtered = issues;
    } else if (filter === 'urgent') {
      filtered = urgentIssues;
    } else if (filter === 'high') {
      filtered = highIssues;
    } else if (filter === 'medium') {
      filtered = mediumIssues;
    }

    // Then apply search filter
    if (searchTerm === '') {
      return filtered;
    }

    return filtered.filter((issue) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        issue.staffName.toLowerCase().includes(searchLower) ||
        issue.department.toLowerCase().includes(searchLower) ||
        issue.type.toLowerCase().includes(searchLower) ||
        issue.problem.toLowerCase().includes(searchLower) ||
        issue.category.toLowerCase().includes(searchLower)
      );
    });
  };

  const filteredIssues = getFilteredIssues();

  const toggleIssue = (issueId: string) => {
    setExpandedIssue(expandedIssue === issueId ? null : issueId);
  };

  // Get unique staff list with issues
  const getStaffWithIssues = () => {
    const staffMap = new Map<string, { name: string; email: string; issueCount: number; severity: string }>();

    filteredIssues.forEach(issue => {
      const key = issue.staffEmail;
      if (staffMap.has(key)) {
        const existing = staffMap.get(key)!;
        existing.issueCount += 1;
        // Update to highest severity
        if (issue.severity === 'urgent') existing.severity = 'urgent';
        else if (issue.severity === 'high' && existing.severity !== 'urgent') existing.severity = 'high';
      } else {
        staffMap.set(key, {
          name: issue.staffName,
          email: issue.staffEmail,
          issueCount: 1,
          severity: issue.severity
        });
      }
    });

    return Array.from(staffMap.values());
  };

  const _handleNotifyStaff = () => {
    _setShowNotifyModal(true);
    // Pre-select all staff with urgent issues
    const urgentStaff = getStaffWithIssues().filter(s => s.severity === 'urgent').map(s => s.email);
    _setSelectedStaff(urgentStaff);
    // Default message
    _setNotificationMessage(
      `Dear Staff Member,\n\nWe've detected repair issues with your device that require attention. Please review the issues in the Device Management System and take necessary action.\n\nYour device health is important to us. Contact IT Support if you need assistance.\n\nBest regards,\nIT Support Team`
    );
  };

  const _toggleStaffSelection = (email: string) => {
    _setSelectedStaff(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const _handleSendNotifications = async () => {
    if (_selectedStaff.length === 0) {
      alert('Please select at least one staff member to notify.');
      return;
    }

    if (!_notificationMessage.trim()) {
      alert('Please enter a notification message.');
      return;
    }

    _setIsSendingNotification(true);

    try {
      // Save notifications to Firebase
      const { addDoc, collection } = await import('firebase/firestore');
      const notificationPromises = _selectedStaff.map(email => {
        const staff = getStaffWithIssues().find(s => s.email === email);
        return addDoc(collection(db, 'notifications'), {
          recipientEmail: email,
          recipientName: staff?.name || 'Unknown',
          message: _notificationMessage,
          sentBy: 'Admin',
          sentDate: new Date(),
          type: 'repair_alert',
          read: false,
        });
      });

      await Promise.all(notificationPromises);

      alert(`Successfully sent notifications to ${_selectedStaff.length} staff member(s)!`);
      _setShowNotifyModal(false);
      _setSelectedStaff([]);
      _setNotificationMessage('');
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Failed to send notifications. Please try again.');
    } finally {
      _setIsSendingNotification(false);
    }
  };

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

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Banner Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔧 Repair Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Click on any stat card to filter issues by severity. Expand cards for detailed repair instructions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                <span>📊</span>
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards - Now Clickable! */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`bg-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left ${
              filter === 'all' ? 'ring-4 ring-blue-300 shadow-xl' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{issues.length}</p>
                {filter === 'all' && (
                  <p className="text-xs text-blue-600 font-semibold mt-1">✓ Active Filter</p>
                )}
              </div>
              <div className="text-4xl">🔧</div>
            </div>
          </button>

          <button
            onClick={() => setFilter('urgent')}
            className={`bg-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left ${
              filter === 'urgent' ? 'ring-4 ring-red-300 shadow-xl' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{urgentIssues.length}</p>
                {filter === 'urgent' && (
                  <p className="text-xs text-red-600 font-semibold mt-1">✓ Active Filter</p>
                )}
              </div>
              <div className="text-4xl">🔴</div>
            </div>
          </button>

          <button
            onClick={() => setFilter('high')}
            className={`bg-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left ${
              filter === 'high' ? 'ring-4 ring-yellow-300 shadow-xl' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{highIssues.length}</p>
                {filter === 'high' && (
                  <p className="text-xs text-yellow-600 font-semibold mt-1">✓ Active Filter</p>
                )}
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </button>

          <button
            onClick={() => setFilter('medium')}
            className={`bg-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left ${
              filter === 'medium' ? 'ring-4 ring-blue-300 shadow-xl' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Medium</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{mediumIssues.length}</p>
                {filter === 'medium' && (
                  <p className="text-xs text-blue-600 font-semibold mt-1">✓ Active Filter</p>
                )}
              </div>
              <div className="text-4xl">💾</div>
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by staff name, department, issue type, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <span>✕</span>
                Clear Search
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Found <span className="font-semibold text-blue-600">{filteredIssues.length}</span> issue(s) matching &quot;{searchTerm}&quot;
            </p>
          )}
        </div>

        {/* Filtered Issues */}
        {filteredIssues.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {filter === 'all' && '🔧 All Issues'}
                {filter === 'urgent' && '🔴 Urgent Issues'}
                {filter === 'high' && '⚠️ High Priority Issues'}
                {filter === 'medium' && '💾 Medium Priority Issues'}
                <span className="ml-2 text-sm text-gray-600">
                  ({filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'})
                </span>
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="space-y-3">
              {filteredIssues.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  isExpanded={expandedIssue === issue.id}
                  onToggle={() => toggleIssue(issue.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* No Issues or No Search Results */}
        {filteredIssues.length === 0 && issues.length > 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Results Found</h2>
            <p className="text-gray-600">
              {searchTerm
                ? `No issues match your search "${searchTerm}". Try different keywords.`
                : 'No issues match the selected filter.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* No Issues at All */}
        {issues.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h2>
            <p className="text-gray-600">No repair issues detected from device scans.</p>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

// Issue Card Component
function IssueCard({ issue, isExpanded, onToggle }: {
  issue: RepairIssue;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityColors = {
    urgent: 'bg-red-50 border-red-200 hover:bg-red-100',
    high: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    medium: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    low: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
  };

  const severityBadgeColors = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-yellow-500 text-white',
    medium: 'bg-blue-500 text-white',
    low: 'bg-gray-500 text-white',
  };

  const categoryIcons = {
    hardware: '🔧',
    software: '💻',
    security: '🔒',
  };

  return (
    <div className={`border-2 rounded-lg transition-all duration-200 hover:shadow-lg ${severityColors[issue.severity]} ${isExpanded ? 'shadow-xl' : ''}`}>
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{categoryIcons[issue.category]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                {issue.staffName} ({issue.department})
              </h3>
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${severityBadgeColors[issue.severity]}`}>
                {issue.severity}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800">{issue.type}</p>
            <p className="text-sm text-gray-600 mt-1">{issue.problem}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>⏱️ {issue.fix.estimatedTime}</span>
              <span>🔨 {issue.fix.difficulty}</span>
              <span>📅 {issue.detectedDate.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t-2 pt-4 space-y-4">
          {/* Problem Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">📋 Problem Details:</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {issue.symptoms.map((symptom, idx) => (
                <li key={idx}>{symptom}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Impact:</strong> {issue.impact}
            </p>
          </div>

          {/* Fix Instructions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">🔧 How to Fix:</h4>
            <p className="text-sm font-medium text-gray-800 mb-2">{issue.fix.title}</p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              {issue.fix.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Parts & Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">⏱️ Time:</p>
              <p className="text-gray-600">{issue.fix.estimatedTime}</p>
            </div>
            {issue.fix.partsNeeded.length > 0 && (
              <div>
                <p className="font-medium text-gray-700">📦 Parts Needed:</p>
                <p className="text-gray-600">{issue.fix.partsNeeded.join(', ')}</p>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-700">🔨 Difficulty:</p>
              <p className="text-gray-600 capitalize">{issue.fix.difficulty}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="pt-3 border-t">
            <h4 className="font-semibold text-gray-900 mb-2">👤 Staff Contact:</h4>
            <div className="text-sm space-y-1">
              <p className="text-gray-700">
                <strong>Name:</strong> {issue.staffName}
              </p>
              <p className="text-gray-700">
                <strong>Email:</strong> {issue.staffEmail}
              </p>
              <p className="text-gray-700">
                <strong>Department:</strong> {issue.department}
              </p>
              <p className="text-gray-700">
                <strong>Device ID:</strong> <span className="font-mono">{issue.deviceId}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Marked as fixed!');
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>✅</span>
              Mark as Fixed
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Assign technician');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>👨‍🔧</span>
              Assign Technician
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Contact staff: ' + issue.staffEmail);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>📧</span>
              Email Staff
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Print repair guide');
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>🖨️</span>
              Print Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
