'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isAdmin, user } = useAuth();
  const { startNavigation } = useNavigation();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);
  const [isRepairDropdownOpen, setIsRepairDropdownOpen] = useState(false);
  const [unreadRepairCount, setUnreadRepairCount] = useState(0);
  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState(0);
  const previousCountRef = useRef<number>(0);

  const isTechnician = (user as any)?.role === 'technician';

  // Get viewed devices from localStorage
  const getViewedDevices = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const viewed = localStorage.getItem('viewedRepairDevices');
      return viewed ? new Set(JSON.parse(viewed)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Listen for localStorage changes (when device is marked as viewed)
  useEffect(() => {
    const handleStorageChange = () => {
      setStorageUpdateTrigger(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('viewedDevicesUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewedDevicesUpdated', handleStorageChange);
    };
  }, []);

  // Listen for detected issues from device scans (only for admins)
  useEffect(() => {
    if (!isAdmin) {
      setUnreadRepairCount(0);
      return;
    }

    try {
      const scansQuery = query(collection(db, 'device_scans'), orderBy('scanTimestamp', 'desc'));
      const repairsQuery = query(collection(db, 'repairs'));

      let fixedSet = new Set<string>();

      const unsubscribeRepairs = onSnapshot(repairsQuery, (repairsSnapshot) => {
        fixedSet = new Set<string>();
        repairsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'fixed' || data.status === 'completed') {
            const fixedId = `${data.deviceId}-${data.staffEmail}-${data.issueType?.replace(/[^a-zA-Z0-9]/g, '_')}`;
            fixedSet.add(fixedId);
          }
        });
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error('Error listening to repairs:', error);
        }
      });

      const unsubscribeScans = onSnapshot(scansQuery, (scansSnapshot) => {
          const latestScans = new Map();
          scansSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const deviceId = data.deviceId;
            const scanTime = data.scanTimestamp?.toDate?.()?.getTime() || 0;
            const existing = latestScans.get(deviceId);
            const existingTime = existing?.scanTimestamp?.toDate?.()?.getTime() || 0;

            if (!existing || scanTime > existingTime) {
              latestScans.set(deviceId, data);
            }
          });

          const viewedDevices = getViewedDevices();
          const devicesWithIssues = new Set<string>();
          latestScans.forEach(scan => {
            let hasIssue = false;

            if (scan.ramUsage > 90) {
              const id = `${scan.deviceId}-${scan.staffEmail}-RAM_Critical___Memory_Failure`;
              if (!fixedSet.has(id)) hasIssue = true;
            }
            if (scan.diskSpaceFree < 20) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Low_Disk_Space`;
              if (!fixedSet.has(id)) hasIssue = true;
            }
            if (scan.cpuTemp && scan.cpuTemp > 85) {
              const id = `${scan.deviceId}-${scan.staffEmail}-CPU_Overheating`;
              if (!fixedSet.has(id)) hasIssue = true;
            }
            if (scan.batteryHealth && scan.batteryHealth < 50) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Battery_Degraded`;
              if (!fixedSet.has(id)) hasIssue = true;
            }
            if (scan.antivirusStatus && scan.antivirusStatus.includes('Inactive')) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Antivirus_Disabled`;
              if (!fixedSet.has(id)) hasIssue = true;
            }
            if (scan.firewallStatus && scan.firewallStatus.includes('Inactive')) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Firewall_Disabled`;
              if (!fixedSet.has(id)) hasIssue = true;
            }

            if (hasIssue) {
              devicesWithIssues.add(scan.deviceId);
            }
          });

          let unseenCount = 0;
          devicesWithIssues.forEach(deviceId => {
            if (!viewedDevices.has(deviceId)) {
              unseenCount++;
            }
          });

          previousCountRef.current = unseenCount;
          setUnreadRepairCount(unseenCount);
        }, (error) => {
          if (error.code !== 'permission-denied') {
            console.error('Error listening to scans:', error);
          }
          setUnreadRepairCount(0);
        });

      return () => {
        unsubscribeRepairs();
        unsubscribeScans();
      };
    } catch (error) {
      console.error('Error setting up repairs listener:', error);
      setUnreadRepairCount(0);
    }
  }, [isAdmin, storageUpdateTrigger]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      startNavigation(href);
      setIsMobileMenuOpen(false);
      router.push(href);
    }
  };

  const dashboardSubItems = [
    { href: '/dashboard', label: 'Department Overview' },
    { href: '/user-management', label: 'User Management' },
  ];

  const repairSubItems = [
    { href: '/repair-management', label: 'Detected Issues' },
    { href: '/repair-management-history', label: 'Repair History' },
  ];

  const adminNavItems = [
    { href: '/data-analysis', label: 'Data Analysis' },
    { href: '/device-health', label: 'Device Health' },
    { href: '/activity-tracking', label: 'Activity Tracking' },
  ];

  const technicianNavItems = [
    { href: '/technician-dashboard', label: 'My Repairs' },
    { href: '/repair-history', label: 'Repair History' },
  ];

  const userNavItems = [
    { href: '/my-device', label: 'My Device' },
    { href: '/download', label: 'Download App' },
  ];

  const navItems = isTechnician ? technicianNavItems : isAdmin ? adminNavItems : userNavItems;

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Brand */}
          <div className="flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">DMS</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Dashboard Dropdown (Super Admin Only) */}
            {(user as any)?.role === 'super_admin' && (
              <div className="relative">
                <button
                  onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    pathname === '/dashboard' || pathname === '/user-management'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                  <svg className={`w-3.5 h-3.5 transition-transform ${isDashboardDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDashboardDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {dashboardSubItems.map((subItem) => (
                      <button
                        key={subItem.href}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleNavigation(subItem.href);
                          setIsDashboardDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          pathname === subItem.href
                            ? 'bg-gray-50 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Repair Management Dropdown (Admin Only) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setIsRepairDropdownOpen(!isRepairDropdownOpen)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 relative ${
                    pathname === '/repair-management' || pathname === '/repair-management-history'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Repairs
                  {unreadRepairCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                    </span>
                  )}
                  <svg className={`w-3.5 h-3.5 transition-transform ${isRepairDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isRepairDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {repairSubItems.map((subItem) => (
                      <button
                        key={subItem.href}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleNavigation(subItem.href);
                          setIsRepairDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          pathname === subItem.href
                            ? 'bg-gray-50 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          {subItem.label}
                          {subItem.href === '/repair-management' && unreadRepairCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                              {unreadRepairCount}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Other Nav Items */}
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                  pathname === item.href
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
                {item.href === '/repair-management' && unreadRepairCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop Logout */}
          <div className="hidden md:flex flex-shrink-0">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Log out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100">
            <div className="space-y-1">
              {/* Dashboard Dropdown (Super Admin Only) */}
              {(user as any)?.role === 'super_admin' && (
                <div>
                  <button
                    onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      pathname === '/dashboard' || pathname === '/user-management'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Dashboard
                    <svg className={`w-4 h-4 transition-transform ${isDashboardDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDashboardDropdownOpen && (
                    <div className="pl-3 mt-1 space-y-1">
                      {dashboardSubItems.map((subItem) => (
                        <button
                          key={subItem.href}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNavigation(subItem.href);
                            setIsDashboardDropdownOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === subItem.href
                              ? 'bg-gray-100 text-gray-900 font-medium'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Repair Management Dropdown (Admin Only) */}
              {isAdmin && (
                <div>
                  <button
                    onClick={() => setIsRepairDropdownOpen(!isRepairDropdownOpen)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      pathname === '/repair-management' || pathname === '/repair-management-history'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      Repairs
                      {unreadRepairCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                          {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                        </span>
                      )}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${isRepairDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isRepairDropdownOpen && (
                    <div className="pl-3 mt-1 space-y-1">
                      {repairSubItems.map((subItem) => (
                        <button
                          key={subItem.href}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNavigation(subItem.href);
                            setIsRepairDropdownOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === subItem.href
                              ? 'bg-gray-100 text-gray-900 font-medium'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Other Nav Items */}
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {item.label}
                    {item.href === '/repair-management' && unreadRepairCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                        {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}

              {/* Logout */}
              <div className="pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
