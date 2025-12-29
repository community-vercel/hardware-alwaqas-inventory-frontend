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
  GlobeAltIcon,
  MapPinIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { productAPI } from '../services/api';
import Loader from '../components/Loader';
import { formatCurrency, getStockStatus, formatDate } from '../utils/helpers';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import toast from 'react-hot-toast';

const Suppliers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [viewSupplierProducts, setViewSupplierProducts] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'productName', direction: 'ascending' });

  // Use the same query as products to get all products
  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', { search: '', category: '', page: 1 }],
    queryFn: () => productAPI.getProducts({ 
      search: '', 
      category: '', 
      page: 1,
      limit: 1000 // Get all products to extract suppliers
    }),
  });

  // Extract unique suppliers from products data
  const suppliers = useMemo(() => {
    if (!productsData) return [];
    
    const products = productsData?.data?.docs || productsData?.docs || [];
    const supplierMap = new Map();
    
    products.forEach(product => {
      if (product.supplier && typeof product.supplier === 'string' && product.supplier.trim()) {
        const supplierName = product.supplier.trim();
        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            _id: `supplier_${supplierName.toLowerCase().replace(/\s+/g, '_')}`,
            name: supplierName,
            productsCount: 1,
            totalStock: product.quantity || 0,
            totalValue: (product.quantity || 0) * (product.purchasePrice || 0)
          });
        } else {
          const existing = supplierMap.get(supplierName);
          existing.productsCount += 1;
          existing.totalStock += product.quantity || 0;
          existing.totalValue += (product.quantity || 0) * (product.purchasePrice || 0);
        }
      }
    });
    
    // Convert to array and filter by search
    const suppliersArray = Array.from(supplierMap.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      return suppliersArray.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower)
      );
    }
    
    return suppliersArray.sort((a, b) => a.name.localeCompare(b.name));
  }, [productsData, search]);

  const deleteMutation = useMutation({
    mutationFn: async (supplierName) => {
      // This would need a backend API to handle supplier deletion
      // For now, we'll just show a toast
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Supplier data will be removed from products');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove supplier');
    }
  });

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = (supplierName) => {
    if (window.confirm(`Are you sure you want to remove "${supplierName}" from all products? This will only remove the supplier name from products, not delete the products themselves.`)) {
      deleteMutation.mutate(supplierName);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedSupplier(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // Get products for a specific supplier
  const getSupplierProducts = (supplierName) => {
    if (!productsData) return [];
    
    const products = productsData?.data?.docs || productsData?.docs || [];
    return products.filter(product => 
      product.supplier && product.supplier.trim() === supplierName
    );
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Sort supplier products
  const getSortedProducts = (products) => {
    if (!products) return [];
    
    const sortedProducts = [...products];
    sortedProducts.sort((a, b) => {
      if (sortConfig.key === 'productName') {
        return sortConfig.direction === 'ascending'
          ? a.productName?.localeCompare(b.productName)
          : b.productName?.localeCompare(a.productName);
      } else if (sortConfig.key === 'quantity') {
        return sortConfig.direction === 'ascending'
          ? (a.quantity || 0) - (b.quantity || 0)
          : (b.quantity || 0) - (a.quantity || 0);
      } else if (sortConfig.key === 'salePrice') {
        return sortConfig.direction === 'ascending'
          ? (a.salePrice || 0) - (b.salePrice || 0)
          : (b.salePrice || 0) - (a.salePrice || 0);
      } else if (sortConfig.key === 'stockValue') {
        const aValue = (a.quantity || 0) * (a.purchasePrice || 0);
        const bValue = (b.quantity || 0) * (b.purchasePrice || 0);
        return sortConfig.direction === 'ascending'
          ? aValue - bValue
          : bValue - aValue;
      }
      return 0;
    });
    
    return sortedProducts;
  };

  // View supplier products modal
  const handleViewSupplierProducts = (supplierName) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    setViewSupplierProducts(supplier);
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
        <p className="mt-1 text-sm text-gray-500">Failed to fetch supplier data from products. Please try again.</p>
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
            Total {suppliers.length} unique suppliers • Extracted from product data
          </p>
        </div>
        <button
          onClick={() => toast.info('Suppliers are automatically extracted from product data. Add supplier names to your products to see them here.')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <BuildingOfficeIcon className="h-5 w-5 mr-2" />
          How to Add Suppliers
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
            placeholder="Search suppliers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Suppliers are automatically extracted from the "supplier" field in your products.
        </p>
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
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
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
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${suppliers.reduce((sum, s) => sum + s.totalValue, 0).toLocaleString('en-US', {
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
                  <div className="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">
                      {supplier.productsCount} product{supplier.productsCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Edit Supplier"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.name)}
                    className="text-red-600 hover:text-red-900"
                    title="Remove Supplier"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Supplier Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Total Stock</p>
                    <p className="text-lg font-semibold text-gray-900">{supplier.totalStock}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${supplier.totalValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                </div>

                {/* Sample Products */}
                {supplierProducts.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Products:</h4>
                    <div className="space-y-2">
                      {supplierProducts.slice(0, 3).map(product => (
                        <div key={product._id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 truncate">{product.productName}</span>
                          <span className="font-medium text-gray-900">{product.quantity} {product.unit}</span>
                        </div>
                      ))}
                      {supplierProducts.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          + {supplierProducts.length - 3} more product{supplierProducts.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* View Products Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewSupplierProducts(supplier.name)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md flex items-center justify-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Products
                  </button>
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
            {search ? 'No suppliers match your search.' : 'Add supplier names to your products to see them listed here.'}
          </p>
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="text-sm font-medium text-gray-900 mb-2">How to add suppliers:</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Go to Products page</li>
                <li>Add or edit a product</li>
                <li>Enter a supplier name in the "Supplier" field</li>
                <li>Save the product</li>
                <li>Suppliers will appear here automatically</li>
              </ol>
            </div>
            {!search && (
              <button
                onClick={() => {
                  // You could redirect to products page or show a modal
                  toast.info('Go to Products page to add supplier names to your products');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Go to Products
              </button>
            )}
          </div>
        </div>
      )}

      {/* Supplier Products Modal */}
      {viewSupplierProducts && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setViewSupplierProducts(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Products from {viewSupplierProducts.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Total {viewSupplierProducts.productsCount} products • Total Value: ${viewSupplierProducts.totalValue.toLocaleString('en-US', {
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

              {/* Modal Body - Products Table */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('productName')}
                        >
                          <div className="flex items-center">
                            Product Name
                            {sortConfig.key === 'productName' && (
                              sortConfig.direction === 'ascending' 
                                ? <ArrowUpIcon className="h-4 w-4 ml-1" />
                                : <ArrowDownIcon className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('quantity')}
                        >
                          <div className="flex items-center">
                            Stock
                            {sortConfig.key === 'quantity' && (
                              sortConfig.direction === 'ascending' 
                                ? <ArrowUpIcon className="h-4 w-4 ml-1" />
                                : <ArrowDownIcon className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('salePrice')}
                        >
                          <div className="flex items-center">
                            Sale Price
                            {sortConfig.key === 'salePrice' && (
                              sortConfig.direction === 'ascending' 
                                ? <ArrowUpIcon className="h-4 w-4 ml-1" />
                                : <ArrowDownIcon className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('stockValue')}
                        >
                          <div className="flex items-center">
                            Stock Value
                            {sortConfig.key === 'stockValue' && (
                              sortConfig.direction === 'ascending' 
                                ? <ArrowUpIcon className="h-4 w-4 ml-1" />
                                : <ArrowDownIcon className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSortedProducts(getSupplierProducts(viewSupplierProducts.name)).map((product) => {
                        const stockStatus = getStockStatus(product.quantity, product.minStockLevel || 10);
                        const stockValue = (product.quantity || 0) * (product.purchasePrice || 0);
                        
                        return (
                          <tr key={product._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.productName || 'No Name'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.sizePackage || 'N/A'} • {product.unit || 'piece'}
                                </div>
                                {product.barcode && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    <code>{product.barcode}</code>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {product.category || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${stockStatus.text === 'Out of Stock' ? 'text-red-600' : stockStatus.text === 'Low Stock' ? 'text-yellow-600' : 'text-green-600'}`}>
                                {product.quantity || 0} {product.unit || 'piece'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Min: {product.minStockLevel || 10}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">
                                {formatCurrency(product.salePrice || 0)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Cost: {formatCurrency(product.purchasePrice || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(stockValue)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {stockStatus.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => {
                                  // You could implement view product details or edit
                                  toast.info(`Viewing details for ${product.productName} - Feature coming soon!`);
                                }}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Summary</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">In Stock:</span>
                        <span className="text-sm font-medium text-green-600">
                          {getSupplierProducts(viewSupplierProducts.name).filter(p => (p.quantity || 0) > (p.minStockLevel || 10)).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Low Stock:</span>
                        <span className="text-sm font-medium text-yellow-600">
                          {getSupplierProducts(viewSupplierProducts.name).filter(p => (p.quantity || 0) <= (p.minStockLevel || 10) && (p.quantity || 0) > 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Out of Stock:</span>
                        <span className="text-sm font-medium text-red-600">
                          {getSupplierProducts(viewSupplierProducts.name).filter(p => (p.quantity || 0) === 0).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Category Distribution</h4>
                    <div className="space-y-1">
                      {Object.entries(
                        getSupplierProducts(viewSupplierProducts.name).reduce((acc, product) => {
                          const category = product.category || 'Uncategorized';
                          acc[category] = (acc[category] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span className="text-sm text-gray-600">{category}:</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Value Analysis</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Value:</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${(viewSupplierProducts.totalValue / viewSupplierProducts.productsCount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Stock:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(viewSupplierProducts.totalStock / viewSupplierProducts.productsCount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Price:</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${(getSupplierProducts(viewSupplierProducts.name).reduce((sum, p) => sum + (p.salePrice || 0), 0) / viewSupplierProducts.productsCount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {viewSupplierProducts.productsCount} products from {viewSupplierProducts.name}
                  </div>
                  <button
                    onClick={() => setViewSupplierProducts(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showForm && selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowForm(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Update Supplier Name
                    </h3>
                    <p className="text-sm text-gray-500">
                      This will update all products with this supplier name
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        This will update the supplier name in {selectedSupplier.productsCount} product{selectedSupplier.productsCount !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Supplier Name
                    </label>
                    <input
                      type="text"
                      value={selectedSupplier.name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Supplier Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter new supplier name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.info('Supplier name update feature coming soon!');
                    setShowForm(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Update Supplier
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