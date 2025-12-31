// src/pages/Supplier.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { productAPI } from '../services/api';
import Loader from '../components/Loader';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const Suppliers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [viewSupplierProducts, setViewSupplierProducts] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    salesPerson: '',
    contact: '',
    email: '',
    address: ''
  });

  // Load suppliers from localStorage
  const loadLocalSuppliers = () => {
    try {
      const saved = localStorage.getItem('productSuppliers');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading suppliers from localStorage:', error);
      return [];
    }
  };

  // Save suppliers to localStorage
  const saveLocalSuppliers = (suppliers) => {
    try {
      localStorage.setItem('productSuppliers', JSON.stringify(suppliers));
    } catch (error) {
      console.error('Error saving suppliers to localStorage:', error);
    }
  };

  // Get all products to extract supplier information
  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', { search: '', category: '', page: 1 }],
    queryFn: () => productAPI.getProducts({ 
      search: '', 
      category: '', 
      page: 1,
      limit: 1000
    }),
  });

  // Extract and combine suppliers
  const suppliers = useMemo(() => {
    if (!productsData) return [];
    
    const products = productsData?.data?.docs || productsData?.docs || [];
    const localSuppliers = loadLocalSuppliers();
    const supplierMap = new Map();
    
    // Add local suppliers first
    localSuppliers.forEach(supplierName => {
      if (typeof supplierName === 'string' && supplierName.trim()) {
        const name = supplierName.trim();
        supplierMap.set(name, {
          _id: `local_${name.toLowerCase().replace(/\s+/g, '_')}`,
          name: name,
          source: 'local',
          productsCount: 0,
          totalStock: 0,
          totalValue: 0,
          contactInfo: {
            salesPerson: '',
            contact: '',
            email: '',
            address: ''
          }
        });
      }
    });
    
    // Process products to extract suppliers and aggregate data
    products.forEach(product => {
      if (product.supplier && typeof product.supplier === 'string' && product.supplier.trim()) {
        const supplierName = product.supplier.trim();
        
        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            _id: `product_${supplierName.toLowerCase().replace(/\s+/g, '_')}`,
            name: supplierName,
            source: 'product',
            productsCount: 1,
            totalStock: product.quantity || 0,
            totalValue: (product.quantity || 0) * (product.purchasePrice || 0),
            contactInfo: {
              salesPerson: product.supplierSalesPerson || '',
              contact: product.supplierContact || '',
              email: product.supplierEmail || '',
              address: product.supplierAddress || ''
            }
          });
        } else {
          const existing = supplierMap.get(supplierName);
          existing.productsCount += 1;
          existing.totalStock += product.quantity || 0;
          existing.totalValue += (product.quantity || 0) * (product.purchasePrice || 0);
          
          // Update contact info if product has more complete data
          if (product.supplierSalesPerson && !existing.contactInfo.salesPerson) {
            existing.contactInfo.salesPerson = product.supplierSalesPerson;
          }
          if (product.supplierContact && !existing.contactInfo.contact) {
            existing.contactInfo.contact = product.supplierContact;
          }
          if (product.supplierEmail && !existing.contactInfo.email) {
            existing.contactInfo.email = product.supplierEmail;
          }
          if (product.supplierAddress && !existing.contactInfo.address) {
            existing.contactInfo.address = product.supplierAddress;
          }
          
          // If it was a local supplier, update source
          if (existing.source === 'local') {
            existing.source = 'both';
          }
        }
      }
    });
    
    // Convert to array and filter by search
    const suppliersArray = Array.from(supplierMap.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      return suppliersArray.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower) ||
        (supplier.contactInfo.salesPerson && supplier.contactInfo.salesPerson.toLowerCase().includes(searchLower)) ||
        (supplier.contactInfo.contact && supplier.contactInfo.contact.includes(search)) ||
        (supplier.contactInfo.email && supplier.contactInfo.email.toLowerCase().includes(searchLower))
      );
    }
    
    return suppliersArray.sort((a, b) => a.name.localeCompare(b.name));
  }, [productsData, search]);

  // Add new supplier
  const handleAddSupplier = () => {
    if (!newSupplier.name.trim()) {
      toast.error('Please enter supplier name');
      return;
    }

    // Check if supplier already exists
    const existingSupplier = suppliers.find(s => 
      s.name.toLowerCase() === newSupplier.name.trim().toLowerCase()
    );
    
    if (existingSupplier) {
      toast.error('Supplier already exists');
      return;
    }

    const localSuppliers = loadLocalSuppliers();
    const updatedSuppliers = [...localSuppliers, newSupplier.name.trim()];
    saveLocalSuppliers(updatedSuppliers);
    
    setNewSupplier({
      name: '',
      salesPerson: '',
      contact: '',
      email: '',
      address: ''
    });
    setShowAddSupplierModal(false);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Supplier added successfully');
  };

  // Update supplier name in all products
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ oldName, newName }) => {
      // In a real implementation, this would update all products with the old supplier name
      // For now, we'll just update localStorage and invalidate queries
      const products = productsData?.data?.docs || productsData?.docs || [];
      const productsToUpdate = products.filter(p => p.supplier === oldName);
      
      // Show what would be updated
      toast.success(`Would update ${productsToUpdate.length} products from "${oldName}" to "${newName}"`);
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Remove supplier
  const handleRemoveSupplier = (supplierName) => {
    if (window.confirm(`Are you sure you want to remove "${supplierName}"? This will remove the supplier name from all products.`)) {
      const localSuppliers = loadLocalSuppliers();
      const updatedSuppliers = localSuppliers.filter(s => s !== supplierName);
      saveLocalSuppliers(updatedSuppliers);
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Supplier removed from local list');
    }
  };

  // Get products for a specific supplier
  const getSupplierProducts = (supplierName) => {
    if (!productsData) return [];
    
    const products = productsData?.data?.docs || productsData?.docs || [];
    return products.filter(product => 
      product.supplier && product.supplier.trim() === supplierName
    );
  };

  // Export supplier products to CSV
  const exportSupplierProducts = (supplierName) => {
    const products = getSupplierProducts(supplierName);
    
    if (products.length === 0) {
      toast.error('No products found for this supplier');
      return;
    }
    
    const exportData = products.map(p => ({
      'Product Name': p.productName,
      'Size/Package': p.sizePackage,
      'Category': p.category,
      'Unit': p.unit,
      'Stock': p.quantity,
      'Purchase Price': p.purchasePrice,
      'Sale Price': p.salePrice,
      'Minimum Stock': p.minStockLevel || 10,
      'Barcode': p.barcode || '',
      'Stock Value': (p.quantity || 0) * (p.purchasePrice || 0)
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => {
        const cell = row[header];
        return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
      }).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplierName.replace(/\s+/g, '_')}_products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${products.length} products for ${supplierName}`);
  };

  // Edit supplier contact info
  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
  };

  const handleUpdateSupplierContact = () => {
    if (!editingSupplier) return;
    
    toast.info('In a real implementation, this would update contact info in all related products');
    setEditingSupplier(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading suppliers</h3>
        <p className="mt-1 text-sm text-gray-500">Failed to fetch supplier data. Please try again.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total {suppliers.length} suppliers • Manage your product suppliers
          </p>
        </div>
        <button
          onClick={() => setShowAddSupplierModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="relative max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search suppliers by name, contact person, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
          <span className="inline-flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            Active in products
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            Saved locally
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
            Both
          </span>
        </div>
      </div>

      {/* Suppliers Stats */}
      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-indigo-100 p-3">
                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-semibold text-gray-900">{suppliers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {suppliers.reduce((sum, s) => sum + s.productsCount, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  PKR {suppliers.reduce((sum, s) => sum + s.totalValue, 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => {
          const supplierProducts = getSupplierProducts(supplier.name);
          
          return (
            <div key={supplier._id} className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${
                    supplier.source === 'product' ? 'bg-green-100' : 
                    supplier.source === 'local' ? 'bg-blue-100' : 
                    'bg-purple-100'
                  }`}>
                    <BuildingOfficeIcon className={`h-6 w-6 ${
                      supplier.source === 'product' ? 'text-green-600' : 
                      supplier.source === 'local' ? 'text-blue-600' : 
                      'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        supplier.source === 'product' ? 'bg-green-100 text-green-800' : 
                        supplier.source === 'local' ? 'bg-blue-100 text-blue-800' : 
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {supplier.source === 'product' ? 'Active' : 
                         supplier.source === 'local' ? 'Saved' : 'Active & Saved'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {supplier.productsCount} product{supplier.productsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {supplier.source !== 'product' && (
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Supplier"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  {supplier.source !== 'product' && (
                    <button
                      onClick={() => handleRemoveSupplier(supplier.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Remove Supplier"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              {(supplier.contactInfo.salesPerson || supplier.contactInfo.contact || supplier.contactInfo.email) && (
                <div className="mb-4 space-y-2">
                  {supplier.contactInfo.salesPerson && (
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-4 w-4 mr-2" />
                      <span>{supplier.contactInfo.salesPerson}</span>
                    </div>
                  )}
                  {supplier.contactInfo.contact && (
                    <div className="flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <span>{supplier.contactInfo.contact}</span>
                    </div>
                  )}
                  {supplier.contactInfo.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      <span className="truncate">{supplier.contactInfo.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Total Stock</p>
                    <p className="text-lg font-semibold text-gray-900">{supplier.totalStock}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-lg font-semibold text-gray-900">
                      PKR {supplier.totalValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                  {supplier.productsCount > 0 && (
                    <button
                      onClick={() => setViewSupplierProducts(supplier)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Products
                    </button>
                  )}
                  {supplier.productsCount === 0 && (
                    <button
                      onClick={() => toast.info('No products associated with this supplier yet')}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 rounded-md"
                    >
                      No Products
                    </button>
                  )}
                  <button
                    onClick={() => exportSupplierProducts(supplier.name)}
                    className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md flex items-center justify-center"
                    title="Export to CSV"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {suppliers.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No suppliers found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No suppliers match your search.' : 'Add suppliers to get started.'}
          </p>
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Your First Supplier
          </button>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowAddSupplierModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Add New Supplier
                    </h3>
                    <p className="text-sm text-gray-500">
                      Suppliers will be available when creating products
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Person (Optional)
                    </label>
                    <input
                      type="text"
                      value={newSupplier.salesPerson}
                      onChange={(e) => setNewSupplier({...newSupplier, salesPerson: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={newSupplier.contact}
                      onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address (Optional)
                    </label>
                    <textarea
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Full address"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Add Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Products Modal */}
      {viewSupplierProducts && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setViewSupplierProducts(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Products from {viewSupplierProducts.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Total {viewSupplierProducts.productsCount} products • Total Value: PKR {viewSupplierProducts.totalValue.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => exportSupplierProducts(viewSupplierProducts.name)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => setViewSupplierProducts(null)}
                      className="p-2 text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {getSupplierProducts(viewSupplierProducts.name).length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      This supplier doesn't have any products associated with it yet.
                    </p>
                    <button
                      onClick={() => {
                        toast.info('Go to Products page to add products with this supplier');
                        setViewSupplierProducts(null);
                      }}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Products list */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prices
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSupplierProducts(viewSupplierProducts.name).map((product) => (
                            <tr key={product._id}>
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.productName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {product.sizePackage} • {product.unit}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  {product.category}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {product.quantity} {product.unit}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Min: {product.minStockLevel || 10}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  Sale: {formatCurrency(product.salePrice)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Cost: {formatCurrency(product.purchasePrice)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency((product.quantity || 0) * (product.purchasePrice || 0))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setEditingSupplier(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Edit Supplier
                    </h3>
                    <p className="text-sm text-gray-500">
                      Update supplier contact information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSupplier(null)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Person
                    </label>
                    <input
                      type="text"
                      defaultValue={editingSupplier.contactInfo.salesPerson}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      defaultValue={editingSupplier.contactInfo.contact}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={editingSupplier.contactInfo.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      defaultValue={editingSupplier.contactInfo.address}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Full address"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSupplierContact}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Update Contact Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;