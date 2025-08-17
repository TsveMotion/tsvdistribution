'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import InventoryManagement from './InventoryManagement';
import OrderTracking from './OrderTracking';
import WarehouseVisualization from './WarehouseVisualization';
import UserManagement from './UserManagement';
import Settings from './Settings';
import { Product, Order } from '@/types/database';
import {
  CubeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'inventory' | 'orders' | 'locations' | 'users' | 'settings';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  // Mobile sidebar toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: HomeIcon },
    { id: 'inventory' as TabType, name: 'Inventory', icon: CubeIcon },
    { id: 'orders' as TabType, name: 'Orders', icon: ClipboardDocumentListIcon },
    { id: 'locations' as TabType, name: 'Locations', icon: BuildingStorefrontIcon },
    // Only show Users tab to the specific admin user
    ...(user?.email === 'kristiyan@tsvstock.com' ? [{ id: 'users' as TabType, name: 'Users', icon: UsersIcon }] : []),
    { id: 'settings' as TabType, name: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-700/40 text-slate-200"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CubeIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                TsvStock
              </h1>
              <p className="hidden sm:block text-xs md:text-sm text-slate-400">Inventory Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs md:text-sm font-medium text-white">{user?.name}</p>
              <p className="text-[10px] md:text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-slate-300" />
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Sign Out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <nav className="hidden md:block w-64 bg-slate-800/30 backdrop-blur-xl min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] p-4 md:p-6">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
            <div className="pt-2">
              <button
                onClick={() => router.push('/scan')}
                className="w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 text-slate-200 hover:text-white hover:bg-slate-700/30 border border-transparent hover:border-cyan-500/30"
              >
                <QrCodeIcon className="h-5 w-5 text-cyan-400" />
                <span className="font-medium">Scan</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Slide-over Sidebar */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80%] h-full bg-slate-900 border-r border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <CubeIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-semibold">TsvStock</span>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-slate-700/40"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    router.push('/scan');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-700/30"
                >
                  <QrCodeIcon className="h-5 w-5 text-cyan-400" />
                  <span className="font-medium">Scan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden w-full">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'locations' && <LocationsTab />}
          {/* Invoices tab removed; invoices are now managed inside Orders */}
          {activeTab === 'users' && user?.email === 'kristiyan@tsvstock.com' && <UsersTab />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-700/60 bg-slate-900/80 backdrop-blur">
        <div className="grid grid-cols-6">
          <button
            onClick={() => router.push('/scan')}
            className="flex flex-col items-center justify-center py-3 text-xs text-slate-300"
          >
            <QrCodeIcon className="h-5 w-5 mb-1 text-cyan-400" />
            Scan
          </button>
          {tabs.slice(0,5).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-3 text-xs ${active ? 'text-cyan-400' : 'text-slate-300'}`}
              >
                <Icon className={`h-5 w-5 mb-1 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    bestSellers: [] as { name: string; sku: string; soldQuantity: number; revenue: number }[],
    recentOrders: [] as Order[],
    ordersByStatus: {} as { [key: string]: number },
    inventoryValue: 0,
    monthlyRevenue: [] as { month: string; revenue: number }[],
    lowStockList: [] as { name: string; sku: string; quantity: number; minStockLevel: number }[]
  });

  const calculateAnalytics = useCallback((products: Product[], orders: Order[]) => {
    // Basic counts
    const totalProducts = products.length;
    const totalOrders = orders.length;
    
    // Low stock items (less than minimum stock level)
    const lowStock = products
      .filter(p => p.quantity < (p.minStockLevel || 10))
      .map(p => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        minStockLevel: p.minStockLevel || 10,
      }))
      .sort((a, b) => (a.quantity - a.minStockLevel) - (b.quantity - b.minStockLevel))
      .slice(0, 5);
    const lowStockItems = lowStock.length;
    
    // Revenue calculation
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Best sellers (products with highest sales)
    const productSales = new Map<string, { name: string; sku: string; soldQuantity: number; revenue: number }>();
    
    orders.forEach(order => {
      if (order.status !== 'cancelled' && order.items) {
        order.items.forEach(item => {
          const existing = productSales.get(item.sku) || { name: item.productName, sku: item.sku, soldQuantity: 0, revenue: 0 };
          existing.soldQuantity += item.quantity;
          existing.revenue += item.quantity * item.price;
          productSales.set(item.sku, existing);
        });
      }
    });
    
    const bestSellers = Array.from(productSales.values())
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);
    
    // Orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    // Recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    
    // Inventory value
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    
    // Monthly revenue (last 12 months)
    const monthlyRevenue = getMonthlyRevenue(orders);
    
    setAnalytics({
      totalProducts,
      totalOrders,
      totalRevenue,
      lowStockItems,
      bestSellers,
      recentOrders,
      ordersByStatus,
      inventoryValue,
      monthlyRevenue,
      lowStockList: lowStock
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch products and orders
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (productsRes.ok && ordersRes.ok) {
        const productsData = await productsRes.json();
        const ordersData = await ordersRes.json();
        
        setOrders(ordersData);
        
        // Calculate analytics
        calculateAnalytics(productsData, ordersData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateAnalytics]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);



  const getMonthlyRevenue = (orders: Order[]) => {
    const monthlyData: { [key: string]: number } = {};
    const last6Months = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      last6Months.push(monthKey);
      monthlyData[monthKey] = 0;
    }
    
    // Calculate revenue for each month
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt || '');
      const monthKey = orderDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyData.hasOwnProperty(monthKey)) {
        const orderRevenue = order.items?.reduce((sum: number, item) => sum + (item.quantity * item.price), 0) || 0;
        monthlyData[monthKey] += orderRevenue;
      }
    });
    
    return last6Months.map(month => ({
      month,
      revenue: monthlyData[month]
    }));
  };

  const formatCurrency = (amount: number) => `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'shipped': return 'bg-purple-500/20 text-purple-400';
      case 'delivered': case 'completed': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Dashboard Overview
      </h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-white">{analytics.totalProducts.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Active inventory items</p>
            </div>
            <CubeIcon className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">{analytics.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">All time orders</p>
            </div>
            <ClipboardDocumentListIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(analytics.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">From completed orders</p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Low Stock Alert</p>
              <p className="text-2xl font-bold text-white">{analytics.lowStockItems}</p>
              <p className="text-xs text-slate-500 mt-1">Items need restocking</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Inventory Value</h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(analytics.inventoryValue)}</p>
              <p className="text-xs text-slate-400">Total stock value</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Order Status Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-slate-300 capitalize">{status}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock List */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Critical Low Stock</h3>
            <span className="text-xs text-slate-400">Top 5 by deficit</span>
          </div>
          {analytics.lowStockList.length === 0 ? (
            <p className="text-slate-400 text-center py-6">All good — no low stock items.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.lowStockList.map(item => {
                const deficit = Math.max(0, item.minStockLevel - item.quantity);
                return (
                  <div key={item.sku} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.sku}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">- {deficit}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      Qty: <span className="text-white font-semibold">{item.quantity}</span> · Min: <span className="text-white font-semibold">{item.minStockLevel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Best Selling Products */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🏆 Best Selling Products</h3>
          {analytics.bestSellers.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No sales data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.bestSellers.map((product, index) => (
                <div key={product.sku} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">#{index + 1}</span>
                    <span className="text-xs text-slate-400">{product.sku}</span>
                  </div>
                  <h4 className="text-white font-medium mb-1">{product.name}</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-cyan-400">{product.soldQuantity} sold</span>
                    <span className="text-green-400">{formatCurrency(product.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Monthly Revenue Chart */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">📈 Monthly Revenue</h3>
          <div className="space-y-3">
            {analytics.monthlyRevenue.map((month) => {
              const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue));
              const widthPercentage = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={month.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{month.month}</span>
                    <span className="text-cyan-400">{formatCurrency(month.revenue)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${widthPercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Recent Orders */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🕒 Recent Orders</h3>
          {analytics.recentOrders.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentOrders.map((order) => (
                <div key={order._id?.toString()} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium text-sm">#{order.orderNumber}</p>
                    <p className="text-slate-400 text-xs">{order.customerName}</p>
                    <p className="text-slate-500 text-xs">{order.createdAt ? formatDate(order.createdAt) : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <p className="text-cyan-400 text-xs mt-1">
                      {formatCurrency(order.total || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryTab() {
  return (
    <div>
      <InventoryManagement />
    </div>
  );
}

function OrdersTab() {
  return (
    <div>
      <OrderTracking />
    </div>
  );
}

function LocationsTab() {
  return <WarehouseVisualization />;
}

// InvoicesTab removed

function UsersTab() {
  return <UserManagement />;
}


