'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useDepartments } from '../contexts/DepartmentContext';
import { Department, Device } from '../types/device';
import DepartmentCard from './DepartmentCard';
import DepartmentDetail from './DepartmentDetail';

interface DepartmentDashboardProps {
  onEdit?: (device: Device) => void;
  onAdd?: () => void;
  onAddDepartment?: () => void;
}

type DepartmentStats = {
  totalDevices: number;
  staffCount: number;
  workingDevices: number;
  brokenDevices: number;
  underRepairDevices: number;
};

function DepartmentDashboard({ onEdit, onAdd, onAddDepartment }: DepartmentDashboardProps) {
  const { devices, loading, searchDevices, deleteDevice } = useDevices();
  const { departments } = useDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Device[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState<Device | null>(null);

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

  // Group devices by department and calculate stats
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

    // If no devices, return initialized stats
    if (!devices) return stats;

    const staffByDepartment: Record<Department, Set<string>> = {} as Record<Department, Set<string>>;
    departments.forEach(dept => {
      staffByDepartment[dept] = new Set();
    });

    devices.forEach(device => {
      const dept = device.department;
      stats[dept].totalDevices++;
      staffByDepartment[dept].add(device.staffName);
      
      switch (device.status) {
        case 'Working':
          stats[dept].workingDevices++;
          break;
        case 'Broken':
          stats[dept].brokenDevices++;
          break;
        case 'Needs Repair':
          stats[dept].underRepairDevices++;
          break;
      }
    });

    // Update staff counts
    departments.forEach(dept => {
      stats[dept].staffCount = staffByDepartment[dept].size;
    });

    return stats;
  }, [devices, departments]);

  // Calculate overall summary statistics
  const overallStats = useMemo(() => {
    if (!devices) return {
      totalDevices: 0,
      totalStaff: 0,
      workingDevices: 0,
      issueDevices: 0
    };

    const uniqueStaff = new Set(devices.map(device => device.staffName));
    const workingDevices = devices.filter(device => device.status === 'Working').length;
    const issueDevices = devices.filter(device => device.status === 'Broken' || device.status === 'Needs Repair').length;

    return {
      totalDevices: devices.length,
      totalStaff: uniqueStaff.size,
      workingDevices,
      issueDevices
    };
  }, [devices]);

  // Get all devices with issues for the modal
  const issueDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(device => device.status === 'Broken' || device.status === 'Needs Repair')
      .map(device => ({
        ...device,
        reportedDate: new Date().toLocaleDateString() // Since we don't have actual reported dates
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

  const handleEdit = (device: Device) => {
    if (onEdit) {
      onEdit(device);
    }
  };

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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-black bg-clip-text text-transparent">
            Department Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Search for staff or click on a department to view details
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {onAddDepartment && (
            <button
              onClick={onAddDepartment}
              className="w-full sm:w-auto group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-sm font-semibold text-white rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden touch-manipulation"
            >
              <span className="relative z-10 flex items-center justify-center">
                <span>Add Department</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-full sm:w-auto group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-sm font-semibold text-white rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden touch-manipulation"
            >
              <span className="relative z-10 flex items-center justify-center">
                <span>Add Device</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
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
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-3">
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
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(device);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(device.id);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
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

      {/* Empty State - Only show when not searching */}
      {!loading && !searchQuery.trim() && Object.values(departmentStats).every((stat: DepartmentStats) => stat.totalDevices === 0) && (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-gray-600">Start by adding devices to see department statistics</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full animate-modal-pop"
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
            className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl w-full max-h-[80vh] overflow-hidden animate-modal-pop"
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
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-hidden animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
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
                    <p className="text-gray-900">{showDeviceModal.deviceModel || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600">Device Type</label>
                    <p className="text-gray-900">{showDeviceModal.deviceType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600">Operating System</label>
                    <p className="text-gray-900">{showDeviceModal.operatingSystem || 'N/A'}</p>
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
                    <p className="text-gray-900">{showDeviceModal.processor || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">RAM</label>
                    <p className="text-gray-900">{showDeviceModal.ram || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">Graphics/GPU</label>
                    <p className="text-gray-900">{showDeviceModal.graphics || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600">Storage</label>
                    <p className="text-gray-900">{showDeviceModal.storage || 'N/A'}</p>
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
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeviceModal(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDeviceModal(null);
                    handleEdit(showDeviceModal);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Device
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DepartmentDashboard;