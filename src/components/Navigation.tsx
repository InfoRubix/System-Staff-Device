'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { startNavigation } = useNavigation();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      // Start the loading state immediately
      startNavigation(href);

      // Navigate immediately but the loading will continue until the page finishes
      router.push(href);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/data-analysis', label: 'Data Analysis' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">Device Management System</h1>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-4">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Logout Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}