import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter both email and password');
      setLoading(false);
      return;
    }
    
    try {
      // Make API call using your authAPI.login
      const response = await authAPI.login(credentials);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success(`Welcome back, ${user.email}!`);
        
        // Navigate to dashboard immediately
        navigate('/dashboard', { replace: true });
        
        // Force a refresh to update auth state if needed
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = error.response.data?.message || 'Invalid credentials';
        toast.error(`Login failed: ${errorMessage}`);
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('No response from server. Make sure backend is running on http://localhost:5000');
      } else {
        // Something happened in setting up the request
        toast.error('Login error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

 

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center">
              <BuildingStorefrontIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Al-Waqas Hardware
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Inventory Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter email"
                  value={credentials.email}
                  onChange={handleChange}
                //   autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter password"
                  value={credentials.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

         

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-xs text-blue-700">
            <p><strong>Current Status:</strong> {loading ? 'Logging in...' : 'Ready'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Al-Waqas Hardware • Inventory System v1.0.0</p>
        </div>
      </div>
    </div>
    </div>

  );
};

export default Login;