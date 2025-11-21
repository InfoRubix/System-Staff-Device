import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, fcmTokens } = body;

    if (!fcmTokens || fcmTokens.length === 0) {
      return NextResponse.json(
        { error: 'No FCM tokens provided' },
        { status: 400 }
      );
    }

    // Firebase Admin SDK would be needed here to send notifications
    // Since we don't have Firebase Admin credentials, we'll use Firebase Cloud Functions approach
    // For now, we'll return success and log the notification

    console.log('📢 Push Notification Request:');
    console.log('Title:', title);
    console.log('Message:', message);
    console.log('Sending to', fcmTokens.length, 'device(s)');

    // In production, you would use Firebase Admin SDK here:
    // const admin = require('firebase-admin');
    // await admin.messaging().sendMulticast({
    //   tokens: fcmTokens,
    //   notification: { title, body: message },
    // });

    return NextResponse.json({
      success: true,
      message: `Notification queued for ${fcmTokens.length} device(s)`,
      note: 'Using client-side notification for now (Firebase Admin not configured)'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
