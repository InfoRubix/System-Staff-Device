'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Department, DEPARTMENTS, Device } from '../types/device';
import DepartmentCard from './DepartmentCard';
import DepartmentDetail from './DepartmentDetail';
import DeviceCard from './DeviceCard';

interface DepartmentDashboardProps {
  onEdit?: (device: Device) => void;
  onAdd?: () => void;
}

function DepartmentDashboard({ onEdit, onAdd }: DepartmentDashboardProps) {
  const { devices, loading, searchDevices, deleteDevice } = useDevices();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Device[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Group devices by department and calculate stats
  const departmentStats = useMemo(() => {
    if (!devices) return {};
    
    const stats: Record<Department, {
      totalDevices: number;
      staffCount: number;
      workingDevices: number;
      brokenDevices: number;
      underRepairDevices: number;
    }> = {} as Record<Department, {
      totalDevices: number;
      staffCount: number;
      workingDevices: number;
      brokenDevices: number;
      underRepairDevices: number;
    }>;

    DEPARTMENTS.forEach(dept => {
      stats[dept] = {
        totalDevices: 0,
        staffCount: 0,
        workingDevices: 0,
        brokenDevices: 0,
        underRepairDevices: 0,
      };
    });

    const staffByDepartment: Record<Department, Set<string>> = {} as Record<Department, Set<string>>;
    DEPARTMENTS.forEach(dept => {
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
        case 'Under Repair':
          stats[dept].underRepairDevices++;
          break;
      }
    });

    // Update staff counts
    DEPARTMENTS.forEach(dept => {
      stats[dept].staffCount = staffByDepartment[dept].size;
    });

    return stats;
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
        
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full sm:w-auto group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-sm font-semibold text-white rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden touch-manipulation"
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>Add Device</span>
              <span className="animate-bounce">➕</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        )}
      </div>

      {/* Global Search Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400 text-lg sm:text-xl">🔍</span>
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
              <div className="animate-spin text-gray-400 text-lg">⏳</div>
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
              <div className="text-3xl sm:text-4xl mb-3 animate-spin">⏳</div>
              <p className="text-sm sm:text-base text-gray-600">Searching devices...</p>
            </div>
          )}

          {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <div className="text-3xl sm:text-4xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-sm text-gray-600">
                No devices found for &ldquo;{searchQuery}&rdquo;. Try a different search term.
              </p>
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((device, index) => (
                <div key={device.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-1">
                    <div className="flex items-center text-xs sm:text-sm text-blue-700 font-medium mb-2 px-3 pt-2">
                      <span className="mr-2">🏢</span>
                      <span>{device.department} Department</span>
                    </div>
                    <DeviceCard
                      device={device}
                      onEdit={handleEdit}
                      onDelete={(id) => setShowDeleteModal(id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl sm:text-6xl mb-4 animate-spin">⏳</div>
          <p className="text-lg text-gray-600">Loading departments...</p>
        </div>
      )}

      {/* Department Cards Grid - Only show when not searching */}
      {!loading && !searchQuery.trim() && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Departments
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {DEPARTMENTS.map((department) => (
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
      {!loading && !searchQuery.trim() && Object.values(departmentStats).every(stat => stat.totalDevices === 0) && (
        <div className="text-center py-12">
          <div className="text-4xl sm:text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-gray-600">Start by adding devices to see department statistics</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full animate-modal-pop">
            <div className="p-6 text-center">
              <div className="text-4xl mb-4 animate-bounce">🗑️</div>
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
    </div>
  );
}

export default DepartmentDashboard;