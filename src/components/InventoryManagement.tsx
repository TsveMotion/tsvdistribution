'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types/database';
import { generateBarcodeForSKU } from '@/lib/barcode';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  PrinterIcon,
  PhotoIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface InventoryManagementProps {
  className?: string;
}

export default function InventoryManagement({ className = '' }: InventoryManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  // Get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter and search products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = [...new Set(products.map(product => product.category))];

  // Handle delete product
  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      await fetchProducts(); // Refresh the list
      setShowDeleteModal(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleDetailClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleBulkBarcodeGeneration = async () => {
    if (selectedProductIds.length === 0) return;
    
    try {
      const response = await fetch('/api/products/barcode-print', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productIds: selectedProductIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate barcodes');
      }
      
      const html = await response.text();
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
        setTimeout(() => newWindow.print(), 500);
      }
    } catch (err) {
      setError('Failed to generate barcode print sheet');
    }
  };

  const getStockLevelStatus = (quantity: number, minStockLevel: number) => {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= minStockLevel) return 'low-stock';
    return 'in-stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'text-red-400 bg-red-900/20';
      case 'low-stock': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-green-400 bg-green-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'Out of Stock';
      case 'low-stock': return 'Low Stock';
      default: return 'In Stock';
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
          <button
            onClick={fetchProducts}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Inventory Management
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Product</span>
        </button>
        {selectedProductIds.length > 0 && (
          <button
            onClick={() => handleBulkBarcodeGeneration()}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl font-medium transition-all duration-200"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Print Barcodes ({selectedProductIds.length})</span>
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-10 pr-8 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {products.length === 0 ? 'No products found. Add your first product to get started.' : 'No products match your search criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(filteredProducts.map(p => p._id!.toString()));
                        } else {
                          setSelectedProductIds([]);
                        }
                      }}
                      className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-700"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Price (£)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Weight (KG)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredProducts.map((product) => {
                  const status = getStockLevelStatus(product.quantity, product.minStockLevel);
                  const productId = product._id?.toString() || '';
                  return (
                    <tr key={productId} className="hover:bg-slate-700/25 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(productId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, productId]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
                            }
                          }}
                          className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-700"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{product.name}</div>
                          <div className="text-slate-400 text-sm">{product.description}</div>
                          {product.barcode && (
                            <div className="text-slate-500 text-xs font-mono mt-1">Barcode: {product.barcode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">{product.sku}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-sm">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{product.quantity}</div>
                        <div className="text-slate-400 text-sm">Min: {product.minStockLevel}</div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">£{product.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-300">{product.weight ? `${product.weight} kg` : 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleDetailClick(product)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <ProductModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
          product={selectedProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedProduct(null);
          }}
          onConfirm={() => handleDeleteProduct(selectedProduct._id!.toString())}
          productName={selectedProduct.name}
        />
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}
    </div>
  );
}

// Product Modal Component
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
}

