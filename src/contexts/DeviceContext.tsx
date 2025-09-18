'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Device, DeviceFormData } from '../types/device';
import { DeviceContextType } from '../types/context';
import { deviceService } from '../lib/deviceService';

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load devices from Firebase on mount, but only once
  useEffect(() => {
    if (!isInitialized) {
      loadDevices();
    }
  }, [isInitialized]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const firebaseDevices = await deviceService.getAllDevices();
      setDevices(firebaseDevices);
      setIsInitialized(true);
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (deviceData: DeviceFormData) => {
    try {
      setError(null);
      const deviceId = await deviceService.addDevice(deviceData);
      
      // Add to local state immediately for better UX
      const newDevice: Device = {
        id: deviceId,
        ...deviceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setDevices(prev => [newDevice, ...prev]);
    } catch (err) {
      console.error('Error adding device:', err);
      setError('Failed to add device');
      throw err;
    }
  };

  const updateDevice = async (id: string, deviceData: DeviceFormData) => {
    try {
      setError(null);
      await deviceService.updateDevice(id, deviceData);
      
      // Update local state
      setDevices(prev =>
        prev.map(device =>
          device.id === id
            ? { ...device, ...deviceData, updatedAt: new Date() }
            : device
        )
      );
    } catch (err) {
      console.error('Error updating device:', err);
      setError('Failed to update device');
      throw err;
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      setError(null);
      await deviceService.deleteDevice(id);
      
      // Remove from local state
      setDevices(prev => prev.filter(device => device.id !== id));
    } catch (err) {
      console.error('Error deleting device:', err);
      setError('Failed to delete device');
      throw err;
    }
  };

  const searchDevices = async (query: string): Promise<Device[]> => {
    try {
      setError(null);
      if (!query.trim()) return devices;
      
      return await deviceService.searchDevices(query);
    } catch (err) {
      console.error('Error searching devices:', err);
      setError('Failed to search devices');
      return [];
    }
  };

  return (
    <DeviceContext.Provider value={{
      devices,
      addDevice,
      updateDevice,
      deleteDevice,
      searchDevices,
      loading,
      error,
      refreshDevices: loadDevices,
    }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevices() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
}