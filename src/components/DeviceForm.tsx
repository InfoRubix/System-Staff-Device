'use client';

import { useState, useEffect } from 'react';
import { Device, DeviceFormData, DEPARTMENTS } from '../types/device';

interface DeviceFormProps {
  device?: Device;
  onSubmit: (data: DeviceFormData) => void;
  onCancel: () => void;
}

function DeviceForm({ device, onSubmit, onCancel }: DeviceFormProps) {
  const [formData, setFormData] = useState<DeviceFormData>({
    staffName: '',
    department: 'MARKETING',
    deviceType: 'Laptop',
    deviceModel: '',
    operatingSystem: '',
    processor: '',
    ram: '',
    graphics: '',
    storage: '',
    status: 'Working',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<DeviceFormData>>({});

  useEffect(() => {
    if (device) {
      setFormData({
        staffName: device.staffName,
        department: device.department,
        deviceType: device.deviceType,
        deviceModel: device.deviceModel,
        operatingSystem: device.operatingSystem,
        processor: device.processor,
        ram: device.ram,
        graphics: device.graphics,
        storage: device.storage,
        status: device.status,
        notes: device.notes || '',
      });
    }
  }, [device]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof DeviceFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<DeviceFormData> = {};

    // Only validate that staff name has some value (can be empty for others)
    if (!formData.staffName.trim()) {
      newErrors.staffName = 'Staff name is required';
    }

    // All other fields are now optional and can be empty
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-screen w-screen z-50 animate-fade-in"
      onClick={onCancel}
    >
      <div className="relative min-h-full flex items-center justify-center p-2 sm:p-4 lg:p-6">
        <div
          className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl bg-white rounded-lg shadow-xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                {device ? 'Edit Device' : 'Add New Device'}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {device ? 'Update device information' : 'Enter device details and specifications'}
              </p>
            </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="staffName" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Staff Name                </label>
                <input
                  type="text"
                  name="staffName"
                  id="staffName"
                  value={formData.staffName}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.staffName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter staff name"
                />
                {errors.staffName && (
                  <p className="mt-1 text-sm text-red-600">{errors.staffName}</p>
                )}
              </div>

              <div>
                <label htmlFor="department" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Department                </label>
                <select
                  name="department"
                  id="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                )}
              </div>

              <div>
                <label htmlFor="deviceType" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Device Type                </label>
                <select
                  name="deviceType"
                  id="deviceType"
                  value={formData.deviceType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Phone">Phone</option>
                </select>
              </div>

              <div>
                <label htmlFor="deviceModel" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Device Model                </label>
                <input
                  type="text"
                  name="deviceModel"
                  id="deviceModel"
                  value={formData.deviceModel}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.deviceModel ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter device model (optional)"
                />
                {errors.deviceModel && (
                  <p className="mt-1 text-sm text-red-600">{errors.deviceModel}</p>
                )}
              </div>

              <div>
                <label htmlFor="operatingSystem" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Operating System                </label>
                <select
                  name="operatingSystem"
                  id="operatingSystem"
                  value={formData.operatingSystem}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.operatingSystem ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Operating System (optional)</option>
                  <optgroup label="Windows">
                    <option value="Windows 7">Windows 7</option>
                    <option value="Windows 8.1">Windows 8.1</option>
                    <option value="Windows 10">Windows 10</option>
                    <option value="Windows 11">Windows 11</option>
                  </optgroup>
                  <optgroup label="macOS">
                    <option value="macOS Monterey">macOS Monterey</option>
                    <option value="macOS Ventura">macOS Ventura</option>
                    <option value="macOS Sonoma">macOS Sonoma</option>
                  </optgroup>
                  <optgroup label="iOS">
                    <option value="iOS 16">iOS 16</option>
                    <option value="iOS 17">iOS 17</option>
                    <option value="iOS 18">iOS 18</option>
                  </optgroup>
                  <optgroup label="Android">
                    <option value="Android 11">Android 11</option>
                    <option value="Android 12">Android 12</option>
                    <option value="Android 13">Android 13</option>
                    <option value="Android 14">Android 14</option>
                    <option value="Android 15">Android 15</option>
                  </optgroup>
                </select>
                {errors.operatingSystem && (
                  <p className="mt-1 text-sm text-red-600">{errors.operatingSystem}</p>
                )}
              </div>

              <div>
                <label htmlFor="processor" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Processor/CPU                </label>
                <input
                  type="text"
                  name="processor"
                  id="processor"
                  value={formData.processor}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.processor ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter processor (optional)"
                />
                {errors.processor && (
                  <p className="mt-1 text-sm text-red-600">{errors.processor}</p>
                )}
              </div>

              <div>
                <label htmlFor="ram" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  RAM                </label>
                <select
                  name="ram"
                  id="ram"
                  value={formData.ram}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.ram ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select RAM (optional)</option>
                  <option value="2 GB">2 GB</option>
                  <option value="4 GB">4 GB</option>
                  <option value="6 GB">6 GB</option>
                  <option value="8 GB">8 GB</option>
                  <option value="16 GB">16 GB</option>
                  <option value="32 GB">32 GB</option>
                </select>
                {errors.ram && (
                  <p className="mt-1 text-sm text-red-600">{errors.ram}</p>
                )}
              </div>

              <div>
                <label htmlFor="graphics" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Graphics/GPU                </label>
                <input
                  type="text"
                  name="graphics"
                  id="graphics"
                  value={formData.graphics}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.graphics ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter graphics card (optional)"
                />
                {errors.graphics && (
                  <p className="mt-1 text-sm text-red-600">{errors.graphics}</p>
                )}
              </div>

              <div>
                <label htmlFor="storage" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Storage                </label>
                <select
                  name="storage"
                  id="storage"
                  value={formData.storage}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.storage ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select storage (optional)</option>
                  <option value="256 GB">256 GB</option>
                  <option value="512 GB">512 GB</option>
                  <option value="1 TB">1 TB</option>
                  <option value="2 TB">2 TB</option>
                </select>
                {errors.storage && (
                  <p className="mt-1 text-sm text-red-600">{errors.storage}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Status                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Working">Working</option>
                  <option value="Broken">Broken</option>
                  <option value="Needs Repair">Needs Repair</option>
                </select>
              </div>

            </div>

            <div>
              <label htmlFor="notes" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                User Feedback (Optional)
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                placeholder="Enter user feedback..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-4 sm:py-3 rounded-lg font-medium transition-colors duration-200 text-base touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 sm:py-3 rounded-lg font-semibold transition-colors duration-200 text-base touch-manipulation"
              >
                {device ? 'Update Device' : 'Add Device'}
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
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-modal-slide-up {
          animation: modal-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

export default DeviceForm;