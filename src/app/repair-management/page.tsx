'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { staffService, StaffMember } from '@/lib/staffService';
import Navigation from '@/components/Navigation';
import YearMonthFilter from '@/components/YearMonthFilter';
import Pagination from '@/components/Pagination';

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

interface GroupedDeviceIssues {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  issues: RepairIssue[];
  highestSeverity: 'urgent' | 'high' | 'medium' | 'low';
  detectedDate: Date;
}

export default function RepairManagementPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [groupedIssues, setGroupedIssues] = useState<GroupedDeviceIssues[]>([]);
  const [filteredGroupedIssues, setFilteredGroupedIssues] = useState<GroupedDeviceIssues[]>([]);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'medium'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [_showNotifyModal, _setShowNotifyModal] = useState(false);
  const [_selectedStaff, _setSelectedStaff] = useState<string[]>([]);
  const [_notificationMessage, _setNotificationMessage] = useState('');
  const [_isSendingNotification, _setIsSendingNotification] = useState(false);

  // Assign Technician states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIssueForAssign, setSelectedIssueForAssign] = useState<{ group: GroupedDeviceIssues; issue: RepairIssue } | null>(null);
  const [technicians, setTechnicians] = useState<StaffMember[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [assignedTechnicianPhone, setAssignedTechnicianPhone] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Track fixed repairs (to filter them out)
  const [fixedRepairs, setFixedRepairs] = useState<Set<string>>(new Set());

  // Load fixed/completed repairs to filter them out
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'repairs'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fixedSet = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'fixed' || data.status === 'completed') {
          const fixedId = `${data.deviceId}-${data.staffEmail}-${data.issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;
          fixedSet.add(fixedId);
        }
      });
      setFixedRepairs(fixedSet);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Load expanded issue from URL (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const deviceParam = params.get('device');
      if (deviceParam) {
        setExpandedIssue(deviceParam);
      }
    }
  }, []);

  // Load technicians
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const allStaff = await staffService.getAllStaff();
        const techList = allStaff.filter(s => s.role === 'technician');
        setTechnicians(techList);
      } catch (error) {
        console.error('Error loading technicians:', error);
      }
    };
    loadTechnicians();
  }, []);

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done and we have data
  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      if (isNavigating) {
        console.log('Repair Management Page - Starting navigation loading timer');

        const loadingTime = 800;

        console.log('Repair Management Page - Starting with standard loading time:', loadingTime);

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
        setComponentsReady(true);
        setPageLoaded();
      }
    } else if (!loading && (!isAuthenticated || !isAdmin)) {
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

  // Filter groupedIssues by year/month
  useEffect(() => {
    if (selectedYear === 'all') {
      setFilteredGroupedIssues(groupedIssues);
      return;
    }

    const filtered = groupedIssues.filter(group => {
      const detectedDate = group.detectedDate;
      const detectedYear = detectedDate.getFullYear().toString();
      const detectedMonth = detectedDate.getMonth().toString();

      if (detectedYear !== selectedYear) return false;
      if (selectedMonth === 'all') return true;
      return detectedMonth === selectedMonth;
    });

    setFilteredGroupedIssues(filtered);
  }, [groupedIssues, selectedYear, selectedMonth]);

  const handleFilterChange = (year: string, month: string) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScans = new Map();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deviceId = data.deviceId;
        const scanTime = data.scanTimestamp?.toDate?.()?.getTime() || 0;

        const existing = allScans.get(deviceId);
        const existingTime = existing?.scanTimestamp?.toDate?.()?.getTime() || 0;

        if (!existing || scanTime > existingTime) {
          allScans.set(deviceId, data);
        }
      });

      const detectedIssues: RepairIssue[] = [];
      allScans.forEach((scanData) => {
        const scanIssues = analyzeDeviceForIssues(scanData);
        detectedIssues.push(...scanIssues);
      });

      const unfixedIssues = detectedIssues.filter(issue => !fixedRepairs.has(issue.id));

      const deviceIssuesMap = new Map<string, GroupedDeviceIssues>();
      unfixedIssues.forEach(issue => {
        if (!deviceIssuesMap.has(issue.deviceId)) {
          deviceIssuesMap.set(issue.deviceId, {
            id: issue.deviceId,
            deviceId: issue.deviceId,
            staffName: issue.staffName,
            staffEmail: issue.staffEmail,
            department: issue.department,
            issues: [],
            highestSeverity: issue.severity,
            detectedDate: issue.detectedDate
          });
        }

        const grouped = deviceIssuesMap.get(issue.deviceId)!;
        grouped.issues.push(issue as any);

        const severityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
        if (severityOrder[issue.severity] > severityOrder[grouped.highestSeverity]) {
          grouped.highestSeverity = issue.severity;
        }
      });

      const sortedIssues = Array.from(deviceIssuesMap.values()).sort((a, b) => {
        return b.detectedDate.getTime() - a.detectedDate.getTime();
      });

      setGroupedIssues(sortedIssues);
    });

    return () => unsubscribe();
  }, [isAdmin, fixedRepairs]);

  // Analyze device scan data for issues
  const analyzeDeviceForIssues = (scanData: any): RepairIssue[] => {
    const issues: RepairIssue[] = [];

    // RAM Critical
    if (scanData.ramUsage > 90) {
      const issueType = 'RAM Critical / Memory Failure';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'urgent',
        category: 'hardware',
        type: issueType,
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
      const issueType = 'Low Disk Space';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.diskSpaceFree < 10 ? 'urgent' : 'high',
        category: 'hardware',
        type: issueType,
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
      const issueType = 'CPU Overheating';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.cpuTemp > 90 ? 'urgent' : 'high',
        category: 'hardware',
        type: issueType,
        problem: 'CPU temperature dangerously high',
        symptoms: [`CPU Temp: ${scanData.cpuTemp}C`, 'Fan loud', 'Sudden shutdowns'],
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
      const issueType = 'Battery Degraded';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: scanData.batteryHealth < 30 ? 'high' : 'medium',
        category: 'hardware',
        type: issueType,
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
    if (!scanData.antivirusStatus || !scanData.antivirusStatus.toLowerCase().includes('active')) {
      const issueType = 'Antivirus Disabled';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'urgent',
        category: 'security',
        type: issueType,
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
    if (!scanData.firewallStatus || !scanData.firewallStatus.toLowerCase().includes('active')) {
      const issueType = 'Firewall Disabled';
      const issueId = `${scanData.deviceId}-${scanData.staffEmail}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

      issues.push({
        id: issueId,
        deviceId: scanData.deviceId,
        staffName: scanData.staffName,
        staffEmail: scanData.staffEmail,
        department: scanData.department,
        severity: 'high',
        category: 'security',
        type: issueType,
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

  // Calculate stats from filtered grouped issues
  const totalIssuesCount = filteredGroupedIssues.reduce((sum, g) => sum + g.issues.length, 0);
  const urgentCount = filteredGroupedIssues.filter(g => g.highestSeverity === 'urgent').length;
  const highCount = filteredGroupedIssues.filter(g => g.highestSeverity === 'high').length;
  const mediumCount = filteredGroupedIssues.filter(g => g.highestSeverity === 'medium').length;

  // Apply severity filter and search
  const getDisplayedIssues = () => {
    let filtered = filteredGroupedIssues;

    if (filter === 'urgent') {
      filtered = filteredGroupedIssues.filter(g => g.highestSeverity === 'urgent');
    } else if (filter === 'high') {
      filtered = filteredGroupedIssues.filter(g => g.highestSeverity === 'high');
    } else if (filter === 'medium') {
      filtered = filteredGroupedIssues.filter(g => g.highestSeverity === 'medium');
    }

    if (searchTerm === '') {
      return filtered;
    }

    return filtered.filter((group) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        group.staffName.toLowerCase().includes(searchLower) ||
        group.department.toLowerCase().includes(searchLower) ||
        group.issues.some(issue =>
          issue.type.toLowerCase().includes(searchLower) ||
          issue.problem.toLowerCase().includes(searchLower) ||
          issue.category.toLowerCase().includes(searchLower)
        )
      );
    });
  };

  const allDisplayedIssues = getDisplayedIssues();

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, selectedYear, selectedMonth]);

  // Paginate the displayed issues
  const displayedIssues = allDisplayedIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleIssue = async (issueId: string) => {
    const isExpanding = expandedIssue !== issueId;
    setExpandedIssue(isExpanding ? issueId : null);

    if (isExpanding) {
      router.push(`/repair-management?device=${encodeURIComponent(issueId)}`);
    } else {
      router.push('/repair-management');
    }

    if (isExpanding) {
      try {
        const viewedDevices = localStorage.getItem('viewedRepairDevices');
        const viewed = viewedDevices ? JSON.parse(viewedDevices) : [];
        if (!viewed.includes(issueId)) {
          viewed.push(issueId);
          localStorage.setItem('viewedRepairDevices', JSON.stringify(viewed));
          window.dispatchEvent(new Event('viewedDevicesUpdated'));
        }

        const issueRef = doc(db, 'repairs', issueId);
        const docSnap = await getDoc(issueRef);
        if (docSnap.exists()) {
          await updateDoc(issueRef, {
            isRead: true,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.warn('Could not mark device as viewed:', error);
      }
    }
  };

  // Get unique staff list with issues
  const getStaffWithIssues = () => {
    return allDisplayedIssues.map(group => ({
      name: group.staffName,
      email: group.staffEmail,
      issueCount: group.issues.length,
      severity: group.highestSeverity
    }));
  };

  const _handleNotifyStaff = () => {
    _setShowNotifyModal(true);
    const urgentStaff = getStaffWithIssues().filter(s => s.severity === 'urgent').map(s => s.email);
    _setSelectedStaff(urgentStaff);
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

  // Handle opening assign modal
  const _handleOpenAssignModal = (group: GroupedDeviceIssues, issue: RepairIssue) => {
    setSelectedIssueForAssign({ group, issue });
    setShowAssignModal(true);
    setSelectedTechnicianId('');
  };

  // Handle assigning repair to technician
  const handleAssignTechnician = async () => {
    if (!selectedTechnicianId) {
      alert('Please select a technician');
      return;
    }

    if (!selectedIssueForAssign) return;

    const technician = technicians.find(t => t.id === selectedTechnicianId);
    if (!technician) return;

    setIsAssigning(true);

    try {
      await addDoc(collection(db, 'assigned_repairs'), {
        deviceId: selectedIssueForAssign.group.deviceId,
        staffName: selectedIssueForAssign.group.staffName,
        staffEmail: selectedIssueForAssign.group.staffEmail,
        department: selectedIssueForAssign.group.department,
        issueType: selectedIssueForAssign.issue.type,
        description: selectedIssueForAssign.issue.problem,
        severity: selectedIssueForAssign.issue.severity,
        status: 'assigned',
        technicianEmail: technician.email,
        technicianName: technician.name,
        technicianPhone: technician.phone || '',
        assignedDate: new Date(),
        assignedBy: 'Super Admin',
      });

      const message = `Hi ${technician.name}, you have been assigned a new repair:\n\nIssue: ${selectedIssueForAssign.issue.type}\nStaff: ${selectedIssueForAssign.group.staffName}\nDepartment: ${selectedIssueForAssign.group.department}\nSeverity: ${selectedIssueForAssign.issue.severity.toUpperCase()}\n\nPlease check your Technician Dashboard.`;

      setWhatsappMessage(message);
      setAssignedTechnicianPhone(technician.phone || '');

      setShowAssignModal(false);
      setShowWhatsAppModal(true);

    } catch (error) {
      console.error('Error assigning repair:', error);
      alert('Failed to assign repair. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Generate PDF Report
  const generateReport = async () => {
    setIsExporting(true);
    try {
      const jsPDFModule: any = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const { pdfService } = await import('@/services/pdfService');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      const primaryColor: [number, number, number] = [25, 118, 210];
      const secondaryColor: [number, number, number] = [100, 100, 100];
      const lightGray: [number, number, number] = [245, 245, 245];

      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text('REPAIR MANAGEMENT REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 20, yPos);
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

      const totalIssuesCount = allDisplayedIssues.reduce((sum, group) => sum + group.issues.length, 0);

      const boxWidth = (pageWidth - 50) / 4;
      const boxHeight = 25;
      const boxStartY = yPos;

      const stats = [
        { label: 'Total Issues', value: totalIssuesCount.toString(), color: [59, 130, 246] as [number, number, number] },
        { label: 'Urgent', value: urgentCount.toString(), color: [239, 68, 68] as [number, number, number] },
        { label: 'High Priority', value: highCount.toString(), color: [245, 158, 11] as [number, number, number] },
        { label: 'Medium', value: mediumCount.toString(), color: [59, 130, 246] as [number, number, number] }
      ];

      stats.forEach((stat, index) => {
        const boxX = 20 + (index * (boxWidth + 3));
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(boxX, boxStartY, boxWidth, boxHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxStartY, boxWidth, boxHeight);
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(stat.label, boxX + boxWidth / 2, boxStartY + 8, { align: 'center' });
        doc.setFontSize(16);
        doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.text(stat.value, boxX + boxWidth / 2, boxStartY + 18, { align: 'center' });
      });

      yPos = boxStartY + boxHeight + 15;

      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(undefined, 'bold');

      doc.text(`Detected Issues (${totalIssuesCount})`, 20, yPos);
      yPos += 12;

      if (allDisplayedIssues.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont(undefined, 'normal');
        doc.text('No repair issues found in this period.', pageWidth / 2, yPos + 20, { align: 'center' });
      } else {
        const tableData = allDisplayedIssues.flatMap(group =>
          group.issues.map(issue => ({
            staff: `${group.staffName} (${group.department})`,
            issue: issue.type,
            severity: issue.severity.toUpperCase(),
            status: issue.status === 'fixed' ? 'FIXED' : 'DETECTED',
            impact: issue.impact
          }))
        );

        const columns = [
          { key: 'staff', header: 'Staff (Dept)', width: 1.8 },
          { key: 'issue', header: 'Issue Type', width: 1.5 },
          { key: 'severity', header: 'Severity', width: 0.8 },
          { key: 'status', header: 'Status', width: 1.0 },
          { key: 'impact', header: 'Impact', width: 2 }
        ];

        pdfService.addProfessionalTable(doc, tableData, columns, yPos);
      }

      const filename = `Repair_Management_${periodText.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      setIsExporting(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
      setIsExporting(false);
    }
  };

  // Handle opening WhatsApp
  const handleOpenWhatsApp = () => {
    if (!assignedTechnicianPhone) {
      alert('Technician phone number not available');
      return;
    }

    const cleanPhone = assignedTechnicianPhone.replace(/[^0-9+]/g, '');
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    setShowWhatsAppModal(false);
  };

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading for direct page access (not from navigation)
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Checking authentication...</p>
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Repair Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Click on any stat card to filter issues by severity. Expand cards for detailed repair instructions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateReport}
                  disabled={isExporting || filteredGroupedIssues.length === 0}
                  className="px-4 py-2 bg-gray-900 text-white font-medium rounded-xl transition-colors flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Year/Month Filter */}
          <YearMonthFilter onFilterChange={handleFilterChange} />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            <button
              onClick={() => setFilter('all')}
              className={`bg-white rounded-2xl border shadow-sm p-6 transition-all duration-200 hover:shadow-md text-left ${
                filter === 'all' ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Issues</p>
                <p className={`text-3xl font-semibold ${filter === 'all' ? 'text-gray-900' : 'text-gray-900'}`}>{totalIssuesCount}</p>
                {filter === 'all' && (
                  <p className="text-xs text-gray-500 font-medium mt-2">Active</p>
                )}
              </div>
            </button>

            <button
              onClick={() => setFilter('urgent')}
              className={`bg-white rounded-2xl border shadow-sm p-6 transition-all duration-200 hover:shadow-md text-left ${
                filter === 'urgent' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Urgent</p>
                <p className={`text-3xl font-semibold ${filter === 'urgent' ? 'text-red-600' : 'text-gray-900'}`}>{urgentCount}</p>
                {filter === 'urgent' && (
                  <p className="text-xs text-red-500 font-medium mt-2">Active</p>
                )}
              </div>
            </button>

            <button
              onClick={() => setFilter('high')}
              className={`bg-white rounded-2xl border shadow-sm p-6 transition-all duration-200 hover:shadow-md text-left ${
                filter === 'high' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">High Priority</p>
                <p className={`text-3xl font-semibold ${filter === 'high' ? 'text-amber-600' : 'text-gray-900'}`}>{highCount}</p>
                {filter === 'high' && (
                  <p className="text-xs text-amber-500 font-medium mt-2">Active</p>
                )}
              </div>
            </button>

            <button
              onClick={() => setFilter('medium')}
              className={`bg-white rounded-2xl border shadow-sm p-6 transition-all duration-200 hover:shadow-md text-left ${
                filter === 'medium' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Medium</p>
                <p className={`text-3xl font-semibold ${filter === 'medium' ? 'text-blue-600' : 'text-gray-900'}`}>{mediumCount}</p>
                {filter === 'medium' && (
                  <p className="text-xs text-blue-500 font-medium mt-2">Active</p>
                )}
              </div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="mt-3 text-sm text-gray-500">
                Found <span className="font-medium text-gray-900">{displayedIssues.length}</span> device(s)
              </p>
            )}
          </div>

          {/* Filtered Issues */}
          {displayedIssues.length > 0 ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-gray-900">
                  {filter === 'all' && 'All Devices'}
                  {filter === 'urgent' && 'Urgent Devices'}
                  {filter === 'high' && 'High Priority'}
                  {filter === 'medium' && 'Medium Priority'}
                  <span className="ml-2 text-gray-500">
                    ({allDisplayedIssues.length})
                  </span>
                </h2>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="text-sm text-gray-500 hover:text-gray-900 font-medium"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {displayedIssues.map(group => (
                  <GroupedDeviceCard
                    key={group.id}
                    group={group}
                    isExpanded={expandedIssue === group.id}
                    onToggle={() => toggleIssue(group.id)}
                    onAssignTechnician={(group, issue) => {
                      setSelectedIssueForAssign({ group, issue });
                      setShowAssignModal(true);
                      setSelectedTechnicianId('');
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {allDisplayedIssues.length > itemsPerPage && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(allDisplayedIssues.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    totalItems={allDisplayedIssues.length}
                    itemsPerPage={itemsPerPage}
                    startIndex={(currentPage - 1) * itemsPerPage + 1}
                    endIndex={Math.min(currentPage * itemsPerPage, allDisplayedIssues.length)}
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* No Issues or No Search Results */}
          {displayedIssues.length === 0 && filteredGroupedIssues.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No Results</h2>
              <p className="text-sm text-gray-500">
                {searchTerm
                  ? `No devices match your search. Try different keywords.`
                  : 'No devices match the selected filter.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* No Issues at All */}
          {groupedIssues.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">All Clear</h2>
              <p className="text-sm text-gray-500">No repair issues detected from device scans.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Technician Modal */}
      {showAssignModal && selectedIssueForAssign && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !isAssigning && setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">Assign Technician</h3>
                    <p className="text-sm text-gray-500 truncate">{selectedIssueForAssign.issue.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Issue Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Staff:</span>
                    <span className="font-medium text-gray-900">{selectedIssueForAssign.group.staffName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department:</span>
                    <span className="font-medium text-gray-900">{selectedIssueForAssign.group.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Issue:</span>
                    <span className="font-medium text-gray-900">{selectedIssueForAssign.issue.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Severity:</span>
                    <span className={`font-medium uppercase ${
                      selectedIssueForAssign.issue.severity === 'urgent' ? 'text-red-600' :
                      selectedIssueForAssign.issue.severity === 'high' ? 'text-amber-600' :
                      'text-blue-600'
                    }`}>
                      {selectedIssueForAssign.issue.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Select Technician */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Select Technician <span className="text-red-500">*</span>
                </label>
                {technicians.length === 0 ? (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-sm text-amber-700">
                      No technicians available. Please create technician accounts first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    disabled={isAssigning}
                  >
                    <option value="">Choose a technician...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.department})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="flex-1 px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors hover:bg-gray-200 disabled:opacity-50 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTechnician}
                  disabled={isAssigning || !selectedTechnicianId}
                  className="flex-1 px-4 py-3 sm:py-2 bg-gray-900 text-white rounded-xl font-medium transition-colors hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center order-1 sm:order-2"
                >
                  {isAssigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Assign Repair
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Notification Modal */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Success Icon */}
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Repair Assigned
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Notify the technician via WhatsApp?
              </p>

              {/* WhatsApp Message Preview */}
              <div className="bg-green-50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-800 mb-2">Message Preview:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{whatsappMessage}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors hover:bg-gray-200"
                >
                  Skip
                </button>
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Grouped Device Card Component - Shows all issues for one device
function GroupedDeviceCard({ group, isExpanded, onToggle, onAssignTechnician }: {
  group: GroupedDeviceIssues;
  isExpanded: boolean;
  onToggle: () => void;
  onAssignTechnician: (group: GroupedDeviceIssues, issue: RepairIssue) => void;
}) {
  const [expandedFixes, setExpandedFixes] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState('');
  const [savedRemarks, setSavedRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [markingFixed, setMarkingFixed] = useState<string | null>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = remarks.trim() !== savedRemarks.trim() && remarks.trim() !== '';

  // Load existing remarks from Firestore when card is expanded
  useEffect(() => {
    if (isExpanded) {
      loadRemarks();
    }
  }, [isExpanded]);

  const loadRemarks = async () => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const remarkDocRef = doc(db, 'repair_remarks', group.deviceId);
      const remarkDoc = await getDoc(remarkDocRef);

      if (remarkDoc.exists()) {
        const data = remarkDoc.data();
        const loadedRemarks = data.remarks || '';
        setRemarks(loadedRemarks);
        setSavedRemarks(loadedRemarks);
      }
    } catch (error) {
      console.error('Error loading remarks:', error);
    }
  };

  const saveRemarks = async () => {
    if (!remarks.trim()) {
      alert('Please enter some remarks before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const remarkDocRef = doc(db, 'repair_remarks', group.deviceId);

      await setDoc(remarkDocRef, {
        deviceId: group.deviceId,
        staffName: group.staffName,
        staffEmail: group.staffEmail,
        department: group.department,
        remarks: remarks.trim(),
        updatedAt: new Date(),
        updatedBy: 'Admin'
      });

      setSavedRemarks(remarks.trim());
      alert(`Remarks saved for ${group.staffName}!`);
    } catch (error) {
      console.error('Error saving remarks:', error);
      alert('Failed to save remarks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFix = (issueId: string) => {
    setExpandedFixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  // Mark individual repair as fixed
  const markRepairFixed = async (issue: RepairIssue) => {
    const confirmMark = confirm(`Mark "${issue.type}" as fixed for ${group.staffName}?\n\nThis will hide the issue from the repair management page.`);
    if (!confirmMark) return;

    setMarkingFixed(issue.id);
    try {
      const { doc, setDoc } = await import('firebase/firestore');

      const repairDocRef = doc(db, 'repairs', issue.id);

      await setDoc(repairDocRef, {
        deviceId: issue.deviceId,
        staffName: issue.staffName,
        staffEmail: issue.staffEmail,
        department: issue.department,
        issueType: issue.type,
        category: issue.category,
        severity: issue.severity,
        status: 'fixed',
        fixedAt: new Date(),
        fixedBy: 'Admin',
        originalIssue: issue.problem
      });

      alert(`"${issue.type}" marked as fixed!`);
    } catch (error) {
      console.error('Error marking repair as fixed:', error);
      alert('Failed to mark repair as fixed. Please try again.');
    } finally {
      setMarkingFixed(null);
    }
  };

  const categoryLabels = {
    hardware: 'Hardware',
    software: 'Software',
    security: 'Security',
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md ${isExpanded ? 'border-gray-200' : 'border-gray-100'}`}>
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-medium text-gray-900">
                {group.staffName}
              </h3>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                {group.department}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                group.highestSeverity === 'urgent' ? 'bg-red-50 text-red-700' :
                group.highestSeverity === 'high' ? 'bg-amber-50 text-amber-700' :
                group.highestSeverity === 'medium' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {group.highestSeverity}
              </span>
            </div>
            {!isExpanded && (
              <p className="text-sm text-gray-500">
                {group.issues.length} {group.issues.length === 1 ? 'Issue' : 'Issues'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{isExpanded ? 'Collapse' : 'Details'}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details - Show All Issues */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-50 pt-6 space-y-6">
          {/* Staff Information */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Staff Information</h4>
            <div className="text-sm space-y-2">
              <p className="text-gray-700"><span className="text-gray-500">Name:</span> {group.staffName}</p>
              <p className="text-gray-700"><span className="text-gray-500">Email:</span> {group.staffEmail}</p>
              <p className="text-gray-700"><span className="text-gray-500">Department:</span> {group.department}</p>
              <p className="text-gray-700"><span className="text-gray-500">Device ID:</span> <span className="font-mono text-xs">{group.deviceId}</span></p>
            </div>
          </div>

          {/* All Issues for This Device */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">All Issues ({group.issues.length})</h4>
            <div className="space-y-3">
              {group.issues.map((issue) => (
                <div key={issue.id} className="bg-gray-50 rounded-xl p-4">
                  {/* Issue Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-sm font-medium text-gray-900">{issue.type}</h5>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                          issue.severity === 'urgent' ? 'bg-red-50 text-red-700' :
                          issue.severity === 'high' ? 'bg-amber-50 text-amber-700' :
                          issue.severity === 'medium' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {issue.severity}
                        </span>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                          {categoryLabels[issue.category]}
                        </span>
                        {issue.status === 'fixed' && (
                          <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">
                            Fixed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{issue.problem}</p>
                    </div>
                  </div>

                  {/* Problem Details */}
                  <div className="mb-3">
                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Symptoms</h6>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {issue.symptoms.map((symptom, idx) => (
                        <li key={idx}>{symptom}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Impact:</span> {issue.impact}
                    </p>
                  </div>

                  {/* Fix Instructions - Collapsible */}
                  <div className="mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFix(issue.id);
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors mb-1 w-full text-left"
                    >
                      <span>How to Fix</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedFixes.has(issue.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedFixes.has(issue.id) && (
                      <div className="mt-2 pl-3 border-l-2 border-gray-200">
                        <p className="text-sm font-medium text-gray-800 mb-1">{issue.fix.title}</p>
                        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                          {issue.fix.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* Parts & Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white rounded-lg p-3 mb-3">
                    <div>
                      <p className="font-medium text-gray-500">Time</p>
                      <p className="text-gray-700">{issue.fix.estimatedTime}</p>
                    </div>
                    {issue.fix.partsNeeded.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-500">Parts</p>
                        <p className="text-gray-700">{issue.fix.partsNeeded.join(', ')}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-500">Difficulty</p>
                      <p className="text-gray-700 capitalize">{issue.fix.difficulty}</p>
                    </div>
                  </div>

                  {/* Action Buttons - Individual Issue */}
                  <div className="flex justify-end gap-2">
                    {issue.status === 'fixed' ? (
                      <div className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                        Already Fixed
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRepairFixed(issue);
                        }}
                        disabled={markingFixed === issue.id}
                        className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingFixed === issue.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Marking...</span>
                          </>
                        ) : (
                          'Mark Fixed'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Remarks */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Admin Remarks / Notes
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks, notes, or technician instructions here..."
              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={3}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveRemarks();
                }}
                disabled={isSaving}
                className={`${
                  hasUnsavedChanges
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                } px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50`}
              >
                {isSaving ? 'Saving...' : 'Save Remarks'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (group.issues.length > 0) {
                  onAssignTechnician(group, group.issues[0]);
                }
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              Assign Technician
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
