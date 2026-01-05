import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { saleAPI } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';

const Sales = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { search, page, startDate, endDate, paymentMethod }],
    queryFn: () => saleAPI.getSales({ 
      search, 
      page, 
      limit: 20,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      paymentMethod
    }),
    keepPreviousData: true
  });

  const sales = data?.data?.docs || [];
  const totalPages = data?.totalPages || 1;

  const handlePrintInvoice = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${sale.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .total { text-align: right; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>Al-Waqas Hardware</h1>
            <p>Sales Invoice</p>
          </div>
          <div class="invoice-details">
            <p><strong>Invoice #:</strong> ${sale.invoiceNumber}</p>
            <p><strong>Date:</strong> ${formatDateTime(sale.saleDate)}</p>
            <p><strong>Sold By:</strong> ${sale.soldBy?.username || 'N/A'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total">Total:</td>
                <td>${formatCurrency(sale.grandTotal)}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Paid:</td>
                <td>${formatCurrency(sale.paidAmount)}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Change:</td>
                <td>${formatCurrency(sale.change)}</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Al-Waqas Hardware Shop</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <div className="text-sm text-gray-500">
          Total Sales: {formatCurrency(sales.reduce((sum, sale) => sum + sale.grandTotal, 0))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              className="input-field"
              placeholderText="Select start date"
              dateFormat="dd/MM/yyyy"
              isClearable
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              className="input-field"
              placeholderText="Select end date"
              dateFormat="dd/MM/yyyy"
              isClearable
              minDate={startDate}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              className="input-field"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Invoice
            </label>
            <SearchBar
              placeholder="Search invoice..."
              onSearch={setSearch}
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
              setPaymentMethod('');
              setSearch('');
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Invoice #</th>
                <th className="table-header">Date & Time</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Items</th>
                <th className="table-header">Total</th>
                <th className="table-header">Payment</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.invoiceNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      Sold by: {sale.soldBy?.username || 'N/A'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(sale.saleDate)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {sale.customer?.name || 'Walk-in Customer'}
                    </div>
                    {sale.customer?.phone && (
                      <div className="text-xs text-gray-500">
                        {sale.customer.phone}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {sale.items.length} items
                    </div>
                    <div className="text-xs text-gray-500">
                      {sale.items[0]?.productName}
                      {sale.items.length > 1 && ` + ${sale.items.length - 1} more`}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(sale.grandTotal)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Paid: {formatCurrency(sale.paidAmount)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sale.paymentMethod === 'cash' 
                        ? 'bg-green-100 text-green-800'
                        : sale.paymentMethod === 'card'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePrintInvoice(sale)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Print Invoice"
                      >
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      {/* <button
                       onClick={() => toast('View details coming soon')}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sales.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search terms.
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

export default Sales;