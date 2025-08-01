'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InventoryManagement from './InventoryManagement';
import OrderTracking from './OrderTracking';
import Locations from './Locations';
import WarehouseVisualization from './WarehouseVisualization';
import InvoiceManagement from './InvoiceManagement';
import { Product, Order } from '@/types/database';
import {
  CubeIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  HomeIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'inventory' | 'orders' | 'locations' | 'invoices' | 'settings';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: HomeIcon },
    { id: 'inventory' as TabType, name: 'Inventory', icon: CubeIcon },
    { id: 'orders' as TabType, name: 'Orders', icon: TruckIcon },
    { id: 'locations' as TabType, name: 'Locations', icon: BuildingStorefrontIcon },
    { id: 'invoices' as TabType, name: 'Invoices', icon: DocumentTextIcon },
    { id: 'settings' as TabType, name: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                TsvDistribution
              </h1>
              <p className="text-sm text-slate-400">Inventory Management System</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-slate-300" />
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

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-slate-800/30 backdrop-blur-xl min-h-screen p-6">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
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
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'locations' && <LocationsTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
    monthlyRevenue: [] as { month: string; revenue: number }[]
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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
        
        setProducts(productsData);
        setOrders(ordersData);
        
        // Calculate analytics
        calculateAnalytics(productsData, ordersData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (products: Product[], orders: Order[]) => {
    // Basic counts
    const totalProducts = products.length;
    const totalOrders = orders.length;
    
    // Low stock items (less than minimum stock level)
    const lowStockItems = products.filter(p => p.quantity < (p.minStockLevel || 10)).length;
    
    // Inventory value
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.cost), 0);
    
    // Revenue calculation from completed orders
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((sum, order) => {
      const orderTotal = order.items?.reduce((itemSum: number, item: any) => {
        return itemSum + (item.quantity * item.price);
      }, 0) || 0;
      return sum + orderTotal;
    }, 0);
    
    // Best sellers calculation
    const productSales: { [productId: string]: { name: string; sku: string; quantity: number; revenue: number } } = {};
    
    completedOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (!productSales[item.productId]) {
          const product = products.find(p => p._id?.toString() === item.productId);
          productSales[item.productId] = {
            name: product?.name || 'Unknown Product',
            sku: product?.sku || 'N/A',
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.quantity * item.price;
      });
    });
    
    const bestSellers = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        sku: item.sku,
        soldQuantity: item.quantity,
        revenue: item.revenue
      }));
    
    // Recent orders (last 5)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 5);
    
    // Orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    // Monthly revenue (last 6 months)
    const monthlyRevenue = getMonthlyRevenue(completedOrders);
    
    setAnalytics({
      totalProducts,
      totalOrders,
      totalRevenue,
      lowStockItems,
      bestSellers,
      recentOrders,
      ordersByStatus,
      inventoryValue,
      monthlyRevenue
    });
  };

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
        const orderRevenue = order.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) || 0;
        monthlyData[monthKey] += orderRevenue;
      }
    });
    
    return last6Months.map(month => ({
      month,
      revenue: monthlyData[month]
    }));
  };

  const formatCurrency = (amount: number) => `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
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
            {analytics.monthlyRevenue.map((month, index) => {
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

function InvoicesTab() {
  return <InvoiceManagement />;
}

function SettingsTab() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Settings
      </h2>
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
        <p className="text-slate-400 text-center">Settings will be implemented here</p>
      </div>
    </div>
  );
}
