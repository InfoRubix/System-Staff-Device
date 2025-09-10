import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Device, DeviceFormData } from '../types/device';

const COLLECTION_NAME = 'devices';

export const deviceService = {
  // Get all devices
  async getAllDevices(): Promise<Device[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Device;
      });
    } catch (error) {
      console.error('Error getting devices:', error);
      throw error;
    }
  },

  // Add new device
  async addDevice(deviceData: DeviceFormData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...deviceData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  },

  // Update device
  async updateDevice(id: string, deviceData: DeviceFormData): Promise<void> {
    try {
      const deviceRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(deviceRef, {
        ...deviceData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  },

  // Delete device
  async deleteDevice(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  },

  // Search devices by staff name
  async searchDevices(staffName: string): Promise<Device[]> {
    try {
      if (!staffName.trim()) {
        return await this.getAllDevices();
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        where('staffName', '>=', staffName),
        where('staffName', '<=', staffName + '\uf8ff'),
        orderBy('staffName')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Device;
      });
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  },

  // Get devices by department
  async getDevicesByDepartment(department: string): Promise<Device[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Device;
      });
    } catch (error) {
      console.error('Error getting devices by department:', error);
      throw error;
    }
  }
};