import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { productAPI } from '../services/api';
import { formatCurrency, getStockStatus } from '../utils/helpers';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all'); // all, low, out, good, critical
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quantityRange, setQuantityRange] = useState({ min: '', max: '' });
  const [valueRange, setValueRange] = useState({ min: '', max: '' });

  // Add refetchInterval to auto-refresh every 5 seconds
  // This provides real-time updates without manual refresh
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventory', { search, page }],
    queryFn: () => productAPI.getProducts({ 
      search, 
      page, 
      limit: 20 
    }),
    keepPreviousData: true,
    refetchInterval: 5000, // Auto-refetch every 5 seconds
    staleTime: 3000, // Data considered stale after 3 seconds
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => productAPI.getLowStock(),
    refetchInterval: 5000, // Auto-refetch every 5 seconds
    staleTime: 3000,
  });

  const products = data?.data?.docs || [];
  const totalPages = data?.totalPages || 1;
  const totalProducts = data?.totalDocs || 0;
  const lowStockProducts = lowStockData?.data || [];

  // Enhanced filter logic combining both approaches
  const filteredProducts = products.filter(product => {
    // Basic stock status filter (your original logic)
    if (filter === 'low') return product.quantity <= product.minStockLevel;
    if (filter === 'out') return product.quantity === 0;
    if (filter === 'good') return product.quantity > product.minStockLevel;
    if (filter === 'critical') return product.quantity <= (product.minStockLevel / 2);
    
    // Additional filters from my enhancements
    if (categoryFilter && product.category !== categoryFilter) return false;
    
    if (quantityRange.min !== '' && product.quantity < parseInt(quantityRange.min)) return false;
    if (quantityRange.max !== '' && product.quantity > parseInt(quantityRange.max)) return false;
    
    const productValue = product.quantity * product.purchasePrice;
    if (valueRange.min !== '' && productValue < parseInt(valueRange.min)) return false;
    if (valueRange.max !== '' && productValue > parseInt(valueRange.max)) return false;
    
    return true;
  });
 
  // Enhanced statistics combining both approaches
  const stats = {
    totalProducts: products.length,
    lowStock: lowStockProducts.length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    criticalStock: products.filter(p => p.quantity <= (p.minStockLevel || 10) / 2).length,
    totalValue: products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0),
    averageStockValue: products.length > 0 
      ? products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0) / products.length 
      : 0,
    totalInvestment: products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0),
    potentialRevenue: products.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0),
    totalProfitPotential: products.reduce((sum, p) => {
      const cost = p.quantity * p.purchasePrice;
      const revenue = p.quantity * p.salePrice * (1 - (p.discount || 0) / 100);
      return sum + (revenue - cost);
    }, 0)
  };

  // Categories for filtering
  const categories = ['hardware', 'electrical', 'plumbing', 'tools', 'paint', 'other'];

  // Export to PDF function
  const exportToPDF = () => {
    try {
      // Dynamically import jsPDF
      import('jspdf').then(({ jsPDF }) => {
        import('jspdf-autotable').then((autoTable) => {
          const doc = new jsPDF('landscape');
          
          // Header with logo and shop info
          doc.setFontSize(24);
          doc.setTextColor(59, 130, 246); // Blue color
          doc.text('AL-WAQAS HARDWARE & PAINT SHOP', 105, 15, { align: 'center' });
          
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('COMPLETE INVENTORY REPORT', 105, 25, { align: 'center' });
          
          // Date and time
          doc.setFontSize(10);
          const now = new Date();
          doc.text(`Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 105, 32, { align: 'center' });
          
          // Summary section
          doc.setFontSize(12);
          doc.text('INVENTORY SUMMARY', 14, 45);
          
          // Summary box
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(0.5);
          doc.rect(13, 50, 275, 25);
          
          // Summary content
          doc.setFontSize(10);
          doc.text(`Total Products: ${stats.totalProducts}`, 15, 58);
          doc.text(`Inventory Value: ${formatCurrency(stats.totalValue)}`, 15, 64);
          doc.text(`Low Stock Items: ${stats.lowStock}`, 85, 58);
          doc.text(`Out of Stock: ${stats.outOfStock}`, 85, 64);
          doc.text(`Critical Stock: ${stats.criticalStock}`, 155, 58);
          doc.text(`Profit Potential: ${formatCurrency(stats.totalProfitPotential)}`, 155, 64);
          
          // Filter info
          if (filter !== 'all' || categoryFilter || search) {
            doc.text('Filters Applied:', 220, 58);
            let filterText = [];
            if (filter !== 'all') filterText.push(`Stock: ${filter}`);
            if (categoryFilter) filterText.push(`Category: ${categoryFilter}`);
            if (search) filterText.push(`Search: "${search}"`);
            doc.text(filterText.join(', '), 220, 64);
          }
          
          // Table data
          const tableData = filteredProducts.map(product => {
            const stockValue = product.quantity * product.purchasePrice;
            const stockStatus = getStockStatus(product.quantity, product.minStockLevel);
            
            return [
              product.productName || 'N/A',
              product.sizePackage || 'N/A',
              product.category || 'Uncategorized',
              `${product.quantity || 0} ${product.unit || 'piece'}`,
              formatCurrency(product.purchasePrice || 0),
              formatCurrency(product.salePrice || 0),
              formatCurrency(stockValue),
              stockStatus.text
            ];
          });
          
          // Create table
          autoTable.default(doc, {
            startY: 80,
            head: [
              ['Product Name', 'Size', 'Category', 'Stock', 'Cost', 'Price', 'Value', 'Status']
            ],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { 
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            columnStyles: {
              3: { cellWidth: 25 }, // Stock column
              4: { cellWidth: 25 }, // Cost column
              5: { cellWidth: 25 }, // Price column
              6: { cellWidth: 30 }, // Value column
              7: { cellWidth: 20 }  // Status column
            },
            didDrawPage: function (data) {
              // Footer
              doc.setFontSize(8);
              doc.setTextColor(128, 128, 128);
              doc.text(
                'Al-Waqas Hardware & Paint Shop • Inventory Management System • Page ' + doc.internal.getNumberOfPages(),
                105,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
              );
            }
          });
          
          // Save PDF
          const fileName = `alwaqas_inventory_${now.toISOString().split('T')[0]}_${Date.now()}.pdf`;
          doc.save(fileName);
          
          toast.success('Inventory report exported to PDF successfully!');
        });
      }).catch(error => {
        console.error('PDF export error:', error);
        toast.error('Error exporting PDF. Please try again.');
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error exporting PDF. Please try again.');
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    const exportData = filteredProducts.map(product => ({
      'Product Name': product.productName,
      'Size/Package': product.sizePackage,
      'Category': product.category,
      'Unit': product.unit,
      'Stock': product.quantity,
      'Purchase Price': product.purchasePrice,
      'Sale Price': product.salePrice,
      'Discount %': product.discount || 0,
      'Min Stock Level': product.minStockLevel || 10,
      'Stock Value': (product.quantity || 0) * (product.purchasePrice || 0),
      'Barcode': product.barcode || '',
      'Status': getStockStatus(product.quantity, product.minStockLevel).text
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => {
        const cell = row[header];
        if (typeof cell === 'string' && cell.includes(',')) {
          return `"${cell}"`;
        }
        return cell;
      }).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alwaqas_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredProducts.length} products to CSV`);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter('all');
    setCategoryFilter('');
    setSearch('');
    setQuantityRange({ min: '', max: '' });
    setValueRange({ min: '', max: '' });
    setShowAdvancedFilters(false);
  };

  // Manual refresh button
  const handleManualRefresh = () => {
    refetch();
    toast.success('Inventory refreshed!');
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date().toLocaleDateString()} • Auto-refreshing every 5 seconds
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            title="Manually refresh inventory data"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          
          <button
            onClick={resetFilters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Reset Filters
          </button>
          
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">
                Value: {formatCurrency(stats.totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-yellow-100 p-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.lowStock}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.criticalStock} critical items
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-red-100 p-3">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.outOfStock}</p>
              <p className="text-xs text-gray-500 mt-1">
                Needs attention
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit Potential</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalProfitPotential)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on current stock
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stock Status Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Stock Status</h3>
              <div className="space-y-2">
                {[
                  { key: 'all', label: 'All Products', color: 'bg-gray-100' },
                  { key: 'good', label: 'In Stock (Good)', color: 'bg-green-100' },
                  { key: 'low', label: 'Low Stock', color: 'bg-yellow-100' },
                  { key: 'critical', label: 'Critical Stock', color: 'bg-orange-100' },
                  { key: 'out', label: 'Out of Stock', color: 'bg-red-100' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                      filter === key 
                        ? 'ring-2 ring-blue-500' 
                        : 'hover:bg-gray-50'
                    } ${color}`}
                  >
                    <span>{label}</span>
                    <span className="text-xs font-medium">
                      {key === 'all' && totalProducts}
                      {key === 'good' && products.filter(p => p.quantity > p.minStockLevel).length}
                      {key === 'low' && lowStockProducts.length}
                      {key === 'critical' && products.filter(p => p.quantity <= (p.minStockLevel || 10) / 2).length}
                      {key === 'out' && products.filter(p => p.quantity === 0).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Category Filter</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    categoryFilter === '' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm capitalize ${
                      categoryFilter === category 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                    <span className="float-right text-xs font-medium">
                      ({products.filter(p => p.category === category).length})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Value Range Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quantity & Value Range</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={quantityRange.min}
                      onChange={(e) => setQuantityRange({ ...quantityRange, min: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={quantityRange.max}
                      onChange={(e) => setQuantityRange({ ...quantityRange, max: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stock Value Range (Rs)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min Value"
                      value={valueRange.min}
                      onChange={(e) => setValueRange({ ...valueRange, min: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max Value"
                      value={valueRange.max}
                      onChange={(e) => setValueRange({ ...valueRange, max: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setQuantityRange({ min: '', max: '' });
                      setValueRange({ min: '', max: '' });
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Ranges
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar - Keep your original layout */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Search products..."
              onSearch={setSearch}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'good', label: 'In Stock' },
                { key: 'low', label: 'Low Stock' },
                { key: 'out', label: 'Out of Stock' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filter === key
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Alert:</span> You have {lowStockProducts.length} products with low stock.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Product</th>
                <th className="table-header">Category</th>
                <th className="table-header">Stock Level</th>
                <th className="table-header">Value</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const stockValue = product.quantity * product.purchasePrice;
                const stockStatus = getStockStatus(product.quantity, product.minStockLevel);
                
                return (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.productName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.sizePackage} • {product.unit}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {product.category}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {product.quantity} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {product.minStockLevel} {product.unit}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(stockValue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Unit: {formatCurrency(product.purchasePrice)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter !== 'all' ? `No products match the "${filter}" filter.` : 'Try changing your search terms.'}
            </p>
          </div>
        )}
        
        {/* Pagination */}
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default Inventory;