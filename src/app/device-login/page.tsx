'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { invoke } from '@tauri-apps/api/core';
import { formatDateTime } from '@/lib/dateFormat';

export default function DeviceLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isTauri, setIsTauri] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [debugSteps, setDebugSteps] = useState<string[]>([]);

  const addDebugStep = (step: string) => {
    setDebugSteps(prev => [...prev, `${new Date().toLocaleTimeString()}: ${step}`]);
  };

  useEffect(() => {
    addDebugStep('Page loaded');
    console.log('🔵 Component mounted');
    // Check if running in Tauri
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      addDebugStep('✅ Running in Tauri');
      console.log('✅ Running in Tauri');
      setIsTauri(true);

      // Validate saved session
      validateSavedSession();
    } else {
      addDebugStep('❌ NOT running in Tauri!');
      console.log('❌ Not running in Tauri');
    }
  }, []);

  // Validate if saved session is still valid
  const validateSavedSession = async () => {
    const savedEmail = localStorage.getItem('staff_email');
    const savedName = localStorage.getItem('staff_name');
    const savedDept = localStorage.getItem('staff_department');

    addDebugStep(`Checking localStorage: email=${savedEmail ? 'YES' : 'NO'}, name=${savedName ? 'YES' : 'NO'}, dept=${savedDept ? 'YES' : 'NO'}`);
    console.log('Checking localStorage:', {
      email: savedEmail,
      name: savedName,
      dept: savedDept
    });

    if (savedEmail && savedName && savedDept) {
      addDebugStep('Found saved login - waiting for Firebase to initialize...');
      console.log('🔍 Waiting for Firebase Auth to initialize...');

      try {
        // WAIT for Firebase Auth to initialize (this is the fix!)
        await new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((_user) => {
            unsubscribe(); // Stop listening after first check
            resolve();
          });
        });

        // Now check if Firebase auth session exists
        const currentUser = auth.currentUser;
        addDebugStep(`Firebase initialized - currentUser: ${currentUser ? 'EXISTS' : 'NULL'}`);

        if (currentUser) {
          // Session is valid, check if user doc exists in Firestore
          addDebugStep('Firebase auth session valid - checking Firestore...');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

          if (userDoc.exists()) {
            addDebugStep('✅ Account valid! Auto-login successful');
            console.log('✅ Account valid! Auto-login successful');
            setIsLoggedIn(true);
          } else {
            // User deleted from Firestore but Auth still exists
            addDebugStep('⚠️ User deleted from Firestore - clearing session');
            console.warn('⚠️ User deleted from Firestore - clearing session');
            clearSessionAndShowMessage('Your account has been removed. Please contact admin.');
          }
        } else {
          // No Firebase auth session yet - could be temporary during startup
          // Keep localStorage and try to stay logged in
          addDebugStep('⚠️ No Firebase auth session - but keeping localStorage, will work offline mode');
          console.warn('⚠️ No Firebase auth session - keeping session for offline mode');
          // Allow user to stay logged in with localStorage
          setIsLoggedIn(true);
        }
      } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        addDebugStep(`❌ Session validation error: ${firebaseError.code || 'unknown'}`);
        console.error('Session validation error:', error);

        // Check for specific auth errors
        if (firebaseError.code === 'auth/user-not-found' ||
            firebaseError.code === 'auth/user-disabled' ||
            firebaseError.code === 'auth/invalid-user-token') {
          clearSessionAndShowMessage('Previous user account has been removed. Please login with your credentials.');
        } else {
          // Other errors - still allow auto-login attempt
          addDebugStep('✅ Proceeding with saved login despite validation error');
          console.log('✅ Proceeding with saved login');
          setIsLoggedIn(true);
        }
      }
    } else {
      addDebugStep('No saved login found - ready for new login');
      console.log('❌ No saved login found');
    }
  };

  // Clear localStorage and show message to user
  const clearSessionAndShowMessage = (msg: string) => {
    console.log('🧹 Clearing localStorage...');
    localStorage.removeItem('staff_email');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_department');
    localStorage.removeItem('last_scan');
    setMessage(msg);
    setIsLoggedIn(false);
    addDebugStep('Session cleared - showing login screen');
  };

  // Background auto-scan checker - runs every hour
  useEffect(() => {
    if (!isTauri || !isLoggedIn) return;

    const checkAndScan = async () => {
      const savedEmail = localStorage.getItem('staff_email');
      const savedName = localStorage.getItem('staff_name');
      const savedDepartment = localStorage.getItem('staff_department');

      if (!savedEmail || !savedName || !savedDepartment) return;

      try {
        // Validate session before scanning
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn('⚠️ No auth session during scan - account may be deleted');
          clearSessionAndShowMessage('Your account has been removed. Auto-scan stopped.');
          return;
        }

        // Check if user still exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          console.warn('⚠️ User deleted from Firestore - stopping scans');
          clearSessionAndShowMessage('Your account has been removed. Auto-scan stopped.');
          return;
        }

        // Fetch FRESH department data from Firestore (in case it was changed by admin)
        const userData = userDoc.data();
        const currentDepartment = (userData.department || 'IT').toUpperCase();
        const currentName = userData.name || savedName;

        // Update localStorage with fresh data
        localStorage.setItem('staff_department', currentDepartment);
        localStorage.setItem('staff_name', currentName);
        console.log(`✅ Refreshed user data: ${currentName} - ${currentDepartment}`);

        // Session valid - proceed with scan using FRESH department
        const result = await invoke('check_and_run_auto_scan', {
          staffEmail: savedEmail,
          staffName: currentName,
          department: currentDepartment,
        }) as string;

        if (result.includes('Auto-scan completed')) {
          localStorage.setItem('last_scan', new Date().toISOString());
          console.log('✅ Auto-scan completed:', result);
        } else {
          console.log('⏰ Auto-scan check:', result);
        }
      } catch (error) {
        console.error('Auto-scan error:', error);

        // Check if error is auth-related
        const firebaseError = error as { code?: string };
        if (firebaseError.code === 'auth/user-not-found' ||
            firebaseError.code === 'auth/user-disabled') {
          clearSessionAndShowMessage('Your account has been removed. Auto-scan stopped.');
        }
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
    addDebugStep('🔵 Login button clicked');
    console.log('🔵 Login button clicked');
    console.log('Email:', email);
    console.log('Is Tauri?', isTauri);

    setIsLoading(true);
    setMessage('Logging in...');
    setDebugSteps([]); // Clear previous debug steps

    try {
      addDebugStep('Attempting Firebase authentication...');
      console.log('🔵 Attempting Firebase authentication...');
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      addDebugStep(`✅ Firebase auth successful! UID: ${user.uid}`);
      console.log('✅ Firebase auth successful, UID:', user.uid);

      setMessage('Fetching your profile...');

      // Get user profile from Firestore
      addDebugStep('Fetching user profile from Firestore...');
      console.log('🔵 Fetching user profile from Firestore...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        addDebugStep('❌ User profile NOT FOUND in Firestore!');
        console.error('❌ User profile not found in Firestore');
        throw new Error('User profile not found. Please contact your administrator.');
      }

      const userData = userDoc.data();
      addDebugStep(`✅ User profile found: ${userData.name}`);
      console.log('✅ User profile found:', userData);
      const staffName = userData.name || userData.email?.split('@')[0] || 'Unknown';
      const department = (userData.department || 'IT').toUpperCase();
      addDebugStep(`Name: ${staffName}, Dept: ${department}`);
      console.log('Staff Name:', staffName);
      console.log('Department:', department);

      // Save user info to localStorage
      addDebugStep('Saving to localStorage...');
      localStorage.setItem('staff_email', email);
      localStorage.setItem('staff_name', staffName);
      localStorage.setItem('staff_department', department);
      localStorage.setItem('user_id', user.uid);
      addDebugStep('✅ Saved to localStorage!');
      console.log('✅ Saved to localStorage');

      setMessage('Running initial device scan...');

      // Run initial scan
      try {
        addDebugStep('Invoking Tauri scan command...');
        console.log('🔵 Invoking Tauri scan command...');
        const result = await invoke('scan_and_submit_device_data', {
          staffEmail: email,
          staffName: staffName,
          department: department,
        });

        addDebugStep(`✅ Scan completed: ${result}`);
        console.log('✅ Initial scan result:', result);
        localStorage.setItem('last_scan', new Date().toISOString());

        setMessage('Login successful! Device scan completed. The app will now run in the background and scan automatically every 2 weeks.');
        addDebugStep('✅ Setting isLoggedIn to TRUE');
        setIsLoggedIn(true);

        // Notify user they can close the window
        setTimeout(() => {
          setMessage('Setup complete! You can minimize or close this window. The app will continue running in the background.');
        }, 3000);

      } catch (scanError) {
        addDebugStep(`❌ Scan error: ${scanError}`);
        console.error('❌ Scan error:', scanError);
        setMessage('Login successful, but scan failed. You can try again later. Error: ' + scanError);
        addDebugStep('Setting isLoggedIn to TRUE (despite scan error)');
        setIsLoggedIn(true);
      }

    } catch (error: unknown) {
      addDebugStep(`❌ LOGIN ERROR: ${error}`);
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

      setMessage(errorMessage);
      addDebugStep(`Error message: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      addDebugStep('Login process finished');
      console.log('🔵 Login process finished');
    }
  };

  const handleManualScan = async () => {
    setIsLoading(true);
    setMessage('Running device scan...');

    const savedEmail = localStorage.getItem('staff_email');
    const savedName = localStorage.getItem('staff_name');

    try {
      // Fetch FRESH department data from Firestore before scanning
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setMessage('Not logged in. Please login again.');
        setIsLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setMessage('User account not found. Please contact admin.');
        setIsLoading(false);
        return;
      }

      // Get fresh department and name from Firestore
      const userData = userDoc.data();
      const currentDepartment = (userData.department || 'IT').toUpperCase();
      const currentName = userData.name || savedName;

      // Update localStorage
      localStorage.setItem('staff_department', currentDepartment);
      localStorage.setItem('staff_name', currentName);

      // Run scan with fresh data
      await invoke('scan_and_submit_device_data', {
        staffEmail: savedEmail,
        staffName: currentName,
        department: currentDepartment,
      });

      localStorage.setItem('last_scan', new Date().toISOString());
      setMessage('Device scan completed successfully!');
    } catch (error) {
      setMessage('Scan failed: ' + error);
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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{
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

        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-lg p-8 max-w-md w-full text-center relative z-10">
          <div className="mb-6 flex justify-center">
            <img
              src="/desk-pixel-art.jpg"
              alt="Device Monitor"
              className="w-32 h-32 object-contain rounded-lg shadow-md"
            />
          </div>
          <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase mb-4">DESKTOP · APP · ONLY</h1>
          <p className="text-gray-600">
            This page is only accessible from the Device Monitor desktop application.
            Please download the app from the dashboard.
          </p>

          {/* ALWAYS VISIBLE DEBUG PANEL */}
          <div className="mt-6 p-4 rounded-lg bg-gray-900 text-green-400 border border-gray-700">
            <div className="text-xs font-mono space-y-1">
              <div className="text-yellow-400 font-bold mb-2">DEBUG LOG:</div>
              <div className="text-red-400">NOT running in Tauri!</div>
              <div className="text-gray-400">window.__TAURI__ is {typeof window !== 'undefined' && '__TAURI__' in window ? 'PRESENT' : 'MISSING'}</div>
              <div className="text-gray-400">Debug steps: {debugSteps.length}</div>
              {debugSteps.map((step, index) => (
                <div key={index} className="text-xs">
                  {step}
                </div>
              ))}
            </div>
          </div>
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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{
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

        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-2xl p-6 max-w-md w-full relative z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <img
                src="/desk-pixel-art.jpg"
                alt="Device Monitor Active"
                className="w-24 h-24 object-contain rounded-lg shadow-md"
              />
            </div>
            <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">DEVICE · MONITOR · ACTIVE</h1>
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
                  {formatDateTime(new Date(lastScan))}
                </div>

                {nextScanDate && (
                  <div className="text-xs text-green-800 mt-2">
                    <span className="font-medium">Next Scan:</span>
                    <br />
                    {formatDateTime(nextScanDate)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Manual Scan Button */}
          <button
            onClick={handleManualScan}
            disabled={isLoading}
            className="w-full bg-blue-100 border-4 border-blue-300 hover:bg-blue-200 hover:border-blue-400 disabled:bg-gray-300 disabled:border-gray-400 text-blue-700 hover:text-blue-800 disabled:text-gray-500 font-semibold py-2.5 px-4 rounded-lg transition text-sm mb-3"
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{
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

      <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-2xl p-8 max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <img
              src="/desk-pixel-art.jpg"
              alt="Device Monitor"
              className="w-32 h-32 object-contain rounded-lg shadow-md"
            />
          </div>
          <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">DEVICE · MONITOR</h1>
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
            className="w-full bg-blue-100 border-4 border-blue-300 hover:bg-blue-200 hover:border-blue-400 disabled:bg-gray-300 disabled:border-gray-400 text-blue-700 hover:text-blue-800 disabled:text-gray-500 font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? 'Logging in...' : 'Sign In & Activate'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('successful') || message.includes('complete') ? 'bg-green-50 text-green-800 border border-green-200' :
            message.includes('failed') || message.includes('error') || message.includes('not found') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* DEBUG PANEL - ALWAYS VISIBLE */}
        <div className="mt-6 p-4 rounded-lg bg-gray-900 text-green-400 border border-gray-700 max-h-60 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            <div className="text-yellow-400 font-bold mb-2">DEBUG LOG:</div>
            <div className="text-green-400">Running in Tauri: {isTauri ? 'YES' : 'NO'}</div>
            <div className="text-gray-400">Debug steps count: {debugSteps.length}</div>
            <div className="text-gray-400">Is logged in: {isLoggedIn ? 'YES' : 'NO'}</div>
            <div className="text-gray-400">---</div>
            {debugSteps.length > 0 ? (
              debugSteps.map((step, index) => (
                <div key={index} className="text-xs">
                  {step}
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">No debug steps yet...</div>
            )}
          </div>
        </div>

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
