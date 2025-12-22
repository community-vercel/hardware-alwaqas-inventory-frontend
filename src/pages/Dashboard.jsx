import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCartIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ReceiptPercentIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  BanknotesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardAPI, productAPI, saleAPI, expenseAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('30days');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', timeRange],
    queryFn: () => dashboardAPI.getStats(),
    refetchInterval: 30000,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to load dashboard data');
    }
  });

  // Fetch recent sales
  const { data: recentSalesData, isLoading: recentSalesLoading } = useQuery({
    queryKey: ['recentSales'],
    queryFn: () => saleAPI.getSales({ limit: 5, page: 1, sort: '-saleDate' }),
    onError: (error) => {
      console.error('Error fetching recent sales:', error);
    }
  });

  // Fetch expense summary
  const { data: expenseSummaryData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expenseSummary', timeRange],
    queryFn: () => expenseAPI.getExpenseSummary({ period: timeRange }),
    onError: (error) => {
      console.error('Error fetching expense summary:', error);
    }
  });

  // Fetch low stock products
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => productAPI.getLowStock(),
    onError: (error) => {
      console.error('Error fetching low stock:', error);
    }
  });

  // Debug: Check the data structure
  console.log('Dashboard stats response:', stats);
  console.log('Low stock data:', lowStockData);
  console.log('Recent sales data:', recentSalesData);
  console.log('Expense summary data:', expenseSummaryData);

  // Extract data with proper fallbacks
  const statsData = stats?.data?.data || stats?.data || {};
  const lowStockProducts = lowStockData?.data?.docs || lowStockData?.data || [];
  const recentSales = recentSalesData?.data?.docs || recentSalesData?.docs || recentSalesData?.data || [];
  const expenseSummary = expenseSummaryData?.data || { summary: [], total: 0 };

  // Prepare chart data
  const salesChartData = timeRange === 'week' 
    ? statsData.weeklySales || []
    : statsData.monthlySales || [];

  const topProductsData = statsData.topProducts || [];

  // Quick stats cards
  const quickStats = [
    {
      title: 'Today\'s Sales',
      value: formatCurrency(statsData.today?.sales || 0),
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      change: statsData.today?.salesGrowth || '0%',
      trend: statsData.today?.salesGrowth?.includes('-') ? 'down' : 'up'
    },
    {
      title: 'Today\'s Transactions',
      value: statsData.today?.transactions || 0,
      icon: ShoppingCartIcon,
      color: 'bg-blue-500',
      change: statsData.today?.transactionGrowth || '0%',
      trend: statsData.today?.transactionGrowth?.includes('-') ? 'down' : 'up'
    },
    {
      title: 'Today\'s Profit',
      value: formatCurrency(statsData.today?.profit || 0),
      icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500',
      change: statsData.today?.profitGrowth || '0%',
      trend: statsData.today?.profitGrowth?.includes('-') ? 'down' : 'up'
    },
    {
      title: 'Today\'s Expenses',
      value: formatCurrency(statsData.today?.expenses || 0),
      icon: ReceiptPercentIcon,
      color: 'bg-red-500',
      change: statsData.today?.expenseGrowth || '0%',
      trend: statsData.today?.expenseGrowth?.includes('-') ? 'down' : 'up'
    }
  ];

  // Inventory stats
  const inventoryStats = [
    {
      title: 'Total Products',
      value: statsData.totalProducts || 0,
      icon: CubeIcon,
      color: 'bg-indigo-500'
    },
    {
      title: 'Low Stock Items',
      value: statsData.lowStockCount || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-yellow-500'
    },
    {
      title: 'Out of Stock',
      value: statsData.outOfStock || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(statsData.inventoryValue || 0),
      icon: BanknotesIcon,
      color: 'bg-green-500'
    }
  ];

  // Color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (statsLoading || recentSalesLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {[
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: '30days', label: '30 Days' },
              { key: 'year', label: 'This Year' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-3 py-1 rounded-full text-sm ${
                  timeRange === key
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.trend === 'up' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">vs yesterday</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
              <p className="text-sm text-gray-500">{timeRange === 'week' ? 'Weekly' : 'Monthly'} performance</p>
            </div>
            <ChartBarIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="h-80">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="_id" 
                    stroke="#666" 
                    fontSize={12}
                    tickFormatter={(value) => {
                      // Format date for display
                      const [year, month, day] = value.split('-');
                      return `${day}/${month}`;
                    }}
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value).replace('$', '')}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'totalSales') {
                        return [formatCurrency(value), 'Sales'];
                      }
                      return [value, 'Transactions'];
                    }}
                    labelFormatter={(label) => {
                      const [year, month, day] = label.split('-');
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="totalSales" 
                    name="Sales Amount" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    name="Transactions" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <ChartBarIcon className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No sales data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </div>
            <CubeIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="h-80">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="productName" 
                    stroke="#666" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12}
                    yAxisId="left"
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    stroke="#666" 
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value).replace('$', '')}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'totalRevenue') {
                        return [formatCurrency(value), 'Revenue'];
                      }
                      return [`${value} units`, 'Quantity'];
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="totalQuantity" 
                    name="Quantity Sold" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="totalRevenue" 
                    name="Revenue" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <CubeIcon className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No product sales data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
            <CubeIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            {inventoryStats.map((stat) => (
              <div key={stat.title} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="space-y-4">
            {statsData.lowStockProducts?.length > 0 ? (
              statsData.lowStockProducts.slice(0, 5).map((product) => (
                <div key={product._id} className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{product.productName}</h4>
                      <p className="text-sm text-gray-500">{product.sizePackage} • {product.unit}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded">
                      {product.quantity} {product.unit}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Minimum:</span>
                      <span className="font-medium">{product.minStockLevel} {product.unit}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Stock value: {formatCurrency(product.quantity * (product.purchasePrice || 0))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-300" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">All good!</h4>
                <p className="mt-1 text-sm text-gray-500">No low stock items</p>
              </div>
            )}
            {statsData.lowStockProducts?.length > 5 && (
              <div className="text-center pt-4">
                <a 
                  href="/products" 
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  View all {statsData.lowStockProducts.length} items →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale._id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{sale.invoiceNumber || `SALE-${sale._id.slice(-6)}`}</h4>
                      <p className="text-sm text-gray-500">
                        {sale.customer?.name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(sale.grandTotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDate(sale.saleDate, 'time')}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sale.paymentMethod === 'cash' 
                        ? 'bg-green-100 text-green-800'
                        : sale.paymentMethod === 'card'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.paymentMethod || 'cash'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-300" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">No recent sales</h4>
                <p className="mt-1 text-sm text-gray-500">Sales will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
    {/* Expense Breakdown */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
      <p className="text-sm text-gray-500">Total: {formatCurrency(expenseSummary?.data?.total || 0)}</p>
    </div>
    <ReceiptPercentIcon className="h-6 w-6 text-gray-400" />
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="h-64">
      {expenseSummary?.data?.summary?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenseSummary.data.summary}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ _id, totalAmount }) => `${_id}: ${formatCurrency(totalAmount)}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="totalAmount"
              nameKey="_id"
            >
              {expenseSummary.data.summary.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Amount']}
              labelFormatter={(label) => label || 'Category'}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center">
          <ReceiptPercentIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No expense data available</p>
        </div>
      )}
    </div>
    <div className="space-y-4">
      {expenseSummary?.data?.summary?.length > 0 ? (
        expenseSummary.data.summary.map((item, index) => (
          <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-3" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div>
                <h4 className="font-medium text-gray-900 capitalize">{item._id || 'Uncategorized'}</h4>
                <p className="text-sm text-gray-500">{item.count || 0} transactions</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">{formatCurrency(item.totalAmount || 0)}</div>
              <div className="text-sm text-gray-500">
                {expenseSummary.data.total > 0 ? 
                  (((item.totalAmount || 0) / expenseSummary.data.total) * 100).toFixed(1) + '%' : 
                  '0%'}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No expense categories</p>
        </div>
      )}
    </div>
  </div>
</div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8" />
            <div className="ml-4">
              <p className="text-sm opacity-90">Total Customers</p>
              <p className="text-2xl font-bold">{statsData.totalCustomers || 0}</p>
            </div>
          </div>
        </div> */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8" />
            <div className="ml-4">
              <p className="text-sm opacity-90">Year to Date Sales</p>
              <p className="text-2xl font-bold">
                {formatCurrency(statsData.yearToDateSales?.totalSales || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8" />
            <div className="ml-4">
              <p className="text-sm opacity-90">Transactions</p>
              <p className="text-2xl font-bold">
                {statsData.yearToDateSales?.totalTransactions || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;