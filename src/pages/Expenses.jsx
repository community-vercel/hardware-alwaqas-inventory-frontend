import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ReceiptPercentIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { expenseAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import ExpenseForm from '../components/ExpenseForm';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

const Expenses = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { search, page, category }],
    queryFn: () => expenseAPI.getExpenses({ 
      search, 
      page, 
      limit: 20,
      category 
    }),
    keepPreviousData: true
  });

  const { data: summaryData } = useQuery({
    queryKey: ['expenseSummary'],
    queryFn: () => expenseAPI.getExpenseSummary()
  });

  // CORRECTED: useMutation with v5 syntax
  const deleteMutation = useMutation({
    mutationFn: expenseAPI.deleteExpense,
    onSuccess: () => {
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    }
  });

  const expenses = data?.data?.docs || [];
  const totalPages = data?.totalPages || 1;
  const summary = summaryData?.data?.data || { summary: [], total: 0 };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedExpense(null);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
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
        <h1 className="text-2xl font-bold text-gray-900">Expenses Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Summary Stats */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Expense Summary</h3>
            <p className="text-sm text-gray-500">Total: {formatCurrency(summary.total)}</p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summary.summary?.map((item) => (
            <div key={item._id} className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {item._id}
              </div>
              <div className="text-lg font-bold text-gray-900 mt-1">
                {formatCurrency(item.totalAmount)}
              </div>
              <div className="text-xs text-gray-500">
                {item.count} transactions
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Search expenses..."
              onSearch={setSearch}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setPage(1);
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Description</th>
                <th className="table-header">Category</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Paid By</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {formatDate(expense.expenseDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added by: {expense.addedBy?.username || 'N/A'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {expense.description}
                    </div>
                    {expense.receiptNumber && (
                      <div className="text-xs text-gray-500">
                        Receipt: {expense.receiptNumber}
                      </div>
                    )}
                    {expense.notes && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {expense.notes}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      expense.category === 'food' ? 'bg-red-100 text-red-800' :
                      expense.category === 'petrol' ? 'bg-yellow-100 text-yellow-800' :
                      expense.category === 'utilities' ? 'bg-blue-100 text-blue-800' :
                      expense.category === 'maintenance' ? 'bg-purple-100 text-purple-800' :
                      expense.category === 'salary' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {expense.paidBy || 'N/A'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {expenses.length === 0 && (
          <div className="text-center py-12">
            <ReceiptPercentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by adding your first expense.
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

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          expense={selectedExpense}
          onClose={() => {
            setShowForm(false);
            setSelectedExpense(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Expenses;