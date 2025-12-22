import React, { useState, useEffect, useRef } from 'react';
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
  PhoneIcon,
  CalculatorIcon,
  QrCodeIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { productAPI, saleAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const POS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef(null);

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
    // Check if product already in cart
    const existingItem = cart.find(item => item.product === product._id);
    
    if (existingItem) {
      // Check stock availability
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
      // Check stock availability for new item
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
          discount: product.discount || 0,
          stockAvailable: product.quantity
        }
      ]);
    }
    
    // Clear search
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

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = (item.discount / 100) * itemTotal;
      subtotal += itemTotal;
      totalDiscount += itemDiscount;
    });
    
    const grandTotal = subtotal - totalDiscount;
    
    return { subtotal, totalDiscount, grandTotal };
  };

  const { subtotal, totalDiscount, grandTotal } = calculateTotals();
  const change = parseFloat(paidAmount || 0) - grandTotal;

  // Handle checkout
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
        discount: item.discount // This should be percentage (e.g., 10 for 10%)
      })),
      customer: customer.name || customer.phone ? customer : null,
      paymentMethod,
      paidAmount: parseFloat(paidAmount),
      subtotal,
      totalDiscount,
      grandTotal,
      change: change > 0 ? change : 0
    };

    console.log('Sending sale data:', saleData); // Debug log
    
    const response = await saleAPI.createSale(saleData);
    
    if (response.data.success) {
      const sale = response.data.data;
      toast.success('Sale completed successfully!');
      
      // Print receipt automatically
      printReceipt(sale);
      
      // Reset form
      resetPOS();
    } else {
      toast.error(response.data.message || 'Failed to complete sale');
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Better error handling
    if (error.response) {
      // Server responded with error
      toast.error(error.response.data.message || 'Failed to complete sale');
      console.error('Error response:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      toast.error('No response from server. Please check your connection.');
    } else {
      // Other errors
      toast.error('An unexpected error occurred');
    }
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
          body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
          .receipt { max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; }
          .info { margin-bottom: 20px; }
          .info div { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px 0; text-align: left; border-bottom: 1px dashed #ddd; }
          th { font-weight: bold; }
          .total-row { font-weight: bold; border-top: 2px solid #000; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          .barcode { text-align: center; margin: 20px 0; }
          @media print { 
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>AL-WAQAS HARDWARE</h1>
            <p>Hardware & Paint Shop</p>
            <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="info">
            <div><strong>Invoice:</strong> ${sale.invoiceNumber}</div>
            ${sale.customer?.name ? `<div><strong>Customer:</strong> ${sale.customer.name}</div>` : ''}
            ${sale.customer?.phone ? `<div><strong>Phone:</strong> ${sale.customer.phone}</div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
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
                  <td>${formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Subtotal:</td>
                <td>${formatCurrency(sale.subtotal)}</td>
              </tr>
              ${sale.totalDiscount > 0 ? `
                <tr>
                  <td colspan="3">Discount:</td>
                  <td>-${formatCurrency(sale.totalDiscount)}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="3">TOTAL:</td>
                <td>${formatCurrency(sale.grandTotal)}</td>
              </tr>
              <tr>
                <td colspan="3">Paid:</td>
                <td>${formatCurrency(sale.paidAmount)}</td>
              </tr>
              ${sale.change > 0 ? `
                <tr>
                  <td colspan="3">Change:</td>
                  <td>${formatCurrency(sale.change)}</td>
                </tr>
              ` : ''}
            </tfoot>
          </table>
          
          <div class="barcode">
            <div>${sale.invoiceNumber}</div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Alwaqas Paint & Hardware Shop</p>
            <p>*** VISIT AGAIN ***</p>
            <p>Contact: [0333 5093223 | 0300 8168264]</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Receipt
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
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
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Point of Sale (POS)</h1>
            <p className="text-sm text-gray-600">Quick sales and billing</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Scan Barcode
            </button>
            <button
              onClick={resetPOS}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
              New Sale
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name or barcode..."
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={product.quantity === 0}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                      product.quantity === 0 
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                        : 'bg-white border-gray-200 hover:border-indigo-500 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center w-full">
                      <h4 className="font-medium text-gray-900 text-sm truncate w-full">
                        {product.productName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{product.sizePackage}</p>
                      
                      <div className="mt-3">
                        <span className="text-lg font-bold text-indigo-600">
                          {formatCurrency(product.salePrice)}
                        </span>
                        {product.discount > 0 && (
                          <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            -{product.discount}%
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.quantity > 10 
                            ? 'bg-green-100 text-green-800' 
                            : product.quantity > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Stock: {product.quantity} {product.unit}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {products.length === 0 && searchTerm && !loading && (
              <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Try a different search term</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart & Payment */}
        <div className="w-1/3 flex flex-col bg-white">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingCartIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="ml-2 text-lg font-semibold text-gray-800">Cart</h2>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                  {cart.length} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCartIcon className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</h3>
                <p className="mt-1 text-sm text-gray-500">Add products from the list</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-500">{item.sizePackage}</p>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(item.unitPrice)} each
                          {item.discount > 0 && (
                            <span className="ml-2 text-green-600">
                              ({item.discount}% off)
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product, item.quantity - 1)}
                            className="p-1 rounded-full hover:bg-gray-200"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product, item.quantity + 1)}
                            className="p-1 rounded-full hover:bg-gray-200"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="text-right min-w-20">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeFromCart(item.product)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
            <div className="space-y-3">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </div>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-green-600">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h4>
              <div className="grid grid-cols-4 gap-2">
                {['cash', 'card', 'credit', 'mixed'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium flex flex-col items-center justify-center ${
                      paymentMethod === method
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {method === 'cash' && <BanknotesIcon className="h-5 w-5 mb-1" />}
                    {method === 'card' && <CreditCardIcon className="h-5 w-5 mb-1" />}
                    {method === 'credit' && <ReceiptPercentIcon className="h-5 w-5 mb-1" />}
                    {method === 'mixed' && <CalculatorIcon className="h-5 w-5 mb-1" />}
                    <span>{method.charAt(0).toUpperCase() + method.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paid Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Paid
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rs</span>
                <input
                  type="number"
                  className="w-full pl-12 pr-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Change */}
            {paidAmount && change >= 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Change</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0 || !paidAmount || parseFloat(paidAmount) < grandTotal}
              className={`w-full py-4 px-4 rounded-lg font-bold text-white text-lg ${
                isProcessing || cart.length === 0 || !paidAmount || parseFloat(paidAmount) < grandTotal
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } transition-colors`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <CreditCardIcon className="h-6 w-6 mr-2" />
                  Complete Sale - {formatCurrency(grandTotal)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Simple Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Barcode Scanner</h3>
              <button onClick={() => setShowScanner(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Scanner placeholder - implement with actual barcode scanner library</p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter barcode manually"
                className="w-full px-3 py-2 border rounded"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeScan(e.target.value);
                    setShowScanner(false);
                  }
                }}
              />
              <button
                onClick={() => setShowScanner(false)}
                className="w-full bg-indigo-600 text-white py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;