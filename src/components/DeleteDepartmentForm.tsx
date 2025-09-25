'use client';

import { useState } from 'react';
import { useDepartments } from '../contexts/DepartmentContext';

interface DeleteDepartmentFormProps {
  onSuccess: (departmentName: string) => void;
  onCancel: () => void;
}

function DeleteDepartmentForm({ onSuccess, onCancel }: DeleteDepartmentFormProps) {
  const { departments } = useDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // All departments can be deleted
  const deletableDepartments = departments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDepartment.trim()) {
      setError('Please select a department to delete');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      onSuccess(selectedDepartment);
    } catch {
      setError('Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  if (deletableDepartments.length === 0) {
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
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  No Departments to Delete
                </h3>
                <p className="text-sm text-gray-600">
                  All departments can be deleted. Add new ones using the Add Department button.
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
          className="w-full max-w-md bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-gray-200 animate-modal-pop mt-4 sm:mt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Delete Department
              </h3>
              <p className="text-sm text-gray-600">
                Select a department to delete permanently
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="departmentSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Department to Delete
                </label>
                <select
                  id="departmentSelect"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-3 sm:px-4 text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors touch-manipulation ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select department to delete</option>
                  {deletableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              {/* Warning */}
              {selectedDepartment && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L12.732 4.5c-.77-.833-1.732-.833-2.464 0L1.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800">Warning!</p>
                      <p className="text-sm text-red-600 mt-1">
                        This will permanently remove &ldquo;{selectedDepartment}&rdquo; from the system. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors duration-200 touch-manipulation"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation"
                  disabled={isDeleting || !selectedDepartment}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Department'}
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

export default DeleteDepartmentForm;