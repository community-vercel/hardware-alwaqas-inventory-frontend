import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { expenseAPI } from '../services/api';
import { expenseSchema } from '../utils/validators';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import toast from 'react-hot-toast';

const ExpenseForm = ({ expense, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
  mutationFn: (values) =>
    expense 
      ? expenseAPI.updateExpense(expense._id, values)
      : expenseAPI.createExpense(values),
  onSuccess: () => {
    toast.success(`Expense ${expense ? 'updated' : 'added'} successfully`);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
    onSuccess();
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || `Failed to ${expense ? 'update' : 'add'} expense`);
  },
  onSettled: () => setIsSubmitting(false),
});


  const initialValues = {
    description: expense?.description || '',
    amount: expense?.amount || '',
    category: expense?.category || 'other',
    expenseDate: expense?.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paidBy: expense?.paidBy || '',
    receiptNumber: expense?.receiptNumber || '',
    notes: expense?.notes || ''
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    mutation.mutate(values);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {expense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isSubmitting}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <Formik
          initialValues={initialValues}
          validationSchema={expenseSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting: formikSubmitting }) => (
            <Form>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <Field
                    type="text"
                    name="description"
                    className="input-field"
                    placeholder="Enter expense description"
                  />
                  <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (PKR) *
                  </label>
                  <Field
                    type="number"
                    name="amount"
                    className="input-field"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <ErrorMessage name="amount" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <Field as="select" name="category" className="input-field">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="category" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Field
                    type="date"
                    name="expenseDate"
                    className="input-field"
                  />
                  <ErrorMessage name="expenseDate" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid By
                  </label>
                  <Field
                    type="text"
                    name="paidBy"
                    className="input-field"
                    placeholder="Enter name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Number
                  </label>
                  <Field
                    type="text"
                    name="receiptNumber"
                    className="input-field"
                    placeholder="Enter receipt number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Field
                    as="textarea"
                    name="notes"
                    rows="3"
                    className="input-field"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || formikSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {expense ? 'Updating...' : 'Adding...'}
                    </span>
                  ) : (
                    expense ? 'Update Expense' : 'Add Expense'
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default ExpenseForm;