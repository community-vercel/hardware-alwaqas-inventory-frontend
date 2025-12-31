import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
  SparklesIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ClockIcon,
  DocumentTextIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';
import { productAPI, saleAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const POS = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDiscountInput, setItemDiscountInput] = useState('');
  const [itemDiscountType, setItemDiscountType] = useState('percentage');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);
  const [customerPurchaseHistory, setCustomerPurchaseHistory] = useState([]);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  const [manualGrandTotal, setManualGrandTotal] = useState(null);
  const [showDiscountCalculator, setShowDiscountCalculator] = useState(false);
  const [discountCalculation, setDiscountCalculation] = useState({
    originalPrice: '',
    discountAmount: '',
    discountPercentage: '',
    finalPrice: ''
  });
  
  const searchInputRef = useRef(null);
  const rightPanelRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const cartItemsRef = useRef(null);

  // Fetch customers
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customersForPOS'],
    queryFn: () => saleAPI.getCustomersFromSales({ search: '', page: 1 }),
    staleTime: 3000
  });

  // Fetch customer purchase history
  const fetchCustomerPurchaseHistory = async (customerPhone) => {
    try {
      setLoadingPurchaseHistory(true);
      const customerFromList = customers?.find(c => c.phone === customerPhone);
      
      if (customerFromList?.recentSales && customerFromList.recentSales.length > 0) {
        setCustomerPurchaseHistory(customerFromList.recentSales);
      } else {
        const response = await saleAPI.getSalesByCustomerPhone(customerPhone);
        const transformedData = response.data.data?.docs?.map(sale => ({
          _id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          paymentMethod: sale.paymentMethod,
          grandTotal: sale.grandTotal,
          totalDiscount: sale.totalDiscount,
          paidAmount: sale.paidAmount,
          change: sale.change,
          items: sale.items?.map(item => ({
            _id: item.product?._id || item.product,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            total: item.quantity * item.unitPrice - (item.discount || 0)
          })) || []
        })) || [];
        setCustomerPurchaseHistory(transformedData);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      toast.error('Failed to load purchase history');
      setCustomerPurchaseHistory([]);
    } finally {
      setLoadingPurchaseHistory(false);
    }
  };

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

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset manual grand total when cart changes
  useEffect(() => {
    setManualGrandTotal(null);
  }, [cart]);

  // Calculate discount values when editing
  useEffect(() => {
    if (editingItem && itemDiscountInput) {
      const item = cart.find(item => item.product === editingItem);
      if (item) {
        const itemTotal = item.quantity * item.unitPrice;
        let discountAmount;
        
        if (itemDiscountType === 'percentage') {
          const percentage = parseFloat(itemDiscountInput) || 0;
          discountAmount = (percentage / 100) * itemTotal;
        } else {
          discountAmount = parseFloat(itemDiscountInput) || 0;
        }
        
        // Update discount calculation state
        setDiscountCalculation({
          originalPrice: itemTotal.toFixed(2),
          discountAmount: Math.round(discountAmount * 100) / 100,
          discountPercentage: itemDiscountType === 'percentage' ? 
            (parseFloat(itemDiscountInput) || 0).toFixed(2) : 
            ((discountAmount / itemTotal) * 100 || 0).toFixed(2),
          finalPrice: Math.round((itemTotal - discountAmount) * 100) / 100
        });
      }
    }
  }, [editingItem, itemDiscountInput, itemDiscountType, cart]);

  // Extract customers from data
  const customers = customersData?.data?.data?.docs || [];
  
  // Filter customers based on search
  const filteredCustomers = customers
    .filter(c => c.phone && c.name && c.address)
    .filter(c => 
      customerSearch === '' || 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );

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

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setCustomer({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    
    if (customer.name) {
      toast.success(`Selected customer: ${customer.name}`);
    } else if (customer.phone) {
      toast.success(`Selected customer: ${customer.phone}`);
    }
  };

  // Handle add new customer
  const handleAddNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomer({ name: '', phone: '', address: '' });
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setShowCustomerInfo(true);
    
    setTimeout(() => {
      const nameInput = document.querySelector('input[placeholder="Name (optional)"]');
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
    
    toast.info('Enter new customer details (all fields optional)');
  };

  // Handle view purchase history
  const handleViewPurchaseHistory = async (customerItem, e) => {
    e.stopPropagation();
    try {
      setSelectedCustomer(customerItem);
      await fetchCustomerPurchaseHistory(customerItem.phone);
      setShowPurchaseHistory(true);
      setShowCustomerDropdown(false);
    } catch (error) {
      console.error('Error viewing purchase history:', error);
      toast.error('Failed to load purchase history');
    }
  };

  // Clear customer selection
  const handleClearCustomer = () => {
    setCustomer({ name: '', phone: '', address: '' });
    setSelectedCustomer(null);
    setShowCustomerInfo(false);
    toast.success('Customer cleared');
  };

  // Calculate item discount amount with rounding
  const calculateItemDiscountAmount = (item) => {
    const itemTotal = item.quantity * item.unitPrice;
    let discountAmount;
    
    if (item.discountType === 'percentage') {
      discountAmount = (item.discountValue / 100) * itemTotal;
    } else {
      discountAmount = item.discountValue;
    }
    
    return Math.round(discountAmount * 100) / 100;
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

  // Remove discount from individual item
  const removeItemDiscount = (productId) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product === productId
          ? { 
              ...item, 
              discountType: 'percentage',
              discountValue: 0 
            }
          : item
      )
    );
    
    setEditingItem(null);
    setItemDiscountInput('');
    toast.success(`Removed discount from item`);
  };

  // Calculate totals with proper discount handling and rounding
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    
    cart.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = calculateItemDiscountAmount(item);
      subtotal += itemTotal;
      itemDiscounts += itemDiscount;
    });
    
    // Round to 2 decimal places to avoid floating point issues
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedItemDiscounts = Math.round(itemDiscounts * 100) / 100;
    const roundedGrandTotal = Math.max(0, Math.round((roundedSubtotal - roundedItemDiscounts) * 100) / 100);
    
    return { 
      subtotal: roundedSubtotal, 
      itemDiscounts: roundedItemDiscounts, 
      grandTotal: roundedGrandTotal 
    };
  };

  const { 
    subtotal, 
    itemDiscounts, 
    grandTotal: calculatedGrandTotal 
  } = calculateTotals();

  // Use manual grand total if set, otherwise use calculated
  const grandTotal = manualGrandTotal !== null ? manualGrandTotal : calculatedGrandTotal;
  
  // Handle grand total change
  const handleGrandTotalChange = (newTotal) => {
    const parsedTotal = Math.max(0, Math.round((parseFloat(newTotal) || 0) * 100) / 100);
    setManualGrandTotal(parsedTotal);
  };

  const change = Math.max(0, Math.round((parseFloat(paidAmount || 0) - grandTotal) * 100) / 100);

  // Handle checkout with real-time inventory update
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Use rounded values for comparison
    const paid = parseFloat(paidAmount) || 0;
    const roundedPaid = Math.round(paid * 100) / 100;
    const roundedGrandTotal = Math.round(grandTotal * 100) / 100;
    
    if (roundedPaid === 0) {
      toast.error('Please enter paid amount');
      return;
    }

    if (roundedPaid < roundedGrandTotal) {
      toast.error(`Paid amount (${formatCurrency(roundedPaid)}) is less than total (${formatCurrency(roundedGrandTotal)})`);
      return;
    }

    setIsProcessing(true);

    try {
      const roundedChange = Math.max(0, Math.round((roundedPaid - roundedGrandTotal) * 100) / 100);
      
      const saleData = {
        items: cart.map(item => ({
          product: item.product,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discountValue,
          discountType: item.discountType
        })),
        customer: customer.name || customer.phone || customer.address ? customer : null,
        paymentMethod,
        paidAmount: roundedPaid,
        subtotal: Math.round(subtotal * 100) / 100,
        itemDiscounts: Math.round(itemDiscounts * 100) / 100,
        grandTotal: roundedGrandTotal,
        change: roundedChange
      };

      const response = await saleAPI.createSale(saleData);
      
      if (response.data.success) {
        const sale = response.data.data;
        toast.success('Sale completed successfully!');
        
        // Update local products state with new quantities
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
        
        // Invalidate queries to refresh other components
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['lowStock'] });
        queryClient.invalidateQueries({ queryKey: ['recentSales'] });
        queryClient.invalidateQueries({ queryKey: ['dailySales'] });
        queryClient.invalidateQueries({ queryKey: ['customersForPOS'] });
        
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
    setCustomer({ name: '', phone: '', address: '' });
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setPaidAmount('');
    setSearchTerm('');
    setShowCustomerInfo(false);
    setEditingItem(null);
    setItemDiscountInput('');
    setManualGrandTotal(null);
    setShowDiscountCalculator(false);
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
          .item-discount { font-size: 0.9em; color: #666; margin-left: 20px; }
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
          ${sale.items.map(item => {
            const itemTotal = item.quantity * item.unitPrice;
            const discountAmount = item.discountType === 'percentage' ? 
              (item.discount / 100) * itemTotal : 
              item.discount;
            const finalPrice = itemTotal - discountAmount;
            
            return `
              <div class="item">
                <div>
                  <strong>${item.productName} x${item.quantity}</strong>
                  ${item.discount > 0 ? `
                    <div class="item-discount">
                      ${item.discountType === 'percentage' ? 
                        `-${item.discount}% discount` : 
                        `-${formatCurrency(item.discount)} discount`}
                    </div>
                  ` : ''}
                </div>
                <div>
                  ${formatCurrency(finalPrice)}
                  ${discountAmount > 0 ? `
                    <div style="text-decoration: line-through; color: #666; font-size: 0.9em;">
                      ${formatCurrency(itemTotal)}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.itemDiscounts > 0 ? `
            <div class="total-row">
              <span>Total Discount:</span>
              <span>-${formatCurrency(sale.itemDiscounts)}</span>
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

  // Discount calculator handlers
  const handleDiscountCalcChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const newCalc = { ...discountCalculation };
    
    switch (field) {
      case 'originalPrice':
        newCalc.originalPrice = numValue;
        if (newCalc.discountPercentage) {
          const discountAmount = (numValue * parseFloat(newCalc.discountPercentage) / 100);
          newCalc.discountAmount = Math.round(discountAmount * 100) / 100;
          newCalc.finalPrice = Math.round((numValue - discountAmount) * 100) / 100;
        } else if (newCalc.discountAmount) {
          newCalc.discountPercentage = ((newCalc.discountAmount / numValue) * 100).toFixed(2);
          newCalc.finalPrice = Math.round((numValue - newCalc.discountAmount) * 100) / 100;
        } else if (newCalc.finalPrice) {
          newCalc.discountAmount = Math.round((numValue - newCalc.finalPrice) * 100) / 100;
          newCalc.discountPercentage = ((newCalc.discountAmount / numValue) * 100).toFixed(2);
        }
        break;
        
      case 'discountAmount':
        newCalc.discountAmount = numValue;
        if (newCalc.originalPrice) {
          newCalc.discountPercentage = ((numValue / newCalc.originalPrice) * 100).toFixed(2);
          newCalc.finalPrice = Math.round((newCalc.originalPrice - numValue) * 100) / 100;
        }
        break;
        
      case 'discountPercentage':
        newCalc.discountPercentage = numValue;
        if (newCalc.originalPrice) {
          const discountAmount = (newCalc.originalPrice * numValue / 100);
          newCalc.discountAmount = Math.round(discountAmount * 100) / 100;
          newCalc.finalPrice = Math.round((newCalc.originalPrice - discountAmount) * 100) / 100;
        }
        break;
        
      case 'finalPrice':
        newCalc.finalPrice = numValue;
        if (newCalc.originalPrice) {
          newCalc.discountAmount = Math.round((newCalc.originalPrice - numValue) * 100) / 100;
          newCalc.discountPercentage = ((newCalc.discountAmount / newCalc.originalPrice) * 100).toFixed(2);
        }
        break;
    }
    
    setDiscountCalculation(newCalc);
  };

  const applyDiscountFromCalculator = () => {
    if (!editingItem) return;
    
    const item = cart.find(item => item.product === editingItem);
    if (!item) return;
    
    const itemTotal = item.quantity * item.unitPrice;
    
    // Calculate discount value based on percentage
    const discountPercentage = parseFloat(discountCalculation.discountPercentage) || 0;
    if (discountPercentage > 100) {
      toast.error('Discount cannot exceed 100%');
      return;
    }
    
    setItemDiscountInput(discountPercentage.toString());
    setItemDiscountType('percentage');
    
    // Apply the discount
    applyItemDiscount(editingItem);
    setShowDiscountCalculator(false);
    setDiscountCalculation({
      originalPrice: '',
      discountAmount: '',
      discountPercentage: '',
      finalPrice: ''
    });
  };

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
        <div className={`${isRightPanelExpanded ? 'w-1/3' : 'flex-1'} flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden transition-all duration-300`}>
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

        {/* Right Panel - Cart & Payment */}
        <div 
          ref={rightPanelRef}
          className={`${isRightPanelExpanded ? 'w-2/3' : 'w-96'} bg-white shadow-lg flex flex-col rounded-xl border border-gray-200 overflow-hidden transition-all duration-300`}
        >
          {/* Cart Header with Expand/Collapse */}
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-2">
                <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Cart</h2>
                <p className="text-xs text-gray-500">{cart.length} item{cart.length !== 1 ? 's' : ''} • {formatCurrency(grandTotal)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title={isRightPanelExpanded ? "Collapse panel" : "Expand panel"}
              >
                {isRightPanelExpanded ? (
                  <ArrowsPointingInIcon className="h-4 w-4" />
                ) : (
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                )}
              </button>
              
              {cart.length > 0 && (
                <>
                  <button
                    onClick={() => setCart([])}
                    className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all duration-200 shadow-sm"
                  >
                    <TrashIcon className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Scrollable Container for Both Cart Items and Payment Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Cart Items Section - Scrollable */}
            <div 
              ref={cartItemsRef}
              className="flex-1 overflow-y-auto border-b border-gray-200"
              style={{ minHeight: '200px', maxHeight: 'calc(60vh - 200px)' }}
            >
              <div className="p-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ShoppingCartIcon className="h-24 w-24 mb-4 opacity-20" />
                    <p className="text-base font-medium text-gray-600">Cart is empty</p>
                    <p className="text-xs mt-2 text-gray-500">Add products to begin</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      const discountAmount = calculateItemDiscountAmount(item);
                      const finalTotal = Math.round((itemTotal - discountAmount) * 100) / 100;

                      return (
                        <div key={item.product} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-blue-300 transition-all group">
                          <div className="flex justify-between items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm truncate">{item.productName}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{item.sizePackage}</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product)}
                              className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                              title="Remove item"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 overflow-hidden">
                              <button 
                                onClick={() => updateQuantity(item.product, item.quantity - 1)}
                                className="p-2 hover:bg-gray-200 text-gray-700 transition-colors"
                                title="Decrease quantity"
                              >
                                <MinusIcon className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-10 text-center text-gray-900 font-semibold text-base">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product, item.quantity + 1)}
                                className="p-2 hover:bg-gray-200 text-gray-700 transition-colors"
                                title="Increase quantity"
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-blue-600 text-base">{formatCurrency(finalTotal)}</div>
                              {discountAmount > 0 && (
                                <div className="text-xs text-gray-500 line-through">{formatCurrency(itemTotal)}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingItem(item.product);
                                  setItemDiscountInput(item.discountValue.toString());
                                  setItemDiscountType(item.discountType);
                                }}
                                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors flex-shrink-0"
                                title="Edit discount"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {item.discountValue > 0 && (
                                <button
                                  onClick={() => removeItemDiscount(item.product)}
                                  className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors flex-shrink-0"
                                  title="Remove discount"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {item.discountValue > 0 && (
                            <div className="text-xs text-green-700 bg-green-100 rounded px-3 py-1.5 inline-flex items-center gap-1">
                              <TagIcon className="h-3 w-3" />
                              {item.discountType === 'percentage' 
                                ? `-${item.discountValue}% discount applied`
                                : `-${formatCurrency(item.discountValue)} discount applied`
                              }
                            </div>
                          )}

                          {editingItem === item.product && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-700">Apply Item Discount</h5>
                                <button
                                  onClick={() => setShowDiscountCalculator(true)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                                >
                                  <CalculatorIcon className="h-3 w-3" />
                                  Calculator
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="number"
                                  value={itemDiscountInput}
                                  onChange={(e) => setItemDiscountInput(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Discount amount"
                                  min="0"
                                  step="0.5"
                                />
                                <select
                                  value={itemDiscountType}
                                  onChange={(e) => setItemDiscountType(e.target.value)}
                                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="percentage">%</option>
                                  <option value="fixed">Fixed</option>
                                </select>
                              </div>
                              
                              {/* Discount Preview */}
                              {itemDiscountInput && parseFloat(itemDiscountInput) > 0 && (
                                <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-600">Original:</div>
                                    <div className="text-right font-medium">{formatCurrency(itemTotal)}</div>
                                    
                                    <div className="text-gray-600">Discount:</div>
                                    <div className="text-right font-medium text-green-700">
                                      {itemDiscountType === 'percentage' 
                                        ? `${itemDiscountInput}%` 
                                        : formatCurrency(parseFloat(itemDiscountInput))
                                      }
                                    </div>
                                    
                                    <div className="text-gray-600">Discount Amount:</div>
                                    <div className="text-right font-medium text-red-700">
                                      -{formatCurrency(discountCalculation.discountAmount)}
                                    </div>
                                    
                                    <div className="text-gray-600 font-bold">Final Price:</div>
                                    <div className="text-right font-bold text-blue-700">
                                      {formatCurrency(discountCalculation.finalPrice)}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => applyItemDiscount(item.product)}
                                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  Apply Discount
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingItem(null);
                                    setItemDiscountInput('');
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Section - Scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 100px)' }}>
              <div className="p-4 space-y-4">
                {/* Customer Selection */}
                <div className="relative" ref={customerDropdownRef}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700">Customer</label>
                    {selectedCustomer && (
                      <button
                        onClick={handleClearCustomer}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 border border-gray-300"
                  >
                    <div className="flex items-center gap-2 text-sm truncate">
                      <UserIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      {selectedCustomer ? (
                        <span className="truncate">
                          {selectedCustomer.name || selectedCustomer.phone || 'Customer'} 
                          {selectedCustomer.phone && selectedCustomer.name && ` (${selectedCustomer.phone})`}
                        </span>
                      ) : customer.name || customer.phone || customer.address ? (
                        <span className="truncate">
                          {customer.name || customer.phone || 'New Customer'}
                          {customer.phone && customer.name && ` (${customer.phone})`}
                        </span>
                      ) : (
                        <span>Select or add customer</span>
                      )}
                    </div>
                    <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                  </button>

                  {showCustomerDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden flex flex-col">
                      {/* Search Bar */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                          />
                          {customerSearch && (
                            <button
                              onClick={() => setCustomerSearch('')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Customer List */}
                      <div className="flex-1 overflow-y-auto">
                        {loadingCustomers ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600 mx-auto"></div>
                          </div>
                        ) : filteredCustomers.length > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {filteredCustomers.map((customerItem) => {
                              const customerType = customerItem.totalSpent > 5000 ? 'VIP' : 
                                                  customerItem.totalSpent > 1000 ? 'Regular' : 'New';
                              
                              return (
                                <div 
                                  key={customerItem._id || customerItem.phone}
                                  className="p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => handleSelectCustomer(customerItem)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                          {customerItem.name || 'Unknown Customer'}
                                        </span>
                                        {customerType === 'VIP' && (
                                          <StarIcon className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {customerItem.phone || 'No phone'}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-600">
                                          {customerItem.totalPurchases || 0} purchases
                                        </span>
                                        <span className="text-xs text-gray-600">
                                          {formatCurrency(customerItem.totalSpent || 0)} spent
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <button
                                        onClick={(e) => handleViewPurchaseHistory(customerItem, e)}
                                        className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                        title="View purchase history"
                                      >
                                        <ClockIcon className="h-4 w-4" />
                                      </button>
                                      <div className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                                        {customerType}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {customerSearch ? 'No customers found' : 'No customers available'}
                          </div>
                        )}
                      </div>

                      {/* Add New Customer Button */}
                      <div className="p-2 border-t border-gray-200">
                        <button
                          onClick={handleAddNewCustomer}
                          className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add New Customer (All fields optional)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Details Form (for new customer) */}
                {(!selectedCustomer || showCustomerInfo) && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600">New Customer Details (All Optional)</span>
                      {customer.name || customer.phone || customer.address ? (
                        <button
                          onClick={handleClearCustomer}
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
                      maxLength="11"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Address (optional)"
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Totals Summary with Editable Grand Total */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {itemDiscounts > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-700">
                        <span>Total Item Discounts</span>
                        <span>-{formatCurrency(itemDiscounts)}</span>
                      </div>
                    )}
                    
                    {/* Editable Grand Total */}
                    <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                      <span className="text-lg font-bold text-blue-700">Grand Total</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">PKR </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={grandTotal}
                          onChange={(e) => handleGrandTotalChange(e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value === '' || parseFloat(e.target.value) === calculatedGrandTotal) {
                              setManualGrandTotal(null);
                            }
                          }}
                          className="pl-10 pr-2 py-1 text-lg font-bold text-blue-700 bg-transparent border border-transparent hover:border-blue-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 w-32 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Payment Method</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'cash', icon: BanknotesIcon, label: 'Cash', color: 'green' },
                      { key: 'card', icon: CreditCardIcon, label: 'Card', color: 'blue' },
                      { key: 'credit', icon: ReceiptPercentIcon, label: 'Credit', color: 'purple' },
                      { key: 'mixed', icon: 'M', label: 'Mixed', color: 'gray' }
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setPaymentMethod(m.key)}
                        className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center transition-all ${
                          paymentMethod === m.key 
                            ? `bg-${m.color}-600 text-white shadow-md` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {typeof m.icon === 'string' ? (
                          <span className="text-base mb-1">{m.icon}</span>
                        ) : (
                          <m.icon className="h-5 w-5 mb-1" />
                        )}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid Amount */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Paid Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">PKR </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-semibold text-gray-900"
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => setPaidAmount(grandTotal.toFixed())}
                      className="flex-1 py-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Exact Amount
                    </button>
                    {[500, 1000, 5000].map(v => (
                      <button 
                        key={v}
                        onClick={() => setPaidAmount((parseFloat(paidAmount || 1) + v).toString())}
                        className="flex-1 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Display */}
                {paidAmount && Math.round(parseFloat(paidAmount)) >= grandTotal && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg text-center border border-green-200">
                    <div className="text-xs text-green-700 mb-1">Change Due</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(change)}</div>
                  </div>
                )}

                {/* Complete Sale Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.length === 0 || Math.round((parseFloat(paidAmount || 0) * 100) / 100) < Math.round(grandTotal * 100) / 100}
                  className="w-full py-4 rounded-lg text-white font-bold text-base shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Processing Sale...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Complete Sale • {formatCurrency(grandTotal)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Calculator Modal */}
      {showDiscountCalculator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5" />
                  Discount Calculator
                </h2>
                <p className="text-sm text-gray-500">Calculate discount for selected item</p>
              </div>
              <button
                onClick={() => setShowDiscountCalculator(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">PKR</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountCalculation.originalPrice}
                      onChange={(e) => handleDiscountCalcChange('originalPrice', e.target.value)}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">PKR</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountCalculation.discountAmount}
                        onChange={(e) => handleDiscountCalcChange('discountAmount', e.target.value)}
                        className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discountCalculation.discountPercentage}
                        onChange={(e) => handleDiscountCalcChange('discountPercentage', e.target.value)}
                        className="w-full pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Final Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">PKR</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountCalculation.finalPrice}
                      onChange={(e) => handleDiscountCalcChange('finalPrice', e.target.value)}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Summary */}
                {discountCalculation.originalPrice && discountCalculation.discountPercentage && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-900 mb-2">Discount Summary</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">Original Price:</div>
                      <div className="text-right font-medium">{formatCurrency(discountCalculation.originalPrice)}</div>
                      
                      <div className="text-gray-600">Discount:</div>
                      <div className="text-right font-medium text-green-700">
                        {discountCalculation.discountPercentage}%
                      </div>
                      
                      <div className="text-gray-600">You Save:</div>
                      <div className="text-right font-medium text-red-700">
                        -{formatCurrency(discountCalculation.discountAmount)}
                      </div>
                      
                      <div className="text-gray-600 font-bold">Final Price:</div>
                      <div className="text-right font-bold text-blue-700">
                        {formatCurrency(discountCalculation.finalPrice)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowDiscountCalculator(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyDiscountFromCalculator}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply Discount
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {showPurchaseHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Purchase History - {selectedCustomer.name}
                </h2>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setShowPurchaseHistory(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {loadingPurchaseHistory ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading purchase history...</span>
                </div>
              ) : customerPurchaseHistory.length > 0 ? (
                <div className="space-y-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">Total Purchases</p>
                      <p className="text-2xl font-bold text-blue-900">{customerPurchaseHistory.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">Total Spent</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(customerPurchaseHistory.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700">Average Purchase</p>
                      <p className="text-2xl font-bold text-amber-900">
                        {formatCurrency(
                          customerPurchaseHistory.length > 0 
                            ? customerPurchaseHistory.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0) / customerPurchaseHistory.length
                            : 0
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Recent Sales List */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ReceiptPercentIcon className="h-4 w-4" />
                      Recent Sales ({customerPurchaseHistory.length})
                    </h3>
                    <div className="space-y-3">
                      {customerPurchaseHistory.map((sale) => (
                        <div key={sale._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                          {/* Sale Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {sale.invoiceNumber || `Sale #${sale._id?.slice(-6)}`}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  (sale.paymentMethod || 'cash') === 'cash' ? 'bg-green-100 text-green-800' :
                                  (sale.paymentMethod || 'cash') === 'card' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {sale.paymentMethod || 'Cash'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.saleDate 
                                  ? new Date(sale.saleDate).toLocaleDateString() 
                                  : 'No date available'
                                } {sale.saleDate 
                                  ? '• ' + new Date(sale.saleDate).toLocaleTimeString() 
                                  : ''
                                }
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-700">
                                {formatCurrency(sale.grandTotal || 0)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.items?.length || 0} item{sale.items?.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          
                          {/* Products List */}
                          {sale.items && sale.items.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="text-xs font-medium text-gray-600 mb-2">Items Purchased:</div>
                              <div className="space-y-2">
                                {sale.items.map((item, index) => {
                                  const itemTotal = item.quantity * item.unitPrice;
                                  const discountAmount = item.discountType === 'percentage' ? 
                                    (item.discount / 100) * itemTotal : 
                                    item.discount;
                                  
                                  return (
                                    <div key={item._id || index} className="flex justify-between text-sm">
                                      <div className="text-gray-700">
                                        <span className="font-medium">{item.productName || 'Product'}</span>
                                        <span className="text-gray-500 ml-2">
                                          (x{item.quantity || 1})
                                        </span>
                                        {item.discount > 0 && (
                                          <span className="text-xs text-green-700 ml-2">
                                            {item.discountType === 'percentage' 
                                              ? `-${item.discount}%` 
                                              : `-${formatCurrency(item.discount)}`
                                            }
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-gray-700 font-medium">
                                        {formatCurrency(itemTotal - discountAmount)}
                                        {discountAmount > 0 && (
                                          <div className="text-xs text-gray-500 line-through">
                                            {formatCurrency(itemTotal)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Discount Information */}
                          {sale.totalDiscount > 0 && (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm text-gray-600">Total Discount:</div>
                              <div className="text-sm font-medium text-green-700">
                                -{formatCurrency(sale.totalDiscount || 0)}
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Information */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 text-sm">
                            <div className="text-gray-600">
                              Paid: {formatCurrency(sale.paidAmount || 0)}
                            </div>
                            {sale.change > 0 && (
                              <div className="text-gray-600">
                                Change: {formatCurrency(sale.change || 0)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <ReceiptPercentIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-600">No Purchase History</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedCustomer.name} has no previous purchases
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;