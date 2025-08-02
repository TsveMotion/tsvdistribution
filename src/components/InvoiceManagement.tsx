'use client';

import React, { useState, useEffect } from 'react';
import { Product, Invoice as DbInvoice, InvoiceItem } from '@/types/database';
import InvoiceViewer from './InvoiceViewer';

interface LocalInvoice {
  _id?: string;
  invoiceNumber: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Using InvoiceItem from @/types/database

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<LocalInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<LocalInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<LocalInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceData, setInvoiceData] = useState<LocalInvoice>({
    _id: '',
    invoiceNumber: '',
    orderId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    items: [],
    subtotal: 0,
    vatAmount: 0,
    vatRate: 20,
    total: 0,
    status: 'draft',
    issueDate: '',
    dueDate: '',
    notes: '',
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      
      // Debug: Log the actual data structure
      console.log('Invoice data from API:', data);
      if (data.length > 0) {
        console.log('First invoice items:', data[0].items);
      }
      
      // If no real data, create a test invoice with correct structure
      if (!data || data.length === 0) {
        const testInvoice: LocalInvoice = {
          _id: 'test-1',
          invoiceNumber: 'INV-2025-TEST',
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerAddress: '123 Test Street, Test City',
          items: [{
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 1,
            price: 7.00,
            total: 7.00
          }],
          subtotal: 7.00,
          vatAmount: 1.40,
          vatRate: 20,
          total: 8.40,
          status: 'draft',
          issueDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Test invoice with correct data structure'
        };
        console.log('Created test invoice data:', testInvoice);
        setInvoices([testInvoice]);
      } else {
        setInvoices(data);
      }
    } catch (error) {
      setError('Failed to fetch invoices');
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const productData: Product[] = await response.json();
        setProducts(productData);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const calculateTotals = (items: InvoiceItem[], vatRate: number) => {
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      productName: '',
      sku: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceData((prev: LocalInvoice) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      
      // Recalculate total for this item
      if (field === 'quantity' || field === 'price') {
        const quantity = field === 'quantity' ? Number(value) : items[index].quantity;
        const price = field === 'price' ? Number(value) : items[index].price;
        items[index].total = quantity * price;
      }
      
      // Recalculate invoice totals
      const { subtotal, vatAmount, total } = calculateTotals(items, prev.vatRate || 20);
      
      return {
        ...prev,
        items,
        subtotal,
        vatAmount,
        total
      };
    });
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceData(prev => {
      const items = (prev.items || []).filter((_, i) => i !== index);
      const { subtotal, vatAmount, total } = calculateTotals(items, prev.vatRate || 20);
      
      return {
        ...prev,
        items,
        subtotal,
        vatAmount,
        total
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceData.customerName || !invoiceData.items?.length) {
      setError('Please fill in all required fields and add at least one item');
      return;
    }

    try {
      setLoading(true);
      
      const invoiceDataCopy = { ...invoiceData };
      invoiceDataCopy.invoiceNumber = invoiceDataCopy.invoiceNumber || generateInvoiceNumber();
      invoiceDataCopy.createdAt = new Date().toISOString();
      invoiceDataCopy.updatedAt = new Date().toISOString();

      // For now, just add to local state (replace with API call later)
      if (selectedInvoice) {
        setInvoices(prev => prev.map(inv => 
          inv._id === selectedInvoice._id ? { ...invoiceDataCopy, _id: selectedInvoice._id } as LocalInvoice : inv
        ));
      } else {
        const newInvoice = { ...invoiceDataCopy, _id: Date.now().toString() } as LocalInvoice;
        setInvoices(prev => [...prev, newInvoice]);
      }

      setShowCreateModal(false);
      setSelectedInvoice(null);
      resetForm();
      setError(null);
    } catch (error) {
      setError('Error saving invoice: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice: LocalInvoice) => {
    setSelectedInvoice(invoice);
    setInvoiceData(invoice);
    setShowCreateModal(true);
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    setInvoices(prev => prev.filter(inv => inv._id !== invoiceId));
  };

  const resetForm = () => {
    setInvoiceData({
      _id: '',
      invoiceNumber: '',
      orderId: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      items: [],
      subtotal: 0,
      vatAmount: 0,
      vatRate: 20,
      total: 0,
      status: 'draft',
      issueDate: '',
      dueDate: '',
      notes: '',
      createdAt: '',
      updatedAt: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Invoice Management
          </h2>
          <p className="text-slate-400 mt-2">Create and manage customer invoices</p>
        </div>
        <button
          onClick={() => {
            setSelectedInvoice(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          + Create Invoice
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left p-4 text-slate-300 font-semibold">Invoice #</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Customer</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Amount</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Issue Date</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Due Date</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 text-white font-mono">{invoice.invoiceNumber}</td>
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{invoice.customerName}</p>
                        <p className="text-slate-400 text-sm">{invoice.customerEmail}</p>
                      </div>
                    </td>
                    <td className="p-4 text-white">£{invoice.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-300">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowViewModal(true);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="View"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(invoice._id!)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {selectedInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber || ''}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={invoiceData.status}
                    onChange={(e) => setInvoiceData((prev: LocalInvoice) => ({ ...prev, status: e.target.value as LocalInvoice['status'] }))}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={invoiceData.customerName || ''}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Customer Email</label>
                    <input
                      type="email"
                      value={invoiceData.customerEmail || ''}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Address</label>
                  <textarea
                    value={invoiceData.customerAddress || ''}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-white">Invoice Items</h4>
                  <button
                    type="button"
                    onClick={addInvoiceItem}
                    className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                
                {invoiceData.items.map((item: InvoiceItem, index: number) => (
                  <div key={index} className="bg-slate-700/30 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Product</label>
                        <select
                          value={item.productName}
                          onChange={(e) => {
                            const selectedProduct = products.find(p => p._id?.toString() === e.target.value);
                            if (selectedProduct) {
                              updateInvoiceItem(index, 'productName', selectedProduct.name);
                              updateInvoiceItem(index, 'sku', selectedProduct.sku);
                              updateInvoiceItem(index, 'price', selectedProduct.price || 0);
                            }
                          }}
                          className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">Select product...</option>
                          {products.map(product => (
                            <option key={product._id?.toString()} value={product._id?.toString()}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Unit Price (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateInvoiceItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Total</label>
                        <input
                          type="text"
                          value={`£${item.total.toFixed(2)}`}
                          readOnly
                          className="w-full bg-slate-600/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-300"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removeInvoiceItem(index)}
                          className="bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {invoiceData.items && invoiceData.items.length > 0 && (
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal:</span>
                      <span>£{(invoiceData.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>VAT ({invoiceData.vatRate}%):</span>
                      <span>£{(invoiceData.vatAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-white border-t border-slate-600 pt-2">
                      <span>Total:</span>
                      <span>£{(invoiceData.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedInvoice(null);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : selectedInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {showViewModal && selectedInvoice && (
        <InvoiceViewer
          invoice={selectedInvoice}
          onClose={() => {
            setShowViewModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default InvoiceManagement;
