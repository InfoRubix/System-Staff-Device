import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from './firebase';

const DEPARTMENTS_COLLECTION = 'departments';

export interface DepartmentData {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}

export const departmentService = {
  // Get all departments
  async getAllDepartments(): Promise<DepartmentData[]> {
    try {
      const q = query(
        collection(db, DEPARTMENTS_COLLECTION),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as DepartmentData;
      });
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  },

  // Add new department
  async addDepartment(name: string): Promise<string> {
    try {
      // Check if department already exists
      const existingDepts = await this.getAllDepartments();
      const exists = existingDepts.some(dept =>
        dept.name.toUpperCase() === name.toUpperCase() && dept.isActive
      );

      if (exists) {
        throw new Error('Department already exists');
      }

      const docRef = await addDoc(collection(db, DEPARTMENTS_COLLECTION), {
        name: name.toUpperCase(),
        isActive: true,
        createdAt: new Date(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding department:', error);
      throw error;
    }
  },

  // Get active department names only
  async getActiveDepartmentNames(): Promise<string[]> {
    try {
      const departments = await this.getAllDepartments();
      return departments
        .filter(dept => dept.isActive)
        .map(dept => dept.name);
    } catch (error) {
      console.error('Error getting active departments:', error);
      // Fallback to default departments if Firebase fails
      return [
        'MARKETING', 'RUBIX', 'CONVEY', 'ACCOUNT', 'HR',
        'LITIGATION', 'SANCO', 'POT/POC', 'AFC', 'RDHOMES', 'QHOMES'
      ];
    }
  },

  // Delete/deactivate department
  async deleteDepartment(name: string): Promise<void> {
    try {
      const departments = await this.getAllDepartments();
      const deptToDelete = departments.find(dept =>
        dept.name.toUpperCase() === name.toUpperCase() && dept.isActive
      );

      if (!deptToDelete) {
        throw new Error('Department not found or already inactive');
      }

      // Instead of actually deleting, mark as inactive
      const deptRef = doc(db, DEPARTMENTS_COLLECTION, deptToDelete.id);
      await updateDoc(deptRef, {
        isActive: false,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },

  // Initialize default departments (run once)
  async initializeDefaultDepartments(): Promise<void> {
    try {
      const existingDepts = await this.getAllDepartments();

      if (existingDepts.length === 0) {
        const defaultDepartments = [
          'MARKETING', 'RUBIX', 'CONVEY', 'ACCOUNT', 'HR',
          'LITIGATION', 'SANCO', 'POT/POC', 'AFC', 'RDHOMES', 'QHOMES'
        ];

        const promises = defaultDepartments.map(dept => this.addDepartment(dept));
        await Promise.all(promises);
        console.log('Default departments initialized');
      }
    } catch (error) {
      console.error('Error initializing default departments:', error);
    }
  }
};