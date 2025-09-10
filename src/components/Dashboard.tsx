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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-red-50 to-white animate-fade-in">
      {/* Floating Computer Emojis */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-float-slow absolute top-24 left-16 text-2xl opacity-60">💻</div>
        <div className="animate-float-medium absolute top-48 right-24 text-xl opacity-50">🖥️</div>
        <div className="animate-float-fast absolute bottom-36 left-24 text-2xl opacity-60">⌨️</div>
        <div className="animate-float-slow absolute top-72 left-1/3 text-xl opacity-50">🖱️</div>
        <div className="animate-float-medium absolute bottom-24 right-16 text-2xl opacity-60">💾</div>
        <div className="animate-float-fast absolute top-36 right-1/4 text-xl opacity-50">🔧</div>
        <div className="animate-float-slow absolute bottom-48 left-1/4 text-xl opacity-50">💻</div>
        <div className="animate-float-medium absolute top-96 right-1/3 text-2xl opacity-60">🖥️</div>
        
        {/* Additional floating emojis */}
        <div className="animate-float-fast absolute top-20 right-20 text-lg opacity-40">⌨️</div>
        <div className="animate-float-slow absolute top-80 right-32 text-xl opacity-55">🖱️</div>
        <div className="animate-float-medium absolute bottom-60 left-32 text-lg opacity-45">💾</div>
        <div className="animate-float-fast absolute top-52 left-48 text-xl opacity-50">🔧</div>
        <div className="animate-float-slow absolute bottom-80 right-48 text-lg opacity-40">💻</div>
        <div className="animate-float-medium absolute top-40 left-2/3 text-xl opacity-55">🖥️</div>
        <div className="animate-float-fast absolute bottom-40 right-2/3 text-lg opacity-45">⌨️</div>
        <div className="animate-float-slow absolute top-64 right-12 text-xl opacity-50">🖱️</div>
        <div className="animate-float-medium absolute bottom-16 left-20 text-lg opacity-40">💾</div>
        <div className="animate-float-fast absolute top-28 left-3/4 text-xl opacity-55">🔧</div>
        <div className="animate-float-slow absolute bottom-72 left-12 text-lg opacity-45">💻</div>
        <div className="animate-float-medium absolute top-84 right-1/4 text-xl opacity-50">🖥️</div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-10 bg-gradient-to-r from-slate-900 via-gray-900 to-red-900 backdrop-blur-sm shadow-2xl border-b border-red-800/30 animate-slide-down">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-18">
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm sm:text-lg">🖥️</span>
                  </div>
                  <div>
                    <h1 className="text-sm sm:text-xl lg:text-2xl font-black bg-gradient-to-r from-white via-gray-100 to-red-200 bg-clip-text text-transparent tracking-tight">
                      Device Management
                    </h1>
                    <p className="text-xs text-red-300/80 font-medium hidden sm:block">Professional Portal</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-white font-medium">Welcome, Admin</span>
              </div>
              <button
                onClick={logout}
                className="group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg touch-manipulation overflow-hidden"
              >
                <span className="relative z-10 flex items-center space-x-1">
                  <span>Logout</span>
                  <span className="text-xs">🚪</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-3 sm:py-6 animate-slide-up">
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
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-3deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
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
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;