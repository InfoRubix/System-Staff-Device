'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { departmentService } from '../lib/departmentService';
import { useAuth } from './AuthContext';

interface DepartmentContextType {
  departments: string[];
  loading: boolean;
  error: string | null;
  addDepartment: (name: string) => Promise<void>;
  deleteDepartment: (name: string) => Promise<void>;
  refreshDepartments: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

interface DepartmentProviderProps {
  children: ReactNode;
}

export function DepartmentProvider({ children }: DepartmentProviderProps) {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default departments for non-admin users
  const defaultDepartments = [
    'MARKETING', 'RUBIX', 'CONVEY', 'ACCOUNT', 'HR',
    'LITIGATION', 'SANCO', 'POT/POC', 'AFC', 'RDHOMES', 'QHOMES'
  ];

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize default departments if needed
      await departmentService.initializeDefaultDepartments();

      // Get all active departments
      const deptNames = await departmentService.getActiveDepartmentNames();
      setDepartments(deptNames);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Failed to load departments');
      // Fallback to default departments
      setDepartments(defaultDepartments);
    } finally {
      setLoading(false);
    }
  };

  const addDepartment = async (name: string) => {
    try {
      setError(null);
      await departmentService.addDepartment(name);
      // Refresh the departments list
      await loadDepartments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add department';
      console.error('Failed to add department:', err);
      setError(errorMessage);
      throw err; // Re-throw so the UI can handle it
    }
  };

  const deleteDepartment = async (name: string) => {
    try {
      setError(null);
      await departmentService.deleteDepartment(name);
      // Refresh the departments list
      await loadDepartments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete department';
      console.error('Failed to delete department:', err);
      setError(errorMessage);
      throw err; // Re-throw so the UI can handle it
    }
  };

  const refreshDepartments = async () => {
    await loadDepartments();
  };

  // Load departments ONLY when authenticated AND is admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      loadDepartments();
    } else if (!authLoading && (!isAuthenticated || !isAdmin)) {
      // If not authenticated or not admin, use default departments
      setDepartments(defaultDepartments);
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, authLoading]);

  const value: DepartmentContextType = {
    departments,
    loading,
    error,
    addDepartment,
    deleteDepartment,
    refreshDepartments
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartments() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartments must be used within a DepartmentProvider');
  }
  return context;
}