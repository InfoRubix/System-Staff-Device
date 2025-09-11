'use client';

import { useState, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Device } from '../types/device';
import DeviceCard from './DeviceCard';

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

        {/* Accordion Device Cards */}
        <div className="space-y-4">
          {!loading && !searchLoading && Array.isArray(filteredDevices) && filteredDevices.map((device, index) => (
            <div key={device.id} className="animate-row-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <DeviceCard
                device={device}
                onEdit={onEdit}
                onDelete={(id) => setShowDeleteModal(id)}
              />
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