'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import APP_INFO from '@/config/appInfo';
import { formatDate } from '@/lib/dateFormat';

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
        version: APP_INFO.version, // ✅ Automatically synced from tauri.conf.json
        platform: APP_INFO.platform,
      });

      // Start download from Google Drive
      window.location.href = 'https://drive.google.com/uc?export=download&id=1bg7gKOkU9x3ZnI2ac9P3WWln6XMAPaiB';
    } catch (error) {
      console.error('Error logging download:', error);
      // Still allow download even if logging fails
      window.location.href = 'https://drive.google.com/uc?export=download&id=1bg7gKOkU9x3ZnI2ac9P3WWln6XMAPaiB';
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
      <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8" style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f4ff 50%, #e8eeff 100%)',
      }}>
        {/* Blurred Background Elements - Large Corner Bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top Left Corner - Large Blue Bubble with visible border */}
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full">
            <div className="w-full h-full bg-gradient-to-br from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>

          {/* Bottom Right Corner - Large Blue Bubble with visible border */}
          <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full">
            <div className="w-full h-full bg-gradient-to-tl from-blue-200/60 to-blue-300/50 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-2 border-white/70"></div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
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
              <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg overflow-hidden">
                <div className="backdrop-blur-xl bg-green-300/60 border-b border-white/50 p-6 text-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">DOWNLOAD · HISTORY</h2>
                      <p className="mt-3 text-sm text-gray-600 font-normal">Complete list of all app downloads</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{downloads.length}</div>
                      <div className="text-sm text-gray-600">Total Downloads</div>
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
                                <td className="py-3 px-4 text-gray-600 font-mono text-sm">{download.userEmail}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                                    {download.department || 'Unknown'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">
                                  {formatDate(download.downloadDate)}
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
                                    className="border-4 p-2 rounded transition-colors
                                      md:bg-red-100 md:border-red-300 md:hover:bg-red-200 md:hover:border-red-400 md:text-red-700 md:hover:text-red-800
                                      bg-red-600 border-red-700 text-white"
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
              <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="backdrop-blur-xl bg-green-300/60 p-8 text-gray-800 text-center border-b border-white/50">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-2xl font-bold mb-2">{APP_INFO.productName} v{APP_INFO.version}</h2>
            <p className="text-gray-600">
              Automatic health monitoring for Windows computers
            </p>
          </div>

          {/* Download Section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="border-4 font-bold py-4 px-8 rounded-lg text-lg shadow-lg transform transition inline-flex items-center gap-3
                  md:bg-blue-100 md:border-blue-300 md:hover:bg-blue-200 md:hover:border-blue-400 md:text-blue-700 md:hover:text-blue-800 md:hover:scale-105
                  bg-blue-600 border-blue-700 text-white
                  disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:scale-100"
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
                Download: {APP_INFO.fileSize} | Installed: {APP_INFO.installedSize} | Version {APP_INFO.version}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {APP_INFO.supportedOS}
              </p>
            </div>

            {/* What's New */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🎉 What&apos;s New in v{APP_INFO.version} ({APP_INFO.releaseDate})
              </h3>
              <ul className="space-y-2">
                {APP_INFO.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">•</span>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ✨ Key Features:
              </h3>
              <ul className="space-y-3">
                {APP_INFO.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-2xl">{highlight.icon}</span>
                    <span className="text-gray-700">
                      <strong>{highlight.title}</strong> - {highlight.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Upgrading from an older version?
              </h4>
              <p className="text-sm text-orange-800 mb-3">
                If you have an older version installed, you must uninstall it first before installing v{APP_INFO.version}:
              </p>
              <ol className="text-sm text-orange-800 space-y-2 ml-4">
                <li><strong>1.</strong> Press <kbd className="bg-orange-100 px-2 py-1 rounded border border-orange-300">Windows + I</kbd> → Open <strong>Settings</strong></li>
                <li><strong>2.</strong> Go to <strong>Apps</strong> → <strong>Installed apps</strong> (or Apps & features)</li>
                <li><strong>3.</strong> Search for &quot;<strong>Device Monitor</strong>&quot;</li>
                <li><strong>4.</strong> Click <strong>Uninstall</strong> → Confirm</li>
                <li><strong>5.</strong> Download and install the new version from this page</li>
              </ol>
            </div>

            {/* Installation Steps */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Fresh Installation:
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
                {APP_INFO.privacy.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-6 backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💾 System Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Operating System:</p>
              <p className="text-gray-600">{APP_INFO.supportedOS}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Disk Space:</p>
              <p className="text-gray-600">{APP_INFO.minDiskSpace}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">RAM:</p>
              <p className="text-gray-600">Minimum {APP_INFO.minRAM}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Internet:</p>
              <p className="text-gray-600">{APP_INFO.internetRequired ? 'Required for data sync' : 'Not required'}</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-6 backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">❓ Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">Will this slow down my computer?</p>
              <p className="text-gray-600">
                No. The app is lightweight and runs efficiently in the background without impacting your computer&apos;s performance.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Can I uninstall it later?</p>
              <p className="text-gray-600">
                Yes. Use standard Windows &quot;Add or Remove Programs&quot; to uninstall anytime.
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