function ProductModal({ isOpen, onClose, onSuccess, product }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    category: product?.category || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    quantity: product?.quantity || 0,
    minStockLevel: product?.minStockLevel || 5,
    supplier: product?.supplier || '',
    supplierLink: product?.supplierLink || '',
    barcode: product?.barcode || '',
    weight: product?.weight || 0,
    dimensions: {
      length: product?.dimensions?.length || 0,
      width: product?.dimensions?.width || 0,
      height: product?.dimensions?.height || 0,
    },
    aiGeneratedDescription: product?.aiGeneratedDescription || '',
    aiGeneratedTitle: product?.aiGeneratedTitle || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);

  // Auto-generate barcode when SKU is entered (for new products)
  useEffect(() => {
    if (!product && formData.sku && !formData.barcode && !barcodeGenerated) {
      const generatedBarcode = generateBarcodeForSKU(formData.sku);
      setFormData(prev => ({ ...prev, barcode: generatedBarcode }));
      setBarcodeGenerated(true);
    }
  }, [formData.sku, formData.barcode, product, barcodeGenerated]);

  // Generate AI content
  const handleGenerateAIContent = async (type: 'title' | 'description' | 'both') => {
    setAiLoading(true);
    try {
      const productInfo = {
        name: formData.name,
        category: formData.category,
        sku: formData.sku,
        supplier: formData.supplier,
        weight: formData.weight,
        dimensions: formData.dimensions,
        price: formData.price
      };

      const response = await fetch('/api/products/ai-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
        },
        body: JSON.stringify({ productInfo, type }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI content');
      }

      const result = await response.json();
      
      setFormData(prev => ({
        ...prev,
        ...(result.title && { aiGeneratedTitle: result.title }),
        ...(result.description && { aiGeneratedDescription: result.description })
      }));
    } catch (err) {
      setError('Failed to generate AI content. Check your OpenAI API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = product ? `/api/products/${product._id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Link (Optional)</label>
              <input
                type="url"
                value={formData.supplierLink}
                onChange={(e) => setFormData({ ...formData, supplierLink: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="https://supplier-website.com/product"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Weight (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Min Stock Level</label>
                <input
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Barcode {!product && '(Auto-generated)'}</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  readOnly={!product && barcodeGenerated}
                />
                {!product && (
                  <button
                    type="button"
                    onClick={() => {
                      const newBarcode = generateBarcodeForSKU(formData.sku || Date.now().toString());
                      setFormData({ ...formData, barcode: newBarcode });
                      setBarcodeGenerated(true);
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dimensions (L × W × H cm)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Length (cm)"
                  value={formData.dimensions.length}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, length: parseFloat(e.target.value) || 0 }
                  })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Width (cm)"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) || 0 }
                  })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Height (cm)"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dimensions: { ...formData.dimensions, height: parseFloat(e.target.value) || 0 }
                  })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* AI Content Generation Section */}
            <div className="border-t border-slate-600 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                  <span>AI Content Generation</span>
                </h4>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateAIContent('title')}
                    disabled={aiLoading || !formData.name || !formData.category}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-lg text-white text-sm transition-colors"
                  >
                    {aiLoading ? 'Generating...' : 'Title'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAIContent('description')}
                    disabled={aiLoading || !formData.name || !formData.category}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-lg text-white text-sm transition-colors"
                  >
                    {aiLoading ? 'Generating...' : 'Description'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateAIContent('both')}
                    disabled={aiLoading || !formData.name || !formData.category}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-lg text-white text-sm transition-colors"
                  >
                    {aiLoading ? 'Generating...' : 'Both'}
                  </button>
                </div>
              </div>

              {formData.aiGeneratedTitle && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">AI Generated Title</label>
                  <div className="flex space-x-2">
                    <textarea
                      value={formData.aiGeneratedTitle}
                      onChange={(e) => setFormData({ ...formData, aiGeneratedTitle: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={2}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formData.aiGeneratedTitle)}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {formData.aiGeneratedDescription && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">AI Generated Description</label>
                  <div className="flex space-x-2">
                    <textarea
                      value={formData.aiGeneratedDescription}
                      onChange={(e) => setFormData({ ...formData, aiGeneratedDescription: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formData.aiGeneratedDescription)}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Product Detail Modal
interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

function ProductDetailModal({ isOpen, onClose, product }: ProductDetailModalProps) {
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = async (files: FileList) => {
    setUploadingPhotos(true);
    setPhotoError(null);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('photos', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${product._id}/photos`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload photos');
      }

      // Refresh the page to show new photos
      window.location.reload();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleBulkPhotoDownload = async () => {
    if (!product.images || product.images.length === 0) return;

    try {
      // Dynamic import for client-side only
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folder = zip.folder(`${product.name}-photos`);

      for (const imagePath of product.images) {
        try {
          const response = await fetch(imagePath);
          const blob = await response.blob();
          const fileName = imagePath.split('/').pop() || 'image.jpg';
          folder?.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading image ${imagePath}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.name}-photos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating photo archive:', error);
      alert('Error downloading photos. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-slate-400">{product.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Product Info */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Product Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">SKU:</span>
                    <p className="text-white font-mono">{product.sku}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Category:</span>
                    <p className="text-white">{product.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Price:</span>
                    <p className="text-white font-semibold">£{product.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost:</span>
                    <p className="text-white">£{product.cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Stock:</span>
                    <p className="text-white">{product.quantity} units</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Min Stock:</span>
                    <p className="text-white">{product.minStockLevel} units</p>
                  </div>
                  {product.weight && (
                    <div>
                      <span className="text-slate-400">Weight:</span>
                      <p className="text-white">{product.weight} kg</p>
                    </div>
                  )}
                  {product.dimensions && (
                    <div>
                      <span className="text-slate-400">Dimensions:</span>
                      <p className="text-white">
                        {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Info */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Supplier Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-400">Supplier:</span>
                    <p className="text-white">{product.supplier || 'Not specified'}</p>
                  </div>
                  {product.supplierLink && (
                    <div>
                      <span className="text-slate-400">Link:</span>
                      <a
                        href={product.supplierLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline ml-1"
                      >
                        View Supplier Page
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode */}
              {product.barcode && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Barcode</h4>
                  <div className="flex items-center space-x-2">
                    <code className="text-white font-mono text-lg bg-slate-800 px-3 py-2 rounded">
                      {product.barcode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(product.barcode!)}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* AI Generated Content */}
              {(product.aiGeneratedTitle || product.aiGeneratedDescription) && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <SparklesIcon className="h-5 w-5 text-purple-400" />
                    <span>AI Generated Content</span>
                  </h4>
                  {product.aiGeneratedTitle && (
                    <div className="mb-3">
                      <span className="text-slate-400">Title:</span>
                      <div className="flex items-start space-x-2 mt-1">
                        <p className="text-white flex-1">{product.aiGeneratedTitle}</p>
                        <button
                          onClick={() => copyToClipboard(product.aiGeneratedTitle!)}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-xs transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  {product.aiGeneratedDescription && (
                    <div>
                      <span className="text-slate-400">Description:</span>
                      <div className="flex items-start space-x-2 mt-1">
                        <p className="text-white flex-1">{product.aiGeneratedDescription}</p>
                        <button
                          onClick={() => copyToClipboard(product.aiGeneratedDescription!)}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-xs transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Photos */}
            <div>
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <PhotoIcon className="h-5 w-5" />
                    <span>Product Photos</span>
                  </h4>
                  <div className="flex space-x-2">
                    <label className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white text-sm cursor-pointer transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                        className="hidden"
                        disabled={uploadingPhotos}
                      />
                      {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
                    </label>
                    {product.images && product.images.length > 1 && (
                      <button
                        onClick={handleBulkPhotoDownload}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-colors"
                      >
                        Download All
                      </button>
                    )}
                  </div>
                </div>

                {photoError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400 text-sm">
                    {photoError}
                  </div>
                )}

                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {product.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/150/150';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <a
                            href={image}
                            download
                            className="px-2 py-1 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 transition-colors"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <PhotoIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No photos uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, productName }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
            <h3 className="text-xl font-bold text-white">Delete Product</h3>
          </div>
          <p className="text-slate-300 mb-6">
            Are you sure you want to delete "<strong>{productName}</strong>"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white"
            >
              Delete Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
