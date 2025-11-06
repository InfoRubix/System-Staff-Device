'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DownloadRecord {
  id: string;
  userName: string;
  userEmail: string;
  department?: string;
  downloadDate: Date;
  version: string;
  platform: string;
}

export default function DownloadPage() {
  const { isAuthenticated, loading, user, isAdmin } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const _router = useRouter();
  const [componentsReady, setComponentsReady] = useState(false);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (isNavigating) {
        console.log('Download Page - Starting navigation loading timer');

        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);

        let loadingTime;
        if (isPhone) {
          loadingTime = 3000;
        } else if (isTablet) {
          loadingTime = 2500;
        } else if (isLaptop) {
          loadingTime = 2000;
        } else {
          loadingTime = 1500;
        }

        const readyTimer = setTimeout(() => {
          console.log('Download Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime);

        return () => clearTimeout(readyTimer);
      } else {
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isNavigating, setPageLoaded]);

  // Finish navigation when page is fully loaded
  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      const finishTimer = setTimeout(() => {
        finishNavigation();
        setShowLoadingScreen(false);
      }, 800);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

  // Listen to download records
  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(
      collection(db, 'app_downloads'),
      orderBy('downloadDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const downloadList: DownloadRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        downloadList.push({
          id: doc.id,
          ...data,
          downloadDate: data.downloadDate?.toDate() || new Date(),
        } as DownloadRecord);
      });
      setDownloads(downloadList);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // Get user's department from their profile
      let userDepartment = 'Unknown';
      let userName = user?.displayName || user?.email?.split('@')[0] || 'Unknown User';

      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userDepartment = userData.department || 'Unknown';
            userName = userData.name || userName;
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }

      // Log download to Firebase with ACTUAL user data
      await addDoc(collection(db, 'app_downloads'), {
        userName: userName,
        userEmail: user?.email || 'unknown@company.com',
        department: userDepartment, // ✅ Now gets real department from user profile
        downloadDate: new Date(),
        version: '1.0',
        platform: 'Windows',
      });

      // Start download
      window.location.href = '/downloads/DeviceMonitorSetup.exe';
    } catch (error) {
      console.error('Error logging download:', error);
      // Still allow download even if logging fails
      window.location.href = '/downloads/DeviceMonitorSetup.exe';
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  // Delete download record
  const handleDeleteRecord = async (recordId: string, userEmail: string) => {
    if (!confirm(`Delete download record for ${userEmail}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'app_downloads', recordId));
      // Record will auto-remove from list due to onSnapshot listener
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading for direct page access
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Admin View - Only Download List */}
          {isAdmin ? (
            <>
              {/* Header for Admin */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  📥 App Download Tracking
                </h1>
                <p className="text-gray-600">
                  Monitor which users have downloaded the Device Health Monitor app
                </p>
              </div>

              {/* Download Tracking List for Admin */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Download History</h2>
                      <p className="text-green-100 mt-1">Complete list of all app downloads</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{downloads.length}</div>
                      <div className="text-sm text-green-100">Total Downloads</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {downloads.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📥</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Downloads Yet</h3>
                      <p className="text-gray-600">Waiting for users to download the app...</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Download Date</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Version</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Platform</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {downloads.map((download, index) => (
                              <tr
                                key={download.id}
                                className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                                      {download.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-900">{download.userName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600 font-mono text-sm">{download.userEmail}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                                    {download.department || 'Unknown'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">
                                  {download.downloadDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}{' '}
                                  <span className="text-gray-400 text-sm">
                                    {download.downloadDate.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                                    v{download.version}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="flex items-center gap-1 text-gray-600">
                                    💻 {download.platform}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => handleDeleteRecord(download.id, download.userEmail)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                    title="Delete this download record"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">📊 Statistics:</span> {downloads.length} user(s) have downloaded the Device Health Monitor app. Download records are tracked automatically.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* User View - Download Instructions */
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Device Health Monitor
                </h1>
                <p className="text-gray-600">
                  Download and install the monitoring app on your computer
                </p>
              </div>

              {/* Main Download Card */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white text-center">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-2xl font-bold mb-2">Device Monitor v1.0</h2>
            <p className="text-blue-100">
              Automatic health monitoring for Windows computers
            </p>
          </div>

          {/* Download Section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transform transition hover:scale-105 disabled:scale-100 inline-flex items-center gap-3"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download for Windows
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Size: ~8 MB | Version 1.0 | Windows 7/8/10/11
              </p>
            </div>

            {/* Features */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ✨ What this app does:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">
                    <strong>Automatic monitoring</strong> - Scans your computer every 2 weeks
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">
                    <strong>Zero disruption</strong> - Runs silently in background
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">
                    <strong>Health checks</strong> - CPU, RAM, disk space, battery, antivirus
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">
                    <strong>Early warnings</strong> - Detect problems before device breaks
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">
                    <strong>Lightweight</strong> - Only 8 MB, uses minimal resources
                  </span>
                </li>
              </ul>
            </div>

            {/* Installation Steps */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 How to install:
              </h3>
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span className="text-gray-700">Click &quot;Download for Windows&quot; button above</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span className="text-gray-700">
                    Open the downloaded <code className="bg-gray-100 px-2 py-1 rounded">DeviceMonitorSetup.exe</code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span className="text-gray-700">Follow the installation wizard - Click &quot;Next&quot; to install</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <span className="text-gray-700">
                    <strong>Launch the app and login with your email and password</strong> (same as this dashboard)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    5
                  </span>
                  <span className="text-gray-700">
                    Done! App will run in background and scan automatically every 2 weeks
                  </span>
                </li>
              </ol>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">🔒 Privacy & Security</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Only collects technical data (CPU, RAM, disk space)</li>
                <li>• No personal files, browsing history, or screenshots</li>
                <li>• Data encrypted during transfer (HTTPS)</li>
                <li>• Helps IT team maintain your device proactively</li>
              </ul>
            </div>

            {/* Support */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-2">Need help?</p>
              <p className="text-gray-500 text-sm">
                Contact IT Support: <span className="text-blue-600 font-medium">it-support@company.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💾 System Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Operating System:</p>
              <p className="text-gray-600">Windows 7, 8, 10, or 11</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Disk Space:</p>
              <p className="text-gray-600">100 MB free space</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">RAM:</p>
              <p className="text-gray-600">Minimum 2 GB</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Internet:</p>
              <p className="text-gray-600">Required for data sync</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">❓ Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">Will this slow down my computer?</p>
              <p className="text-gray-600">
                No. The app uses only 20-40 MB of RAM and scans only once every 2 weeks for 2-3 minutes.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Can I uninstall it later?</p>
              <p className="text-gray-600">
                Yes. Use standard Windows &quot;Add or Remove Programs&quot; to uninstall anytime.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Will I see pop-ups or notifications?</p>
              <p className="text-gray-600">
                No. The app runs silently in the background. You&apos;ll only see a small icon in the system tray.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">What data is collected?</p>
              <p className="text-gray-600">
                Only technical metrics: CPU usage, RAM usage, disk space, battery health, OS version, and antivirus status. No personal files or activity.
              </p>
            </div>
          </div>
        </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
