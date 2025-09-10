import { deviceService } from '../lib/deviceService';
import { createInitialDevices } from '../data/mockDevices';

export async function migrateDataToFirebase() {
  try {
    console.log('Starting data migration to Firebase...');
    
    const mockDevices = createInitialDevices();
    
    for (const device of mockDevices) {
      // Remove the id field as Firebase will generate new ones
      const { id: _id, ...deviceData } = device;
      
      try {
        const newId = await deviceService.addDevice(deviceData);
        console.log(`Migrated device: ${deviceData.staffName} with new ID: ${newId}`);
      } catch (error) {
        console.error(`Failed to migrate device: ${deviceData.staffName}`, error);
      }
    }
    
    console.log('Data migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Uncomment to run migration
// migrateDataToFirebase();