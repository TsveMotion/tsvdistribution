'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types/database';
import BarcodeScanner from './BarcodeScanner';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PrinterIcon,
  PhotoIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import ProductModal from './modals/ProductModal';
import ProductDetailModal from './modals/ProductDetailModal';
import DeleteConfirmationModal from './modals/DeleteConfirmationModal';

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
  const [activeTab, setActiveTab] = useState<'products' | 'warehouse'>('products');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);


  // Get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete product');
      console.error('Error deleting product:', error);
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
    } catch (error) {
      setError('Failed to generate barcode print sheet');
      console.error('Error generating barcodes:', error);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // Search for product by barcode
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        setScannedProduct(product);
        setSelectedProduct(product);
        setShowDetailModal(true);
      } else {
        // If no product found, search in database
        const response = await fetch(`/api/products/search-barcode?barcode=${encodeURIComponent(barcode)}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const foundProduct = await response.json();
          setScannedProduct(foundProduct);
          setSelectedProduct(foundProduct);
          setShowDetailModal(true);
        } else {
          setError(`No product found with barcode: ${barcode}`);
        }
      }
    } catch (error) {
      setError('Failed to search for product by barcode');
      console.error('Error searching by barcode:', error);
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
    <div className={`space-y-6 ${className}`}>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Inventory Management</h2>
              <p className="text-slate-400 text-lg">Manage your product catalog and stock levels</p>
            </div>
            <div className="flex items-center space-x-4">
              {selectedProductIds.length > 0 && (
                <button
                  onClick={handleBulkBarcodeGeneration}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all duration-200 shadow-lg"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Barcodes ({selectedProductIds.length})
                </button>
              )}
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Scan Barcode
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </button>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
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
                className="w-full pl-10 pr-8 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
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
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded-lg object-cover border border-slate-600"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/api/placeholder/48/48';
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center">
                                <PhotoIcon className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate">{product.name}</div>
                            <div className="text-slate-400 text-sm truncate" title={product.description}>
                              {product.description && product.description.length > 60 
                                ? `${product.description.substring(0, 60)}...` 
                                : product.description || 'No description'}
                            </div>
                            {product.barcode && (
                              <div className="text-slate-500 text-xs font-mono mt-1 flex items-center space-x-1">
                                <span className="inline-block w-2 h-2 bg-slate-500 rounded-full"></span>
                                <span>{product.barcode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-mono text-sm bg-slate-700/50 px-2 py-1 rounded inline-block">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 rounded-full text-sm font-medium border border-slate-600">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="text-white font-bold text-lg">{product.quantity}</div>
                          <div className="text-slate-400 text-xs flex items-center space-x-1">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            <span>Min: {product.minStockLevel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-bold text-lg">£{product.price.toFixed(2)}</div>
                        <div className="text-slate-400 text-xs">Cost: £{product.cost?.toFixed(2) || '0.00'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-medium">{product.weight ? `${product.weight} kg` : '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDetailClick(product)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all duration-200 group"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all duration-200 group"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 group"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
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
          categories={categories}
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
          categories={categories}
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
          onSuccess={() => {
            setShowDetailModal(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
          product={selectedProduct}
          onEdit={(product) => {
            setSelectedProduct(product);
            setShowEditModal(true);
            setShowDetailModal(false);
          }}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScanned}
        title="Scan Product Barcode"
      />
    </div>
  );
}

