import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COLLECTION = 'users';
const DEVICE_SCANS_COLLECTION = 'device_scans';

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  phone?: string;
  department: string;
  role?: string;
  deviceId?: string;
  createdAt?: Date;
  lastScan?: Date;
  scanCount?: number;
}

export const staffService = {
  // Get all staff members (always fetches fresh data from Firestore)
  async getAllStaff(): Promise<StaffMember[]> {
    try {
      console.log('🔄 Fetching fresh staff data from Firestore...');
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));

      const staff = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          name: data.name || '',
          phone: data.phone || '',
          department: (data.department || 'IT').toUpperCase(),
          role: data.role || 'user',
          deviceId: data.deviceId,
          createdAt: data.createdAt?.toDate(),
        } as StaffMember;
      });

      console.log(`✅ Fetched ${staff.length} staff members from Firestore`);
      return staff;
    } catch (error) {
      console.error('Error getting staff:', error);
      throw error;
    }
  },

  // Get staff by department
  async getStaffByDepartment(department: string): Promise<StaffMember[]> {
    try {
      const allStaff = await this.getAllStaff();
      return allStaff.filter(staff =>
        staff.department.toUpperCase() === department.toUpperCase()
      );
    } catch (error) {
      console.error('Error getting staff by department:', error);
      throw error;
    }
  },

  // Transfer staff to new department (updates user record, device scans, AND devices)
  async transferStaff(staffIds: string[], newDepartment: string): Promise<number> {
    try {
      const upperDepartment = newDepartment.toUpperCase();

      // First, get staff emails and names for updating
      const staffData: { email: string; name: string }[] = [];
      for (const staffId of staffIds) {
        const staffDocRef = doc(db, USERS_COLLECTION, staffId);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          const data = staffDocSnap.data();
          if (data.email) {
            staffData.push({
              email: data.email,
              name: data.name || ''
            });
          }
        }
      }

      // 1. Update users collection
      const batch1 = writeBatch(db);
      staffIds.forEach(staffId => {
        const staffRef = doc(db, USERS_COLLECTION, staffId);
        batch1.update(staffRef, {
          department: upperDepartment,
          updatedAt: new Date()
        });
      });
      await batch1.commit();
      console.log(`✅ Updated ${staffIds.length} users in users collection`);

      // 2. Update device_scans collection for each staff member
      for (const staff of staffData) {
        const scansQuery = query(
          collection(db, DEVICE_SCANS_COLLECTION),
          where('staffEmail', '==', staff.email)
        );
        const scansSnapshot = await getDocs(scansQuery);

        if (!scansSnapshot.empty) {
          const batch2 = writeBatch(db);
          scansSnapshot.forEach(scanDoc => {
            batch2.update(scanDoc.ref, {
              department: upperDepartment
            });
          });
          await batch2.commit();
          console.log(`✅ Updated ${scansSnapshot.size} scans for ${staff.name}`);
        }
      }

      // 3. Update devices collection for each staff member
      for (const staff of staffData) {
        const devicesQuery = query(
          collection(db, 'devices'),
          where('staffName', '==', staff.name)
        );
        const devicesSnapshot = await getDocs(devicesQuery);

        if (!devicesSnapshot.empty) {
          const batch3 = writeBatch(db);
          devicesSnapshot.forEach(deviceDoc => {
            batch3.update(deviceDoc.ref, {
              department: upperDepartment,
              updatedAt: new Date()
            });
          });
          await batch3.commit();
          console.log(`✅ Updated ${devicesSnapshot.size} devices for ${staff.name}`);
        }
      }

      return staffIds.length;
    } catch (error) {
      console.error('Error transferring staff:', error);
      throw error;
    }
  },

  // Delete staff member permanently (user account, downloads, assigned repairs, Firebase Auth)
  // NOTE: Device scans are PRESERVED to maintain historical device data
  async deleteStaff(staffId: string, staffEmail: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // 1. Delete user document from Firestore
      const userRef = doc(db, USERS_COLLECTION, staffId);
      batch.delete(userRef);

      // 2. Device scans are NOT deleted - they are preserved as historical data
      // This allows device history to remain even if staff accounts change

      // 3. Find and delete all app download records for this user
      const downloadsQuery = query(
        collection(db, 'app_downloads'),
        where('userEmail', '==', staffEmail)
      );
      const downloadsSnapshot = await getDocs(downloadsQuery);

      downloadsSnapshot.forEach(downloadDoc => {
        batch.delete(downloadDoc.ref);
      });

      // 4. Find and delete all assigned repairs for this technician
      const assignedRepairsQuery = query(
        collection(db, 'assigned_repairs'),
        where('technicianEmail', '==', staffEmail)
      );
      const assignedRepairsSnapshot = await getDocs(assignedRepairsQuery);

      assignedRepairsSnapshot.forEach(repairDoc => {
        batch.delete(repairDoc.ref);
      });

      await batch.commit();

      console.log(`✅ Deleted user ${staffEmail} from Firestore`);
      console.log(`   - Device scans: PRESERVED (not deleted)`);
      console.log(`   - App downloads: ${downloadsSnapshot.size}`);
      console.log(`   - Assigned repairs: ${assignedRepairsSnapshot.size}`);

      // 5. Attempt to delete from Firebase Authentication using Cloud Function
      // NOTE: This requires Firebase Admin SDK credentials to be configured
      try {
        const response = await fetch('/api/deleteUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: staffEmail }),
        });

        if (!response.ok) {
          const error = await response.json();
          // Just log a warning, don't fail the entire operation
          console.warn('⚠️ Could not delete from Firebase Auth:', error.error);
          console.warn('   User Firestore data has been deleted successfully');
          console.warn('   Firebase Auth account still exists but cannot login (no Firestore data)');
          console.warn('   Optional: Admin can manually delete from Firebase Console → Authentication');
        } else {
          console.log(`✅ Deleted Firebase Auth account for ${staffEmail}`);
        }
      } catch (authError: any) {
        // Auth deletion failed, but that's okay - the user can't login without Firestore data anyway
        console.warn('⚠️ Firebase Auth deletion not available:', authError.message);
        console.warn('   User Firestore data deleted successfully - user cannot login');
        console.warn('   Firebase Auth account remains but is effectively disabled');
        // Don't throw - Firestore deletion is the critical part and it succeeded
      }

    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  },

  // Get staff with scan statistics
  async getStaffWithStats(): Promise<StaffMember[]> {
    try {
      const allStaff = await this.getAllStaff();
      const scansSnapshot = await getDocs(collection(db, DEVICE_SCANS_COLLECTION));

      // Build scan stats map
      const scanStats = new Map<string, { count: number; lastScan: Date }>();

      scansSnapshot.forEach(scanDoc => {
        const data = scanDoc.data();
        const email = data.staffEmail;
        const timestamp = data.scanTimestamp?.toDate() || new Date();

        if (!scanStats.has(email)) {
          scanStats.set(email, { count: 0, lastScan: timestamp });
        }

        const stats = scanStats.get(email)!;
        stats.count++;
        if (timestamp > stats.lastScan) {
          stats.lastScan = timestamp;
        }
      });

      // Merge stats with staff members
      return allStaff.map(staff => ({
        ...staff,
        scanCount: scanStats.get(staff.email)?.count || 0,
        lastScan: scanStats.get(staff.email)?.lastScan
      }));
    } catch (error) {
      console.error('Error getting staff with stats:', error);
      throw error;
    }
  },

  // Update user department in Firebase (for manual admin edits)
  async updateStaffDepartment(staffId: string, newDepartment: string): Promise<void> {
    try {
      const staffRef = doc(db, USERS_COLLECTION, staffId);
      await updateDoc(staffRef, {
        department: newDepartment.toUpperCase(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating staff department:', error);
      throw error;
    }
  }
};
