'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Pagination from '@/components/Pagination';
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (isNavigating) {
        const userAgent = navigator.userAgent;
        const isPhone = /iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|tablet/i.test(userAgent);
        const isLaptop = /Macintosh|Windows NT.*WOW64|Windows NT.*Win64/i.test(userAgent);

        let loadingTime;
        if (isPhone) loadingTime = 3000;
        else if (isTablet) loadingTime = 2500;
        else if (isLaptop) loadingTime = 2000;
        else loadingTime = 1500;

        const readyTimer = setTimeout(() => {
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

  useEffect(() => {
    if (isNavigating && isPageLoaded && componentsReady) {
      const finishTimer = setTimeout(() => {
        finishNavigation();
        setShowLoadingScreen(false);
      }, 800);

      return () => clearTimeout(finishTimer);
    }
  }, [isNavigating, isPageLoaded, componentsReady, finishNavigation, setShowLoadingScreen]);

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

      await addDoc(collection(db, 'app_downloads'), {
        userName: userName,
        userEmail: user?.email || 'unknown@company.com',
        department: userDepartment,
        downloadDate: new Date(),
        version: APP_INFO.version,
        platform: APP_INFO.platform,
      });

      window.location.href = 'https://drive.google.com/uc?export=download&id=1iNhoo-xigVfToUaN7_WLIZ33PYZKBhBX';
    } catch (error) {
      console.error('Error logging download:', error);
      window.location.href = 'https://drive.google.com/uc?export=download&id=1iNhoo-xigVfToUaN7_WLIZ33PYZKBhBX';
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const handleDeleteRecord = async (recordId: string, userEmail: string) => {
    if (!confirm(`Delete download record for ${userEmail}?`)) return;

    try {
      await deleteDoc(doc(db, 'app_downloads', recordId));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  if (isNavigating || !componentsReady) return null;

  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {isAdmin ? (
            <>
              {/* Admin Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Download Tracking</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor app downloads across the organization</p>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Downloads</h2>
                  <span className="text-3xl font-semibold text-gray-900 tabular-nums">{downloads.length}</span>
                </div>
              </div>

              {/* Download Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {downloads.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No downloads yet</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Department</th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Version</th>
                            <th className="text-center py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {downloads
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((download) => (
                            <tr key={download.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-5 text-sm text-gray-900">{download.userEmail}</td>
                              <td className="py-3 px-5">
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                                  {download.department || 'Unknown'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-sm text-gray-500">{formatDate(download.downloadDate)}</td>
                              <td className="py-3 px-5">
                                <span className="text-xs font-mono text-gray-500">v{download.version}</span>
                              </td>
                              <td className="py-3 px-5 text-center">
                                <button
                                  onClick={() => handleDeleteRecord(download.id, download.userEmail)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  title="Delete record"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-gray-100">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(downloads.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        totalItems={downloads.length}
                        itemsPerPage={itemsPerPage}
                        startIndex={(currentPage - 1) * itemsPerPage}
                        endIndex={currentPage * itemsPerPage}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* User View */
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Device Health Monitor</h1>
                <p className="text-sm text-gray-500 mt-1">Download the monitoring app for your computer</p>
              </div>

              {/* Download Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Hero */}
                <div className="px-8 py-10 text-center border-b border-gray-100">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{APP_INFO.productName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Version {APP_INFO.version}</p>

                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="mt-6 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-3 px-8 rounded-xl transition-colors"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download for Windows
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 mt-3">{APP_INFO.fileSize} &middot; {APP_INFO.supportedOS}</p>
                </div>

                {/* Features */}
                <div className="p-8 space-y-6">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Key Features</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {APP_INFO.highlights.map((highlight, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm font-medium text-gray-900">{highlight.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{highlight.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Installation */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Installation</h3>
                    <div className="space-y-2">
                      {['Download the installer', 'Run DeviceMonitorSetup.exe', 'Follow the installation wizard', 'Login with your email and password', 'Done — scans automatically every 2 weeks'].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upgrade Notice */}
                  <div className="bg-amber-50 rounded-xl p-5">
                    <p className="text-sm font-medium text-amber-900 mb-2">Upgrading from an older version?</p>
                    <p className="text-xs text-amber-700">
                      Uninstall the old version first via Settings &rarr; Apps &rarr; search &quot;Device Monitor&quot; &rarr; Uninstall. Then install the new version.
                    </p>
                  </div>

                  {/* Privacy */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-sm font-medium text-gray-900 mb-2">Privacy</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {APP_INFO.privacy.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* System Requirements */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">System Requirements</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">OS</p>
                    <p className="text-sm text-gray-900 mt-0.5">{APP_INFO.supportedOS}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Disk</p>
                    <p className="text-sm text-gray-900 mt-0.5">{APP_INFO.minDiskSpace}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">RAM</p>
                    <p className="text-sm text-gray-900 mt-0.5">{APP_INFO.minRAM}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Internet</p>
                    <p className="text-sm text-gray-900 mt-0.5">{APP_INFO.internetRequired ? 'Required' : 'Not required'}</p>
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
