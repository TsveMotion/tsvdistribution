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
  // sortOption: 'default' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc'
  const [sortOption, setSortOption] = useState<'default' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc'>('default');
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

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'stock-asc':
        return (a.quantity ?? 0) - (b.quantity ?? 0);
      case 'stock-desc':
        return (b.quantity ?? 0) - (a.quantity ?? 0);
      case 'price-asc':
        return (a.price ?? 0) - (b.price ?? 0);
      case 'price-desc':
        return (b.price ?? 0) - (a.price ?? 0);
      default:
        return 0;
    }
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
    <div className={`space-y-6 pb-24 md:pb-0 overflow-x-hidden ${className}`}>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl md:rounded-2xl border border-slate-700/50 shadow-lg md:shadow-2xl overflow-hidden">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8 max-w-full">
            <div className="max-w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 break-words">Inventory Management</h2>
              <p className="text-slate-400 text-sm md:text-lg">Manage your product catalog and stock levels</p>
            </div>
            <div className="flex items-center flex-wrap gap-2 md:gap-4 max-w-full">
              {selectedProductIds.length > 0 && (
                <button
                  onClick={handleBulkBarcodeGeneration}
                  className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all duration-200 shadow-lg text-sm"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Barcodes ({selectedProductIds.length})
                </button>
              )}
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg text-sm"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Scan Barcode
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm md:text-base"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </button>
            </div>
          </div>
          
          {/* Search, Filter and Sort Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 md:py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm md:text-base"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="w-full pl-4 pr-8 py-2.5 md:py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm md:text-base"
              >
                <option value="default">Sort: Default</option>
                <option value="stock-asc">Sort: Stock (Low → High)</option>
                <option value="stock-desc">Sort: Stock (High → Low)</option>
                <option value="price-asc">Sort: Price (Low → High)</option>
                <option value="price-desc">Sort: Price (High → Low)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products - Mobile Cards (sm) */}
      <div className="md:hidden bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
        {sortedProducts.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            {products.length === 0 ? 'No products found. Add your first product to get started.' : 'No products match your search criteria.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/50">
            {sortedProducts.map((product) => {
              const status = getStockLevelStatus(product.quantity, product.minStockLevel);
              const productId = product._id?.toString() || '';
              const selected = selectedProductIds.includes(productId);
              return (
                <li key={productId} className="p-4">
                  <div className="flex items-start gap-3 w-full min-w-0">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds([...selectedProductIds, productId]);
                        } else {
                          setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
                        }
                      }}
                      className="mt-1.5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-700"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleDetailClick(product)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDetailClick(product); }}
                      className="flex-1 text-left w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg"
                    >
                      <div className="flex gap-3 w-full min-w-0">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-lg object-cover border border-slate-600"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/api/placeholder/56/56';
                            }}
                          />
                        ) : (
                          <div className="h-14 w-14 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center">
                            <PhotoIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2 w-full">
                            <div className="min-w-0 max-w-full">
                              <div className="text-white font-semibold break-words">{product.name}</div>
                              <div className="text-slate-400 text-xs truncate" title={product.description}>
                                {product.description && product.description.length > 60
                                  ? `${product.description.substring(0, 60)}...`
                                  : product.description || 'No description'}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                <span className="bg-slate-700/60 border border-slate-600 rounded px-1.5 py-0.5 font-mono break-all">{product.sku}</span>
                                <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-slate-600 to-slate-700 border border-slate-600 text-slate-200 break-words">{product.category}</span>
                              </div>
                              {product.barcode && (
                                <div className="text-slate-500 text-[10px] font-mono mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-slate-500 rounded-full"></span>
                                  <span>{product.barcode}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-left sm:text-right sm:shrink-0 mt-1 sm:mt-0">
                              <div className="text-white font-bold text-base">£{product.price.toFixed(2)}</div>
                              <div className="text-slate-400 text-[10px]">Cost: £{product.cost?.toFixed(2) || '0.00'}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-white font-semibold">{product.quantity}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                <span>Min: {product.minStockLevel}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDetailClick(product); }}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all duration-200"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(product); }}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all duration-200"
                                title="Edit Product"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(product); }}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
                                title="Delete Product"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Products Table (md+) */}
      <div className="hidden md:block bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        {sortedProducts.length === 0 ? (
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
                      checked={selectedProductIds.length === sortedProducts.length && sortedProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(sortedProducts.map(p => p._id!.toString()));
                        } else {
                          setSelectedProductIds([]);
                        }
                      }}
                      className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-700"
                    />
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider hidden md:table-cell">SKU</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider">Stock</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider">Price (£)</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider hidden md:table-cell">Weight (KG)</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedProducts.map((product) => {
                  const status = getStockLevelStatus(product.quantity, product.minStockLevel);
                  const productId = product._id?.toString() || '';
                  return (
                    <tr key={productId} className="hover:bg-slate-700/25 transition-colors">
                      <td className="px-4 py-3 md:py-4">
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
                      <td className="px-3 md:px-6 py-3 md:py-4">
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
                            <div className="text-slate-400 text-xs md:text-sm truncate" title={product.description}>
                              {product.description && product.description.length > 60 
                                ? `${product.description.substring(0, 60)}...` 
                                : product.description || 'No description'}
                            </div>
                            {product.barcode && (
                              <div className="text-slate-500 text-[10px] md:text-xs font-mono mt-1 flex items-center space-x-1">
                                <span className="inline-block w-2 h-2 bg-slate-500 rounded-full"></span>
                                <span>{product.barcode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                        <div className="text-slate-300 font-mono text-xs md:text-sm bg-slate-700/50 px-2 py-1 rounded inline-block">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                        <span className="px-3 py-1 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 rounded-full text-sm font-medium border border-slate-600">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="text-white font-bold text-base md:text-lg">{product.quantity}</div>
                          <div className="text-slate-400 text-[10px] md:text-xs flex items-center space-x-1">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            <span>Min: {product.minStockLevel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="text-white font-bold text-base md:text-lg">£{product.price.toFixed(2)}</div>
                        <div className="text-slate-400 text-[10px] md:text-xs">Cost: £{product.cost?.toFixed(2) || '0.00'}</div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                        <div className="text-slate-300 font-medium">{product.weight ? `${product.weight} kg` : '—'}</div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-lg text-[10px] md:text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center space-x-1 md:space-x-2">
                          <button
                            onClick={() => handleDetailClick(product)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all duration-200 group"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4 md:h-4 md:w-4 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all duration-200 group"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4 md:h-4 md:w-4 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="p-1.5 md:p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 group"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-4 w-4 md:h-4 md:w-4 group-hover:scale-110 transition-transform" />
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

