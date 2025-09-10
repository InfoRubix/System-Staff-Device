'use client';

import { useState } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Device } from '../types/device';

interface DeviceListProps {
  onEdit: (device: Device) => void;
  onAdd: () => void;
}

function DeviceList({ onEdit, onAdd }: DeviceListProps) {
  const { devices, deleteDevice, searchDevices } = useDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const filteredDevices = searchQuery ? searchDevices(searchQuery) : devices;

  const handleDelete = (id: string) => {
    deleteDevice(id);
    setShowDeleteModal(null);
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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center animate-fade-in">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎯 Device Management Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 animate-slide-up">
            Manage all staff devices with style! ✨ Track hardware specs and status updates.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none animate-bounce-in">
          <button
            type="button"
            onClick={onAdd}
            className="group relative bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 text-center text-sm font-semibold text-white rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl overflow-hidden"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span>Add Device</span>
              <span className="animate-bounce">➕</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>

      <div className="mt-6 animate-slide-up-delayed">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-purple-400 animate-pulse">🔍</span>
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3 border-2 border-purple-200 rounded-2xl leading-5 bg-white/70 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 sm:text-sm transition-all duration-300 hover:shadow-md"
            placeholder="Search by staff name... ✨"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flow-root animate-table-fade-in">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-xl ring-1 ring-purple-200 ring-opacity-50 rounded-3xl backdrop-blur-sm">
              <table className="min-w-full divide-y divide-purple-200">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                      👥 Staff & Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                      💻 Device Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                      ⚡ Hardware Specs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                      📊 Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                      🏢 Ownership
                    </th>
                    <th className="relative px-6 py-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/90 divide-y divide-purple-100">
                  {filteredDevices.map((device, index) => (
                    <tr key={device.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md animate-row-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{device.staffName}</div>
                          <div className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full inline-block mt-1">{device.department}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{device.deviceModel}</div>
                          <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">{device.deviceType} • {device.operatingSystem}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded-lg">🖥️ {device.processor}</div>
                          <div className="text-gray-700 bg-green-50 px-2 py-1 rounded-lg">🧠 {device.ram}</div>
                          <div className="text-gray-700 bg-yellow-50 px-2 py-1 rounded-lg">🎮 {device.graphics}</div>
                          <div className="text-gray-700 bg-purple-50 px-2 py-1 rounded-lg">💾 {device.storage}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(device.status)}>{device.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getOwnershipBadge(device.ownership)}>{device.ownership}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => onEdit(device)}
                          className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 px-3 py-2 rounded-full mr-2 transform transition-all duration-200 hover:scale-105 hover:shadow-md"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(device.id)}
                          className="bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 px-3 py-2 rounded-full transform transition-all duration-200 hover:scale-105 hover:shadow-md"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDevices.length === 0 && (
                <div className="text-center py-12 animate-fade-in">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg text-gray-600 mb-2">
                    {searchQuery ? 'No magical devices found! ✨' : 'No devices in the portal yet! 🏰'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? 'Try a different search term' : 'Add your first device to get started!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-20 mx-auto p-6 w-96 animate-modal-pop">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
              <div className="p-6 text-center">
                <div className="text-5xl mb-4 animate-bounce">🗑️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Device?</h3>
                <div className="mb-6">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to remove this device from the portal? This magical action cannot be undone! ✨
                  </p>
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteModal)}
                    className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Delete ⚡
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