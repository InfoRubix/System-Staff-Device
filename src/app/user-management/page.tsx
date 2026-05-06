'use client';

import { useState, useEffect } from 'react';
import { staffService, StaffMember } from '@/lib/staffService';
import { departmentService } from '@/lib/departmentService';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { formatDate } from '@/lib/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import Navigation from '@/components/Navigation';
import Pagination from '@/components/Pagination';

export default function UserManagementPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { finishNavigation, isNavigating, setPageLoaded, isPageLoaded, setShowLoadingScreen } = useNavigation();
  const [componentsReady, setComponentsReady] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'technician'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Create Technician Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newTechnicianForm, setNewTechnicianForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });
  const [countryCode, setCountryCode] = useState('+60'); // Default Malaysia
  const [_generatedPassword, setGeneratedPassword] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTechnicianInfo, setCreatedTechnicianInfo] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);

  // Reset Database Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 users per page

  // Reset states when navigation starts
  useEffect(() => {
    if (isNavigating) {
      setComponentsReady(false);
    }
  }, [isNavigating]);

  // Mark components as ready when auth is done
  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      if (isNavigating) {
        console.log('User Management Page - Starting navigation loading timer');

        // Consistent loading time for all devices
        const loadingTime = 800; // 0.8 seconds standard loading time

        const readyTimer = setTimeout(() => {
          console.log('User Management Page - Timer completed, setting components ready');
          setComponentsReady(true);
          setPageLoaded();
        }, loadingTime);

        return () => clearTimeout(readyTimer);
      } else {
        setComponentsReady(true);
        setPageLoaded();
      }
    }
  }, [loading, isAuthenticated, isAdmin, isNavigating, setPageLoaded]);

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

  // Load staff
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadStaff();
    }
  }, [isAuthenticated, isAdmin]);

  // Load active departments from Firestore (same as signup page)
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        // Initialize default departments if needed
        await departmentService.initializeDefaultDepartments();

        // Get ONLY active departments
        const deptNames = await departmentService.getActiveDepartmentNames();
        setDepartments(deptNames);
      } catch (error) {
        console.error('Failed to load departments:', error);
        setDepartments([]);
      }
    };

    loadDepartments();
  }, []);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const staffWithStats = await staffService.getStaffWithStats();
      setStaff(staffWithStats);
      setFilteredStaff(staffWithStats);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate secure random password
  const generatePassword = (): string => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateTechnician = async () => {
    // Validation
    if (!newTechnicianForm.name.trim()) {
      setCreateError('Please enter technician name');
      return;
    }
    if (!newTechnicianForm.email.trim()) {
      setCreateError('Please enter email address');
      return;
    }
    if (!newTechnicianForm.phone.trim()) {
      setCreateError('Please enter phone number');
      return;
    }
    if (!newTechnicianForm.department) {
      setCreateError('Please select a department');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      // Generate password
      const password = generatePassword();
      setGeneratedPassword(password);

      // Create a secondary Firebase Auth instance to avoid logging out the current user
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary-' + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // IMPORTANT: Firebase Auth always lowercases emails
      const emailLowercase = newTechnicianForm.email.toLowerCase();

      // Create Firebase Auth account using secondary auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        emailLowercase,
        password
      );

      // Create Firestore user document with technician role
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: emailLowercase,
        name: newTechnicianForm.name,
        phone: countryCode + newTechnicianForm.phone,
        department: newTechnicianForm.department.toUpperCase(),
        role: 'technician',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'super_admin',
        mustChangePassword: true
      });

      // Clean up secondary app to free resources
      await deleteApp(secondaryApp);

      // Store info for success modal
      setCreatedTechnicianInfo({
        name: newTechnicianForm.name,
        email: emailLowercase,
        password: password
      });

      // Close create modal and show success modal
      setShowCreateModal(false);
      setShowSuccessModal(true);

      // Reset form
      setNewTechnicianForm({ name: '', email: '', phone: '', department: '' });
      setCountryCode('+60');

      // Reload staff list
      await loadStaff();
    } catch (error: any) {
      console.error('Failed to create technician:', error);
      if (error.code === 'auth/email-already-in-use') {
        setCreateError('This email is already registered.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateError('Invalid email address format.');
      } else {
        setCreateError('Failed to create technician account. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Filter staff based on search, department, and role
  useEffect(() => {
    let result = staff;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.department.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (departmentFilter) {
      result = result.filter(s => s.department === departmentFilter);
    }

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter(s => (s.role || 'user') === roleFilter);
    }

    setFilteredStaff(result);
  }, [searchQuery, departmentFilter, roleFilter, staff]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, roleFilter]);

  const handleDelete = async () => {
    if (!showDeleteModal) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await staffService.deleteStaff(showDeleteModal.id, showDeleteModal.email);
      // Reload staff list
      await loadStaff();
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete staff:', error);
      setDeleteError('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'RESET') {
      setResetError('Please type RESET to confirm');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      // Call API to reset database
      const response = await fetch('/api/resetDatabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset database');
      }

      const result = await response.json();

      // Show success modal
      setShowResetModal(false);
      setResetConfirmText('');
      setShowResetSuccessModal(true);

      console.log('Database reset successful:', result);
    } catch (error: any) {
      console.error('Failed to reset database:', error);
      setResetError(error.message || 'Failed to reset database. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const uniqueDepartments = Array.from(new Set(staff.map(s => s.department))).sort();

  // Don't render the page content while the loading screen should be visible
  if (isNavigating || !componentsReady) {
    return null;
  }

  // Show auth loading for direct page access
  if (loading && !isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">User Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage staff members and their accounts</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gray-900 text-white font-medium rounded-xl transition-colors flex items-center gap-2 hover:bg-gray-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">Create Technician</span>
              </button>
              <div className="text-right">
                <div className="text-2xl font-semibold text-gray-900">{staff.length}</div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Search Users
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or department..."
                  className="block w-full pl-10 pr-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'technician')}
                className="block w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All Roles</option>
                <option value="user">Users Only</option>
                <option value="technician">Technicians Only</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Filter by Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="block w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || departmentFilter || roleFilter !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredStaff.length} of {staff.length} users
                {roleFilter !== 'all' && ` (${roleFilter === 'technician' ? 'Technicians' : 'Regular Users'})`}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('');
                  setRoleFilter('all');
                }}
                className="text-sm text-gray-900 hover:text-gray-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No Users Found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery || departmentFilter
                  ? 'Try adjusting your filters'
                  : 'No staff members have been registered yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Device Scans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Last Scan
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((member) => (
                    <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(member.role || 'user') === 'technician' ? (
                          <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                            Technician
                          </span>
                        ) : member.role === 'super_admin' ? (
                          <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.role === 'super_admin' ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                            {member.department}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.role === 'super_admin' ? '-' : `${member.scanCount || 0} scan${(member.scanCount || 0) !== 1 ? 's' : ''}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.role === 'super_admin'
                            ? '-'
                            : member.lastScan
                            ? formatDate(new Date(member.lastScan))
                            : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setShowDeleteModal(member)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredStaff.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredStaff.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  totalItems={filteredStaff.length}
                  itemsPerPage={itemsPerPage}
                  startIndex={(currentPage - 1) * itemsPerPage}
                  endIndex={currentPage * itemsPerPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Technician Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Create Technician Account</h3>
                    <p className="text-sm text-gray-500">Password will be auto-generated</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTechnicianForm.name}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, name: e.target.value })}
                    placeholder="Enter technician's full name"
                    className="w-full px-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    disabled={isCreating}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newTechnicianForm.email}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, email: e.target.value })}
                    placeholder="technician@company.com"
                    className="w-full px-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    disabled={isCreating}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      disabled={isCreating}
                    >
                      <option value="+60">+60 (MY)</option>
                      <option value="+65">+65 (SG)</option>
                      <option value="+62">+62 (ID)</option>
                      <option value="+66">+66 (TH)</option>
                      <option value="+63">+63 (PH)</option>
                      <option value="+84">+84 (VN)</option>
                      <option value="+86">+86 (CN)</option>
                      <option value="+91">+91 (IN)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+1">+1 (US)</option>
                    </select>
                    <input
                      type="tel"
                      value={newTechnicianForm.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setNewTechnicianForm({ ...newTechnicianForm, phone: value });
                      }}
                      placeholder="123456789"
                      className="flex-1 px-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      disabled={isCreating}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Full number: {countryCode}{newTechnicianForm.phone}</p>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTechnicianForm.department}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, department: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    disabled={isCreating}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Box */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Note:</span> A secure password will be auto-generated. Phone number is required for WhatsApp notifications when assigning repairs.
                  </p>
                </div>

                {createError && (
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-sm text-red-600">{createError}</p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTechnician}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium transition-colors hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Technician
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Show Password */}
      {showSuccessModal && createdTechnicianInfo && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Success Icon */}
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Technician Account Created
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Please copy and save these credentials before closing
              </p>

              {/* Credentials Box */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                    <p className="text-sm font-medium text-gray-900">{createdTechnicianInfo.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{createdTechnicianInfo.email}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdTechnicianInfo.email);
                          alert('Email copied to clipboard!');
                        }}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Temporary Password
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg flex-1">
                        {createdTechnicianInfo.password}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdTechnicianInfo.password);
                          alert('Password copied to clipboard!');
                        }}
                        className="text-gray-400 hover:text-gray-700 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 rounded-xl p-3 mb-6">
                <p className="text-xs text-amber-700">
                  <span className="font-medium">Important:</span> Send these credentials to the technician securely. They will be required to change their password upon first login.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    'WARNING: Once you close this, you will NOT be able to see the password again!\n\n' +
                    'Have you copied and saved the password?\n\n' +
                    'Click OK only if you have saved the credentials.'
                  );
                  if (confirmed) {
                    setShowSuccessModal(false);
                    setCreatedTechnicianInfo(null);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-medium transition-colors hover:bg-gray-800"
              >
                Done - Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Icon */}
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete User Permanently?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                This will permanently delete:
              </p>

              {/* User Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900">{showDeleteModal.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900">{showDeleteModal.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department:</span>
                    <span className="font-medium text-gray-900">{showDeleteModal.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scans:</span>
                    <span className="font-medium text-red-600">
                      {showDeleteModal.scanCount || 0} scan{(showDeleteModal.scanCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mb-6 space-y-2">
                <p className="font-medium text-red-600">This action cannot be undone!</p>
                <p>The following will be permanently deleted:</p>
                <ul className="text-left inline-block space-y-1">
                  <li>- User profile from database</li>
                  <li>- Download history</li>
                  {showDeleteModal.role === 'technician' && (
                    <li className="text-red-600 font-medium">- All assigned repairs (as technician)</li>
                  )}
                </ul>
                <div className="bg-green-50 rounded-lg p-2 mt-3 text-left">
                  <p className="text-green-700 text-xs">
                    <span className="font-medium">Device Scans Preserved:</span> All device scan history ({showDeleteModal.scanCount || 0} scans) will be kept for historical records.
                  </p>
                </div>
                {showDeleteModal.role === 'technician' && (
                  <div className="bg-red-50 rounded-lg p-2 mt-3 text-left">
                    <p className="text-red-700 text-xs font-medium">
                      Warning: This is a technician. All their assigned repairs will be permanently deleted!
                    </p>
                  </div>
                )}
                <div className="bg-amber-50 rounded-lg p-2 mt-3 text-left">
                  <p className="text-amber-700 text-xs">
                    <span className="font-medium">Firebase Auth:</span> Login credentials will remain in Firebase Authentication. Admin must manually delete from Firebase Console if needed.
                  </p>
                </div>
              </div>

              {deleteError && (
                <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg p-2 mb-4">
                  {deleteError}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Database Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-red-600 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Reset & Seed Database
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-red-800 font-semibold text-sm mb-2">DANGER ZONE</p>
                <p className="text-red-700 text-xs mb-3">This will permanently DELETE ALL DATA:</p>
                <ul className="text-red-700 text-xs space-y-1 ml-4">
                  <li>- All users from Firebase Authentication</li>
                  <li>- All staff profiles</li>
                  <li>- All departments</li>
                  <li>- All devices</li>
                  <li>- All device scans</li>
                  <li>- All repairs</li>
                  <li>- ALL other data</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-green-800 font-medium text-sm mb-2">New Super Admin will be created:</p>
                <ul className="text-green-700 text-xs space-y-1 ml-4">
                  <li>- Email: <span className="font-mono font-medium">admin.company@gmail.com</span></li>
                  <li>- Password: <span className="font-mono font-medium">12345678admin</span></li>
                  <li>- Role: Super Admin</li>
                </ul>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-amber-800 font-medium text-sm mb-2">You will be logged out!</p>
                <p className="text-amber-700 text-xs">After reset, login with the new admin credentials above.</p>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Type <span className="text-red-600 font-mono">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => {
                    setResetConfirmText(e.target.value);
                    setResetError('');
                  }}
                  placeholder="Type RESET"
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {resetError && (
                <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg p-2">
                  {resetError}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                  setResetError('');
                }}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                disabled={isResetting || resetConfirmText !== 'RESET'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  'RESET EVERYTHING'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Modal */}
      {showResetSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Database Reset Complete</h3>
              <p className="text-sm text-gray-500 mb-4">You will be redirected to login page...</p>

              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">New Admin Credentials:</p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>- Email: <span className="font-mono font-medium">admin.company@gmail.com</span></li>
                  <li>- Password: <span className="font-mono font-medium">12345678admin</span></li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                setShowResetSuccessModal(false);
                // Logout and redirect to login
                window.location.href = '/';
              }}
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-medium transition-colors hover:bg-gray-800"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
