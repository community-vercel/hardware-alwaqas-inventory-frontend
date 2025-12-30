import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserCircleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  KeyIcon,
  SignalIcon,
  SignalSlashIcon,
  ServerIcon,
  WifiIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const API_STATUS_URL = 'https://api-alwaqas-hardware.vercel.app/api/health';

const Profile = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [apiStatus, setApiStatus] = useState({
    loading: true,
    online: false,
    lastChecked: null,
    response: null,
    nextCheck: null
  });

  // Check API status
  const checkApiStatus = async () => {
    setApiStatus(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(API_STATUS_URL);
      const data = await response.json();
      
      const nextCheckTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      setApiStatus({
        loading: false,
        online: true,
        lastChecked: new Date(),
        response: data,
        nextCheck: nextCheckTime
      });
    } catch (error) {
      const nextCheckTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      setApiStatus({
        loading: false,
        online: false,
        lastChecked: new Date(),
        response: null,
        error: error.message,
        nextCheck: nextCheckTime
      });
    }
  };

  useEffect(() => {
    // Check immediately on component mount
    checkApiStatus();
    
    // Calculate time until next check (24 hours)
    const scheduleNextCheck = () => {
      const now = new Date();
      const nextCheckTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const timeUntilNextCheck = nextCheckTime.getTime() - now.getTime();
      
      const timeoutId = setTimeout(() => {
        checkApiStatus();
        scheduleNextCheck();
      }, timeUntilNextCheck);
      
      return timeoutId;
    };
    
    // Schedule first check
    const timeoutId = scheduleNextCheck();
    
    // Also check when user manually clicks refresh
    // This is handled by the refresh button
    
    return () => clearTimeout(timeoutId);
  }, []);

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

  // Calculate time until next check
  const getTimeUntilNextCheck = () => {
    if (!apiStatus.nextCheck) return 'Not scheduled';
    
    const now = new Date();
    const nextCheck = new Date(apiStatus.nextCheck);
    const diffMs = nextCheck.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* API Status Banner */}
        <div className={`rounded-lg border p-4 ${
          apiStatus.loading ? 'bg-gray-50 border-gray-200' :
          apiStatus.online ? 'bg-green-50 border-green-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {apiStatus.loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
              ) : apiStatus.online ? (
                <SignalIcon className="h-5 w-5 text-green-600" />
              ) : (
                <SignalSlashIcon className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  API Status: 
                  <span className={`ml-2 ${
                    apiStatus.loading ? 'text-gray-600' :
                    apiStatus.online ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {apiStatus.loading ? 'Checking...' : 
                     apiStatus.online ? 'Online ✓' : 
                     'Offline ✗'}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">
                  {apiStatus.online && apiStatus.response?.service 
                    ? apiStatus.response.service 
                    : 'API Service'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {apiStatus.lastChecked && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Last check: {formatDate(apiStatus.lastChecked, 'HH:mm:ss')}
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Next check in: {getTimeUntilNextCheck()}
                  </div>
                </div>
              )}
              <button
                onClick={checkApiStatus}
                disabled={apiStatus.loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
              >
                {apiStatus.loading ? 'Checking...' : 'Check Now'}
              </button>
            </div>
          </div>
          
          {!apiStatus.loading && apiStatus.response && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center">
                <ServerIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium ${
                  apiStatus.online ? 'text-green-600' : 'text-red-600'
                }`}>
                  {apiStatus.response.status || 'unknown'}
                </span>
              </div>
              
              <div className="flex items-center">
                <WifiIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Response:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {apiStatus.response.success ? 'Success' : 'Failed'}
                </span>
              </div>
              
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Last Response:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formatDate(apiStatus.response.timestamp, 'HH:mm:ss')}
                </span>
              </div>
              
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Check Interval:</span>
                <span className="ml-2 font-medium text-gray-900">24 hours</span>
              </div>
            </div>
          )}
          
          {!apiStatus.loading && !apiStatus.online && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md">
              <p className="text-sm text-red-700">
                The API server is currently unavailable. Some features may not work properly.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Please check your connection or contact support if the issue persists.
              </p>
            </div>
          )}
        </div>

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
                  disabled={updateMutation.isLoading || !apiStatus.online}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!apiStatus.online ? "API is offline - cannot update profile" : ""}
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
              <div className={`h-2 w-2 rounded-full ${
                apiStatus.online ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div className="text-sm text-gray-900">
                {apiStatus.online ? 'API Server is online' : 'API Server is offline'}
              </div>
              <div className="text-sm text-gray-500 ml-auto">
                {formatDate(apiStatus.lastChecked || new Date(), 'HH:mm:ss')}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div className="text-sm text-gray-900">Logged in successfully</div>
              <div className="text-sm text-gray-500 ml-auto">
                {formatDate(new Date(), 'HH:mm:ss')}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <div className="text-sm text-gray-900">
                API status check scheduled every 24 hours
              </div>
              <div className="text-sm text-gray-500 ml-auto">
                Next: {getTimeUntilNextCheck()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;