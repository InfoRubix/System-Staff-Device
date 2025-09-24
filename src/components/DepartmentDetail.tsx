'use client';

import { useState, useMemo } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Department, Device } from '../types/device';

interface DepartmentDetailProps {
  department: Department;
  onBack: () => void;
  onEdit?: (device: Device) => void;
}

function DepartmentDetail({ department, onBack, onEdit }: DepartmentDetailProps) {
  const { devices, deleteDevice, loading } = useDevices();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter devices by department and search query
  const departmentData = useMemo(() => {
    const deptDevices = devices.filter(device => device.department === department);

    // Apply search filter
    const filteredDevices = searchQuery.trim()
      ? deptDevices.filter(device =>
          device.staffName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : deptDevices;

    // Group filtered devices by staff
    const staffGroups: Record<string, Device[]> = {};
    filteredDevices.forEach(device => {
      if (!staffGroups[device.staffName]) {
        staffGroups[device.staffName] = [];
      }
      staffGroups[device.staffName].push(device);
    });

    // Calculate stats based on filtered results
    const stats = {
      totalDevices: filteredDevices.length,
      staffCount: Object.keys(staffGroups).length,
      workingDevices: filteredDevices.filter(d => d.status === 'Working').length,
      brokenDevices: filteredDevices.filter(d => d.status === 'Broken').length,
      underRepairDevices: filteredDevices.filter(d => d.status === 'Needs Repair').length,
    };

    return {
      devices: filteredDevices,
      staffGroups,
      stats,
      allDeptDevices: deptDevices // Keep all department devices for reference
    };
  }, [devices, department, searchQuery]);

  const handleDelete = (id: string) => {
    deleteDevice(id);
    setShowDeleteModal(null);
  };

  const handleEdit = (device: Device) => {
    if (onEdit) {
      onEdit(device);
    }
  };

  // Get department color scheme
  const getDepartmentStyle = (dept: Department) => {
    const styles = {
      'MARKETING': { gradient: 'from-purple-500 to-pink-600', icon: 'MKT' },
      'RUBIX': { gradient: 'from-blue-500 to-indigo-600', icon: 'RBX' },
      'CONVEY': { gradient: 'from-green-500 to-teal-600', icon: 'CNV' },
      'ACCOUNT': { gradient: 'from-yellow-500 to-orange-600', icon: 'ACC' },
      'HR': { gradient: 'from-rose-500 to-red-600', icon: 'HR' },
      'LITIGATION': { gradient: 'from-gray-600 to-slate-700', icon: 'LIT' },
      'SANCO': { gradient: 'from-emerald-500 to-green-600', icon: 'SAN' },
      'POT/POC': { gradient: 'from-cyan-500 to-blue-600', icon: 'POC' },
      'AFC': { gradient: 'from-violet-500 to-purple-600', icon: 'AFC' },
      'RDHOMES': { gradient: 'from-pink-500 to-rose-600', icon: 'RD' },
      'QHOMES': { gradient: 'from-indigo-500 to-blue-600', icon: 'QH' }
    };
    return styles[dept] || styles['MARKETING'];
  };

  const style = getDepartmentStyle(department);
  const filteredDevices = departmentData.devices;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back to Departments</span>
        </button>
      </div>

      {/* Department Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${style.gradient} rounded-xl flex items-center justify-center text-white text-lg sm:text-2xl shadow-lg`}>
              {style.icon}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{department}</h1>
              <p className="text-sm sm:text-base text-gray-600">Department Overview</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{departmentData.stats.totalDevices}</div>
            <div className="text-sm text-gray-600">Total Devices</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{departmentData.stats.staffCount}</div>
            <div className="text-sm text-gray-600">Staff Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{departmentData.stats.workingDevices}</div>
            <div className="text-sm text-gray-600">Working</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {departmentData.stats.brokenDevices + departmentData.stats.underRepairDevices}
            </div>
            <div className="text-sm text-gray-600">Issues</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            placeholder="Search staff name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Devices List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">
          {searchQuery ? `Search Results` : 'Department Devices'}
          <span className="text-sm font-normal text-gray-600 ml-2">
            ({filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''})
          </span>
        </h3>

        {loading && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading</p>
          </div>
        )}

        {!loading && filteredDevices.length === 0 && (
          <div className="text-center py-8">
            <div className="mb-4">
              {searchQuery ? (
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No Staff Found' : 'No Devices Found'}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? `No staff found matching "${searchQuery}". Try a different search term.`
                : 'This department doesn\'t have any devices yet'
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Device Table */}
        {!loading && filteredDevices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Device Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Operating System</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden">Processor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden">RAM</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden">Storage</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDevices.map((device, index) => (
                    <tr 
                      key={device.id} 
                      className="hover:bg-gray-50 transition-colors animate-fade-in cursor-pointer" 
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => setShowDeviceModal(device)}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{device.staffName}</td>
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
                      <td className="px-4 py-4 text-sm text-gray-700 hidden">{device.processor || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 hidden">{device.ram || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 hidden">{device.storage || 'N/A'}</td>
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

      {/* Combined Device Details Modal */}
      {showDeviceModal && (
        <>
          {/* Fixed Backdrop */}
          <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm h-screen w-screen z-50"
            onClick={() => setShowDeviceModal(null)}
          ></div>
          {/* Scrollable Modal Container */}
          <div
            className="fixed top-0 left-0 right-0 bottom-0 h-screen w-screen z-50 overflow-y-auto flex items-center justify-center p-4"
            onClick={() => setShowDeviceModal(null)}
          >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full my-8 animate-modal-pop flex flex-col max-h-[90vh]"
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
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                
                {/* Hardware Specifications - Sub-section within Device Information */}
                <div className="mt-4 bg-white rounded-lg p-3 border border-green-300">
                  <h5 className="text-base font-semibold text-green-700 mb-3">Hardware Specifications</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Processor/CPU</label>
                      <p className="text-gray-900">{showDeviceModal.processor || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">RAM</label>
                      <p className="text-gray-900">{showDeviceModal.ram || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Graphics/GPU</label>
                      <p className="text-gray-900">{showDeviceModal.graphics || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Storage</label>
                      <p className="text-gray-900">{showDeviceModal.storage || 'N/A'}</p>
                    </div>
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
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
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

export default DepartmentDetail;