'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/database';
import { XMarkIcon, PhotoIcon, SparklesIcon, PrinterIcon } from '@heroicons/react/24/outline';

export interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product;
  onEdit: (product: Product) => void;
}

export default function ProductDetailModal({ isOpen, onClose, onSuccess, product, onEdit }: ProductDetailModalProps) {
  const [generatingAI, setGeneratingAI] = useState<'title' | 'description' | 'both' | null>(null);

  const getStockStatus = () => {
    if (product.quantity === 0) return { text: 'Out of Stock', color: 'text-red-400 bg-red-900/20' } as const;
    if (product.quantity <= product.minStockLevel) return { text: 'Low Stock', color: 'text-yellow-400 bg-yellow-900/20' } as const;
    return { text: 'In Stock', color: 'text-green-400 bg-green-900/20' } as const;
  };

  const handleAIGeneration = async (type: 'title' | 'description' | 'both') => {
    setGeneratingAI(type);
    try {
      const productInfo = {
        name: product.name,
        category: product.category,
        sku: product.sku,
        supplier: product.supplier,
        weight: product.weight,
        dimensions: product.dimensions,
        price: product.price,
      };

      const response = await fetch('/api/products/ai-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('token') && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
        },
        body: JSON.stringify({ productInfo, type }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('AI content generated:', result);
      }
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setGeneratingAI(null);
    }
  };

  const stockStatus = getStockStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 z-50 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 shadow-2xl rounded-3xl w-full max-w-7xl h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 via-slate-750 to-slate-800 border-b border-slate-600/50 rounded-t-3xl px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Product Details
              </h2>
              <p className="text-slate-400 mt-2 text-lg">View and manage product information</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Header */}
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0 relative group">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={120}
                          height={120}
                          className="h-32 w-32 rounded-xl object-cover border border-slate-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/120/120';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = product.images![0];
                              link.download = `${product.name}-main-image.jpg`;
                              link.click();
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                            title="Download image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-32 w-32 bg-slate-700 rounded-xl border border-slate-600 flex items-center justify-center">
                        <PhotoIcon className="h-16 w-16 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
                        <div className="flex items-center space-x-4 mb-3">
                          <span className="px-3 py-1 bg-slate-600/50 text-slate-200 rounded-lg text-sm font-mono">
                            SKU: {product.sku}
                          </span>
                          <span className="px-3 py-1 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-600">
                            {product.category}
                          </span>
                        </div>
                        <p className="text-slate-300 text-lg leading-relaxed">
                          {product.description || 'No description available'}
                        </p>
                      </div>
                      <span className={`px-3 py-2 rounded-lg text-sm font-medium ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </div>
                    {product.barcode && (
                      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                        <div className="text-slate-400 text-sm mb-1">Barcode</div>
                        <div className="text-white font-mono text-lg">{product.barcode}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 text-white font-bold">£</span>
                    Pricing
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Selling Price</span>
                      <span className="text-white font-bold text-xl">£{product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Cost Price</span>
                      <span className="text-slate-300 font-medium">£{(product.cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Profit Margin</span>
                        <span className="text-green-400 font-bold">
                          £{((product.cost ? product.price - product.cost : product.price)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-white font-bold">#</span>
                    Stock Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Current Stock</span>
                      <span className="text-white font-bold text-xl">{product.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Min Stock Level</span>
                      <span className="text-slate-300 font-medium">{product.minStockLevel}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${stockStatus.color}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-3">
                      {product.supplier && (
                        <div>
                          <span className="text-slate-400 text-sm">Supplier</span>
                          <div className="text-white font-medium">{product.supplier}</div>
                        </div>
                      )}
                      {product.weight && (
                        <div>
                          <span className="text-slate-400 text-sm">Weight</span>
                          <div className="text-white font-medium">{product.weight} kg</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="space-y-3">
                      {product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height) && (
                        <div>
                          <span className="text-slate-400 text-sm">Dimensions (L×W×H)</span>
                          <div className="text-white font-medium">
                            {product.dimensions.length || 0} × {product.dimensions.width || 0} × {product.dimensions.height || 0} cm
                          </div>
                        </div>
                      )}
                      {product.supplierLink && (
                        <div>
                          <span className="text-slate-400 text-sm">Supplier Link</span>
                          <div>
                            <a
                              href={product.supplierLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline break-all"
                            >
                              View Source
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Images Gallery */}
              {product.images && product.images.length > 1 && (
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <PhotoIcon className="h-5 w-5 text-blue-400 mr-2" />
                    Product Images ({product.images.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {product.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-600">
                          <Image
                            src={imageUrl}
                            alt={`Product image ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/api/placeholder/200/200';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = imageUrl;
                              link.download = `${product.name}-image-${index + 1}.jpg`;
                              link.click();
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                            title="Download image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Content */}
              {(product.aiGeneratedTitle || product.aiGeneratedDescription) && (
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <SparklesIcon className="h-5 w-5 text-purple-400 mr-2" />
                    AI Generated Content
                  </h4>
                  {product.aiGeneratedTitle && (
                    <div className="mb-4">
                      <span className="text-slate-400 text-sm">AI Generated Title</span>
                      <div className="text-white font-medium mt-1 p-3 bg-slate-800/50 rounded-lg">
                        {product.aiGeneratedTitle}
                      </div>
                    </div>
                  )}
                  {product.aiGeneratedDescription && (
                    <div>
                      <span className="text-slate-400 text-sm">AI Generated Description</span>
                      <div className="text-white mt-1 p-3 bg-slate-800/50 rounded-lg leading-relaxed">
                        {product.aiGeneratedDescription}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">
                {/* AI Generation */}
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">AI Content Generation</h4>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handleAIGeneration('title')}
                      disabled={!!generatingAI}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-700 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      {generatingAI === 'title' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      <span>{generatingAI === 'title' ? 'Generating...' : 'Generate AI Title'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAIGeneration('description')}
                      disabled={!!generatingAI}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-700 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      {generatingAI === 'description' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      <span>{generatingAI === 'description' ? 'Generating...' : 'Generate AI Description'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAIGeneration('both')}
                      disabled={!!generatingAI}
                      className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      {generatingAI === 'both' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      <span>{generatingAI === 'both' ? 'Generating...' : 'Generate Both'}</span>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Actions</h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const printContent = `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Product Details - ${product.name}</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 20px; }
                                .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
                                .section { margin-bottom: 20px; }
                                .label { font-weight: bold; color: #555; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>${product.name}</h1>
                                <p>SKU: ${product.sku} | Category: ${product.category}</p>
                              </div>
                              <div class="section">
                                <div class="label">Description:</div>
                                <p>${product.description || 'No description available'}</p>
                              </div>
                              <div class="section">
                                <div class="label">Pricing:</div>
                                <p>Price: £${product.price.toFixed(2)} | Cost: £${(product.cost || 0).toFixed(2)}</p>
                              </div>
                              <div class="section">
                                <div class="label">Stock:</div>
                                <p>Quantity: ${product.quantity} | Min Level: ${product.minStockLevel}</p>
                              </div>
                              ${product.supplier ? `<div class="section"><div class="label">Supplier:</div><p>${product.supplier}</p></div>` : ''}
                              ${product.barcode ? `<div class="section"><div class="label">Barcode:</div><p>${product.barcode}</p></div>` : ''}
                            </body>
                          </html>
                        `;
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(printContent);
                          printWindow.document.close();
                          setTimeout(() => printWindow.print(), 500);
                        }
                      }}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      <span>Print Details</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-slate-600">
            <button
              type="button"
              onClick={() => {
                onEdit(product);
                onClose();
              }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl text-white font-bold transition-all duration-200"
            >
              Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
