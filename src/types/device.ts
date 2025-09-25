export type Department = string; // Now dynamic instead of hardcoded

export interface IssueLog {
  id: string;
  date: Date;
  type: 'Broken' | 'Needs Repair';
  description: string;
  resolvedDate?: Date;
}

export interface Device {
  id: string;
  staffName: string;
  department: Department;
  deviceType: 'Laptop' | 'Desktop' | 'Tablet' | 'Phone';
  deviceModel: string;
  operatingSystem: string;
  processor: string;
  ram: string;
  graphics: string;
  storage: string;
  status: 'Working' | 'Broken' | 'Needs Repair';
  purchaseYear?: number;
  osInstallYear?: number;
  issueLogs?: IssueLog[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceFormData {
  staffName: string;
  department: Department;
  deviceType: 'Laptop' | 'Desktop' | 'Tablet' | 'Phone';
  deviceModel: string;
  operatingSystem: string;
  processor: string;
  ram: string;
  graphics: string;
  storage: string;
  status: 'Working' | 'Broken' | 'Needs Repair';
  notes?: string;
}

// DEPARTMENTS is now managed dynamically through DepartmentContext
// Default departments are initialized in departmentService