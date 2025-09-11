'use client';

import { useState, useMemo } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Department, Device } from '../types/device';
import DeviceCard from './DeviceCard';

interface DepartmentDetailProps {
  department: Department;
  onBack: () => void;
  onEdit?: (device: Device) => void;
}

function DepartmentDetail({ department, onBack, onEdit }: DepartmentDetailProps) {
  const { devices, deleteDevice, loading } = useDevices();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  // Filter devices by department and organize by staff
  const departmentData = useMemo(() => {
    const deptDevices = devices.filter(device => device.department === department);
    
    // Group devices by staff
    const staffGroups: Record<string, Device[]> = {};
    deptDevices.forEach(device => {
      if (!staffGroups[device.staffName]) {
        staffGroups[device.staffName] = [];
      }
      staffGroups[device.staffName].push(device);
    });

    // Calculate stats
    const stats = {
      totalDevices: deptDevices.length,
      staffCount: Object.keys(staffGroups).length,
      workingDevices: deptDevices.filter(d => d.status === 'Working').length,
      brokenDevices: deptDevices.filter(d => d.status === 'Broken').length,
      underRepairDevices: deptDevices.filter(d => d.status === 'Under Repair').length,
    };

    return { devices: deptDevices, staffGroups, stats };
  }, [devices, department]);

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
      'MARKETING': { gradient: 'from-purple-500 to-pink-600', emoji: '📢' },
      'RUBIX': { gradient: 'from-blue-500 to-indigo-600', emoji: '🔷' },
      'CONVEY': { gradient: 'from-green-500 to-teal-600', emoji: '🚚' },
      'ACCOUNT': { gradient: 'from-yellow-500 to-orange-600', emoji: '💰' },
      'HR': { gradient: 'from-rose-500 to-red-600', emoji: '👥' },
      'LITIGATION': { gradient: 'from-gray-600 to-slate-700', emoji: '⚖️' },
      'SANCO': { gradient: 'from-emerald-500 to-green-600', emoji: '🏥' },
      'POT/POC': { gradient: 'from-cyan-500 to-blue-600', emoji: '🔬' },
      'AFC': { gradient: 'from-violet-500 to-purple-600', emoji: '⚡' }
    };
    return styles[dept] || styles['MARKETING'];
  };

  const style = getDepartmentStyle(department);
  const filteredDevices = selectedStaff 
    ? departmentData.devices.filter(device => device.staffName === selectedStaff)
    : departmentData.devices;

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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 bg-gradient-to-r ${style.gradient} rounded-xl flex items-center justify-center text-white text-2xl shadow-lg`}>
              {style.emoji}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{department}</h1>
              <p className="text-gray-600">Department Overview</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
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

      {/* Staff Filter */}
      {departmentData.stats.staffCount > 1 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Filter by Staff Member</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStaff(null)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStaff === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Staff ({departmentData.stats.totalDevices})
            </button>
            {Object.entries(departmentData.staffGroups).map(([staffName, staffDevices]) => (
              <button
                key={staffName}
                onClick={() => setSelectedStaff(staffName)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStaff === staffName
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {staffName} ({staffDevices.length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">
          {selectedStaff ? `${selectedStaff}'s Devices` : 'All Devices'}
          <span className="text-sm font-normal text-gray-600 ml-2">
            ({filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''})
          </span>
        </h3>

        {loading && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-600">Loading devices...</p>
          </div>
        )}

        {!loading && filteredDevices.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
            <p className="text-gray-600">
              {selectedStaff 
                ? `${selectedStaff} doesn't have any devices yet`
                : 'This department doesn\'t have any devices yet'
              }
            </p>
          </div>
        )}

        {!loading && filteredDevices.map((device, index) => (
          <div key={device.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <DeviceCard
              device={device}
              onEdit={handleEdit}
              onDelete={(id) => setShowDeleteModal(id)}
            />
          </div>
        ))}
      </div>

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

export default DepartmentDetail;