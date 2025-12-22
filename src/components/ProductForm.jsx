import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { productAPI } from '../services/api';
import { productSchema } from '../utils/validators';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../utils/constants';
import toast from 'react-hot-toast';

const ProductForm = ({ product, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // CORRECTED: useMutation with v5 syntax
  const mutation = useMutation({
    mutationFn: (values) => 
      product 
        ? productAPI.updateProduct(product._id, values)
        : productAPI.createProduct(values),
    onSuccess: () => {
      toast.success(`Product ${product ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${product ? 'update' : 'create'} product`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const initialValues = {
    productName: product?.productName || '',
    sizePackage: product?.sizePackage || '',
    unit: product?.unit || 'piece',
    salePrice: product?.salePrice || '',
    purchasePrice: product?.purchasePrice || '',
    discount: product?.discount || 0,
    quantity: product?.quantity || 0,
    minStockLevel: product?.minStockLevel || 10,
    category: product?.category || 'hardware',
    barcode: product?.barcode || '',
    supplier: product?.supplier || '',
    isActive: product?.isActive !== undefined ? product.isActive : true
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    
    // Convert string numbers to actual numbers
    const processedValues = {
      ...values,
      salePrice: parseFloat(values.salePrice),
      purchasePrice: parseFloat(values.purchasePrice),
      discount: parseFloat(values.discount) || 0,
      quantity: parseInt(values.quantity) || 0,
      minStockLevel: parseInt(values.minStockLevel) || 10
    };
    
    mutation.mutate(processedValues);
  };

  const calculateProfit = (purchasePrice, salePrice, discount = 0) => {
    if (!purchasePrice || !salePrice) return 0;
    const pPrice = parseFloat(purchasePrice);
    const sPrice = parseFloat(salePrice);
    const disc = parseFloat(discount) || 0;
    const finalPrice = sPrice - (sPrice * disc / 100);
    return finalPrice - pPrice;
  };

  const calculateProfitMargin = (purchasePrice, salePrice, discount = 0) => {
    const profit = calculateProfit(purchasePrice, salePrice, discount);
    if (!profit || !purchasePrice) return 0;
    return (profit / parseFloat(purchasePrice)) * 100;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {product ? 'Edit Product' : 'Add New Product'}
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
          validationSchema={productSchema}
          onSubmit={handleSubmit}
        >
          {({ values, isSubmitting: formikSubmitting }) => (
            <Form>
              <div className="px-6 py-4 space-y-6">
                {/* Basic Information Section */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <Field
                        type="text"
                        name="productName"
                        className="input-field"
                        placeholder="Enter product name"
                      />
                      <ErrorMessage name="productName" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size/Package *
                      </label>
                      <Field
                        type="text"
                        name="sizePackage"
                        className="input-field"
                        placeholder="e.g., 500ml, 1kg, 25 pieces"
                      />
                      <ErrorMessage name="sizePackage" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit *
                      </label>
                      <Field as="select" name="unit" className="input-field">
                        {PRODUCT_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="unit" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <Field as="select" name="category" className="input-field">
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="category" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  </div>
                </div>
                
                {/* Pricing Section */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Pricing Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purchase Price (PKR) *
                      </label>
                      <Field
                        type="number"
                        name="purchasePrice"
                        className="input-field"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <ErrorMessage name="purchasePrice" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale Price (PKR) *
                      </label>
                      <Field
                        type="number"
                        name="salePrice"
                        className="input-field"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <ErrorMessage name="salePrice" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount (%)
                      </label>
                      <Field
                        type="number"
                        name="discount"
                        className="input-field"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <ErrorMessage name="discount" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                  </div>
                  
                  {/* Profit Calculation */}
                  {(values.purchasePrice || values.salePrice) && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Profit per unit:</div>
                          <div className={`text-lg font-bold ${
                            calculateProfit(values.purchasePrice, values.salePrice, values.discount) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            PKR {calculateProfit(values.purchasePrice, values.salePrice, values.discount).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Profit Margin:</div>
                          <div className={`text-lg font-bold ${
                            calculateProfitMargin(values.purchasePrice, values.salePrice, values.discount) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {calculateProfitMargin(values.purchasePrice, values.salePrice, values.discount).toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Final Price:</div>
                          <div className="text-lg font-bold text-gray-900">
                            PKR {(
                              parseFloat(values.salePrice || 0) - 
                              (parseFloat(values.salePrice || 0) * (parseFloat(values.discount || 0) / 100))
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Stock Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Stock Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Quantity *
                      </label>
                      <Field
                        type="number"
                        name="quantity"
                        className="input-field"
                        placeholder="0"
                        min="0"
                      />
                      <ErrorMessage name="quantity" component="div" className="text-red-500 text-xs mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Stock Level
                      </label>
                      <Field
                        type="number"
                        name="minStockLevel"
                        className="input-field"
                        placeholder="10"
                        min="0"
                      />
                      <ErrorMessage name="minStockLevel" component="div" className="text-red-500 text-xs mt-1" />
                      <p className="text-xs text-gray-500 mt-1">
                        System will alert when stock goes below this level
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Advanced Options */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
                    <svg 
                      className={`ml-2 h-5 w-5 transform ${showAdvanced ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-4 space-y-6 p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Barcode
                          </label>
                          <Field
                            type="text"
                            name="barcode"
                            className="input-field"
                            placeholder="Enter barcode (optional)"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            For barcode scanner integration
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Supplier
                          </label>
                          <Field
                            type="text"
                            name="supplier"
                            className="input-field"
                            placeholder="Enter supplier name (optional)"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <Field
                            type="checkbox"
                            name="isActive"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active Product</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Inactive products won't appear in POS and sales
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {product ? 'Last updated: ' + new Date(product.updatedAt).toLocaleDateString() : ''}
                  </div>
                  <div className="flex space-x-3">
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
                          {product ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        product ? 'Update Product' : 'Create Product'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default ProductForm;