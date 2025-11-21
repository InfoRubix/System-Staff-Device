'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useDepartments } from '../contexts/DepartmentContext';
import { Department, Device } from '../types/device';
import DepartmentCard from './DepartmentCard';
import DepartmentDetail from './DepartmentDetail';
import TransferStaffForm from './TransferStaffForm';
import SuccessToast from './SuccessToast';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/dateFormat';

interface DeviceScan {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  deviceType: string;
  scanTimestamp: Date;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
  cpuUsage: number;
  ramUsage: number;
  diskSpaceFree: number;
  osVersion: string;
  antivirusStatus: string;
  firewallStatus: string;
  // Hardware specifications from scan
  processor: string;
  installedRAM: string;
  graphicsCard: string;
  totalStorage: string;
  computerModel: string;
  systemType: string;
}

interface DepartmentDashboardProps {
  onEdit?: (device: Device) => void;
  onAddDepartment?: () => void;
  onDeleteDepartment?: () => void;
  onTransferStaff?: () => void;
}

type DepartmentStats = {
  totalDevices: number;
  staffCount: number;
  workingDevices: number;
  brokenDevices: number;
  underRepairDevices: number;
};

function DepartmentDashboard({ onEdit, onAddDepartment, onDeleteDepartment, onTransferStaff: _onTransferStaff }: DepartmentDashboardProps) {
  const { devices, loading, searchDevices, deleteDevice, refreshDevices } = useDevices();
  const { departments } = useDepartments();
  const [deviceScans, setDeviceScans] = useState<DeviceScan[]>([]);
  const [_scansLoading, setScansLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Device[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState<Device | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferFormKey, setTransferFormKey] = useState(0); // Counter to force fresh mount
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get scan data for the currently displayed device
  const deviceScanData = useMemo(() => {
    if (!showDeviceModal) return null;
    // Find the latest scan for this device by matching staff name
    return deviceScans.find(scan => scan.staffName === showDeviceModal.staffName);
  }, [showDeviceModal, deviceScans]);

  // Fetch device scans from Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc'),
      limit(500) // Limit to 500 most recent scans for better performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScans: DeviceScan[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allScans.push({
          id: doc.id,
          deviceId: data.deviceId,
          staffName: data.staffName,
          staffEmail: data.staffEmail || '',
          department: data.department,
          deviceType: data.deviceType || 'Desktop',
          scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
          overallStatus: data.overallStatus || 'Healthy',
          cpuUsage: data.cpuUsage || 0,
          ramUsage: data.ramUsage || 0,
          diskSpaceFree: data.diskSpaceFree || 0,
          osVersion: data.osVersion || '',
          antivirusStatus: data.antivirusStatus || '',
          firewallStatus: data.firewallStatus || '',
          // Hardware specifications
          processor: data.processor || 'Unknown',
          installedRAM: data.installedRAM || '0 GB',
          graphicsCard: data.graphicsCard || 'Unknown',
          totalStorage: data.totalStorage || '0 GB',
          computerModel: data.computerModel || 'Unknown',
          systemType: data.systemType || 'Unknown'
        });
      });

      // Group scans by deviceId and keep only the latest scan for each device
      const latestScansMap = new Map<string, DeviceScan>();
      allScans.forEach(scan => {
        const existing = latestScansMap.get(scan.deviceId);
        if (!existing || scan.scanTimestamp > existing.scanTimestamp) {
          latestScansMap.set(scan.deviceId, scan);
        }
      });

      const scans = Array.from(latestScansMap.values());
      setDeviceScans(scans);
      setScansLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showDeviceModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showDeviceModal]);

  // Group device scans by department and calculate stats
  const departmentStats = useMemo(() => {
    const stats: Record<Department, DepartmentStats> = {} as Record<Department, DepartmentStats>;

    // Initialize all departments with empty stats
    departments.forEach(dept => {
      stats[dept] = {
        totalDevices: 0,
        staffCount: 0,
        workingDevices: 0,
        brokenDevices: 0,
        underRepairDevices: 0,
      };
    });

    // If no device scans, return initialized stats
    if (!deviceScans || deviceScans.length === 0) return stats;

    const staffByDepartment: Record<Department, Set<string>> = {} as Record<Department, Set<string>>;
    departments.forEach(dept => {
      staffByDepartment[dept] = new Set();
    });

    deviceScans.forEach(scan => {
      const dept = scan.department as Department;

      // Ensure department exists in stats - handle scans with departments not in the departments list
      if (!stats[dept]) {
        stats[dept] = {
          totalDevices: 0,
          staffCount: 0,
          workingDevices: 0,
          brokenDevices: 0,
          underRepairDevices: 0,
        };
      }

      // Ensure department exists in staffByDepartment
      if (!staffByDepartment[dept]) {
        staffByDepartment[dept] = new Set();
      }

      stats[dept].totalDevices++;
      staffByDepartment[dept].add(scan.staffName);

      // Map overallStatus to device status
      switch (scan.overallStatus) {
        case 'Healthy':
          stats[dept].workingDevices++;
          break;
        case 'Warning':
          stats[dept].underRepairDevices++;
          break;
        case 'Critical':
          stats[dept].brokenDevices++;
          break;
      }
    });

    // Update staff counts for all departments (both predefined and discovered from scans)
    Object.keys(stats).forEach(dept => {
      if (staffByDepartment[dept]) {
        stats[dept].staffCount = staffByDepartment[dept].size;
      }
    });

    return stats;
  }, [deviceScans, departments]);

  // Calculate overall summary statistics from device scans
  const overallStats = useMemo(() => {
    if (!deviceScans || deviceScans.length === 0) return {
      totalDevices: 0,
      totalStaff: 0,
      workingDevices: 0,
      issueDevices: 0
    };

    const uniqueStaff = new Set(deviceScans.map(scan => scan.staffName));
    const workingDevices = deviceScans.filter(scan => scan.overallStatus === 'Healthy').length;
    const issueDevices = deviceScans.filter(scan => scan.overallStatus === 'Warning' || scan.overallStatus === 'Critical').length;

    return {
      totalDevices: deviceScans.length,
      totalStaff: uniqueStaff.size,
      workingDevices,
      issueDevices
    };
  }, [deviceScans]);

  // Get all devices with issues for the modal
  const issueDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(device => device.status === 'Broken' || device.status === 'Needs Repair')
      .map(device => ({
        ...device,
        reportedDate: formatDate(new Date()) // Since we don't have actual reported dates
      }));
  }, [devices]);

  // Handle search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchDevices(searchQuery);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchDevices]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // If clearing search, immediately clear results
    if (!value.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  // handleEdit removed - devices are scanned automatically, no manual editing needed

  const handleDelete = (id: string) => {
    deleteDevice(id);
    setShowDeleteModal(null);
    // Update search results if needed
    if (searchQuery.trim()) {
      setSearchResults(prev => prev.filter(device => device.id !== id));
    }
  };

  if (selectedDepartment) {
    return (
      <DepartmentDetail
        department={selectedDepartment}
        onBack={() => setSelectedDepartment(null)}
        onEdit={onEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">
            DEPARTMENT · OVERVIEW
          </h1>
          <p className="mt-3 text-sm text-gray-600 font-normal">
            Search for staff or click on a department to view details
          </p>
        </div>
        
        <div className="flex flex-row gap-2 w-full sm:w-auto">
          {onAddDepartment && (
            <button
              onClick={onAddDepartment}
              className="flex-1 sm:flex-none sm:w-auto bg-blue-100 border-4 border-blue-300 hover:bg-blue-200 hover:border-blue-400 px-2 py-2 sm:px-6 sm:py-3 text-center text-xs sm:text-sm font-medium sm:font-semibold text-blue-700 hover:text-blue-800 rounded-md sm:rounded-lg shadow-md sm:shadow-lg transition-all duration-200 touch-manipulation"
            >
              <span className="block sm:hidden">Add Dept</span>
              <span className="hidden sm:block">Add Department</span>
            </button>
          )}
          <button
            onClick={() => {
              setTransferFormKey(prev => prev + 1); // Increment to force fresh data
              setShowTransferForm(true);
            }}
            className="flex-1 sm:flex-none sm:w-auto bg-green-100 border-4 border-green-300 hover:bg-green-200 hover:border-green-400 px-2 py-2 sm:px-6 sm:py-3 text-center text-xs sm:text-sm font-medium sm:font-semibold text-green-700 hover:text-green-800 rounded-md sm:rounded-lg shadow-md sm:shadow-lg transition-all duration-200 touch-manipulation"
          >
            <span className="block sm:hidden">Transfer</span>
            <span className="hidden sm:block">Transfer Staff</span>
          </button>
          {onDeleteDepartment && (
            <button
              onClick={onDeleteDepartment}
              className="flex-1 sm:flex-none sm:w-auto bg-red-100 border-4 border-red-300 hover:bg-red-200 hover:border-red-400 px-2 py-2 sm:px-6 sm:py-3 text-center text-xs sm:text-sm font-medium sm:font-semibold text-red-700 hover:text-red-800 rounded-md sm:rounded-lg shadow-md sm:shadow-lg transition-all duration-200 touch-manipulation"
            >
              <span className="block sm:hidden">Delete Dept</span>
              <span className="hidden sm:block">Delete Department</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-12 sm:pl-14 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl leading-5 bg-white/90 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base transition-all duration-300 hover:shadow-md touch-manipulation"
            placeholder="Search by staff name..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Search Results
              {!searchLoading && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({searchResults.length} device{searchResults.length !== 1 ? 's' : ''} found)
                </span>
              )}
            </h2>
            {searchQuery.trim() && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>

          {searchLoading && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm sm:text-base text-gray-600">Loading</p>
            </div>
          )}

          {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <div className="mb-3">
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-sm text-gray-600">
                No devices found for &ldquo;{searchQuery}&rdquo;. Try a different search term.
              </p>
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-md overflow-hidden">
              <div className="backdrop-blur-xl bg-blue-100/40 border-b border-white/50 px-4 py-3">
                <div className="flex items-center text-sm text-blue-700 font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Results ({searchResults.length} devices found)</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Device Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Operating System</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden md:table-cell">Processor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell">RAM</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell">Storage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden xl:table-cell">User Feedback</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {searchResults.map((device, index) => (
                      <tr 
                        key={device.id} 
                        className="hover:bg-gray-50 transition-colors animate-fade-in cursor-pointer" 
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setShowDeviceModal(device)}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{device.staffName}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                            {device.department}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{device.deviceType}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            device.status === 'Working' ? 'bg-green-100 text-green-800' :
                            device.status === 'Broken' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {device.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{device.operatingSystem || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 hidden md:table-cell">{device.processor || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 hidden lg:table-cell">{device.ram || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 hidden lg:table-cell">{device.storage || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 hidden xl:table-cell max-w-xs">
                          <div className="truncate" title={device.notes || 'No feedback'}>
                            {device.notes || 'No feedback'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteModal(device.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading</p>
        </div>
      )}

      {/* Department Cards Grid - Only show when not searching */}
      {!loading && !searchQuery.trim() && (
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 lg:mb-0">
              Departments
            </h2>
            
            {/* Summary Indicators */}
            <div className="flex flex-wrap gap-2">
              <div className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
                <span>Total Devices</span>
                <span className="bg-blue-600 px-2 py-0.5 rounded-full text-xs">{overallStats.totalDevices}</span>
              </div>
              
              <div className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
                <span>Total Staff</span>
                <span className="bg-green-600 px-2 py-0.5 rounded-full text-xs">{overallStats.totalStaff}</span>
              </div>
              
              <div className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
                <span>Working</span>
                <span className="bg-emerald-600 px-2 py-0.5 rounded-full text-xs">{overallStats.workingDevices}</span>
              </div>
              
              <button
                onClick={() => setShowIssuesModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2"
              >
                <span>Issues</span>
                <span className="bg-red-600 px-2 py-0.5 rounded-full text-xs">{overallStats.issueDevices}</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {departments.map((department) => (
              <DepartmentCard
                key={department}
                department={department}
                stats={departmentStats[department] || {
                  totalDevices: 0,
                  staffCount: 0,
                  workingDevices: 0,
                  brokenDevices: 0,
                  underRepairDevices: 0,
                }}
                onClick={() => setSelectedDepartment(department)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State removed per user request */}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(null)}
        >
          <div
            className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-2xl max-w-sm w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Device?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to remove this device? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteModal)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issues Modal */}
      {showIssuesModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 flex items-center justify-center p-4"
          onClick={() => setShowIssuesModal(false)}
        >
          <div
            className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-xl shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-3 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800">Issues</h3>
                  <span className="bg-red-200 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {issueDevices.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowIssuesModal(false)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1 hover:bg-red-200 rounded-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {issueDevices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">✅</div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">No Issues</h4>
                  <p className="text-xs text-gray-500">All devices working!</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-96">
                  <div className="space-y-2">
                    {issueDevices.map((device) => (
                      <div key={device.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{device.staffName}</span>
                              <span className="text-xs text-gray-500">• {device.department}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {device.deviceType} - {device.deviceModel || 'N/A'}
                            </div>
                            {device.notes && (
                              <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 border">
                                {device.notes}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            device.status === 'Broken' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {device.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modal-pop {
          0% { transform: scale(0.7) translateY(-20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-modal-pop {
          animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      {/* Combined Device Details Modal */}
      {showDeviceModal && (
        <>
          {/* Fixed Backdrop */}
          <div
            className="modal-backdrop-fixed bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeviceModal(null)}
          ></div>
          {/* Scrollable Modal Container */}
          <div
            className="fixed top-0 left-0 right-0 bottom-0 h-screen w-screen z-50 overflow-y-auto flex items-center justify-center p-4"
            onClick={() => setShowDeviceModal(null)}
          >
          <div
            className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 backdrop-blur-xl bg-white/40 border-b border-white/50 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Device Details</h3>
                </div>
                <button
                  onClick={() => setShowDeviceModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Staff Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-800 mb-3">Staff Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-blue-600">Staff Name</label>
                    <p className="text-gray-900 font-medium">{showDeviceModal.staffName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-600">Department</label>
                    <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full mt-1">
                      {showDeviceModal.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Information */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-lg font-semibold text-green-800 mb-3">Device Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-green-600">Device Model</label>
                    <p className="text-gray-900">{deviceScanData?.computerModel || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600">Device Type</label>
                    <p className="text-gray-900">{deviceScanData?.deviceType || showDeviceModal.deviceType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600">Operating System</label>
                    <p className="text-gray-900">{deviceScanData?.osVersion || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      showDeviceModal.status === 'Working' ? 'bg-green-100 text-green-800' :
                      showDeviceModal.status === 'Broken' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {showDeviceModal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-lg font-semibold text-purple-800 mb-3">Hardware Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-purple-600">Processor/CPU</label>
                    <p className="text-gray-900">{deviceScanData?.processor || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">RAM</label>
                    <p className="text-gray-900">{deviceScanData?.installedRAM || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">Graphics/GPU</label>
                    <p className="text-gray-900">{deviceScanData?.graphicsCard || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">Storage</label>
                    <p className="text-gray-900">{deviceScanData?.totalStorage || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* User Feedback */}
              {showDeviceModal.notes && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="text-lg font-semibold text-amber-800 mb-3">User Feedback</h4>
                  <div className="bg-white rounded p-3 border border-amber-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{showDeviceModal.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 backdrop-blur-xl bg-white/40 border-t border-white/50 px-6 py-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDeviceModal(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Transfer Staff Form */}
      {showTransferForm && (
        <TransferStaffForm
          key={transferFormKey} // Use counter to force fresh mount with updated data
          onSuccess={(fromDept: string, toDept: string, staffCount: number) => {
            setShowTransferForm(false);
            setSuccessMessage(`Successfully transferred ${staffCount} staff member${staffCount !== 1 ? 's' : ''} from ${fromDept} to ${toDept}`);
            // Refresh devices to show updated department assignments
            refreshDevices();
          }}
          onCancel={() => setShowTransferForm(false)}
        />
      )}

      {/* Success Toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}

export default DepartmentDashboard;