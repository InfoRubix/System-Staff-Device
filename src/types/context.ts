import { Device, DeviceFormData } from './device';

export interface DeviceContextType {
  devices: Device[];
  addDevice: (deviceData: DeviceFormData) => Promise<void>;
  updateDevice: (id: string, deviceData: DeviceFormData) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  searchDevices: (query: string) => Promise<Device[]>;
  loading: boolean;
  error: string | null;
  refreshDevices: () => Promise<void>;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}