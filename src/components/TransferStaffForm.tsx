'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDepartments } from '../contexts/DepartmentContext';
import { staffService, StaffMember } from '../lib/staffService';

interface TransferStaffFormProps {
  onSuccess: (fromDept: string, toDept: string, staffCount: number) => void;
  onCancel: () => void;
}

interface StaffTransfer {
  staffId: string;
  staffName: string;
  currentDept: string;
  newDept: string;
  selected: boolean;
}

function TransferStaffForm({ onSuccess, onCancel }: TransferStaffFormProps) {
  const { departments } = useDepartments();
  const [fromDepartment, setFromDepartment] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffTransfers, setStaffTransfers] = useState<StaffTransfer[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);

  // Load all staff members - reload every time the component mounts
  // This ensures staff counts are always up-to-date when modal opens
  useEffect(() => {
    const loadStaff = async () => {
      try {
        setIsLoading(true);
        const allStaff = await staffService.getAllStaff();
        setStaffList(allStaff);
        console.log('✅ Loaded fresh staff data:', allStaff.length, 'staff members');
      } catch (err) {
        console.error('Failed to load staff:', err);
        setError('Failed to load staff members');
      } finally {
        setIsLoading(false);
      }
    };

    // Load staff data immediately when component mounts
    loadStaff();
  }, []); // Empty dependency array means this runs once per mount

  // Get staff for selected department
  const departmentStaff = useMemo(() => {
    if (!fromDepartment) return [];
    return staffList.filter(staff => staff.department === fromDepartment);
  }, [staffList, fromDepartment]);

  // Initialize transfer list when department changes
  useEffect(() => {
    const transfers: StaffTransfer[] = departmentStaff.map(staff => ({
      staffId: staff.id,
      staffName: staff.name,
      currentDept: staff.department,
      newDept: staff.department, // Initially same as current
      selected: false
    }));
    setStaffTransfers(transfers);
  }, [departmentStaff]);

  // Get staff count per department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    departments.forEach(dept => {
      counts[dept] = staffList.filter(s => s.department === dept).length;
    });
    console.log('📊 Department staff counts:', counts);
    return counts;
  }, [staffList, departments]);

  const selectedCount = staffTransfers.filter(t => t.selected).length;

  const handleSelectAll = () => {
    const allSelected = selectedCount === staffTransfers.length;
    setStaffTransfers(prev => prev.map(t => ({
      ...t,
      selected: !allSelected
    })));
  };

  const handleStaffToggle = (staffId: string) => {
    setStaffTransfers(prev => prev.map(t =>
      t.staffId === staffId ? { ...t, selected: !t.selected } : t
    ));
  };

  const handleDepartmentChange = (staffId: string, newDept: string) => {
    setStaffTransfers(prev => prev.map(t =>
      t.staffId === staffId ? { ...t, newDept } : t
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStaff = staffTransfers.filter(t => t.selected);

    if (selectedStaff.length === 0) {
      setError('Please select at least one staff member to transfer');
      return;
    }

    // Check if any selected staff has actually changed department
    const staffToTransfer = selectedStaff.filter(t => t.newDept !== t.currentDept);

    if (staffToTransfer.length === 0) {
      setError('Selected staff members are already in their target departments');
      return;
    }

    setIsTransferring(true);
    setError('');

    try {
      // Group transfers by destination department
      const transfersByDept = new Map<string, string[]>();

      staffToTransfer.forEach(transfer => {
        if (!transfersByDept.has(transfer.newDept)) {
          transfersByDept.set(transfer.newDept, []);
        }
        transfersByDept.get(transfer.newDept)!.push(transfer.staffId);
      });

      // Execute transfers for each destination department
      for (const [newDept, staffIds] of transfersByDept.entries()) {
        await staffService.transferStaff(staffIds, newDept);
      }

      // Get destination departments for success message
      const destDepts = Array.from(new Set(staffToTransfer.map(t => t.newDept))).join(', ');

      onSuccess(fromDepartment, destDepts, staffToTransfer.length);
    } catch (err) {
      console.error('Transfer failed:', err);
      setError('Failed to transfer staff. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (departments.length < 2) {
    return (
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 overflow-y-auto h-screen w-screen z-50 animate-fade-in"
        onClick={onCancel}
      >
        <div className="relative min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4">
          <div
            className="w-full max-w-md bg-white rounded-lg sm:rounded-2xl shadow-2xl animate-modal-pop mt-4 sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
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
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 overflow-y-auto h-screen w-screen z-50 animate-fade-in"
      onClick={onCancel}
    >
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4">
        <div
          className="w-full max-w-3xl bg-white rounded-lg sm:rounded-2xl shadow-2xl animate-modal-pop mt-4 sm:mt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Transfer Staff
              </h3>
              <p className="text-sm text-gray-600">
                Transfer staff members to different departments
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Department Selection */}
              <div>
                <label htmlFor="fromDept" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Source Department
                </label>
                <select
                  id="fromDept"
                  value={fromDepartment}
                  onChange={(e) => {
                    setFromDepartment(e.target.value);
                    setError('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  disabled={isLoading}
                >
                  <option value="">Choose a department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({departmentCounts[dept] || 0} staff)
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff List */}
              {fromDepartment && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      {fromDepartment} - {departmentStaff.length} Staff Members
                    </label>
                    {departmentStaff.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        {selectedCount === staffTransfers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading staff...</p>
                    </div>
                  ) : departmentStaff.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">No staff found in this department</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                      {staffTransfers.map((transfer) => (
                        <div
                          key={transfer.staffId}
                          className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={`staff-${transfer.staffId}`}
                            checked={transfer.selected}
                            onChange={() => handleStaffToggle(transfer.staffId)}
                            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                          />

                          <label
                            htmlFor={`staff-${transfer.staffId}`}
                            className="flex-1 text-sm font-medium text-gray-900 cursor-pointer"
                          >
                            {transfer.staffName}
                          </label>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">→</span>
                            <select
                              value={transfer.newDept}
                              onChange={(e) => handleDepartmentChange(transfer.staffId, e.target.value)}
                              disabled={!transfer.selected}
                              className={`text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                                transfer.selected
                                  ? 'bg-white text-gray-900'
                                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {departments.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transfer Summary */}
              {selectedCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800">Transfer Summary</p>
                      <p className="text-sm text-green-600 mt-1">
                        {selectedCount} staff member{selectedCount !== 1 ? 's' : ''} selected for transfer.
                        <br />
                        <span className="text-xs text-green-500 italic">
                          Note: Historical scan data will be preserved with original department.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 flex items-center bg-red-50 border border-red-200 rounded-lg p-3">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
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
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation"
                  disabled={isTransferring || selectedCount === 0}
                >
                  {isTransferring ? 'Transferring...' : `Transfer ${selectedCount} Staff`}
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
