'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { invoke } from '@tauri-apps/api/core';

export default function DeviceLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isTauri, setIsTauri] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    console.log('🔵 Component mounted');
    // Check if running in Tauri
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      console.log('✅ Running in Tauri');
      setIsTauri(true);

      // Check if already logged in
      const savedEmail = localStorage.getItem('staff_email');
      const savedName = localStorage.getItem('staff_name');
      const savedDept = localStorage.getItem('staff_department');

      console.log('Checking localStorage:', {
        email: savedEmail,
        name: savedName,
        dept: savedDept
      });

      if (savedEmail && savedName && savedDept) {
        console.log('✅ Found saved login, setting isLoggedIn to true');
        setIsLoggedIn(true);
      } else {
        console.log('❌ No saved login found');
      }
    } else {
      console.log('❌ Not running in Tauri');
    }
  }, []);

  // Background auto-scan checker - runs every hour
  useEffect(() => {
    if (!isTauri || !isLoggedIn) return;

    const checkAndScan = async () => {
      const savedEmail = localStorage.getItem('staff_email');
      const savedName = localStorage.getItem('staff_name');
      const savedDepartment = localStorage.getItem('staff_department');

      if (!savedEmail || !savedName || !savedDepartment) return;

      try {
        const result = await invoke('check_and_run_auto_scan', {
          staffEmail: savedEmail,
          staffName: savedName,
          department: savedDepartment,
        }) as string;

        if (result.includes('Auto-scan completed')) {
          localStorage.setItem('last_scan', new Date().toISOString());
          console.log('✅ Auto-scan completed:', result);
        } else {
          console.log('⏰ Auto-scan check:', result);
        }
      } catch (error) {
        console.error('Auto-scan error:', error);
      }
    };

    // Run immediately on login
    checkAndScan();

    // Then check every hour (3600000 ms)
    const interval = setInterval(checkAndScan, 3600000);

    return () => clearInterval(interval);
  }, [isTauri, isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 Login button clicked');
    console.log('Email:', email);
    console.log('Is Tauri?', isTauri);

    setIsLoading(true);
    setMessage('Logging in...');

    try {
      console.log('🔵 Attempting Firebase authentication...');
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase auth successful, UID:', user.uid);

      setMessage('Fetching your profile...');

      // Get user profile from Firestore
      console.log('🔵 Fetching user profile from Firestore...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        console.error('❌ User profile not found in Firestore');
        throw new Error('User profile not found. Please contact your administrator.');
      }

      const userData = userDoc.data();
      console.log('✅ User profile found:', userData);
      const staffName = userData.name || userData.email?.split('@')[0] || 'Unknown';
      const department = userData.department || 'IT';
      console.log('Staff Name:', staffName);
      console.log('Department:', department);

      // Save user info to localStorage
      localStorage.setItem('staff_email', email);
      localStorage.setItem('staff_name', staffName);
      localStorage.setItem('staff_department', department);
      localStorage.setItem('user_id', user.uid);
      console.log('✅ Saved to localStorage');

      setMessage('Running initial device scan...');

      // Run initial scan
      try {
        console.log('🔵 Invoking Tauri scan command...');
        const result = await invoke('scan_and_submit_device_data', {
          staffEmail: email,
          staffName: staffName,
          department: department,
        });

        console.log('✅ Initial scan result:', result);
        localStorage.setItem('last_scan', new Date().toISOString());

        setMessage('✅ Login successful! Device scan completed. The app will now run in the background and scan automatically every 2 weeks.');
        setIsLoggedIn(true);

        // Notify user they can close the window
        setTimeout(() => {
          setMessage('✅ Setup complete! You can minimize or close this window. The app will continue running in the background.');
        }, 3000);

      } catch (scanError) {
        console.error('❌ Scan error:', scanError);
        setMessage('⚠️ Login successful, but scan failed. You can try again later. Error: ' + scanError);
        setIsLoggedIn(true);
      }

    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      let errorMessage = 'Login failed. ';
      const firebaseError = error as { code?: string; message?: string };

      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
        errorMessage += 'Invalid email or password.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage += 'Too many failed attempts. Please try again later.';
      } else if (firebaseError.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += firebaseError.message || 'Unknown error occurred';
      }

      setMessage('❌ ' + errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🔵 Login process finished');
    }
  };

  const handleManualScan = async () => {
    setIsLoading(true);
    setMessage('Running device scan...');

    const savedEmail = localStorage.getItem('staff_email');
    const savedName = localStorage.getItem('staff_name');
    const savedDepartment = localStorage.getItem('staff_department');

    try {
      await invoke('scan_and_submit_device_data', {
        staffEmail: savedEmail,
        staffName: savedName,
        department: savedDepartment,
      });

      localStorage.setItem('last_scan', new Date().toISOString());
      setMessage('✅ Device scan completed successfully!');
    } catch (error) {
      setMessage('❌ Scan failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setMessage('');
  };

  if (!isTauri) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop App Only</h1>
          <p className="text-gray-600">
            This page is only accessible from the Device Monitor desktop application.
            Please download the app from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    const lastScan = localStorage.getItem('last_scan');
    const staffEmail = localStorage.getItem('staff_email');
    const staffName = localStorage.getItem('staff_name');

    // Calculate next scan date (14 days from last scan)
    let nextScanDate = null;
    if (lastScan) {
      const lastScanDate = new Date(lastScan);
      nextScanDate = new Date(lastScanDate.getTime() + (14 * 24 * 60 * 60 * 1000));
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-xl font-bold text-gray-900">Device Monitor Active</h1>
            <p className="text-sm text-gray-600 mt-1">{staffName}</p>
            <p className="text-xs text-gray-500">{staffEmail}</p>
          </div>

          {/* Scan Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-900">Status</span>
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Running</span>
            </div>

            {lastScan && (
              <>
                <div className="text-xs text-green-800 mt-2">
                  <span className="font-medium">Last Scan:</span>
                  <br />
                  {new Date(lastScan).toLocaleString()}
                </div>

                {nextScanDate && (
                  <div className="text-xs text-green-800 mt-2">
                    <span className="font-medium">Next Scan:</span>
                    <br />
                    {nextScanDate.toLocaleString()}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Manual Scan Button */}
          <button
            onClick={handleManualScan}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm mb-3"
          >
            {isLoading ? 'Scanning...' : 'Run Scan Now'}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 px-4 rounded-lg transition text-sm"
          >
            Logout
          </button>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-xs ${
              message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
              message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Runs in background • Auto-scans every 2 weeks
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💻</div>
          <h1 className="text-3xl font-bold text-gray-900">Device Monitor</h1>
          <p className="text-gray-600 mt-2">Sign in to activate device monitoring</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="your.email@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? 'Logging in...' : 'Sign In & Activate'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing in, you authorize device monitoring including:
            <br />
            CPU, RAM, Disk, Battery, GPU, and OS information.
            <br />
            Data is sent securely every 2 weeks to your company dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
