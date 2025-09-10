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
    ownership: 'Company-owned',
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
        ownership: device.ownership,
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

    if (!formData.staffName.trim()) {
      newErrors.staffName = 'Staff name is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.deviceModel.trim()) {
      newErrors.deviceModel = 'Device model is required';
    }
    if (!formData.operatingSystem.trim()) {
      newErrors.operatingSystem = 'Operating system is required';
    }
    if (!formData.processor.trim()) {
      newErrors.processor = 'Processor is required';
    }
    if (!formData.ram.trim()) {
      newErrors.ram = 'RAM is required';
    }
    if (!formData.graphics.trim()) {
      newErrors.graphics = 'Graphics is required';
    }
    if (!formData.storage.trim()) {
      newErrors.storage = 'Storage is required';
    }

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
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
      <div className="relative top-5 mx-auto p-6 max-w-3xl animate-modal-slide-up">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">
                {device ? '✨' : '➕'}
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {device ? '✨ Edit Magical Device ✨' : '🎯 Add New Device to Portal 🎯'}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {device ? 'Update the device magic spells' : 'Cast a new device into our magical portal!'}
              </p>
            </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="staffName" className="block text-sm font-medium text-gray-700">
                  Staff Name *
                </label>
                <input
                  type="text"
                  name="staffName"
                  id="staffName"
                  value={formData.staffName}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.staffName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter staff name"
                />
                {errors.staffName && (
                  <p className="mt-1 text-sm text-red-600">{errors.staffName}</p>
                )}
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  name="department"
                  id="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
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
                <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700">
                  Device Type *
                </label>
                <select
                  name="deviceType"
                  id="deviceType"
                  value={formData.deviceType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label htmlFor="deviceModel" className="block text-sm font-medium text-gray-700">
                  Device Model *
                </label>
                <input
                  type="text"
                  name="deviceModel"
                  id="deviceModel"
                  value={formData.deviceModel}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.deviceModel ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter device model"
                />
                {errors.deviceModel && (
                  <p className="mt-1 text-sm text-red-600">{errors.deviceModel}</p>
                )}
              </div>

              <div>
                <label htmlFor="operatingSystem" className="block text-sm font-medium text-gray-700">
                  Operating System *
                </label>
                <input
                  type="text"
                  name="operatingSystem"
                  id="operatingSystem"
                  value={formData.operatingSystem}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.operatingSystem ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter operating system"
                />
                {errors.operatingSystem && (
                  <p className="mt-1 text-sm text-red-600">{errors.operatingSystem}</p>
                )}
              </div>

              <div>
                <label htmlFor="processor" className="block text-sm font-medium text-gray-700">
                  Processor/CPU *
                </label>
                <input
                  type="text"
                  name="processor"
                  id="processor"
                  value={formData.processor}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.processor ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter processor"
                />
                {errors.processor && (
                  <p className="mt-1 text-sm text-red-600">{errors.processor}</p>
                )}
              </div>

              <div>
                <label htmlFor="ram" className="block text-sm font-medium text-gray-700">
                  RAM *
                </label>
                <input
                  type="text"
                  name="ram"
                  id="ram"
                  value={formData.ram}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.ram ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter RAM"
                />
                {errors.ram && (
                  <p className="mt-1 text-sm text-red-600">{errors.ram}</p>
                )}
              </div>

              <div>
                <label htmlFor="graphics" className="block text-sm font-medium text-gray-700">
                  Graphics/GPU *
                </label>
                <input
                  type="text"
                  name="graphics"
                  id="graphics"
                  value={formData.graphics}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.graphics ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter graphics card"
                />
                {errors.graphics && (
                  <p className="mt-1 text-sm text-red-600">{errors.graphics}</p>
                )}
              </div>

              <div>
                <label htmlFor="storage" className="block text-sm font-medium text-gray-700">
                  Storage *
                </label>
                <input
                  type="text"
                  name="storage"
                  id="storage"
                  value={formData.storage}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.storage ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter storage"
                />
                {errors.storage && (
                  <p className="mt-1 text-sm text-red-600">{errors.storage}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="Working">Working</option>
                  <option value="Broken">Broken</option>
                  <option value="Under Repair">Under Repair</option>
                </select>
              </div>

              <div>
                <label htmlFor="ownership" className="block text-sm font-medium text-gray-700">
                  Ownership *
                </label>
                <select
                  name="ownership"
                  id="ownership"
                  value={formData.ownership}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="Company-owned">Company-owned</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter any additional notes..."
              />
            </div>

            <div className="flex justify-center space-x-4 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Cancel 👋
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <span className="flex items-center space-x-2">
                  <span>{device ? 'Update Device' : 'Add Device'}</span>
                  <span className="animate-bounce">{device ? '✨' : '🚀'}</span>
                </span>
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