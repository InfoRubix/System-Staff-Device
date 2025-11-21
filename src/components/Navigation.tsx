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
  const [unreadRepairCount, setUnreadRepairCount] = useState(0);
  const previousCountRef = useRef<number>(0);

  const isTechnician = (user as any)?.role === 'technician';

  // Listen for detected issues from device scans (only for admins)
  useEffect(() => {
    if (!isAdmin) {
      setUnreadRepairCount(0);
      return;
    }

    try {
      // Get all device scans to count detected issues
      const scansQuery = query(collection(db, 'device_scans'), orderBy('scanTimestamp', 'desc'));
      const repairsQuery = query(collection(db, 'repairs'));

      // Track fixed repairs in a shared state
      let fixedSet = new Set<string>();

      // Listen to repairs to build fixed set
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

      // Listen to scans to count detected issues
      const unsubscribeScans = onSnapshot(scansQuery, (scansSnapshot) => {
          // Get latest scan per device
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

          // Count issues from latest scans
          let unreadCount = 0;
          latestScans.forEach(scan => {
            // RAM Critical
            if (scan.ramUsage > 90) {
              const id = `${scan.deviceId}-${scan.staffEmail}-RAM_Critical___Memory_Failure`;
              if (!fixedSet.has(id)) unreadCount++;
            }
            // Low Disk Space
            if (scan.diskSpaceFree < 20) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Low_Disk_Space`;
              if (!fixedSet.has(id)) unreadCount++;
            }
            // CPU Overheating
            if (scan.cpuTemp && scan.cpuTemp > 85) {
              const id = `${scan.deviceId}-${scan.staffEmail}-CPU_Overheating`;
              if (!fixedSet.has(id)) unreadCount++;
            }
            // Battery Degraded
            if (scan.batteryHealth && scan.batteryHealth < 50) {
              const id = `${scan.deviceId}-${scan.staffEmail}-Battery_Degraded`;
              if (!fixedSet.has(id)) unreadCount++;
            }
            // Antivirus Disabled
            if (scan.antivirusStatus !== 'Active') {
              const id = `${scan.deviceId}-${scan.staffEmail}-Antivirus_Disabled`;
              if (!fixedSet.has(id)) unreadCount++;
            }
            // Firewall Disabled
            if (scan.firewallStatus !== 'Active') {
              const id = `${scan.deviceId}-${scan.staffEmail}-Firewall_Disabled`;
              if (!fixedSet.has(id)) unreadCount++;
            }
          });

          // Only update count, don't show notifications during navigation
          // (Notifications should only come from real-time issue detection, not count changes)
          previousCountRef.current = unreadCount;
          setUnreadRepairCount(unreadCount);
        }, (error) => {
          // Suppress permission errors during logout (expected behavior)
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
  }, [isAdmin]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      // Start the loading state
      startNavigation(href);

      // Close mobile menu before navigation
      setIsMobileMenuOpen(false);

      // Navigate immediately
      router.push(href);
    }
  };

  // Different navigation items for admin vs regular users
  const dashboardSubItems = [
    { href: '/dashboard', label: 'Department Overview' },
    { href: '/user-management', label: 'User Management' },
  ];

  const adminNavItems = [
    { href: '/data-analysis', label: 'Data Analysis' },
    { href: '/device-health', label: 'Device Health' },
    { href: '/repair-management', label: 'Repair Management' },
    // { href: '/download', label: 'Download App' }, // Hidden per boss request
  ];

  const technicianNavItems = [
    { href: '/technician-dashboard', label: 'My Repairs' },
    { href: '/repair-history', label: 'Repair History' },
  ];

  const userNavItems = [
    { href: '/my-device', label: 'My Device' },
    { href: '/download', label: 'Download App' },
  ];

  // Technicians get their own menu, not admin menu
  const navItems = isTechnician ? technicianNavItems : isAdmin ? adminNavItems : userNavItems;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand - Hidden */}
          <div className="flex-shrink-0">
            {/* Title removed per user request */}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-4 items-center">
            {/* Dashboard Dropdown (Super Admin Only - NOT Technician) */}
            {(user as any)?.role === 'super_admin' && (
              <div className="relative">
                <button
                  onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer touch-manipulation flex items-center ${
                    pathname === '/dashboard' || pathname === '/user-management'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                  <svg
                    className={`ml-1 w-4 h-4 transition-transform ${isDashboardDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDashboardDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {dashboardSubItems.map((subItem) => (
                      <button
                        key={subItem.href}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleNavigation(subItem.href);
                          setIsDashboardDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md transition-colors ${
                          pathname === subItem.href
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700'
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
                onTouchStart={() => {}} // Prevent touch delay on mobile
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer touch-manipulation relative ${
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
                {/* Notification Badge for Repair Management */}
                {item.href === '/repair-management' && unreadRepairCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop Logout Button */}
          <div className="hidden md:flex flex-shrink-0">
            <button
              onClick={handleLogout}
              className="border-2
                md:bg-transparent md:border-gray-300 md:text-gray-700 md:hover:bg-red-200 md:hover:border-red-300 md:hover:text-red-700
                bg-red-600 border-red-700 text-white
                px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 bg-white">
              {/* Dashboard Dropdown (Super Admin Only - NOT Technician) */}
              {(user as any)?.role === 'super_admin' && (
                <div>
                  <button
                    onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors touch-manipulation flex items-center justify-between ${
                      pathname === '/dashboard' || pathname === '/user-management'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                    <svg
                      className={`w-4 h-4 transition-transform ${isDashboardDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDashboardDropdownOpen && (
                    <div className="pl-4 mt-1 space-y-1">
                      {dashboardSubItems.map((subItem) => (
                        <button
                          key={subItem.href}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNavigation(subItem.href);
                            setIsDashboardDropdownOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors touch-manipulation ${
                            pathname === subItem.href
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                  onTouchStart={() => {}} // Prevent touch delay on mobile
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors touch-manipulation relative ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {item.label}
                    {/* Notification Badge for Repair Management */}
                    {item.href === '/repair-management' && unreadRepairCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">
                        {unreadRepairCount > 9 ? '9+' : unreadRepairCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium border-2
                  md:bg-transparent md:border-gray-300 md:text-gray-700 md:hover:bg-red-200 md:hover:border-red-300 md:hover:text-red-700
                  bg-red-600 border-red-700 text-white
                  transition-colors duration-200 mt-4"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
