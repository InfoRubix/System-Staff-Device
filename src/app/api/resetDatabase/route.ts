import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(_request: NextRequest) {
  try {
    const auth = getAuth();
    const firestore = getFirestore();

    console.log('🔄 Starting database reset...');

    // Step 1: Delete ALL users from Firebase Authentication
    console.log('Step 1: Deleting all users from Firebase Auth...');
    const listUsersResult = await auth.listUsers();
    const deletePromises = listUsersResult.users.map((user) =>
      auth.deleteUser(user.uid)
    );
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${listUsersResult.users.length} users from Firebase Auth`);

    // Step 2: Delete ALL documents from ALL collections
    console.log('Step 2: Deleting all Firestore collections...');
    const collections = [
      'users',
      'staff',
      'departments',
      'devices',
      'device_scans',
      'repairs',
      'assigned_repairs',
      'app_downloads',
    ];

    for (const collectionName of collections) {
      const snapshot = await firestore.collection(collectionName).get();
      const batch = firestore.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
    }

    // Step 3: Create new Super Admin in Firebase Auth
    console.log('Step 3: Creating new super admin...');
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@company.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    const newAdmin = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: 'Super Admin',
    });
    console.log(`✅ Created new admin user: ${newAdmin.email}`);

    // Step 4: Create staff profile in Firestore
    const staffRef = firestore.collection('users').doc(newAdmin.uid);
    await staffRef.set({
      email: adminEmail,
      name: 'Super Admin',
      role: 'super_admin',
      createdAt: new Date(),
    });
    console.log('✅ Created staff profile for super admin');

    console.log('🎉 Database reset complete!');

    return NextResponse.json({
      success: true,
      message: 'Database reset successful',
      deletedUsers: listUsersResult.users.length,
      newAdmin: {
        email: adminEmail,
        password: adminPassword,
      },
    });
  } catch (error: any) {
    console.error('❌ Error resetting database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset database' },
      { status: 500 }
    );
  }
}
