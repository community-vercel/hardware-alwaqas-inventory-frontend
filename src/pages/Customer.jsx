import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { saleAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

const Customers = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    subscribeToNotifications: false,
    customerType: 'regular'
  });

  // Fetch customers from sales data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customersFromSales', { search, page }],
    queryFn: () => saleAPI.getCustomersFromSales({
      search,
      page
    }),
    keepPreviousData: true,
    refetchInterval: 5000,
    staleTime: 3000
  });

  // DEBUG: Log the full response structure
  // console.log('Full API response:', data);

  // Extract data from response - FIXED
  const customers = data?.data?.data?.docs || []; // Changed this line
  const stats = data?.data?.data?.stats || {    // Changed this line
    totalCustomers: 0,
    vipCustomers: 0,
    totalSpent: 0,
    averageOrderValue: 0
  };

  // DEBUG: Log extracted data
  // console.log('Customers:', customers);
  // console.log('Stats:', stats);

  // Filter out customers with null/empty phone (these are from sales without customer info)
  const filteredCustomers = customers.filter(customer => 
    customer.phone && customer.name && customer.address
  );

  // Since customers from sales don't have email/address, 
  // we'll need to handle form submissions differently
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    
    // Note: Since we're getting customers from sales, 
    // we can't add new customers directly here.
    // New customers will be created when they make a purchase.
    toast.info('Customers are created automatically when making purchases');
    handleCloseModal();
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    
    // Similarly, we can't update customer details directly 
    // since they come from sales data
    toast.info('Customer details are updated automatically with new purchases');
    setIsEditing(false);
    setSelectedCustomer(null);
    setShowForm(false);
  };

  const handleDeleteCustomer = async (customerPhone) => {
    if (!window.confirm('Are you sure? This will remove customer from the list, but sales records will remain.')) return;
    
    // We can't delete sales records, but we can filter them out
    toast.info('Customer sales records are preserved in sales history');
    refetch();
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleEditCustomer = (customer) => {
    // Since customers from sales don't have all fields,
    // we'll populate only available data
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: '',
      address: customer.address || '',
      notes: '',
      subscribeToNotifications: false,
      customerType: customer.totalSpent > 1000 ? 'vip' : 'regular'
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setSelectedCustomer(null);
    setIsEditing(false);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: customer.address || '',
      notes: '',
      subscribeToNotifications: false,
      customerType: 'regular'
    });
  };

  // Determine customer type based on spending
  const getCustomerType = (customer) => {
    if (!customer.totalSpent) return { label: 'New', class: 'bg-gray-100 text-gray-800' };
    if (customer.totalSpent > 5000) return { label: 'VIP', class: 'bg-yellow-100 text-yellow-800' };
    if (customer.totalSpent > 1000) return { label: 'Regular', class: 'bg-green-100 text-green-800' };
    return { label: 'New', class: 'bg-gray-100 text-gray-800' };
  };

  // Fix for customers with null/undefined names
  const getCustomerName = (customer) => {
    if (!customer.name) {
      if (customer.phone) return `Customer (${customer.phone})`;
      return 'Unknown Customer';
    }
    return customer.name;
  };

  // Fix for customer IDs (some have null _id)
  const getCustomerId = (customer, index) => {
    return customer._id || customer.phone || `customer-${index}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredCustomers.length} customers found in sales data
          </p>
        </div>
        
        {/* <button
          onClick={() => {
            toast.info('Add customers by creating a new sale');
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Sale to Add Customer
        </button> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCustomers || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-yellow-100 p-3">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">VIP Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.vipCustomers || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
              <PlusIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalSpent || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
              <UserIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Spent/Customer</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.averageOrderValue || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Search customer by name or phone..."
              onSearch={setSearch}
            />
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Customer</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Address</th>
                <th className="table-header">Type</th>
                <th className="table-header">Purchases</th>
                <th className="table-header">Total Spent</th>
                <th className="table-header">First Purchase</th>
                <th className="table-header">Last Purchase</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => {
                const customerType = getCustomerType(customer);
                const customerId = getCustomerId(customer, index);
                
                return (
                  <tr key={customerId} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {getCustomerName(customer)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.address || 'N/A'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customerType.class}`}>
                        {customer.totalSpent > 5000 && <StarIcon className="h-3 w-3 mr-1" />}
                        {customerType.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {customer.totalPurchases || 0} purchases
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(customer.totalSpent || 0)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {customer.firstPurchaseDate 
                          ? new Date(customer.firstPurchaseDate).toLocaleDateString() 
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {customer.lastPurchaseDate 
                          ? new Date(customer.lastPurchaseDate).toLocaleDateString() 
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.phone)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? 'No customers match your search' : 'No customers found in sales data. Create a sale to add customers.'}
            </p>
          </div>
        )}

        {/* Pagination - if you want to implement it later */}
        {/* <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={data?.data?.data?.totalPages || 1}
            onPageChange={setPage}
          />
        </div> */}
      </div>

      {/* View Customer Details Modal */}
      {selectedCustomer && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {getCustomerName(selectedCustomer)}
              </h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-base font-semibold text-gray-900">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Purchases</p>
                  <p className="text-base font-semibold text-gray-900">{selectedCustomer.totalPurchases || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-base font-semibold text-gray-900">{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Since</p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedCustomer.firstPurchaseDate 
                      ? new Date(selectedCustomer.firstPurchaseDate).toLocaleDateString() 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

             {selectedCustomer.recentSales && selectedCustomer.recentSales.length > 0 && (
  <div>
    <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Sales</h3>
    <div className="space-y-2">
      {selectedCustomer.recentSales.map((sale) => (
        <div key={sale._id} className="bg-gray-50 rounded-lg p-3">
          {/* Sale Header */}
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {sale.invoiceNumber}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(sale.saleDate).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(sale.grandTotal)}
              </div>
              <div className="text-xs text-gray-500">
                {sale.items?.length || 0} item{sale.items?.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          {/* Products List */}
          {sale.items && sale.items.length > 0 && (
            <div className="border-t border-gray-200 pt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">Products:</div>
              <div className="space-y-1">
                {sale.items.map((item, index) => (
                  <div key={item._id || index} className="flex justify-between text-xs">
                    <div className="text-gray-700">
                      {item.productName}
                      <span className="text-gray-500 ml-1">
                        (x{item.quantity})
                      </span>
                    </div>
                    <div className="text-gray-700">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;