'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy, addDoc, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { staffService, StaffMember } from '@/lib/staffService';
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
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'medium'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Track fixed repairs (to filter them out)
  const [fixedRepairs, setFixedRepairs] = useState<Set<string>>(new Set());

  // Load fixed/completed repairs to filter them out
  useEffect(() => {
    if (!isAdmin) return;

    // Listen to all repairs collection (no filter, we'll filter in code)
    const q = query(collection(db, 'repairs'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fixedSet = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Include both 'fixed' and 'completed' status
        if (data.status === 'fixed' || data.status === 'completed') {
          // Create the same ID format as in analyzeDeviceForIssues
          const fixedId = `${data.deviceId}-${data.issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;
          fixedSet.add(fixedId);
        }
      });
      setFixedRepairs(fixedSet);
    });

    return () => unsubscribe();
  }, [isAdmin]);

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
      // First, group all scans by deviceId and keep only the latest scan for each device
      const allScans = new Map();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deviceId = data.deviceId;
        const scanTime = data.scanTimestamp?.toDate?.()?.getTime() || 0;

        const existing = allScans.get(deviceId);
        const existingTime = existing?.scanTimestamp?.toDate?.()?.getTime() || 0;

        // Only keep the latest scan for each device
        if (!existing || scanTime > existingTime) {
          allScans.set(deviceId, data);
        }
      });

      // Now analyze only the latest scan for each device
      const detectedIssues: RepairIssue[] = [];
      allScans.forEach((scanData) => {
        // Analyze scan data and create issues
        const scanIssues = analyzeDeviceForIssues(scanData);
        detectedIssues.push(...scanIssues);
      });

      // Mark issues as fixed if they're in the fixed repairs list
      const issuesWithStatus = detectedIssues.map(issue => ({
        ...issue,
        status: fixedRepairs.has(issue.id) ? 'fixed' : 'detected'
      }));

      // Group issues by deviceId (ALL issues, both fixed and unfixed)
      const deviceIssuesMap = new Map<string, GroupedDeviceIssues>();
      issuesWithStatus.forEach(issue => {
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

        // Update highest severity
        const severityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
        if (severityOrder[issue.severity] > severityOrder[grouped.highestSeverity]) {
          grouped.highestSeverity = issue.severity;
        }
      });

      setGroupedIssues(Array.from(deviceIssuesMap.values()));
    });

    return () => unsubscribe();
  }, [isAdmin, fixedRepairs]);

  // Analyze device scan data for issues
  const analyzeDeviceForIssues = (scanData: any): RepairIssue[] => {
    const issues: RepairIssue[] = [];

    // RAM Critical
    if (scanData.ramUsage > 90) {
      const issueType = 'RAM Critical / Memory Failure';
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
      const issueType = 'Battery Degraded';
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
    if (scanData.antivirusStatus !== 'Active') {
      const issueType = 'Antivirus Disabled';
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
    if (scanData.firewallStatus !== 'Active') {
      const issueType = 'Firewall Disabled';
      const issueId = `${scanData.deviceId}-${issueType.replace(/[^a-zA-Z0-9]/g, '_')}`;

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

  // Calculate stats from grouped issues
  const totalIssuesCount = groupedIssues.reduce((sum, g) => sum + g.issues.length, 0);
  const urgentCount = groupedIssues.filter(g => g.highestSeverity === 'urgent').length;
  const highCount = groupedIssues.filter(g => g.highestSeverity === 'high').length;
  const mediumCount = groupedIssues.filter(g => g.highestSeverity === 'medium').length;

  // Apply filter and search
  const getFilteredGroupedIssues = () => {
    let filtered = groupedIssues;

    // First apply severity filter
    if (filter === 'urgent') {
      filtered = groupedIssues.filter(g => g.highestSeverity === 'urgent');
    } else if (filter === 'high') {
      filtered = groupedIssues.filter(g => g.highestSeverity === 'high');
    } else if (filter === 'medium') {
      filtered = groupedIssues.filter(g => g.highestSeverity === 'medium');
    }

    // Then apply search filter
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

  const filteredGroupedIssues = getFilteredGroupedIssues();

  const toggleIssue = async (issueId: string) => {
    const isExpanding = expandedIssue !== issueId;
    setExpandedIssue(isExpanding ? issueId : null);

    // Mark as read when expanding (like Facebook notifications)
    // Only if the repair document exists in the repairs collection
    if (isExpanding) {
      try {
        const issueRef = doc(db, 'repairs', issueId);

        // Check if document exists before updating
        const docSnap = await getDoc(issueRef);
        if (docSnap.exists()) {
          await updateDoc(issueRef, {
            isRead: true,
            readAt: new Date(),
          });
        }
        // If document doesn't exist, silently skip (it's just a detected issue, not assigned yet)
      } catch (error) {
        // Silently ignore errors for non-existent documents
        console.warn('Could not mark issue as read (document may not exist):', issueId);
      }
    }
  };

  // Get unique staff list with issues
  const getStaffWithIssues = () => {
    return filteredGroupedIssues.map(group => ({
      name: group.staffName,
      email: group.staffEmail,
      issueCount: group.issues.length,
      severity: group.highestSeverity
    }));
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

  // Handle opening assign modal
  const _handleOpenAssignModal = (group: GroupedDeviceIssues, issue: RepairIssue) => {
    setSelectedIssueForAssign({ group, issue });
    setShowAssignModal(true);
    setSelectedTechnicianId('');
  };

  // Handle assigning repair to technician
  const handleAssignTechnician = async () => {
    if (!selectedTechnicianId) {
      alert('⚠️ Please select a technician');
      return;
    }

    if (!selectedIssueForAssign) return;

    const technician = technicians.find(t => t.id === selectedTechnicianId);
    if (!technician) return;

    setIsAssigning(true);

    try {
      // Create assignment in assigned_repairs collection
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

      // Prepare WhatsApp message
      const message = `Hi ${technician.name}, you have been assigned a new repair:\n\nIssue: ${selectedIssueForAssign.issue.type}\nStaff: ${selectedIssueForAssign.group.staffName}\nDepartment: ${selectedIssueForAssign.group.department}\nSeverity: ${selectedIssueForAssign.issue.severity.toUpperCase()}\n\nPlease check your Technician Dashboard.`;

      setWhatsappMessage(message);
      setAssignedTechnicianPhone(technician.phone || '');

      // Close assign modal and show WhatsApp modal
      setShowAssignModal(false);
      setShowWhatsAppModal(true);

    } catch (error) {
      console.error('Error assigning repair:', error);
      alert('❌ Failed to assign repair. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle opening WhatsApp
  const handleOpenWhatsApp = () => {
    if (!assignedTechnicianPhone) {
      alert('⚠️ Technician phone number not available');
      return;
    }

    // Remove any spaces, dashes, or special characters from phone number
    const cleanPhone = assignedTechnicianPhone.replace(/[^0-9+]/g, '');

    // Encode message for URL
    const encodedMessage = encodeURIComponent(whatsappMessage);

    // Open WhatsApp link
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Close modal
    setShowWhatsAppModal(false);
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
      {/* Glassmorphism Background - Light Blue-White */}
      <div className="min-h-screen relative overflow-hidden" style={{
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

        <div className="max-w-6xl mx-auto relative z-10 py-8 px-4 sm:px-6 lg:px-8">
          {/* Banner Section - White Glassmorphism */}
        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">
                REPAIR · MANAGEMENT
              </h1>
              <p className="mt-3 text-sm text-gray-600 font-normal">
                Click on any stat card to filter issues by severity. Expand cards for detailed repair instructions.
              </p>
            </div>

          </div>
        </div>

        {/* Warning Banner */}
        <div className="backdrop-blur-2xl bg-orange-50/80 border-4 border-orange-200 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-orange-800 uppercase">⚠️ Important Notice</h3>
              <p className="text-sm text-orange-700 mt-1">
                Old repair records (older than <strong>2 months</strong>) will be automatically deleted to save storage space. Please download and save your reports regularly!
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards - Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`backdrop-blur-2xl bg-white/30 border-2 rounded-2xl shadow-lg p-6 transition-all duration-300 cursor-pointer hover:scale-105 text-left ${
              filter === 'all' ? 'border-blue-400 bg-gradient-to-br from-blue-100/60 to-white/30 shadow-blue-200/50' : 'border-white/50 hover:bg-white/40'
            }`}
          >
            <div className="flex flex-col">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Total Issues</p>
              <p className={`text-5xl font-normal mt-2 ${filter === 'all' ? 'text-blue-600' : 'text-gray-800'}`}>{totalIssuesCount}</p>
              {filter === 'all' && (
                <p className="text-xs text-blue-600 font-semibold mt-3">✓ ACTIVE</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setFilter('urgent')}
            className={`backdrop-blur-2xl bg-white/30 border-2 rounded-2xl shadow-lg p-6 transition-all duration-300 cursor-pointer hover:scale-105 text-left ${
              filter === 'urgent' ? 'border-red-400 bg-gradient-to-br from-red-100/60 to-white/30 shadow-red-200/50' : 'border-white/50 hover:bg-white/40'
            }`}
          >
            <div className="flex flex-col">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Urgent</p>
              <p className={`text-5xl font-normal mt-2 ${filter === 'urgent' ? 'text-red-600' : 'text-gray-800'}`}>{urgentCount}</p>
              {filter === 'urgent' && (
                <p className="text-xs text-red-600 font-semibold mt-3">✓ ACTIVE</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setFilter('high')}
            className={`backdrop-blur-2xl bg-white/30 border-2 rounded-2xl shadow-lg p-6 transition-all duration-300 cursor-pointer hover:scale-105 text-left ${
              filter === 'high' ? 'border-yellow-400 bg-gradient-to-br from-yellow-100/60 to-white/30 shadow-yellow-200/50' : 'border-white/50 hover:bg-white/40'
            }`}
          >
            <div className="flex flex-col">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">High Priority</p>
              <p className={`text-5xl font-normal mt-2 ${filter === 'high' ? 'text-yellow-600' : 'text-gray-800'}`}>{highCount}</p>
              {filter === 'high' && (
                <p className="text-xs text-yellow-600 font-semibold mt-3">✓ ACTIVE</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setFilter('medium')}
            className={`backdrop-blur-2xl bg-white/30 border-2 rounded-2xl shadow-lg p-6 transition-all duration-300 cursor-pointer hover:scale-105 text-left ${
              filter === 'medium' ? 'border-blue-400 bg-gradient-to-br from-blue-100/60 to-white/30 shadow-blue-200/50' : 'border-white/50 hover:bg-white/40'
            }`}
          >
            <div className="flex flex-col">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mb-2">Medium</p>
              <p className={`text-5xl font-normal mt-2 ${filter === 'medium' ? 'text-blue-600' : 'text-gray-800'}`}>{mediumCount}</p>
              {filter === 'medium' && (
                <p className="text-xs text-blue-600 font-semibold mt-3">✓ ACTIVE</p>
              )}
            </div>
          </button>
        </div>

        {/* Search Bar - Minimalist Underline Style */}
        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="SEARCH DEVICES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-gray-300 focus:border-gray-600 text-gray-800 placeholder-gray-400 py-3 px-2 focus:outline-none focus:ring-0 font-medium tracking-wider uppercase text-sm transition-all duration-300"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-5 py-3 border-2 font-medium rounded-xl transition-all duration-300 backdrop-blur-sm uppercase text-xs tracking-wider
                  md:border-gray-300 md:hover:border-gray-400 md:text-gray-700 md:hover:bg-white/40
                  border-gray-600 bg-gray-600 text-white"
              >
                ✕ Clear
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-4 text-sm text-gray-600 font-normal">
              Found <span className="font-semibold text-gray-800">{filteredGroupedIssues.length}</span> device(s)
            </p>
          )}
        </div>

        {/* Filtered Issues */}
        {filteredGroupedIssues.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 uppercase tracking-widest">
                {filter === 'all' && 'ALL DEVICES'}
                {filter === 'urgent' && 'URGENT DEVICES'}
                {filter === 'high' && 'HIGH PRIORITY'}
                {filter === 'medium' && 'MEDIUM PRIORITY'}
                <span className="ml-3 text-sm text-gray-500 font-normal">
                  ({filteredGroupedIssues.length})
                </span>
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium uppercase tracking-wider"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="space-y-4">
              {filteredGroupedIssues.map(group => (
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
          </div>
        ) : null}

        {/* No Issues or No Search Results */}
        {filteredGroupedIssues.length === 0 && groupedIssues.length > 0 && (
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-lg p-16 text-center">
            <div className="text-6xl mb-6 opacity-50">🔍</div>
            <h2 className="text-3xl font-semibold text-gray-800 mb-3 uppercase tracking-wider">No Results</h2>
            <p className="text-gray-600 font-normal">
              {searchTerm
                ? `No devices match your search. Try different keywords.`
                : 'No devices match the selected filter.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-6 px-6 py-3 border-2 font-medium rounded-xl transition-all duration-300 uppercase text-xs tracking-wider
                  md:border-gray-300 md:hover:border-gray-400 md:text-gray-700 md:hover:bg-white/40
                  border-gray-600 bg-gray-600 text-white"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* No Issues at All */}
        {groupedIssues.length === 0 && (
          <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-lg p-16 text-center">
            <div className="text-6xl mb-6 opacity-50">✅</div>
            <h2 className="text-3xl font-semibold text-gray-800 mb-3 uppercase tracking-wider">All Clear</h2>
            <p className="text-gray-600 font-normal">No repair issues detected from device scans.</p>
          </div>
        )}
        </div>
      </div>

      {/* Assign Technician Modal */}
      {showAssignModal && selectedIssueForAssign && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isAssigning && setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Assign Technician</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{selectedIssueForAssign.issue.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Issue Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Staff:</span>
                    <span className="text-gray-900">{selectedIssueForAssign.group.staffName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="text-gray-900">{selectedIssueForAssign.group.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Issue:</span>
                    <span className="text-gray-900">{selectedIssueForAssign.issue.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Severity:</span>
                    <span className={`font-bold uppercase ${
                      selectedIssueForAssign.issue.severity === 'urgent' ? 'text-red-600' :
                      selectedIssueForAssign.issue.severity === 'high' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {selectedIssueForAssign.issue.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Select Technician */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Technician <span className="text-red-500">*</span>
                </label>
                {technicians.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ No technicians available. Please create technician accounts first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="flex-1 px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 order-2 sm:order-1
                    md:bg-gray-200 md:hover:bg-gray-300 md:text-gray-700
                    bg-gray-600 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTechnician}
                  disabled={isAssigning || !selectedTechnicianId}
                  className="flex-1 px-4 py-3 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center order-1 sm:order-2"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                ✅ Repair Assigned!
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Notify the technician via WhatsApp?
              </p>

              {/* WhatsApp Message Preview */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-800 mb-2">Message Preview:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{whatsappMessage}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors
                    md:bg-gray-200 md:hover:bg-gray-300 md:text-gray-700
                    bg-gray-600 text-white"
                >
                  Skip
                </button>
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
      alert('⚠️ Please enter some remarks before saving.');
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
      alert(`✅ Remarks saved for ${group.staffName}!`);
    } catch (error) {
      console.error('Error saving remarks:', error);
      alert('❌ Failed to save remarks. Please try again.');
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

      // Store fixed issue in repairs collection
      // Use the existing issue.id to ensure it matches the generated ID format
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

      alert(`✅ "${issue.type}" marked as fixed!`);
      // The real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error marking repair as fixed:', error);
      alert('❌ Failed to mark repair as fixed. Please try again.');
    } finally {
      setMarkingFixed(null);
    }
  };

  const categoryIcons = {
    hardware: '🔧',
    software: '💻',
    security: '🔒',
  };

  return (
    <div className={`backdrop-blur-2xl bg-white/30 border-2 rounded-2xl shadow-lg transition-all duration-300 hover:bg-white/40 ${isExpanded ? 'border-blue-300 shadow-blue-100/50' : 'border-white/50'}`}>
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-white/40 transition-all duration-300 rounded-2xl"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">
                {group.staffName}
              </h3>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 border border-gray-300 text-gray-700 uppercase tracking-wider">
                {group.department}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${
                group.highestSeverity === 'urgent' ? 'bg-red-100 border border-red-300 text-red-700' :
                group.highestSeverity === 'high' ? 'bg-yellow-100 border border-yellow-300 text-yellow-700' :
                group.highestSeverity === 'medium' ? 'bg-blue-100 border border-blue-300 text-blue-700' :
                'bg-gray-100 border border-gray-300 text-gray-700'
              }`}>
                {group.highestSeverity}
              </span>
            </div>
            {!isExpanded && (
              <p className="text-sm text-gray-600 font-normal">
                {group.issues.length} {group.issues.length === 1 ? 'Issue' : 'Issues'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{isExpanded ? 'COLLAPSE' : 'DETAILS'}</span>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
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
        <div className="px-6 pb-6 border-t border-gray-200 pt-6 space-y-6">
          {/* Staff Information */}
          <div className="bg-white/20 backdrop-blur-xl border-4 border-white rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 uppercase tracking-wider mb-4 text-sm">STAFF INFORMATION</h4>
            <div className="text-sm space-y-2">
              <p className="text-gray-700 font-normal"><span className="text-gray-500 font-medium">Name:</span> {group.staffName}</p>
              <p className="text-gray-700 font-normal"><span className="text-gray-500 font-medium">Email:</span> {group.staffEmail}</p>
              <p className="text-gray-700 font-normal"><span className="text-gray-500 font-medium">Department:</span> {group.department}</p>
              <p className="text-gray-700 font-normal"><span className="text-gray-500 font-medium">Device ID:</span> <span className="font-mono text-xs">{group.deviceId}</span></p>
            </div>
          </div>

          {/* All Issues for This Device */}
          <div>
            <h4 className="font-semibold text-gray-800 uppercase tracking-wider mb-4 text-sm">ALL ISSUES ({group.issues.length})</h4>
            <div className="space-y-3">
              {group.issues.map((issue) => (
                <div key={issue.id} className="bg-white/20 backdrop-blur-xl border-4 border-white rounded-xl p-5">
                  {/* Issue Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{categoryIcons[issue.category]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-semibold text-gray-800 uppercase tracking-wide text-sm">{issue.type}</h5>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${
                          issue.severity === 'urgent' ? 'bg-red-100 border border-red-300 text-red-700' :
                          issue.severity === 'high' ? 'bg-yellow-100 border border-yellow-300 text-yellow-700' :
                          issue.severity === 'medium' ? 'bg-blue-100 border border-blue-300 text-blue-700' :
                          'bg-gray-100 border border-gray-300 text-gray-700'
                        }`}>
                          {issue.severity}
                        </span>
                        {/* Show FIXED badge if issue is fixed */}
                        {issue.status === 'fixed' && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-green-100 border-2 border-green-500 text-green-700">
                            ✅ FIXED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-normal mt-2">{issue.problem}</p>
                    </div>
                  </div>

                  {/* Problem Details */}
                  <div className="mb-3">
                    <h6 className="text-sm font-semibold text-gray-800 mb-1">📋 Symptoms:</h6>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {issue.symptoms.map((symptom, idx) => (
                        <li key={idx}>{symptom}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Impact:</strong> {issue.impact}
                    </p>
                  </div>

                  {/* Fix Instructions - Collapsible */}
                  <div className="mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFix(issue.id);
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors mb-1 w-full text-left"
                    >
                      <span>🔧 How to Fix:</span>
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
                      <div className="mt-2 pl-2 border-l-2 border-gray-300">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50 rounded p-3 mb-3">
                    <div>
                      <p className="font-medium text-gray-700">⏱️ Time:</p>
                      <p className="text-gray-600">{issue.fix.estimatedTime}</p>
                    </div>
                    {issue.fix.partsNeeded.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-700">📦 Parts:</p>
                        <p className="text-gray-600">{issue.fix.partsNeeded.join(', ')}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-700">🔨 Difficulty:</p>
                      <p className="text-gray-600 capitalize">{issue.fix.difficulty}</p>
                    </div>
                  </div>

                  {/* Action Buttons - Individual Issue */}
                  <div className="flex justify-end gap-2">
                    {issue.status === 'fixed' ? (
                      <div className="bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <span>✅</span>
                        <span>Already Fixed</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRepairFixed(issue);
                        }}
                        disabled={markingFixed === issue.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingFixed === issue.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Marking...</span>
                          </>
                        ) : (
                          <>
                            <span>✅</span>
                            Mark Fixed
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Remarks */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              📝 Admin Remarks / Notes:
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks, notes, or technician instructions here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                } text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
              >
                {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '✅ Save Remarks' : '💾 Save Remarks'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open assign modal with the first issue in the group
                if (group.issues.length > 0) {
                  onAssignTechnician(group, group.issues[0]);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>👨‍🔧</span>
              Assign Technician
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
