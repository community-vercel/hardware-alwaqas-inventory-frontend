import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  CubeIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  PresentationChartLineIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../services/api';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch low stock count
  const { data: lowStockData } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => productAPI.getLowStock(),
    refetchInterval: 60000, // Refetch every minute
    onSuccess: (data) => {
      setLowStockCount(data.data?.length || 0);
    }
  });

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Navigation items
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon,
      roles: ['superadmin', 'admin', 'staff']
    },
    { 
      name: 'POS', 
      href: '/pos', 
      icon: ShoppingCartIcon,
      roles: ['superadmin', 'admin', 'staff'],
      badge: 'New'
    },
    { 
      name: 'Products', 
      href: '/products', 
      icon: CubeIcon,
      roles: ['superadmin', 'admin']
    },
    { 
      name: 'Inventory', 
      href: '/inventory', 
      icon: ClipboardDocumentListIcon,
      roles: ['superadmin', 'admin', 'staff'],
      badge: lowStockCount > 0 ? lowStockCount.toString() : null
    },
    { 
      name: 'History', 
      href: '/sales', 
      icon: CurrencyDollarIcon,
      roles: ['superadmin', 'admin']
      
    },
    { 
      name: 'Expenses', 
      href: '/expenses', 
      icon: ReceiptPercentIcon,
      roles: ['superadmin', 'admin']
    },
   { 
      name: 'Customers', 
      href: '/customers', 
      icon: UserCircleIcon,
      roles: ['superadmin', 'admin']
    },

     { 
      name: 'Suppliers', 
      href: '/suppliers', 
      icon: UserCircleIcon,
      roles: ['superadmin', 'admin']
    },
  ];

  const userNavigation = [
    { name: 'Your Profile', href: '/profile' },
    // { name: 'Settings', href: '/settings' },
    // { name: 'Help & Support', href: '/help' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  // Notifications data
  const notifications = [
    {
      id: 1,
      title: 'Low Stock Alert',
      message: `${lowStockCount} products are running low on stock`,
      time: '10 minutes ago',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 2,
      title: 'New Sale Recorded',
      message: 'Sale #INV-20231215-0001 completed successfully',
      time: '1 hour ago',
      icon: CurrencyDollarIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      id: 3,
      title: 'System Update',
      message: 'New features added to inventory management',
      time: '2 days ago',
      icon: Cog6ToothIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown')) {
        setNotificationsOpen(false);
      }
      if (!event.target.closest('.profile-dropdown')) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
          {/* Mobile sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <CubeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Al-Waqas</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile sidebar navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                  {item.badge && (
                    <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                      typeof item.badge === 'number' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile sidebar footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="font-bold text-indigo-600">
                  {getInitials(user.username || 'User')}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          {/* Desktop sidebar header */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                <CubeIcon className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">Al-Waqas Paint</h1>
                <p className="text-xs text-gray-500">Hardware Shop Inventory</p>
              </div>
            </div>
          </div>

          {/* Desktop sidebar navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-l-4 border-indigo-500'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                  {item.badge && (
                    <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                      typeof item.badge === 'number' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop sidebar footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                <span className="font-bold text-indigo-600">
                  {getInitials(user.username || 'User')}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                <p className="text-xs text-gray-500 capitalize">{user.email}</p>

              </div>
              <button
                onClick={handleLogout}
                className="ml-auto p-2 rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation bar */}
        <header className="sticky top-0 z-30 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          {/* Mobile menu button */}
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Search bar */}
          <div className="flex-1 px-4 flex justify-between lg:justify-end">
            <div className="flex-1 max-w-lg lg:max-w-xs">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="ml-4 flex items-center lg:ml-6">
              {/* Help button */}
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <QuestionMarkCircleIcon className="h-6 w-6" />
              </button>

              {/* Notifications dropdown */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-gray-400 hover:text-gray-500 relative"
                >
                  <BellIcon className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                      <p className="text-sm text-gray-500">You have {notifications.length} unread notifications</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50"
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 p-2 rounded-lg ${notification.bgColor}`}>
                              <notification.icon className={`h-5 w-5 ${notification.color}`} />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <button className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative profile-dropdown ml-4">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center max-w-xs text-sm rounded-full focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="font-bold text-indigo-600">
                      {getInitials(user.username || 'User')}
                    </span>
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <div className="py-1">
                      {userNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    <div className="py-1 border-t border-gray-200">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 pb-8 bg-white h-full">
          {/* Page header */}
          <div className="bg-white shadow">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {location.pathname.split('/')[1] || 'Dashboard'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="text-sm text-gray-600">
                © {new Date().getFullYear()} Al-Waqas Hardware Shop. All rights reserved.
              </div>
              <div className="flex items-center space-x-6 mt-2 md:mt-0">
                <span className="text-sm text-gray-500">Version 1.0.0</span>
                
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;