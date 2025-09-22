'use client';

import { useState, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Device } from '../types/device';

interface DeviceListProps {
  onEdit: (device: Device) => void;
  onAdd: () => void;
}

function DeviceList({ onEdit, onAdd }: DeviceListProps) {
  const { devices, deleteDevice, searchDevices, loading } = useDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState<Device | null>(null);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize filteredDevices with all devices when devices load
  useEffect(() => {
    if (!searchQuery.trim() && Array.isArray(devices)) {
      setFilteredDevices(devices);
    }
  }, [devices, searchQuery]);

  // Handle search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      return; // Let the initialization effect handle empty search
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchDevices(searchQuery);
        setFilteredDevices(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error('Search error:', error);
        setFilteredDevices([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchDevices]);

  const handleDelete = (id: string) => {
    deleteDevice(id);
    setShowDeleteModal(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // If clearing search, immediately show all devices
    if (!value.trim()) {
      setFilteredDevices(Array.isArray(devices) ? devices : []);
      setSearchLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex-auto">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-3 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-gray-900 via-red-800 to-black bg-clip-text text-transparent tracking-tight">
              Device Management Dashboard
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 font-medium animate-slide-up ml-6">
            Manage all staff devices • Track hardware specs • Monitor status updates
          </p>
        </div>
        <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-none animate-bounce-in">
          <button
            type="button"
            onClick={onAdd}
            className="w-full sm:w-auto group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-sm font-semibold text-white rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden touch-manipulation"
          >
            <span className="relative z-10 flex items-center justify-center">
              <span>Add Device</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 animate-slide-up-delayed">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-2xl leading-5 bg-white/90 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base transition-all duration-300 hover:shadow-md touch-manipulation"
            placeholder="Search by staff name..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="mt-6 sm:mt-8 animate-table-fade-in">

        {/* Device Table */}
        {!loading && !searchLoading && Array.isArray(filteredDevices) && filteredDevices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Staff Name</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Department</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Device Type</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden sm:table-cell">Operating System</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">Processor</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden lg:table-cell">RAM</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden lg:table-cell">Storage</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden xl:table-cell">User Feedback</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDevices.map((device, index) => (
                    <tr 
                      key={device.id} 
                      className="hover:bg-gray-50 transition-colors animate-row-fade-in cursor-pointer" 
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => setShowDeviceModal(device)}
                    >
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 min-w-0">
                        <div className="truncate">{device.staffName}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                        <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full whitespace-nowrap">
                          {device.department}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">{device.deviceType}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          device.status === 'Working' ? 'bg-green-100 text-green-800' :
                          device.status === 'Broken' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden sm:table-cell max-w-32">
                        <div className="truncate" title={device.operatingSystem || 'N/A'}>
                          {device.operatingSystem || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden md:table-cell max-w-28">
                        <div className="truncate" title={device.processor || 'N/A'}>
                          {device.processor || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden lg:table-cell whitespace-nowrap">{device.ram || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden lg:table-cell whitespace-nowrap">{device.storage || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden xl:table-cell max-w-32">
                        <div className="truncate" title={device.notes || 'No feedback'}>
                          {device.notes || 'No feedback'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-center">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(device);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap min-w-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteModal(device.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap min-w-0"
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

        {/* Loading and Empty States */}
        {(loading || searchLoading) && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-lg text-gray-600 mb-2 px-4">Loading</p>
          </div>
        )}

        {!loading && !searchLoading && filteredDevices.length === 0 && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <div className="mb-3 sm:mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm sm:text-lg text-gray-600 mb-2 px-4">
              {searchQuery ? 'No devices found!' : 'No devices added yet!'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 px-4">
              {searchQuery ? 'Try a different search term' : 'Add your first device to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 animate-fade-in flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(null)}
        >
          <div 
            className="relative mx-auto max-w-sm w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20">
              <div className="p-4 sm:p-6 text-center">
                <div className="mb-3 sm:mb-4">
                  <svg className="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Delete Device?</h3>
                <div className="mb-4 sm:mb-6">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to remove this device? This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="w-full sm:w-auto bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 px-4 py-2.5 sm:px-6 sm:py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteModal)}
                    className="w-full sm:w-auto bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-4 py-2.5 sm:px-6 sm:py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg touch-manipulation"
                  >
                    Delete
                  </button>
                </div>
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
                    onEdit(showDeviceModal);
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
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up-delayed {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes table-fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes row-fade-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modal-pop {
          0% { transform: scale(0.7) translateY(-20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.1s both;
        }
        .animate-slide-up-delayed {
          animation: slide-up-delayed 0.8s ease-out 0.3s both;
        }
        .animate-bounce-in {
          animation: bounce-in 0.8s ease-out 0.5s both;
        }
        .animate-table-fade-in {
          animation: table-fade-in 0.8s ease-out 0.4s both;
        }
        .animate-row-fade-in {
          animation: row-fade-in 0.6s ease-out both;
        }
        .animate-modal-pop {
          animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
      </div>
    </div>
  );
}

export default DeviceList;