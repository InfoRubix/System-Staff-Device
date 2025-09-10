export type Department = 'MARKETING' | 'RUBIX' | 'CONVEY' | 'ACCOUNT' | 'HR' | 'LITIGATION' | 'SANCO' | 'POT/POC' | 'AFC';

export interface Device {
  id: string;
  staffName: string;
  department: Department;
  deviceType: 'Laptop' | 'Desktop' | 'Both';
  deviceModel: string;
  operatingSystem: string;
  processor: string;
  ram: string;
  graphics: string;
  storage: string;
  status: 'Working' | 'Broken' | 'Under Repair';
  ownership: 'Company-owned' | 'Personal';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceFormData {
  staffName: string;
  department: Department;
  deviceType: 'Laptop' | 'Desktop' | 'Both';
  deviceModel: string;
  operatingSystem: string;
  processor: string;
  ram: string;
  graphics: string;
  storage: string;
  status: 'Working' | 'Broken' | 'Under Repair';
  ownership: 'Company-owned' | 'Personal';
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