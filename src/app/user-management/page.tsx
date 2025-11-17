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

export default function UserManagementPage() {
  const router = useRouter();
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

  // Load staff
  useEffect(() => {
    loadStaff();
  }, []);

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

  // Removed loadDepartments - now using real-time listener above

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
      // This prevents the super_admin from being logged out when creating a new user
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary-' + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // IMPORTANT: Firebase Auth always lowercases emails, so we must do the same
      const emailLowercase = newTechnicianForm.email.toLowerCase();

      // Create Firebase Auth account using secondary auth (won't affect current session)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        emailLowercase,
        password
      );

      // Create Firestore user document with technician role
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: emailLowercase, // Use lowercase email to match Firebase Auth
        name: newTechnicianForm.name,
        phone: countryCode + newTechnicianForm.phone, // Combine country code + phone
        department: newTechnicianForm.department.toUpperCase(),
        role: 'technician',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'super_admin',
        mustChangePassword: true // Flag for first login
      });

      // Clean up secondary app to free resources
      await deleteApp(secondaryApp);

      // Store info for success modal
      setCreatedTechnicianInfo({
        name: newTechnicianForm.name,
        email: emailLowercase, // Use lowercase email
        password: password
      });

      // Close create modal and show success modal
      setShowCreateModal(false);
      setShowSuccessModal(true);

      // Reset form
      setNewTechnicianForm({ name: '', email: '', phone: '', department: '' });
      setCountryCode('+60'); // Reset to Malaysia default

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

  const uniqueDepartments = Array.from(new Set(staff.map(s => s.department))).sort();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
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

      {/* Header */}
      <div className="backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-4xl font-semibold text-gray-800 tracking-wide uppercase">USER · MANAGEMENT</h1>
              <p className="mt-3 text-sm text-gray-600 font-normal">Manage staff members and their accounts</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 sm:px-6 sm:py-3
                  md:bg-blue-100 md:border-4 md:border-blue-300 md:hover:bg-blue-200 md:hover:border-blue-400 md:text-blue-700 md:hover:text-blue-800
                  bg-blue-600 border-4 border-blue-700 text-white
                  font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm sm:text-base">Create Technician</span>
              </button>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{staff.length}</div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Filters */}
        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or department..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'technician')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="user">Users Only</option>
                <option value="technician">Technicians Only</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <p className="text-sm text-gray-600">
                Showing {filteredStaff.length} of {staff.length} users
                {roleFilter !== 'all' && ` (${roleFilter === 'technician' ? 'Technicians' : 'Regular Users'})`}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('');
                  setRoleFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Staff Table */}
        <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-sm text-gray-600">
                {searchQuery || departmentFilter
                  ? 'Try adjusting your filters'
                  : 'No staff members have been registered yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device Scans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Scan
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(member.role || 'user') === 'technician' ? (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Technician
                          </span>
                        ) : member.role === 'super_admin' ? (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-yellow-700 bg-yellow-100 rounded-full">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.role === 'super_admin' ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
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
                          className="inline-flex items-center px-3 py-1 border-4 text-xs font-medium rounded-md
                            md:bg-red-100 md:hover:bg-red-200 md:border-red-300 md:hover:border-red-400 md:text-red-700 md:hover:text-red-800
                            bg-red-600 border-red-700 text-white
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Technician Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Create Technician Account</h3>
                    <p className="text-sm text-gray-500">Password will be auto-generated</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTechnicianForm.name}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, name: e.target.value })}
                    placeholder="Enter technician's full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isCreating}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newTechnicianForm.email}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, email: e.target.value })}
                    placeholder="technician@company.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isCreating}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      disabled={isCreating}
                    >
                      <option value="+60">🇲🇾 +60 (Malaysia)</option>
                      <option value="+65">🇸🇬 +65 (Singapore)</option>
                      <option value="+62">🇮🇩 +62 (Indonesia)</option>
                      <option value="+66">🇹🇭 +66 (Thailand)</option>
                      <option value="+63">🇵🇭 +63 (Philippines)</option>
                      <option value="+84">🇻🇳 +84 (Vietnam)</option>
                      <option value="+86">🇨🇳 +86 (China)</option>
                      <option value="+91">🇮🇳 +91 (India)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+1">🇺🇸 +1 (USA)</option>
                    </select>
                    <input
                      type="tel"
                      value={newTechnicianForm.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setNewTechnicianForm({ ...newTechnicianForm, phone: value });
                      }}
                      placeholder="123456789"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isCreating}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Full number: {countryCode}{newTechnicianForm.phone}</p>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTechnicianForm.department}
                    onChange={(e) => setNewTechnicianForm({ ...newTechnicianForm, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>ℹ️ Note:</strong> A secure password will be auto-generated. Phone number is required for WhatsApp notifications when assigning repairs.
                  </p>
                </div>

                {createError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{createError}</p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2
                    md:bg-gray-200 md:hover:bg-gray-300 md:text-gray-700
                    bg-gray-600 text-white
                    rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTechnician}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 border-4
                    md:bg-blue-100 md:border-blue-300 md:hover:bg-blue-200 md:hover:border-blue-400 md:text-blue-700 md:hover:text-blue-800
                    bg-blue-600 border-blue-700 text-white
                    rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Technician Account Created!
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Please copy and save these credentials before closing
              </p>

              {/* Credentials Box */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                    <p className="text-sm font-medium text-gray-900">{createdTechnicianInfo.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{createdTechnicianInfo.email}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdTechnicianInfo.email);
                          alert('Email copied to clipboard!');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Temporary Password
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-bold text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200 flex-1">
                        {createdTechnicianInfo.password}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdTechnicianInfo.password);
                          alert('Password copied to clipboard!');
                        }}
                        className="text-blue-600 hover:text-blue-700 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Important:</strong> Send these credentials to the technician securely. They will be required to change their password upon first login.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    '⚠️ WARNING: Once you close this, you will NOT be able to see the password again!\n\n' +
                    'Have you copied and saved the password?\n\n' +
                    'Click OK only if you have saved the credentials.'
                  );
                  if (confirmed) {
                    setShowSuccessModal(false);
                    setCreatedTechnicianInfo(null);
                  }
                }}
                className="w-full px-4 py-3 border-4
                  md:bg-green-100 md:border-green-300 md:hover:bg-green-200 md:hover:border-green-400 md:text-green-700 md:hover:text-green-800
                  bg-green-600 border-green-700 text-white
                  rounded-lg font-medium transition-colors"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(null)}
        >
          <div
            className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Icon */}
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete User Permanently?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                This will permanently delete:
              </p>

              {/* User Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="text-gray-900">{showDeleteModal.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{showDeleteModal.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="text-gray-900">{showDeleteModal.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Scans:</span>
                    <span className="text-red-600 font-semibold">
                      {showDeleteModal.scanCount || 0} scan{(showDeleteModal.scanCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-red-600 text-center mb-6 space-y-2">
                <p className="font-semibold">⚠️ This action cannot be undone!</p>
                <p>All Firestore data will be permanently deleted:</p>
                <ul className="text-left inline-block">
                  <li>• User profile</li>
                  <li>• All device scans ({showDeleteModal.scanCount || 0})</li>
                  <li>• Download history</li>
                  {showDeleteModal.role === 'technician' && (
                    <li className="text-red-700 font-bold">• All assigned repairs (as technician)</li>
                  )}
                </ul>
                {showDeleteModal.role === 'technician' && (
                  <p className="text-red-700 bg-red-50 p-2 rounded mt-3 font-semibold border border-red-200">
                    🔧 <strong>Warning:</strong> This is a technician. All their assigned repairs will be permanently deleted!
                  </p>
                )}
                <p className="text-orange-600 bg-orange-50 p-2 rounded mt-3">
                  ℹ️ <strong>Note:</strong> Firebase Auth login will NOT be deleted. To fully remove access, also delete from Firebase Console → Authentication.
                </p>
              </div>

              {deleteError && (
                <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-lg p-2 mb-4">
                  {deleteError}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2
                    md:bg-gray-200 md:hover:bg-gray-300 md:text-gray-700
                    bg-gray-600 text-white
                    rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border-4
                    md:bg-red-100 md:border-red-300 md:hover:bg-red-200 md:hover:border-red-400 md:text-red-700 md:hover:text-red-800
                    bg-red-600 border-red-700 text-white
                    rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
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

      <style jsx>{`
        @keyframes modal-pop {
          0% { transform: scale(0.7) translateY(-20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-pop {
          animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
