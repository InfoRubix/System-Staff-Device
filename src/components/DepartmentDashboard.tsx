'use client';

import { useState, useMemo } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { Department, DEPARTMENTS, Device } from '../types/device';
import DepartmentCard from './DepartmentCard';
import DepartmentDetail from './DepartmentDetail';

interface DepartmentDashboardProps {
  onEdit?: (device: Device) => void;
  onAdd?: () => void;
}

function DepartmentDashboard({ onEdit, onAdd }: DepartmentDashboardProps) {
  const { devices, loading } = useDevices();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Group devices by department and calculate stats
  const departmentStats = useMemo(() => {
    if (!devices) return {};
    
    const stats: Record<Department, {
      totalDevices: number;
      staffCount: number;
      workingDevices: number;
      brokenDevices: number;
      underRepairDevices: number;
    }> = {} as Record<Department, {
      totalDevices: number;
      staffCount: number;
      workingDevices: number;
      brokenDevices: number;
      underRepairDevices: number;
    }>;

    DEPARTMENTS.forEach(dept => {
      stats[dept] = {
        totalDevices: 0,
        staffCount: 0,
        workingDevices: 0,
        brokenDevices: 0,
        underRepairDevices: 0,
      };
    });

    const staffByDepartment: Record<Department, Set<string>> = {} as Record<Department, Set<string>>;
    DEPARTMENTS.forEach(dept => {
      staffByDepartment[dept] = new Set();
    });

    devices.forEach(device => {
      const dept = device.department;
      stats[dept].totalDevices++;
      staffByDepartment[dept].add(device.staffName);
      
      switch (device.status) {
        case 'Working':
          stats[dept].workingDevices++;
          break;
        case 'Broken':
          stats[dept].brokenDevices++;
          break;
        case 'Under Repair':
          stats[dept].underRepairDevices++;
          break;
      }
    });

    // Update staff counts
    DEPARTMENTS.forEach(dept => {
      stats[dept].staffCount = staffByDepartment[dept].size;
    });

    return stats;
  }, [devices]);

  if (selectedDepartment) {
    return (
      <DepartmentDetail
        department={selectedDepartment}
        onBack={() => setSelectedDepartment(null)}
        onEdit={onEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-black bg-clip-text text-transparent">
            Department Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Click on a department to view staff and devices
          </p>
        </div>
        
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full sm:w-auto group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2.5 sm:px-6 sm:py-3 text-center text-sm font-semibold text-white rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden touch-manipulation"
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>Add Device</span>
              <span className="animate-bounce">➕</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl sm:text-6xl mb-4 animate-spin">⏳</div>
          <p className="text-lg text-gray-600">Loading departments...</p>
        </div>
      )}

      {/* Department Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {DEPARTMENTS.map((department) => (
            <DepartmentCard
              key={department}
              department={department}
              stats={departmentStats[department] || {
                totalDevices: 0,
                staffCount: 0,
                workingDevices: 0,
                brokenDevices: 0,
                underRepairDevices: 0,
              }}
              onClick={() => setSelectedDepartment(department)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && Object.values(departmentStats).every(stat => stat.totalDevices === 0) && (
        <div className="text-center py-12">
          <div className="text-4xl sm:text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-gray-600">Start by adding devices to see department statistics</p>
        </div>
      )}
    </div>
  );
}

export default DepartmentDashboard;