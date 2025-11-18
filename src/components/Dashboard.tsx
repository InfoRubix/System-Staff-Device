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

  // Removed handleAddDevice - no longer needed since "Add Device" button was removed

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
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f4ff 50%, #e8eeff 100%)',
    }}>
      {/* Blurred Background Elements - Large Corner Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Left Corner - Large Blue Bubble with visible border */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full">
          <div className="w-full h-full bg-gradient-to-br from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
        </div>

        {/* Bottom Right Corner - Large Blue Bubble with visible border */}
        <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full">
          <div className="w-full h-full bg-gradient-to-tl from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
        </div>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 relative z-10">
        <DepartmentDashboard
          onEdit={handleEditDevice}
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