'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExclamationTriangleIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types/database';
import { generateBarcodeForSKU } from '@/lib/barcode';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
  categories: string[];
}

export default function ProductModal({ isOpen, onClose, onSuccess, product, categories }: ProductModalProps) {
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
    aiGeneratedTitle: product?.aiGeneratedTitle || '',
    images: product?.images || [],
    // keep existing shape compatible; locations will be set on submit
    locations: product?.locations || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Storage location selection (Rack/Shelf)
  const [selectedRack, setSelectedRack] = useState<number | ''>('');
  const [selectedShelf, setSelectedShelf] = useState<number | ''>('');
  // Dynamic warehouse layout
  const [racks, setRacks] = useState<number[]>([1, 2, 3]);
  const [shelvesByRack, setShelvesByRack] = useState<Record<number, number>>({ 1: 5, 2: 5, 3: 5 });
  const [existingLocationSet, setExistingLocationSet] = useState<Set<string>>(new Set());

  const [initialSnapshot] = useState(() => JSON.stringify({
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
    aiGeneratedTitle: product?.aiGeneratedTitle || '',
    images: product?.images || []
  }));
  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  const handleClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        handleClose();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        const form = document.getElementById('product-form');
        if (form) (form as HTMLFormElement).requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDirty]);

  useEffect(() => {
    if (!product && formData.sku && !formData.barcode && !barcodeGenerated) {
      const generatedBarcode = generateBarcodeForSKU(formData.sku);
      setFormData(prev => ({ ...prev, barcode: generatedBarcode }));
      setBarcodeGenerated(true);
    }
  }, [formData.sku, formData.barcode, product, barcodeGenerated]);

  // Prefill storage selection if product already has a location (best-effort with code if available later)
  // We don't fetch locations list here to keep modal light; selection is optional and resolved on submit.

  // Fetch locations to build dynamic rack/shelf counts when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/locations', {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        if (!res.ok) return; // fallback to defaults silently
        const list = await res.json();
        if (!Array.isArray(list)) return;

        const codeRegex = /^R(\d+)S(\d+)$/i;
        const rackSet = new Set<number>();
        const shelvesMap: Record<number, number> = {};
        const codeSet = new Set<string>();

        for (const loc of list) {
          const code: string | undefined = loc?.code;
          if (!code) continue;
          const m = codeRegex.exec(code);
          if (!m) continue;
          const r = parseInt(m[1], 10);
          const s = parseInt(m[2], 10);
          rackSet.add(r);
          shelvesMap[r] = Math.max(shelvesMap[r] || 0, s);
          codeSet.add(`R${r}S${s}`);
        }

        // Merge with defaults to ensure at least 3 racks × 5 shelves
        const defaultRacks = [1, 2, 3];
        const rackArr = Array.from(new Set<number>([...defaultRacks, ...Array.from(rackSet)])).sort((a, b) => a - b);
        for (const r of rackArr) {
          if (!shelvesMap[r]) shelvesMap[r] = 5;
          // ensure at least 5 shelves visually
          shelvesMap[r] = Math.max(shelvesMap[r], 5);
        }
        setRacks(rackArr);
        setShelvesByRack(shelvesMap);
        setExistingLocationSet(codeSet);
      } catch {
        // ignore and keep defaults
      }
    })();
  }, [isOpen]);

  // When editing, prefill rack/shelf from the existing product location
  useEffect(() => {
    if (!isOpen || !product || !product.locations || product.locations.length === 0) return;
    const firstLocId = (product.locations[0] as any)?.locationId || (product.locations[0] as any)?._id;
    if (!firstLocId) return;

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/locations', {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        const loc = list.find((l: any) => l?._id === firstLocId);
        if (!loc || !loc.code) return;
        const m = /^R(\d+)S(\d+)$/i.exec(loc.code);
        if (!m) return;
        setSelectedRack(parseInt(m[1], 10));
        setSelectedShelf(parseInt(m[2], 10));
      } catch {
        // ignore prefill errors
      }
    })();
  }, [isOpen, product]);

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
    } catch {
      setError('Failed to generate AI content. Check your OpenAI API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.sku.trim()) errs.sku = 'SKU is required';
    if (!formData.category.trim()) errs.category = 'Category is required';
    if (formData.price < 0) errs.price = 'Price cannot be negative';
    if (formData.cost < 0) errs.cost = 'Cost cannot be negative';
    if (formData.quantity < 0) errs.quantity = 'Quantity cannot be negative';
    if (formData.minStockLevel < 0) errs.minStockLevel = 'Min level cannot be negative';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      // API expects all files under the 'files' field in a single multipart request
      const formDataUpload = new FormData();
      Array.from(files).forEach((file) => {
        formDataUpload.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(localStorage.getItem('token') && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
        },
        body: formDataUpload,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errJson.error || 'Failed to upload files');
      }

      const result = await response.json(); // { success: true, files: string[] }
      const uploadedUrls: string[] = result.files || [];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (error) {
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'product-image.jpg';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      setError('Failed to download image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validate()) {
        setLoading(false);
        return;
      }
      const url = product ? `/api/products/${product._id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');

      // Build payload and optionally attach storage location
      let payload: any = { ...formData };

      // If rack/shelf chosen, ensure a Location exists and attach to product.locations
      if (selectedRack && selectedShelf) {
        const code = `R${selectedRack}S${selectedShelf}`;
        // 1) Try to find existing location by code
        const locRes = await fetch('/api/locations', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        if (!locRes.ok) {
          throw new Error('Failed to fetch locations');
        }
        const allLocs = await locRes.json();
        let location = Array.isArray(allLocs) ? allLocs.find((l: any) => l?.code === code) : null;

        // 2) Create if not exists
        if (!location) {
          const createRes = await fetch('/api/locations', {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `Rack ${selectedRack} Shelf ${selectedShelf}`,
              code,
              type: 'shelf',
              description: `Shelf ${selectedShelf} on Rack ${selectedRack}`,
              capacity: 100,
              isActive: true,
            }),
          });
          if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to create location');
          }
          const created = await createRes.json();
          // API returns an object with location and locationId depending on handler; normalize
          location = created.location || created;
        }

        if (location?._id) {
          payload.locations = [
            {
              locationId: location._id,
              quantity: payload.quantity ?? 0,
              lastUpdated: new Date(),
            },
          ];
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 z-50 overflow-hidden">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 shadow-2xl rounded-3xl w-[95vw] max-w-[1800px] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 via-slate-750 to-slate-800 border-b border-slate-600/50 rounded-t-3xl px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-slate-400 mt-2 text-lg">
                {product ? 'Update product information' : 'Fill in the details to create a new product'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form id="product-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 pb-2 flex-1 overflow-y-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-2xl text-red-400">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch auto-rows-fr">
              {/* Basic Information Section */}
              <div className="order-1 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Basic Information</h3>
                    <p className="text-slate-400">Essential product details</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Product Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.name ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                      placeholder="Enter product name"
                      required
                    />
                    {fieldErrors.name && <p className="mt-2 text-sm text-red-400">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">SKU *</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.sku ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                      placeholder="Enter SKU code"
                      required
                    />
                    {fieldErrors.sku && <p className="mt-2 text-sm text-red-400">{fieldErrors.sku}</p>}
                  </div>
                </div>
              </div>

              {/* Storage Location Section */}
              <div className="order-2 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Storage Location</h3>
                    <p className="text-slate-400">Select rack and shelf for this product</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Rack</label>
                    <select
                      value={selectedRack}
                      onChange={(e) => setSelectedRack(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select rack</option>
                      {racks.map(r => (
                        <option key={r} value={r}>Rack {r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Shelf</label>
                    <select
                      value={selectedShelf}
                      onChange={(e) => setSelectedShelf(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                      disabled={!selectedRack}
                    >
                      <option value="">Select shelf</option>
                      {Array.from({ length: selectedRack ? (shelvesByRack[selectedRack as number] || 5) : 0 }, (_, i) => i + 1).map(s => (
                        <option key={s} value={s}>Shelf {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Code</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedRack && selectedShelf ? `R${selectedRack}S${selectedShelf}` : ''}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg placeholder-slate-500"
                      placeholder="Select rack & shelf"
                    />
                  </div>
                </div>

                {/* Visual Picker */}
                <div className="mt-6">
                  <label className="block text-base font-semibold text-slate-300 mb-3">Warehouse Layout</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {racks.map((rack) => (
                      <div
                        key={rack}
                        className={`relative rounded-2xl border ${selectedRack === rack ? 'border-cyan-500' : 'border-slate-600/50'} bg-slate-800/40 p-5`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-cyan-300 font-semibold">Rack {rack}</span>
                          <span className="text-slate-400 text-xs">Click shelf to select</span>
                        </div>
                        {/* Vertical spine */}
                        <div className="absolute left-1/2 top-16 bottom-5 -translate-x-1/2 w-px bg-slate-600/40 hidden md:block" />

                        <div className="space-y-3">
                          {Array.from({ length: shelvesByRack[rack] || 5 }, (_, i) => i + 1).map((shelf) => {
                            const active = selectedRack === rack && selectedShelf === shelf;
                            return (
                              <button
                                type="button"
                                key={shelf}
                                onClick={() => { setSelectedRack(rack); setSelectedShelf(shelf); }}
                                className={`relative w-full text-left px-4 py-3 rounded-xl border transition-colors group
                                  ${active
                                    ? 'bg-green-500 border-green-400 text-white shadow-inner'
                                    : 'bg-slate-800/60 border-slate-600/60 text-slate-300 hover:bg-slate-700/60'}`}
                                title={`R${rack}S${shelf}`}
                              >
                                {/* connector notch on spine */}
                                <span className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-transparent" />
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-slate-500/70'}`} />
                                    <span className="font-medium">Shelf {shelf}</span>
                                  </div>
                                  {active && (
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md">Selected</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="mt-4 flex items-center space-x-6 text-sm text-slate-300">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-green-500 border border-green-400" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-slate-800/60 border border-slate-600/60" />
                      <span>Empty</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-4">If the selected location doesn't exist yet, it will be created automatically when you save.</p>
              </div>

              {/* Product Images Section */}
              <div className="order-3 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-4 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Product Images</h3>
                    <p className="text-slate-400">Upload images of your product</p>
                  </div>
                </div>
                
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 hover:border-cyan-500 transition-colors duration-200 min-h-[160px] flex items-center justify-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImages}
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center">
                        {uploadingImages ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        ) : (
                          <PhotoIcon className="h-8 w-8 text-slate-300" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">
                          {uploadingImages ? 'Uploading images...' : 'Click to upload images'}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          PNG, JPG, JPEG up to 10MB each
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Image Preview Grid */}
                  {formData.images && formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-48 overflow-auto pr-1">
                      {formData.images.map((imageUrl, index) => (
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
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => downloadImage(imageUrl, `${formData.name || 'product'}-image-${index + 1}.jpg`)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                              title="Download image"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                              title="Remove image"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="order-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-4 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Product Description</h3>
                    <p className="text-slate-400">Detailed product information</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-slate-300 mb-3">
                    Description
                    <span className="text-sm text-slate-400 ml-2 font-normal">({formData.description.length}/500 characters)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setFormData({ ...formData, description: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows={4}
                    maxLength={500}
                    placeholder="Enter a detailed product description (max 500 characters)"
                  />
                  {formData.description.length >= 450 && (
                    <p className="text-sm text-orange-400 mt-2 flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>{500 - formData.description.length} characters remaining</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Category and Supplier Section */}
              <div className="order-5 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">5</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Category & Supplier</h3>
                    <p className="text-slate-400">Classification and supplier information</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-1">
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Category *</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      list="category-list"
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.category ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                      placeholder="Enter product category"
                      required
                    />
                    <datalist id="category-list">
                      {Array.from(new Set(categories)).map((c) => (
                        <option value={c} key={c} />
                      ))}
                    </datalist>
                    {fieldErrors.category && <p className="mt-2 text-sm text-red-400">{fieldErrors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter supplier name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-slate-300 mb-3">Supplier Link</label>
                  <input
                    type="url"
                    value={formData.supplierLink}
                    onChange={(e) => setFormData({ ...formData, supplierLink: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://supplier-website.com/product"
                  />
                </div>
              </div>

              {/* Pricing and Physical Properties Section */}
              <div className="order-6 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">6</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Pricing & Physical Properties</h3>
                    <p className="text-slate-400">Pricing, weight, and dimensions</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-base font-semibold text-slate-300 mb-3">Selling Price (£) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className={`w-full pl-8 pr-4 py-3 bg-slate-800/50 border ${fieldErrors.price ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      {fieldErrors.price && <p className="mt-2 text-sm text-red-400">{fieldErrors.price}</p>}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-slate-300 mb-3">Cost Price (£)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                          className={`w-full pl-8 pr-4 py-3 bg-slate-800/50 border ${fieldErrors.cost ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                          placeholder="0.00"
                        />
                      </div>
                      {fieldErrors.cost && <p className="mt-2 text-sm text-red-400">{fieldErrors.cost}</p>}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-slate-300 mb-3">Weight (KG)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">kg</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-slate-300 text-sm">
                    <span className="mr-4">Profit: <span className="font-semibold">£{((formData.price || 0) - (formData.cost || 0)).toFixed(2)}</span></span>
                    <span>Margin: <span className="font-semibold">{formData.price > 0 ? Math.round(((formData.price - (formData.cost || 0)) / formData.price) * 100) : 0}%</span></span>
                  </div>
                </div>
              </div>

              {/* Inventory Management Section */}
              <div className="order-7 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-4 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">7</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Inventory Management</h3>
                    <p className="text-slate-400">Stock levels and management</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Current Quantity *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.quantity ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                      placeholder="0"
                      required
                    />
                    <p className="text-sm text-slate-400 mt-2">Current stock quantity</p>
                    {fieldErrors.quantity && <p className="mt-2 text-sm text-red-400">{fieldErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Minimum Stock Level *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 5 })}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.minStockLevel ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600/50'} rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200`}
                      placeholder="5"
                      required
                    />
                    <p className="text-sm text-slate-400 mt-2">Alert when stock falls below this level</p>
                    {fieldErrors.minStockLevel && <p className="mt-2 text-sm text-red-400">{fieldErrors.minStockLevel}</p>}
                  </div>
                </div>
              </div>

              {/* Technical Details Section */}
              <div className="order-8 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">8</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Technical Details</h3>
                    <p className="text-slate-400">Barcode and physical dimensions</p>
                  </div>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Barcode (Auto-generated)</label>
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-stretch">
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter barcode"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Generate random barcode
                          const randomBarcode = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
                          setFormData({ ...formData, barcode: randomBarcode });
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 whitespace-nowrap"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-300 mb-3">Dimensions (L × W × H cm)</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.dimensions?.length || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { 
                              ...formData.dimensions, 
                              length: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                        <label className="block text-sm text-slate-400 mt-2 text-center">Length (cm)</label>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.dimensions?.width || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { 
                              ...formData.dimensions, 
                              width: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                        <label className="block text-sm text-slate-400 mt-2 text-center">Width (cm)</label>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.dimensions?.height || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { 
                              ...formData.dimensions, 
                              height: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-lg text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                        <label className="block text-sm text-slate-400 mt-2 text-center">Height (cm)</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Content Generation Section */}
              <div className="order-9 md:col-span-2 bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 h-full min-h-[260px] flex flex-col">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">AI Content Generation</h3>
                    <p className="text-slate-400">Generate optimized titles and descriptions</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => handleGenerateAIContent('title')}
                      disabled={aiLoading || !formData.name || !formData.category}
                      className={`px-4 py-3 ${aiLoading ? 'bg-slate-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'} rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center`}
                    >
                      {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Generate Title'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateAIContent('description')}
                      disabled={aiLoading || !formData.name || !formData.category}
                      className={`px-4 py-3 ${aiLoading ? 'bg-slate-600' : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500'} rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center`}
                    >
                      {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Generate Description'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateAIContent('both')}
                      disabled={aiLoading || !formData.name || !formData.category}
                      className={`px-4 py-3 ${aiLoading ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center`}
                    >
                      {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Generate Both'}
                    </button>
                  </div>

                  {(!formData.name || !formData.category) && (
                    <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
                      <p className="text-amber-400 text-sm flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>Fill in the product name and category to enable AI content generation</span>
                      </p>
                    </div>
                  )}

                  {formData.aiGeneratedTitle && (
                    <div className="mb-6">
                      <label className="block text-base font-semibold text-slate-300 mb-3">AI Generated Title</label>
                      <div className="flex space-x-3">
                        <textarea
                          value={formData.aiGeneratedTitle}
                          onChange={(e) => setFormData({ ...formData, aiGeneratedTitle: e.target.value })}
                          className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 resize-none max-h-24 overflow-auto"
                          rows={3}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.aiGeneratedTitle)}
                          className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.aiGeneratedDescription && (
                    <div className="mt-auto">
                      <label className="block text-base font-semibold text-slate-300 mb-3">AI Generated Description</label>
                      <div className="flex space-x-3">
                        <textarea
                          value={formData.aiGeneratedDescription}
                          onChange={(e) => setFormData({ ...formData, aiGeneratedDescription: e.target.value })}
                          className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 resize-none max-h-32 overflow-auto"
                          rows={4}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.aiGeneratedDescription)}
                          className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 pt-3 border-t border-slate-600/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : (product ? 'Save Changes' : 'Save Product')}
            </button>
          </div>
          </form>
        </div>
      </div>
      );
    }
