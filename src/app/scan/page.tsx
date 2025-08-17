    'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCodeIcon, PlusIcon, MinusIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Product } from '@/types/database';

export default function ScanPage() {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantityBusy, setQuantityBusy] = useState<'inc' | 'dec' | null>(null);

  const authHeaders = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  }, []);

  const fetchByBarcode = useCallback(async (barcode: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/products/search-barcode?barcode=${encodeURIComponent(barcode)}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        throw new Error('No product found for that barcode');
      }
      const data: Product = await res.json();
      setProduct(data);
    } catch (e: any) {
      setProduct(null);
      setError(e?.message || 'Failed to look up product');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const adjustQuantity = useCallback(async (delta: number) => {
    if (!product?._id) return;
    try {
      setQuantityBusy(delta > 0 ? 'inc' : 'dec');
      setError(null);
      const newQty = Math.max(0, (product.quantity || 0) + delta);
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to update quantity');
      }
      const json = await res.json();
      const updated: Product = json.product || { ...product, quantity: newQty };
      setProduct(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to update quantity');
    } finally {
      setQuantityBusy(null);
    }
  }, [authHeaders, product]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/40"
            aria-label="Back"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <QrCodeIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Scan Barcode</h1>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* Actions */}
      <div className="px-4 pt-4">
        <div className="flex gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold shadow-lg"
          >
            <QrCodeIcon className="h-5 w-5" />
            Scan with Camera
          </button>
        </div>
        <p className="text-slate-400 text-xs mt-2">Tip: You can also use a USB scanner focused on the page and it will type into the manual input below.</p>
      </div>

      {/* Manual input */}
      <div className="px-4 mt-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
          <label className="block text-slate-300 text-sm mb-2">Manual barcode entry</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter or scan barcode..."
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) fetchByBarcode(val);
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement) || null;
                const val = input?.value.trim();
                if (val) fetchByBarcode(val);
              }}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-semibold"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Result card */}
      <div className="px-4 mt-4">
        {loading && (
          <div className="p-6 text-center text-slate-400">Looking up product...</div>
        )}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400">{error}</div>
        )}
        {product && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3 min-w-0">
                {product.images?.length ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-lg object-cover border border-slate-600"
                  />
                ) : (
                  <div className="h-18 w-18 rounded-lg bg-slate-700 border border-slate-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0 max-w-full">
                      <h2 className="text-white font-semibold text-lg break-words">{product.name}</h2>
                      <div className="text-slate-400 text-xs break-all">{product.sku}</div>
                      <div className="text-slate-400 text-xs break-words">{product.category}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-white font-bold">£{Number(product.price || 0).toFixed(2)}</div>
                      <div className="text-slate-400 text-[11px]">Cost: £{Number(product.cost || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-slate-300 text-sm mt-2 line-clamp-4 whitespace-pre-line break-words">{product.description}</p>
                  )}

                  {product.barcode && (
                    <div className="mt-2 text-slate-400 text-xs font-mono">Barcode: {product.barcode}</div>
                  )}

                  <div className="mt-4 bg-slate-900/40 border border-slate-700/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-400 text-xs">In Stock</div>
                        <div className="text-white text-2xl font-bold">{product.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustQuantity(-1)}
                          disabled={quantityBusy !== null || (product.quantity || 0) <= 0}
                          className="p-3 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 enabled:hover:bg-slate-700 disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => adjustQuantity(+1)}
                          disabled={quantityBusy !== null}
                          className="p-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold"
                          aria-label="Increase quantity"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {product.minStockLevel !== undefined && (
                      <div className="mt-2 text-slate-400 text-xs">Min stock: {product.minStockLevel}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanner modal */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => fetchByBarcode(code)}
        title="Scan Product Barcode"
      />
    </div>
  );
}
