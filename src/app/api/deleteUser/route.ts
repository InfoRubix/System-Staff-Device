import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
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

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const auth = getAuth();

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);

    // Delete the user
    await auth.deleteUser(userRecord.uid);

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted from Firebase Auth`,
    });
  } catch (error: any) {
    console.error('Error deleting user from Auth:', error);

    // If user not found, consider it success (already deleted)
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({
        success: true,
        message: 'User not found in Auth (already deleted)',
      });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete user from Auth' },
      { status: 500 }
    );
  }
}
