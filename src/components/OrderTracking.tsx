'use client';

import React, { useState, useEffect } from 'react';
import { Order, TrackingUpdate, Product, OrderItem, Invoice } from '@/types/database';
import InvoiceManagement from './InvoiceManagement';
import InvoicePdfDoc from './invoices/InvoicePdfDoc';
import { PDFDownloadLink } from '@react-pdf/renderer';

const OrderTracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders');
  const [orderInvoice, setOrderInvoice] = useState<Invoice | null>(null);
  
  // New order form state
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerEmail: '',
    salesChannel: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
    shipping: 0,
    trackingNumber: '',
    carrier: '',
    includeVAT: false
  });

  // Fetch orders and products on component mount
  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const ordersData = await response.json();
      setOrders(ordersData);
    } catch (error) {
      setError('Error fetching orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create invoice for an order
  const createInvoiceForOrder = async (orderId: string) => {
    // Prevent rapid double clicks
    if (invoiceLoading) return;
    try {
      setInvoiceLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      });

      if (res.ok) {
        const data = await res.json();
        // API returns { message, invoiceId, invoice }
        setOrderInvoice(data.invoice as Invoice);
        return;
      }

      if (res.status === 409) {
        // Already exists - use server response if available
        try {
          const conflict = await res.json();
          if (conflict?.invoice) {
            setOrderInvoice(conflict.invoice as Invoice);
          } else if (conflict?.invoiceId) {
            const existing = await fetchInvoiceByOrderId(orderId);
            setOrderInvoice(existing);
          }
        } catch {}
        setError('Invoice already exists for this order.');
        return;
      }

      const text = await res.text();
      setError(text || 'Failed to create invoice.');
    } catch (e) {
      console.error('Create invoice error:', e);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchInvoiceByOrderId = async (orderId: string): Promise<Invoice | null> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return null;
      const all: Invoice[] = await response.json();
      const found = all.find(inv => (inv.orderId as any)?.toString?.() === orderId);
      return found || null;
    } catch (err) {
      console.error('Error fetching invoice by order ID:', err);
      setError('Could not fetch invoice. Please try again.');
      return null;
    }
  };

  // Extract channel note like "[Channel: eBay]" from notes
  const getChannelFromNotes = (notes?: string) => {
    if (!notes) return '';
    const match = notes.match(/\[Channel:\s*([^\]]+)\]/i);
    return match ? match[1] : '';
  };

  const fetchTrackingUpdates = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tracking?orderId=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracking updates');
      }

      const trackingData = await response.json();
      setTrackingUpdates(trackingData);
    } catch (error) {
      setError('Error fetching tracking updates');
      console.error('Error fetching tracking updates:', error);
    }
  };

  const refreshTracking = async (orderId: string, trackingNumber: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          trackingNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tracking');
      }

      // Refresh tracking updates after successful refresh
      await fetchTrackingUpdates(orderId);
    } catch (error) {
      setError('Error refreshing tracking');
      console.error('Error refreshing tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackingNumber?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          ...(trackingNumber && { trackingNumber })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }

      // Refresh orders after successful update
      await fetchOrders();
    } catch (error) {
      setError('Error updating order');
      console.error('Error updating order:', error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete order');
      }

      // Clear selected order if it was the deleted one
      if (selectedOrder?._id?.toString() === orderId) {
        setSelectedOrder(null);
        setTrackingUpdates([]);
      }

      // Refresh orders after successful deletion
      await fetchOrders();
    } catch (error) {
      setError('Error deleting order');
      console.error('Error deleting order:', error);
    }
  };

  const markAsComplete = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const productsData = await response.json();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItemToOrder = () => {
    if (!selectedProduct || itemQuantity <= 0) return;
    
    const product = products.find(p => p._id?.toString() === selectedProduct);
    if (!product) return;
    
    const newItem: OrderItem = {
      productId: product._id!,
      productName: product.name,
      sku: product.sku,
      quantity: itemQuantity,
      price: product.price,
      total: product.price * itemQuantity
    };
    
    setOrderItems(prev => [...prev, newItem]);
    setSelectedProduct('');
    setItemQuantity(1);
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const shipping = parseFloat(newOrder.shipping.toString()) || 0;
    const tax = newOrder.includeVAT ? subtotal * 0.20 : 0; // 20% VAT if enabled
    return {
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping
    };
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!newOrder.salesChannel) {
        setError('Please select a sales channel (eBay, Vinted, or Facebook Marketplace)');
        setLoading(false);
        return;
      }

      if (orderItems.length === 0) {
        setError('Please add at least one item to the order');
        setLoading(false);
        return;
      }
      
      const { subtotal, tax, shipping, total } = calculateOrderTotal();
      
      const channelNote = newOrder.salesChannel ? `[Channel: ${
        newOrder.salesChannel === 'facebook' ? 'Facebook Marketplace' : newOrder.salesChannel.charAt(0).toUpperCase() + newOrder.salesChannel.slice(1)
      }]` : '';

      const orderData = {
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerAddress: {
          street: newOrder.street,
          city: newOrder.city,
          state: newOrder.state,
          zipCode: newOrder.zipCode,
          country: newOrder.country,
        },
        items: orderItems,
        status: 'pending' as const,
        subtotal,
        tax,
        shipping,
        total,
        includeVAT: newOrder.includeVAT,
        // Prepend channel to notes to avoid backend changes
        notes: [channelNote, newOrder.notes].filter(Boolean).join(' ').trim(),
        trackingNumber: newOrder.trackingNumber || undefined,
        carrier: newOrder.carrier || undefined,
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      const createdOrder = await response.json();
      // Removed auto-invoice creation. Invoices are now created only when the user clicks "Create Invoice".
      
      // If tracking number was provided, create tracking via SHIP24
      if (newOrder.trackingNumber && newOrder.carrier) {
        try {
          await fetch('/api/tracking', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: createdOrder._id || createdOrder.id,
              trackingNumber: newOrder.trackingNumber,
              carrier: newOrder.carrier
            }),
          });
        } catch (trackingError) {
          console.warn('Failed to create tracking:', trackingError);
          // Don't fail the order creation if tracking setup fails
        }
      }
      
      // Reset form and close modal
      setNewOrder({
        customerName: '',
        customerEmail: '',
        salesChannel: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        notes: '',
        shipping: 0,
        trackingNumber: '',
        carrier: '',
        includeVAT: false
      });
      setOrderItems([]);
      setShowCreateOrder(false);

      // Refresh orders list
      await fetchOrders();
      // Optionally switch to invoices tab so user can download immediately
      setActiveTab('invoices');
      
    } catch (error) {
      setError('Error creating order: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Header + Tabs */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Orders & Invoices
              </h1>
              {activeTab === 'orders' && (
                <button
                  onClick={() => setShowCreateOrder(true)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
                >
                  Create New Order
                </button>
              )}
            </div>
            <div className="inline-flex bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden w-fit">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 text-sm ${activeTab === 'orders' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700/40'}`}
              >Orders</button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 text-sm ${activeTab === 'invoices' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700/40'}`}
              >Invoices</button>
            </div>
          </div>

      {activeTab === 'orders' ? (
        <>
          {/* Search and Filter Controls */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order number, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <InvoiceManagement orderIdFilter={selectedOrder?._id?.toString()} />
        </div>
      )}

      {activeTab === 'orders' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-medium text-white">Orders ({filteredOrders.length})</h2>
            </div>
            
            {loading && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            )}

            <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
              {filteredOrders.map((order) => (
                <div
                  key={order._id?.toString()}
                  className={`p-6 cursor-pointer hover:bg-slate-700/30 transition-colors ${
                    selectedOrder?._id?.toString() === order._id?.toString() ? 'bg-slate-700/50 border-l-4 border-cyan-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedOrder(order);
                    if (order._id) {
                      fetchTrackingUpdates(order._id.toString());
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-white">#{order.orderNumber}</h3>
                      <p className="text-sm text-slate-300">{order.customerName}</p>
                      <p className="text-sm text-slate-300">{order.customerEmail}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {getChannelFromNotes(order.notes) && (
                        <div className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-200 inline-block">
                          {getChannelFromNotes(order.notes)}
                        </div>
                      )}
                      <p className="text-sm text-slate-300 mt-1">£{order.total.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>{formatDate(order.createdAt)}</span>
                    {order.trackingNumber && (
                      <span className="bg-slate-700/50 px-2 py-1 rounded text-xs text-slate-300">
                        Tracking: {order.trackingNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Details and Tracking */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-medium text-white">Order Details</h2>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Customer Information</h3>
                  {getChannelFromNotes(selectedOrder.notes) && (
                    <p className="mb-2 text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-slate-200">
                      Channel: <span className="font-medium">{getChannelFromNotes(selectedOrder.notes)}</span>
                    </p>
                  )}
                  <p className="text-sm text-white">{selectedOrder.customerName}</p>
                  <p className="text-sm text-slate-300">{selectedOrder.customerEmail}</p>
                  <div className="text-sm text-slate-300">
                    <p>{selectedOrder.customerAddress.street}</p>
                    <p>{selectedOrder.customerAddress.city}, {selectedOrder.customerAddress.state} {selectedOrder.customerAddress.zipCode}</p>
                    <p>{selectedOrder.customerAddress.country}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div>
                          <p className="text-white">{item.productName}</p>
                          <p className="text-slate-300">{item.sku} × {item.quantity}</p>
                        </div>
                        <p className="text-white">£{item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice Actions */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Invoice</h3>
                  <div className="flex items-center gap-2">
                    {!orderInvoice && (
                      <button
                        onClick={() => selectedOrder?._id && createInvoiceForOrder(selectedOrder._id.toString())}
                        disabled={invoiceLoading}
                        className={`px-3 py-2 text-sm rounded text-white ${invoiceLoading ? 'bg-slate-700/30 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'}`}
                      >
                        {invoiceLoading ? 'Creating…' : 'Create Invoice'}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!selectedOrder?._id) return;
                        setInvoiceLoading(true);
                        const inv = await fetchInvoiceByOrderId(selectedOrder._id.toString());
                        setOrderInvoice(inv);
                        if (!inv) setError('No invoice found yet for this order');
                        setInvoiceLoading(false);
                      }}
                      disabled={invoiceLoading}
                      className={`px-3 py-2 text-sm rounded text-white ${invoiceLoading ? 'bg-slate-700/30 cursor-not-allowed' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}
                    >
                      {invoiceLoading ? 'Refreshing…' : 'Refresh Invoice'}
                    </button>
                    {orderInvoice && (
                      <PDFDownloadLink
                        document={<InvoicePdfDoc invoice={orderInvoice} />}
                        fileName={`Invoice_${orderInvoice.invoiceNumber}.pdf`}
                      >
                        {({ loading }: { loading: boolean }) => (
                          <span className="px-3 py-2 text-sm rounded bg-gradient-to-r from-cyan-600 to-blue-600 text-white">{loading ? 'Preparing…' : 'Download PDF'}</span>
                        )}
                      </PDFDownloadLink>
                    )}
                  </div>
                </div>

                {/* Status Update Controls */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Update Status</h3>
                  <div className="space-y-2">
                    {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder._id!.toString(), status)}
                        disabled={selectedOrder.status === status}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                          selectedOrder.status === status
                            ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
                        }`}
                      >
                        Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Quick Actions</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => markAsComplete(selectedOrder._id!.toString())}
                      disabled={selectedOrder.status === 'delivered'}
                      className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                        selectedOrder.status === 'delivered'
                          ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                      }`}
                    >
                      ✓ Complete
                    </button>
                    <button
                      onClick={() => deleteOrder(selectedOrder._id!.toString())}
                      className="flex-1 px-3 py-2 text-sm rounded transition-colors bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* Tracking Updates */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-slate-300">Tracking Updates</h3>
                    {selectedOrder.trackingNumber && (
                      <button
                        onClick={() => refreshTracking(selectedOrder._id!.toString(), selectedOrder.trackingNumber!)}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  
                  {trackingUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {trackingUpdates.map((update, index) => (
                        <div key={index} className="border-l-2 border-cyan-500/50 pl-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-white">{update.status}</p>
                              <p className="text-xs text-slate-300">{update.location}</p>
                              <p className="text-xs text-slate-400">{update.description}</p>
                            </div>
                            <span className="text-xs text-slate-400">
                              {formatDate(update.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No tracking updates available</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
              <div className="p-6 text-center">
                <p className="text-slate-400">Select an order to view details and tracking information</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Create New Order</h2>
              <button
                onClick={() => setShowCreateOrder(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg backdrop-blur">
                  {error}
                </div>
              )}
              <p className="mb-4 text-sm text-slate-400">Only <span className="text-slate-200 font-medium">Sales Channel</span> and <span className="text-slate-200 font-medium">Items</span> are required. Customer and address fields are optional.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Sales Channel</label>
                    <select
                      name="salesChannel"
                      value={newOrder.salesChannel}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select channel</option>
                      <option value="ebay">eBay</option>
                      <option value="vinted">Vinted</option>
                      <option value="facebook">Facebook Marketplace</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                      <input
                        type="text"
                        name="customerName"
                        value={newOrder.customerName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={newOrder.customerEmail}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mt-6 mb-4">Shipping Address</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Street</label>
                      <input
                        type="text"
                        name="street"
                        value={newOrder.street}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">City</label>
                        <input
                          type="text"
                          name="city"
                          value={newOrder.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">State/Province</label>
                        <input
                          type="text"
                          name="state"
                          value={newOrder.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Postal Code</label>
                        <input
                          type="text"
                          name="zipCode"
                          value={newOrder.zipCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Country</label>
                        <input
                          type="text"
                          name="country"
                          value={newOrder.country}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={newOrder.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mt-6 mb-4">Shipping & Tracking (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Carrier</label>
                      <select
                        name="carrier"
                        value={newOrder.carrier}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select a carrier</option>
                        <option value="ups">UPS</option>
                        <option value="fedex">FedEx</option>
                        <option value="dhl">DHL</option>
                        <option value="royal-mail">Royal Mail</option>
                        <option value="dpd">DPD</option>
                        <option value="evri">Evri</option>
                        <option value="yodel">Yodel</option>
                        <option value="amazon">Amazon Logistics</option>
                        <option value="tnt">TNT</option>
                        <option value="gls">GLS</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Tracking Number</label>
                      <input
                        type="text"
                        name="trackingNumber"
                        value={newOrder.trackingNumber}
                        onChange={handleInputChange}
                        placeholder="Enter tracking number if available"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Adding a tracking number will enable real-time package tracking via SHIP24
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
                  
                  <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product._id?.toString()} value={product._id?.toString()}>
                            {product.name} - {product.sku} (£{product.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={addItemToOrder}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  {/* Order Items List */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Items in Order</h4>
                    {orderItems.length > 0 ? (
                      <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800/30">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-slate-700/50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Qty</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Price</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Total</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-300 uppercase tracking-wider"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600">
                            {orderItems.map((item, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-white">
                                  <div>{item.productName}</div>
                                  <div className="text-xs text-slate-400">{item.sku}</div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-white text-right">{item.quantity}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-white text-right">£{item.price.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-white text-right">£{item.total.toFixed(2)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => removeItemFromOrder(index)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No items added yet</p>
                    )}
                  </div>
                  
                  {/* Order Summary */}
                  {orderItems.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Order Summary</h4>
                      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-300">Subtotal:</span>
                          <span className="text-sm font-medium text-white">£{calculateOrderTotal().subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="includeVAT"
                              checked={newOrder.includeVAT}
                              onChange={(e) => setNewOrder(prev => ({ ...prev, includeVAT: e.target.checked }))}
                              className="mr-2 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                            />
                            <span className="text-sm text-slate-300">VAT (20%):</span>
                          </div>
                          <span className="text-sm font-medium text-white">£{newOrder.includeVAT ? calculateOrderTotal().tax.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-sm text-slate-300 mr-2">Shipping:</span>
                            <input
                              type="number"
                              name="shipping"
                              value={newOrder.shipping}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              className="w-20 px-2 py-1 text-sm bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <span className="text-sm font-medium text-white">£{parseFloat(newOrder.shipping.toString() || '0').toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-600 mt-2 pt-2 flex justify-between">
                          <span className="text-base font-medium text-white">Total:</span>
                          <span className="text-base font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">£{calculateOrderTotal().total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateOrder(false)}
                  className="px-6 py-3 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={loading || orderItems.length === 0}
                  className={`px-6 py-3 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${loading || orderItems.length === 0 ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg'}`}
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
