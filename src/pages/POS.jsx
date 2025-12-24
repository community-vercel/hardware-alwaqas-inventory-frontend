import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MinusIcon, 
  TrashIcon, 
  ShoppingCartIcon,
  XMarkIcon,
  CreditCardIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  UserIcon,
  QrCodeIcon,
  ArrowUturnLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TagIcon,
  PencilIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { productAPI, saleAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const POS = () => {
  const queryClient = useQueryClient(); // ← Add this
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState('percentage');
  const [showGlobalDiscount, setShowGlobalDiscount] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDiscountInput, setItemDiscountInput] = useState('');
  const [itemDiscountType, setItemDiscountType] = useState('percentage');
  
  const searchInputRef = useRef(null);
  const rightPanelRef = useRef(null);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productAPI.getProducts({ 
          search: searchTerm, 
          limit: 100,
          isActive: true 
        });
        setProducts(response.data.docs || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Focus search input on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = (barcode) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added ${product.productName} to cart`);
    } else {
      toast.error('Product not found with this barcode');
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product === product._id);
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.quantity) {
        toast.error(`Insufficient stock! Only ${product.quantity} available`);
        return;
      }
      
      setCart(prevCart =>
        prevCart.map(item =>
          item.product === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.quantity < 1) {
        toast.error('Product out of stock!');
        return;
      }
      
      setCart(prevCart => [
        ...prevCart,
        {
          product: product._id,
          productName: product.productName,
          sizePackage: product.sizePackage,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.salePrice,
          discountType: 'percentage',
          discountValue: 0,
          stockAvailable: product.quantity
        }
      ]);
    }
    
    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Update quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    const item = cart.find(item => item.product === productId);
    if (item && newQuantity > item.stockAvailable) {
      toast.error(`Only ${item.stockAvailable} units available`);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product !== productId));
  };

  // Calculate item discount amount
  const calculateItemDiscountAmount = (item) => {
    const itemTotal = item.quantity * item.unitPrice;
    if (item.discountType === 'percentage') {
      return (item.discountValue / 100) * itemTotal;
    } else {
      return item.discountValue;
    }
  };

  // Apply global discount
  const applyGlobalDiscount = () => {
    if (globalDiscountType === 'percentage') {
      if (globalDiscount < 0 || globalDiscount > 100) {
        toast.error('Discount must be between 0 and 100%');
        return;
      }
    } else {
      if (globalDiscount < 0) {
        toast.error('Discount cannot be negative');
        return;
      }
    }
    
    toast.success(`Applied ${globalDiscount}${globalDiscountType === 'percentage' ? '%' : ''} discount`);
    setShowGlobalDiscount(false);
  };

  // Remove global discount
  const removeGlobalDiscount = () => {
    setGlobalDiscount(0);
    setGlobalDiscountType('percentage');
    toast.success('Removed global discount');
  };

  // Apply discount to individual item
  const applyItemDiscount = (productId) => {
    const discount = parseFloat(itemDiscountInput);
    
    if (isNaN(discount) || discount < 0) {
      toast.error('Invalid discount value');
      return;
    }
    
    if (itemDiscountType === 'percentage' && discount > 100) {
      toast.error('Discount cannot exceed 100%');
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product === productId
          ? { 
              ...item, 
              discountType: itemDiscountType,
              discountValue: discount 
            }
          : item
      )
    );
    
    setEditingItem(null);
    setItemDiscountInput('');
    setItemDiscountType('percentage');
    toast.success(`Applied discount to item`);
  };

  // Calculate totals with proper discount handling
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    
    cart.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = calculateItemDiscountAmount(item);
      subtotal += itemTotal;
      itemDiscounts += itemDiscount;
    });
    
    const afterItemDiscounts = subtotal - itemDiscounts;
    
    let globalDiscountAmount = 0;
    if (globalDiscount > 0) {
      if (globalDiscountType === 'percentage') {
        globalDiscountAmount = (globalDiscount / 100) * afterItemDiscounts;
      } else {
        globalDiscountAmount = Math.min(globalDiscount, afterItemDiscounts);
      }
    }
    
    const totalDiscount = itemDiscounts + globalDiscountAmount;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    
    return { 
      subtotal, 
      itemDiscounts, 
      globalDiscountAmount, 
      totalDiscount, 
      grandTotal
    };
  };

  const { 
    subtotal, 
    itemDiscounts, 
    globalDiscountAmount, 
    totalDiscount, 
    grandTotal 
  } = calculateTotals();
  
  const change = Math.max(0, parseFloat(paidAmount || 0) - grandTotal);

  // Handle checkout with inventory sync
 // Handle checkout with real-time inventory update
const handleCheckout = async () => {
  if (cart.length === 0) {
    toast.error('Cart is empty');
    return;
  }

  if (!paidAmount || parseFloat(paidAmount) === 0) {
    toast.error('Please enter paid amount');
    return;
  }

  if (parseFloat(paidAmount) < grandTotal) {
    toast.error('Paid amount is less than total');
    return;
  }

  setIsProcessing(true);

  try {
    const saleData = {
      items: cart.map(item => ({
        product: item.product,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountValue,
        discountType: item.discountType
      })),
      customer: customer.name || customer.phone ? customer : null,
      paymentMethod,
      paidAmount: parseFloat(paidAmount),
      subtotal,
      itemDiscounts,
      globalDiscount: globalDiscount,
      globalDiscountType,
      globalDiscountAmount,
      totalDiscount,
      grandTotal,
      change: change > 0 ? change : 0
    };

    const response = await saleAPI.createSale(saleData);
    
    if (response.data.success) {
      const sale = response.data.data;
      toast.success('Sale completed successfully!');
      
      // IMPORTANT: Update local products state with new quantities
      const updatedProducts = products.map(product => {
        const soldItem = cart.find(item => item.product === product._id);
        if (soldItem) {
          return {
            ...product,
            quantity: product.quantity - soldItem.quantity
          };
        }
        return product;
      });
      
      setProducts(updatedProducts);
      
      // Also invalidate queries to refresh other components
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
      queryClient.invalidateQueries({ queryKey: ['recentSales'] });
      queryClient.invalidateQueries({ queryKey: ['dailySales'] });
      
      printReceipt(sale);
      resetPOS();
    } else {
      toast.error(response.data.message || 'Failed to complete sale');
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    toast.error(error.response?.data?.message || 'Failed to complete sale');
  } finally {
    setIsProcessing(false);
  }
};

  // Reset POS
  const resetPOS = () => {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setPaymentMethod('cash');
    setPaidAmount('');
    setSearchTerm('');
    setShowCustomerInfo(false);
    setGlobalDiscount(0);
    setGlobalDiscountType('percentage');
    setShowGlobalDiscount(false);
    setEditingItem(null);
    setItemDiscountInput('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Print receipt
  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank');
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${sale.invoiceNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .items { margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .grand-total { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>RECEIPT</h2>
          <p>${sale.invoiceNumber}</p>
          <p>${new Date(sale.saleDate).toLocaleString()}</p>
        </div>
        <div class="items">
          ${sale.items.map(item => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>${formatCurrency(item.quantity * item.unitPrice)}</span>
            </div>
          `).join('')}
        </div>
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.totalDiscount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(sale.totalDiscount)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Total:</span>
            <span>${formatCurrency(sale.grandTotal)}</span>
          </div>
          <div class="total-row">
            <span>Paid:</span>
            <span>${formatCurrency(sale.paidAmount)}</span>
          </div>
          <div class="total-row">
            <span>Change:</span>
            <span>${formatCurrency(sale.change)}</span>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchTerm('');
      }
      if (e.key === 'Enter' && searchTerm && products.length > 0) {
        addToCart(products[0]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, products]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-sm text-gray-500">Fast & efficient checkout</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Scan
            </button>
            <button
              onClick={resetPOS}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-md"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
              New Sale
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name (Ctrl+K)..."
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={product.quantity === 0}
                    className={`flex flex-col items-center p-4 rounded-lg transition-all duration-200 border-2 ${
                      product.quantity === 0 
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' 
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-lg'
                    }`}
                  >
                    <div className="text-center w-full">
                      <h4 className="font-semibold text-gray-900 text-sm truncate w-full">
                        {product.productName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{product.sizePackage}</p>
                      <div className="mt-3">
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(product.salePrice)}
                        </span>
                        {product.discount > 0 && (
                          <span className="ml-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            -{product.discount}%
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          product.quantity > 10 ? 'bg-green-100 text-green-800' 
                          : product.quantity > 0 ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity} {product.unit}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-sm font-medium text-gray-600">No products found</h3>
                <p className="text-xs mt-1 text-gray-500">Try a different search term</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart & Payment (SCROLLABLE) */}
        <div 
          ref={rightPanelRef}
          className="w-96 bg-white shadow-lg flex flex-col rounded-xl border border-gray-200 overflow-hidden overflow-y-auto"
        >
          {/* Cart Header - Sticky */}
          <div className="sticky top-0 z-30 p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-2">
                  <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Items</h2>
                  <p className="text-xs text-gray-500">{cart.length} product{cart.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {cart.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGlobalDiscount(true)}
                    className="text-xs text-green-700 hover:text-green-800 px-3 py-1.5 hover:bg-green-50 rounded-lg flex items-center transition-colors font-medium"
                  >
                    <TagIcon className="h-4 w-4 mr-1" />
                    Discount
                  </button>
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-700 hover:text-red-800 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Global Discount Panel - Sticky */}
          {showGlobalDiscount && (
            <div className="sticky top-20 z-20 p-4 bg-amber-50 border-b border-amber-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm text-amber-900 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4" />
                  Apply Discount
                </h4>
                <button onClick={() => setShowGlobalDiscount(false)}>
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="Amount"
                />
                <select
                  value={globalDiscountType}
                  onChange={(e) => setGlobalDiscountType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={applyGlobalDiscount}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={removeGlobalDiscount}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Cart Items - Scrollable */}
          <div className="flex-1 px-4 py-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCartIcon className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-base font-medium text-gray-600">Cart is empty</p>
                <p className="text-xs mt-2 text-gray-500">Add products to begin</p>
              </div>
            ) : (
              cart.map((item) => {
                const itemTotal = item.quantity * item.unitPrice;
                const discountAmount = calculateItemDiscountAmount(item);
                const finalTotal = itemTotal - discountAmount;

                return (
                  <div key={item.product} className="bg-gray-50 rounded-lg p-3.5 shadow-sm border border-gray-200 hover:border-blue-300 transition-all">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{item.productName}</h4>
                        <p className="text-xs text-gray-500">{item.sizePackage}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product)}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center bg-white rounded-lg border border-gray-300 overflow-hidden">
                        <button 
                          onClick={() => updateQuantity(item.product, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-gray-900 font-semibold text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-blue-600 text-base">{formatCurrency(finalTotal)}</div>
                        {discountAmount > 0 && (
                          <div className="text-xs text-gray-500 line-through">{formatCurrency(itemTotal)}</div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setEditingItem(item.product);
                          setItemDiscountInput(item.discountValue.toString());
                          setItemDiscountType(item.discountType);
                        }}
                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {item.discountValue > 0 && (
                      <div className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 inline-block mb-2">
                        {item.discountType === 'percentage' 
                          ? `-${item.discountValue}%` 
                          : `-${formatCurrency(item.discountValue)}`
                        } discount
                      </div>
                    )}

                    {editingItem === item.product && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            value={itemDiscountInput}
                            onChange={(e) => setItemDiscountInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Amount"
                            min="0"
                          />
                          <select
                            value={itemDiscountType}
                            onChange={(e) => setItemDiscountType(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => applyItemDiscount(item.product)}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(null);
                              setItemDiscountInput('');
                            }}
                            className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Fixed Bottom Payment Section - Sticky */}
          <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white p-4 space-y-4 shadow-lg">
            {/* Customer Info */}
            <button
              onClick={() => setShowCustomerInfo(!showCustomerInfo)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserIcon className="h-5 w-5 text-gray-500" />
                Customer Info
              </div>
              {showCustomerInfo ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>

            {showCustomerInfo && (
              <div className="space-y-2 pb-3 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
                  maxLength="11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 text-blue-600">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'cash', icon: BanknotesIcon, label: 'Cash' },
                { key: 'card', icon: CreditCardIcon, label: 'Card' },
                { key: 'credit', icon: ReceiptPercentIcon, label: 'Credit' },
                { key: 'mixed', icon: 'm', label: 'Mixed' }
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center transition-all ${
                    paymentMethod === m.key 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {typeof m.icon === 'string' ? (
                    <span className="text-base mb-1">{m.icon}</span>
                  ) : (
                    <m.icon className="h-4 w-4 mb-1" />
                  )}
                  {m.label}
                </button>
              ))}
            </div>

            {/* Paid Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Paid Amount</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-semibold text-gray-900"
              />
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setPaidAmount(grandTotal.toFixed(2))}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                >
                  Exact
                </button>
                {[1000, 5000, 10000].map(v => (
                  <button 
                    key={v}
                    onClick={() => setPaidAmount(v.toString())}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {paidAmount && parseFloat(paidAmount) >= grandTotal && (
              <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                <div className="text-xs text-green-700 mb-1">Change</div>
                <div className="text-2xl font-bold text-green-700">{formatCurrency(change)}</div>
              </div>
            )}

            {/* Complete Button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0 || parseFloat(paidAmount || 0) < grandTotal}
              className="w-full py-4 rounded-lg text-white font-bold text-base shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Barcode Scanner</h3>
              <button 
                onClick={() => setShowScanner(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Scan or type barcode..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeScan(e.target.value);
                  e.target.value = '';
                  setShowScanner(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;