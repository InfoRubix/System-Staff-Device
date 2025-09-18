export type Department = 'MARKETING' | 'RUBIX' | 'CONVEY' | 'ACCOUNT' | 'HR' | 'LITIGATION' | 'SANCO' | 'POT/POC' | 'AFC';

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

export const DEPARTMENTS: Department[] = [
  'MARKETING',
  'RUBIX',
  'CONVEY',
  'ACCOUNT',
  'HR',
  'LITIGATION',
  'SANCO',
  'POT/POC',
  'AFC'
];