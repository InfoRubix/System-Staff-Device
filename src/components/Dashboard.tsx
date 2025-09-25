'use client';

import { useState } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import DepartmentDashboard from './DepartmentDashboard';
import DeviceForm from './DeviceForm';
import DepartmentForm from './DepartmentForm';
import Navigation from './Navigation';
import { Device, DeviceFormData } from '../types/device';

function Dashboard() {
  const { addDevice, updateDevice } = useDevices();
  const [showForm, setShowForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
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

  const handleAddDepartment = () => {
    setShowDepartmentForm(true);
  };

  const handleDepartmentSubmit = (departmentName: string) => {
    // TODO: Add department to the system/database
    console.log('New department:', departmentName);
    alert(`Department "${departmentName}" has been created successfully!\n\nNote: This is a demo. In a real application, this would be saved to the database and the department would appear in the list.`);
    setShowDepartmentForm(false);
  };

  const handleDepartmentCancel = () => {
    setShowDepartmentForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-white">

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
        <DepartmentDashboard
          onEdit={handleEditDevice}
          onAdd={handleAddDevice}
          onAddDepartment={handleAddDepartment}
        />
      </main>

      {/* Device Form Modal */}
      {showForm && (
        <DeviceForm
          device={editingDevice}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Department Form Modal */}
      {showDepartmentForm && (
        <DepartmentForm
          onSubmit={handleDepartmentSubmit}
          onCancel={handleDepartmentCancel}
        />
      )}

    </div>
  );
}

export default Dashboard;