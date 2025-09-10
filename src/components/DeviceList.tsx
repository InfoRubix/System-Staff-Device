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

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
    switch (status) {
      case 'Working':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Broken':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'Under Repair':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getOwnershipBadge = (ownership: string) => {
    const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
    return ownership === 'Company-owned'
      ? `${baseClasses} bg-blue-100 text-blue-800`
      : `${baseClasses} bg-purple-100 text-purple-800`;
  };

  return (
    <div className="px-3 sm:px-6 lg:px-8">
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
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>Add Device</span>
              <span className="animate-bounce">➕</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 animate-slide-up-delayed">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400 text-sm sm:text-base">🔍</span>
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
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="-mx-6 lg:-mx-8 overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <div className="overflow-hidden shadow-xl ring-1 ring-gray-200 ring-opacity-50 rounded-3xl backdrop-blur-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-red-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Staff & Department
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Device Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Hardware Specs
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Ownership
                      </th>
                      <th className="relative px-6 py-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/95 divide-y divide-gray-100">
                    {!loading && !searchLoading && Array.isArray(filteredDevices) && filteredDevices.map((device, index) => (
                      <tr key={device.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50 transition-all duration-300 animate-row-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{device.staffName}</div>
                            <div className="text-sm font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full inline-block mt-1">{device.department}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{device.deviceModel}</div>
                            <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">{device.deviceType} • {device.operatingSystem}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md border border-blue-200">CPU</span>
                              <span className="text-gray-800 font-medium">{device.processor}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md border border-green-200">RAM</span>
                              <span className="text-gray-800 font-medium">{device.ram}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-md border border-orange-200">GPU</span>
                              <span className="text-gray-800 font-medium">{device.graphics}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-medium text-gray-900 bg-purple-100 px-2 py-1 rounded-md border border-purple-200">SSD</span>
                              <span className="text-gray-800 font-medium">{device.storage}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(device.status)}>{device.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getOwnershipBadge(device.ownership)}>{device.ownership}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEdit(device)}
                              className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 px-3 py-2 rounded-full transform transition-all duration-200 hover:scale-105 hover:shadow-md"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(device.id)}
                              className="bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 px-3 py-2 rounded-full transform transition-all duration-200 hover:scale-105 hover:shadow-md"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {!loading && !searchLoading && Array.isArray(filteredDevices) && filteredDevices.map((device, index) => (
            <div key={device.id} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-4 animate-row-fade-in hover:shadow-xl transition-all duration-300" style={{ animationDelay: `${index * 50}ms` }}>
              {/* Header with Staff Info */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{device.staffName}</h3>
                  <span className="text-sm font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full inline-block mt-1">{device.department}</span>
                </div>
                <div className="flex space-x-1">
                  <span className={getStatusBadge(device.status)}>{device.status}</span>
                </div>
              </div>

              {/* Device Details */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Device Details</h4>
                <div className="space-y-1">
                  <p className="text-sm"><span className="font-medium text-gray-900">{device.deviceModel}</span></p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{device.deviceType}</span>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{device.operatingSystem}</span>
                    <span className={getOwnershipBadge(device.ownership)}>{device.ownership}</span>
                  </div>
                </div>
              </div>

              {/* Hardware Specs */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Hardware Specs</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md border border-blue-200">CPU</span>
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate">{device.processor}</span>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md border border-green-200">RAM</span>
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate">{device.ram}</span>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-md border border-orange-200">GPU</span>
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate">{device.graphics}</span>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-900 bg-purple-100 px-2 py-1 rounded-md border border-purple-200">SSD</span>
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate">{device.storage}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => onEdit(device)}
                  className="flex-1 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 px-4 py-2 rounded-full text-sm font-medium transform transition-all duration-200 hover:scale-105 hover:shadow-md touch-manipulation"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(device.id)}
                  className="flex-1 bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 px-4 py-2 rounded-full text-sm font-medium transform transition-all duration-200 hover:scale-105 hover:shadow-md touch-manipulation"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Loading and Empty States */}
        {(loading || searchLoading) && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-spin">⏳</div>
            <p className="text-sm sm:text-lg text-gray-600 mb-2 px-4">
              {searchLoading ? 'Searching devices...' : 'Loading devices...'}
            </p>
          </div>
        )}

        {!loading && !searchLoading && filteredDevices.length === 0 && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
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
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in flex items-center justify-center p-4">
          <div className="relative mx-auto max-w-sm w-full animate-modal-pop">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20">
              <div className="p-4 sm:p-6 text-center">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 animate-bounce">🗑️</div>
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
  );
}

export default DeviceList;