import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ShoppingBagIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { productAPI } from '../services/api';
import { formatCurrency, getStockStatus, formatDate } from '../utils/helpers';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../utils/constants';
import ProductForm from '../components/ProductForm';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

const Products = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showDetails, setShowDetails] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Add this function to your component
  const downloadCSVTemplate = () => {
    const templateData = [
      {
        'Product Name': 'Sample Product 1',
        'Size/Package': '5 inch',
        'Category': 'hardware',
        'Unit': 'piece',
        'Stock': 100,
        'Purchase Price': 10.50,
        'Sale Price': 15.99,
        'Minimum Stock': 20,
        'Barcode': '1234567890',
        'Stock Value': 1050.00
      },
      {
        'Product Name': 'Sample Product 2',
        'Size/Package': '1kg',
        'Category': 'electrical',
        'Unit': 'kg',
        'Stock': 50,
        'Purchase Price': 25.00,
        'Sale Price': 35.50,
        'Minimum Stock': 10,
        'Barcode': '0987654321',
        'Stock Value': 1250.00
      },
      {
        'Product Name': 'Sample Product 3',
        'Size/Package': '500ml',
        'Category': 'plumbing',
        'Unit': 'liter',
        'Stock': 75,
        'Purchase Price': 8.00,
        'Sale Price': 12.99,
        'Minimum Stock': 15,
        'Barcode': '1122334455',
        'Stock Value': 600.00
      },
      {
        'Product Name': 'Sample Product 4',
        'Size/Package': '10cm x 10cm',
        'Category': 'hardware',
        'Unit': 'piece',
        'Stock': 30,
        'Purchase Price': 5.25,
        'Sale Price': 8.75,
        'Minimum Stock': 5,
        'Barcode': '5566778899',
        'Stock Value': 157.50
      },
      {
        'Product Name': 'Sample Product 5',
        'Size/Package': '2m',
        'Category': 'electrical',
        'Unit': 'meter',
        'Stock': 45,
        'Purchase Price': 15.75,
        'Sale Price': 22.50,
        'Minimum Stock': 8,
        'Barcode': '9988776655',
        'Stock Value': 708.75
      }
    ];

    // Create CSV content
    const headers = Object.keys(templateData[0]);
    const csvRows = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => {
        const cell = row[header];
        // Escape commas and quotes in strings
        if (typeof cell === 'string') {
          // If string contains commas or quotes, wrap in quotes and escape existing quotes
          if (cell.includes(',') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }
        return cell;
      }).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV template downloaded successfully');
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { search, category, page }],
    queryFn: () => productAPI.getProducts({ 
      search, 
      category, 
      page, 
      limit: 20 
    }),
    keepPreviousData: true
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => productAPI.getLowStock()
  });

  console.log("API Response:", data);

  const products = data?.data?.docs || data?.docs || [];
  const totalPages = data?.data?.totalPages || data?.totalPages || 1;
  const totalDocs = data?.data?.totalDocs || data?.totalDocs || 0;
  
  const lowStockProducts = lowStockData?.data?.docs || lowStockData?.data || lowStockData || [];

  const deleteMutation = useMutation({
    mutationFn: productAPI.deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, data: stockData }) => productAPI.updateStock(id, stockData),
    onSuccess: () => {
      toast.success('Stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  });

  // New: Mutation for bulk import
  const importMutation = useMutation({
    mutationFn: (products) => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', products.file);
      return productAPI.bulkImport(formData);
    },
    onSuccess: () => {
      toast.success('Products imported successfully!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImportFile(null);
      setShowImportModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to import products');
    },
    onSettled: () => {
      setImportLoading(false);
    }
  });

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleViewDetails = (product) => {
    setViewingProduct(product);
    setShowDetails(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStockUpdate = (productId, operation) => {
    const quantity = prompt(`Enter quantity to ${operation}:`);
    if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
      updateStockMutation.mutate({
        id: productId,
        data: { 
          quantity: parseInt(quantity), 
          operation 
        }
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProduct(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['lowStock'] });
  };

  // CSV/Excel Import Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setImportFile(file);
  };

  const processImportFile = async () => {
    if (!importFile) {
      toast.error('Please select a file first');
      return;
    }

    setImportLoading(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Call API to import
      importMutation.mutate({ file: importFile });
      
    } catch (error) {
      toast.error(`Import error: ${error.message}`);
      setImportLoading(false);
    }
  };

  // PDF Export Functions
  const exportToPDF = () => {
    try {
      // Dynamically import jsPDF
      import('jspdf').then(({ jsPDF }) => {
        import('jspdf-autotable').then((autoTable) => {
          const doc = new jsPDF();
          
          // Title
          doc.setFontSize(20);
          doc.text('Products Inventory Report', 20, 20);
          
          // Date
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
          
          // Summary
          doc.setFontSize(12);
          doc.text(`Total Products: ${totalDocs}`, 20, 40);
          doc.text(`Total Value: ${formatCurrency(products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.purchasePrice || 0)), 0))}`, 20, 48);
          
          // Table data
          const tableData = products.map(product => [
            product.productName || 'N/A',
            product.sizePackage || 'N/A',
            product.category || 'Uncategorized',
            `${product.quantity || 0} ${product.unit || 'piece'}`,
            formatCurrency(product.purchasePrice || 0),
            formatCurrency(product.salePrice || 0),
            formatCurrency((product.quantity || 0) * (product.purchasePrice || 0))
          ]);
          
          // Create table
          autoTable.default(doc, {
            startY: 55,
            head: [['Product Name', 'Size', 'Category', 'Stock', 'Cost', 'Price', 'Value']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] }
          });
          
          // Save PDF
          doc.save(`products_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
          
          toast.success('PDF exported successfully!');
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

  // CSV Export Function
  const exportToCSV = (allProducts = false) => {
    const exportProducts = allProducts ? products : products.filter(p => p.selected);
    
    if (!allProducts && exportProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }
    
    const exportData = exportProducts.map(p => ({
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
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${exportProducts.length} products to CSV`);
  };

  // Print Function
  const printProducts = () => {
    const printContent = `
      <html>
        <head>
          <title>Products Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Products Inventory Report</h1>
          <div class="summary">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Products:</strong> ${totalDocs}</p>
            <p><strong>Total Value:</strong> ${formatCurrency(products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.purchasePrice || 0)), 0))}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Size</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(product => `
                <tr>
                  <td>${product.productName || 'N/A'}</td>
                  <td>${product.sizePackage || 'N/A'}</td>
                  <td>${product.category || 'Uncategorized'}</td>
                  <td>${product.quantity || 0} ${product.unit || 'piece'}</td>
                  <td>${formatCurrency(product.purchasePrice || 0)}</td>
                  <td>${formatCurrency(product.salePrice || 0)}</td>
                  <td>${formatCurrency((product.quantity || 0) * (product.purchasePrice || 0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Report
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleBulkAction = (action) => {
    switch (action) {
      case 'export':
        exportToCSV(false);
        break;
      case 'exportAll':
        exportToCSV(true);
        break;
      case 'pdf':
        exportToPDF();
        break;
      case 'print':
        printProducts();
        break;
      case 'import':
        setShowImportModal(true);
        break;
      default:
        toast.info(`Action "${action}" not implemented yet`);
    }
  };

  // Create sample CSV template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Product Name': 'Sample Product 1',
        'Size/Package': '5 inch',
        'Unit': 'piece',
        'Category': 'hardware',
        'Stock': 100,
        'Purchase Price': 10.50,
        'Sale Price': 15.99,
        'Minimum Stock': 20,
        'Barcode': '1234567890'
      },
      {
        'Product Name': 'Sample Product 2',
        'Size/Package': '1kg',
        'Unit': 'kg',
        'Category': 'electrical',
        'Stock': 50,
        'Purchase Price': 25.00,
        'Sale Price': 35.50,
        'Minimum Stock': 10,
        'Barcode': '0987654321'
      }
    ];

    const headers = Object.keys(sampleData[0]);
    const csvRows = [
      headers.join(','),
      ...sampleData.map(row => headers.map(header => row[header]).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_products_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Sample template downloaded');
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading products</h3>
        <p className="mt-1 text-sm text-gray-500">Failed to fetch products. Please try again.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total {totalDocs} products • {lowStockProducts.length} low stock items
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
            {viewMode === 'table' ? 'Grid View' : 'Table View'}
          </button>
          
          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            Import CSV
          </button>
          
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export
              <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => exportToCSV(true)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Export All (CSV)
                </button>
                <button
                  onClick={() => exportToPDF()}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={() => printProducts()}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Report
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </button>
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

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-lg">
            <SearchBar
              placeholder="Search products by name or barcode..."
              onSearch={setSearch}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </button>
            
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setPage(1);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Reset
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory('')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      category === ''
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        category === cat.value
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Status
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-700">In Stock ({products.filter(p => p.quantity > (p.minStockLevel || 10)).length})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-sm text-gray-700">Low Stock ({products.filter(p => p.quantity <= (p.minStockLevel || 10) && p.quantity > 0).length})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-sm text-gray-700">Out of Stock ({products.filter(p => p.quantity === 0).length})</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Options
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => exportToCSV(true)}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export All CSV
                  </button>
                  <button
                    onClick={() => exportToPDF()}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Display - Table View */}
      {viewMode === 'table' ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prices
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.quantity, product.minStockLevel || 10);
                  const stockValue = product.quantity * (product.purchasePrice || 0);
                  
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
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${stockStatus.text === 'Out of Stock' ? 'text-red-600' : stockStatus.text === 'Low Stock' ? 'text-yellow-600' : 'text-green-600'}`}>
                              {product.quantity || 0} {product.unit || 'piece'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {product.minStockLevel || 10} {product.unit || 'piece'}
                            </div>
                          </div>
                          <div className="ml-4 flex space-x-1">
                            <button
                              onClick={() => handleStockUpdate(product._id, 'add')}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Add Stock"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStockUpdate(product._id, 'subtract')}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Reduce Stock"
                              disabled={(product.quantity || 0) === 0}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Sale: <span className="font-bold">{formatCurrency(product.salePrice || 0)}</span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
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
          
          {products.length === 0 && (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || category ? 'Try changing your search or filter terms.' : 'Get started by creating your first product.'}
              </p>
              {!(search || category) && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add First Product
                </button>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      ) : (
        /* Products Display - Grid View */
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.quantity || 0, product.minStockLevel || 10);
              const stockValue = (product.quantity || 0) * (product.purchasePrice || 0);
              
              return (
                <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{product.productName || 'No Name'}</h3>
                      <p className="text-sm text-gray-500">{product.sizePackage || 'N/A'} • {product.unit || 'piece'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                      {stockStatus.text}
                    </span>
                  </div>
                  
                  {product.barcode && (
                    <div className="mb-3 text-xs text-gray-400">
                      <code>{product.barcode}</code>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock:</span>
                      <span className={`font-medium ${stockStatus.text === 'Out of Stock' ? 'text-red-600' : stockStatus.text === 'Low Stock' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {product.quantity || 0} {product.unit || 'piece'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sale Price:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(product.salePrice || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock Value:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(stockValue)}</span>
                    </div>
                    
                    <div className="flex space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleStockUpdate(product._id, 'add')}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
                      >
                        Add Stock
                      </button>
                      <button
                        onClick={() => handleViewDetails(product)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || category ? 'Try changing your search or filter terms.' : 'Get started by creating your first product.'}
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
              <CheckCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{totalDocs}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{lowStockProducts.length}</p>
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
              <p className="text-2xl font-semibold text-gray-900">
                {products.filter(p => (p.quantity || 0) === 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.purchasePrice || 0)), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={selectedProduct}
          onClose={() => {
            setShowForm(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Product Details Modal */}
      {showDetails && viewingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowDetails(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <ShoppingBagIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {viewingProduct.productName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Product Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Product Name:</span>
                          <span className="text-sm font-medium text-gray-900">{viewingProduct.productName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Size/Package:</span>
                          <span className="text-sm font-medium text-gray-900">{viewingProduct.sizePackage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Unit:</span>
                          <span className="text-sm font-medium text-gray-900">{viewingProduct.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Category:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {viewingProduct.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Pricing</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sale Price:</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(viewingProduct.salePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Purchase Price:</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(viewingProduct.purchasePrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Stock Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Stock:</span>
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${
                              getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text === 'Out of Stock' 
                                ? 'text-red-600' 
                                : getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text === 'Low Stock' 
                                  ? 'text-yellow-600' 
                                  : 'text-green-600'
                            }`}>
                              {viewingProduct.quantity} {viewingProduct.unit}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Minimum Stock Level:</span>
                          <span className="text-sm font-medium text-gray-900">{viewingProduct.minStockLevel} {viewingProduct.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Stock Value:</span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(viewingProduct.quantity * viewingProduct.purchasePrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Additional Information</h4>
                      <div className="space-y-3">
                        {viewingProduct.barcode && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Barcode:</span>
                            <code className="text-sm font-mono text-gray-900">{viewingProduct.barcode}</code>
                          </div>
                        )}
                        {viewingProduct.createdAt && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Created:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(viewingProduct.createdAt)}
                            </span>
                          </div>
                        )}
                        {viewingProduct.updatedAt && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Updated:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(viewingProduct.updatedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Status Badge */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text === 'In Stock' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      ) : getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text === 'Low Stock' ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className="font-medium text-gray-900">
                        Stock Status: {getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).color
                    }`}>
                      {getStockStatus(viewingProduct.quantity, viewingProduct.minStockLevel).text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleEdit(viewingProduct);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => !importLoading && setShowImportModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <CloudArrowUpIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Import Products
                    </h3>
                    <p className="text-sm text-gray-500">
                      Upload CSV or Excel file
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !importLoading && setShowImportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                  disabled={importLoading}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Drag and drop your file here or
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
                        className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled={importLoading}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Supported formats: CSV, Excel (.xlsx, .xls)
                      </p>
                    </div>
                    
                    {importFile && (
                      <div className="mt-4 p-3 bg-green-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-5 w-5 text-green-500 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {importFile.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {(importFile.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CSV Template */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      CSV Template Format
                    </h4>
                    <p className="text-xs text-blue-700 mb-2">
                      Required columns: <strong>Product Name, Size/Package, Unit, Category, Stock, Purchase Price, Sale Price</strong>
                    </p>
                    <button
                      onClick={downloadCSVTemplate}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                      Download CSV Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processImportFile}
                  disabled={!importFile || importLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    !importFile || importLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {importLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </span>
                  ) : (
                    'Import Products'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;