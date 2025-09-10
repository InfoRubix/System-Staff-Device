'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDevices } from '../contexts/DeviceContext';
import DeviceList from './DeviceList';
import DeviceForm from './DeviceForm';
import { Device, DeviceFormData } from '../types/device';

function Dashboard() {
  const { logout } = useAuth();
  const { addDevice, updateDevice } = useDevices();
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>(undefined);

  const handleAddDevice = () => {
    setEditingDevice(undefined);
    setShowForm(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleFormSubmit = (data: DeviceFormData) => {
    if (editingDevice) {
      updateDevice(editingDevice.id, data);
    } else {
      addDevice(data);
    }
    setShowForm(false);
    setEditingDevice(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDevice(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-fade-in">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-purple-100 animate-slide-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse-soft">
                  ✨ Device Management Portal ✨
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 animate-fade-in">Welcome, Admin! 🎯✨</span>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Logout 👋
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 animate-slide-up">
        <DeviceList 
          onEdit={handleEditDevice}
          onAdd={handleAddDevice}
        />
      </main>

      {/* Device Form Modal */}
      {showForm && (
        <div className="animate-fade-in">
          <DeviceForm
            device={editingDevice}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s both;
        }
        .animate-pulse-soft {
          animation: pulse-soft 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;