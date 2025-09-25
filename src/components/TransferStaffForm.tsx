'use client';

import { useState, useMemo } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useDepartments } from '../contexts/DepartmentContext';

interface TransferStaffFormProps {
  onSuccess: (fromDept: string, toDept: string, staffCount: number) => void;
  onCancel: () => void;
}

interface StaffInfo {
  staffName: string;
  deviceCount: number;
  devices: string[]; // device IDs
}

function TransferStaffForm({ onSuccess, onCancel }: TransferStaffFormProps) {
  const { devices, updateDevice } = useDevices();
  const { departments } = useDepartments();
  const [fromDepartment, setFromDepartment] = useState('');
  const [toDepartment, setToDepartment] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Get staff grouped by department
  const staffByDepartment = useMemo(() => {
    const grouped: Record<string, StaffInfo[]> = {};

    devices.forEach(device => {
      if (!grouped[device.department]) {
        grouped[device.department] = [];
      }

      const existingStaff = grouped[device.department].find(s => s.staffName === device.staffName);
      if (existingStaff) {
        existingStaff.deviceCount++;
        existingStaff.devices.push(device.id);
      } else {
        grouped[device.department].push({
          staffName: device.staffName,
          deviceCount: 1,
          devices: [device.id]
        });
      }
    });

    return grouped;
  }, [devices]);

  const availableStaff = fromDepartment ? (staffByDepartment[fromDepartment] || []) : [];
  const availableToDepartments = departments.filter(dept => dept !== fromDepartment);

  const handleSelectAll = () => {
    if (selectedStaff.length === availableStaff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(availableStaff.map(staff => staff.staffName));
    }
  };

  const handleStaffToggle = (staffName: string) => {
    setSelectedStaff(prev =>
      prev.includes(staffName)
        ? prev.filter(name => name !== staffName)
        : [...prev, staffName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromDepartment.trim()) {
      setError('Please select source department');
      return;
    }

    if (!toDepartment.trim()) {
      setError('Please select destination department');
      return;
    }

    if (selectedStaff.length === 0) {
      setError('Please select at least one staff member to transfer');
      return;
    }

    setIsTransferring(true);
    setError('');

    try {
      // Get all devices for selected staff
      const devicesToUpdate = devices.filter(device =>
        device.department === fromDepartment &&
        selectedStaff.includes(device.staffName)
      );

      // Update each device's department
      const updatePromises = devicesToUpdate.map(device =>
        updateDevice(device.id, {
          department: toDepartment,
          updatedAt: new Date()
        })
      );

      await Promise.all(updatePromises);

      onSuccess(fromDepartment, toDepartment, selectedStaff.length);
    } catch {
      setError('Failed to transfer staff. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (departments.length < 2) {
    return (
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 animate-fade-in"
        onClick={onCancel}
      >
        <div className="relative min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4">
          <div
            className="w-full max-w-md bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-gray-200 animate-modal-pop mt-4 sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Not Enough Departments
                </h3>
                <p className="text-sm text-gray-600">
                  You need at least 2 departments to transfer staff between them.
                </p>
              </div>

              {/* Button */}
              <div className="flex justify-center">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors touch-manipulation"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 animate-fade-in"
      onClick={onCancel}
    >
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4">
        <div
          className="w-full max-w-2xl bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-gray-200 animate-modal-pop mt-4 sm:mt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Transfer Staff Between Departments
              </h3>
              <p className="text-sm text-gray-600">
                Move staff members and their devices from one department to another
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Department Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fromDept" className="block text-sm font-medium text-gray-700 mb-2">
                    From Department
                  </label>
                  <select
                    id="fromDept"
                    value={fromDepartment}
                    onChange={(e) => {
                      setFromDepartment(e.target.value);
                      setSelectedStaff([]); // Reset selected staff
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select source department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept} ({staffByDepartment[dept]?.length || 0} staff)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="toDept" className="block text-sm font-medium text-gray-700 mb-2">
                    To Department
                  </label>
                  <select
                    id="toDept"
                    value={toDepartment}
                    onChange={(e) => setToDepartment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select destination department</option>
                    {availableToDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Staff Selection */}
              {fromDepartment && availableStaff.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Select Staff to Transfer ({availableStaff.length} available)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedStaff.length === availableStaff.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableStaff.map((staff) => (
                      <div
                        key={staff.staffName}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`staff-${staff.staffName}`}
                            checked={selectedStaff.includes(staff.staffName)}
                            onChange={() => handleStaffToggle(staff.staffName)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3">
                            <label
                              htmlFor={`staff-${staff.staffName}`}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {staff.staffName}
                            </label>
                            <p className="text-xs text-gray-500">
                              {staff.deviceCount} device{staff.deviceCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fromDepartment && availableStaff.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No staff found in the selected department</p>
                </div>
              )}

              {/* Transfer Summary */}
              {selectedStaff.length > 0 && fromDepartment && toDepartment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Transfer Summary</p>
                      <p className="text-sm text-blue-600 mt-1">
                        {selectedStaff.length} staff member{selectedStaff.length !== 1 ? 's' : ''} and their devices will be moved from <strong>{fromDepartment}</strong> to <strong>{toDepartment}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors duration-200 touch-manipulation"
                  disabled={isTransferring}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation"
                  disabled={isTransferring || !fromDepartment || !toDepartment || selectedStaff.length === 0}
                >
                  {isTransferring ? 'Transferring...' : `Transfer ${selectedStaff.length || 0} Staff`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-pop {
          0% { transform: scale(0.7) translateY(-20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-modal-pop {
          animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

export default TransferStaffForm;