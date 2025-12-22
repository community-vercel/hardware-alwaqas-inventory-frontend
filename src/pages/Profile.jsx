import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserCircleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Profile = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: authAPI.getProfile
  });

  const updateMutation = useMutation({
  mutationFn: authAPI.updateProfile,
  onSuccess: (response) => {
    const { user } = response.data.data;
    localStorage.setItem('user', JSON.stringify(user));
    queryClient.setQueryData({ queryKey: ['profile'] }, response);
    toast.success('Profile updated successfully');
    setIsEditing(false);
    setFormData({
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Failed to update profile');
  }
});


  const user = profileData?.data?.user || JSON.parse(localStorage.getItem('user') || '{}');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const updateData = {};
    if (formData.email) updateData.email = formData.email;
    if (formData.newPassword) updateData.password = formData.newPassword;

    updateMutation.mutate(updateData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile Info Card */}
        <div className="card">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
              <UserCircleIcon className="h-16 w-16 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-600">{user.username}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </span>
                <span className="text-sm text-gray-500 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Joined: {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <div className="text-lg text-gray-900">{user.username}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    Email
                  </label>
                  <div className="text-lg text-gray-900">{user.email}</div>
                </div>
              </div>
              {user.lastLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Last Login</label>
                  <div className="text-lg text-gray-900">
                    {formatDate(user.lastLogin, 'dd/MM/yyyy HH:mm:ss')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder={user.email}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  Change Password
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  Leave password fields blank if you don't want to change the password.
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn-primary"
                >
                  {updateMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Activity Log */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div className="text-sm text-gray-900">Logged in successfully</div>
              <div className="text-sm text-gray-500 ml-auto">
                {formatDate(new Date(), 'HH:mm')}
              </div>
            </div>
            {/* Add more activity items here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;