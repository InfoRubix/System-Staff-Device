'use client';

import { useState } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useDepartments } from '../contexts/DepartmentContext';
import DepartmentDashboard from './DepartmentDashboard';
import DeviceForm from './DeviceForm';
import DepartmentForm from './DepartmentForm';
import DeleteDepartmentForm from './DeleteDepartmentForm';
import Navigation from './Navigation';
import { Device, DeviceFormData } from '../types/device';

function Dashboard() {
  const { addDevice, updateDevice } = useDevices();
  const { addDepartment, deleteDepartment } = useDepartments();
  const [showForm, setShowForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showDeleteDepartmentForm, setShowDeleteDepartmentForm] = useState(false);
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

  const handleDepartmentSubmit = async (departmentName: string) => {
    try {
      await addDepartment(departmentName);
      alert(`Department "${departmentName}" has been created successfully!`);
      setShowDepartmentForm(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create department';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDepartmentCancel = () => {
    setShowDepartmentForm(false);
  };

  const handleDeleteDepartment = () => {
    setShowDeleteDepartmentForm(true);
  };

  const handleDeleteDepartmentSubmit = async (departmentName: string) => {
    try {
      await deleteDepartment(departmentName);
      alert(`Department "${departmentName}" has been deleted successfully!`);
      setShowDeleteDepartmentForm(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete department';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteDepartmentCancel = () => {
    setShowDeleteDepartmentForm(false);
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
          onDeleteDepartment={handleDeleteDepartment}
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

      {/* Delete Department Form Modal */}
      {showDeleteDepartmentForm && (
        <DeleteDepartmentForm
          onSuccess={handleDeleteDepartmentSubmit}
          onCancel={handleDeleteDepartmentCancel}
        />
      )}

    </div>
  );
}

export default Dashboard;