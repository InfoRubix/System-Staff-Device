'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { departmentService } from '../lib/departmentService';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [_loadingDepartments, setLoadingDepartments] = useState(true);
  const { login, signUp, error: authError } = useAuth();
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

  // Load departments from Firestore on component mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        // Initialize default departments if needed (creates departments collection)
        await departmentService.initializeDefaultDepartments();

        // Get active departments from Firestore
        const deptNames = await departmentService.getActiveDepartmentNames();
        setDepartments(deptNames);
      } catch (error) {
        console.error('Failed to load departments:', error);
        // No fallback - departments must come from Firestore only
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="mb-5 flex justify-center">
            <img
              src="/computer-logo.png"
              alt="Device Management"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Device Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow"
                placeholder="you@company.com"
              />
              {isSignUp && name && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Name: <span className="font-medium text-gray-700">{name}</span>
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Department Dropdown - Only show during signup */}
            {isSignUp && (
              <div>
                <label htmlFor="department" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Department
                </label>
                <select
                  id="department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow appearance-none"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {(error || authError) && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                {error || authError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-medium hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Info for new users */}
          {isSignUp && (
            <div className="mt-5 bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-700 mb-1.5">For staff members:</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                <li>Use your company email address</li>
                <li>After signup, download the monitoring app</li>
                <li>View your device health anytime</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
