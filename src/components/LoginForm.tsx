'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();
  const router = useRouter();

  // Auto-generate name from email
  const extractNameFromEmail = (email: string): string => {
    if (!email) return '';

    // Get part before @
    const username = email.split('@')[0];

    // Split by dots, underscores, or hyphens
    const parts = username.split(/[._-]+/);

    // Filter out common prefixes and short parts
    const nameParts = parts.filter(part => {
      const lower = part.toLowerCase();
      // Skip common prefixes and very short parts
      return part.length > 3 && !['ahs', 'dr', 'mr', 'mrs', 'ms'].includes(lower);
    });

    // If no valid parts found, use all parts except first
    const finalParts = nameParts.length > 0 ? nameParts : parts.slice(1);

    // Capitalize each part and join
    return finalParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Update name when email changes (only in signup mode)
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    if (isSignUp) {
      const autoName = extractNameFromEmail(newEmail);
      if (autoName) {
        setName(autoName);
      }
    }
  };

  const departments = [
    'Marketing',
    'Rubix',
    'Convey',
    'Account',
    'HR',
    'Litigation',
    'Sanco',
    'POT/POC',
    'AFC'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success;
      if (isSignUp) {
        // Validate signup fields
        if (!department) {
          setError('Please select your department');
          setLoading(false);
          return;
        }

        // Auto-generate name if not set
        const finalName = name || extractNameFromEmail(email) || 'User';

        success = await signUp(email, password, finalName, department);
        if (success) {
          // After signup, redirect to user device page
          router.push('/my-device');
        }
      } else {
        success = await login(email, password);
        if (success) {
          // Login successful - routing handled by home page
        }
      }

      if (!success) {
        setError(isSignUp ? 'Signup failed' : 'Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💻</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Device Management System
          </h1>
          <p className="text-gray-600">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="ahs.nurullaili@company.com"
              />
              {isSignUp && name && (
                <p className="mt-2 text-xs text-gray-600">
                  Your name will be: <span className="font-semibold text-gray-900">{name}</span>
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Name is auto-generated from email - no input needed */}

            {/* Department Dropdown - Only show during signup */}
            {isSignUp && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  id="department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 bg-white"
                >
                  <option value="">Select your department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              )}
            </button>

            {/* Toggle Login/Signup */}
            <div className="text-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>

          {/* Info for new users */}
          {isSignUp && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">📱 For Staff Members:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Use your company email address</li>
                <li>• After signup, download the monitoring app</li>
                <li>• View your device health anytime</li>
              </ul>
            </div>
          )}
        </div>

        {/* Admin Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Admin? Use <span className="font-mono bg-gray-100 px-2 py-1 rounded">admin@company.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
