'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Location } from '@/types/database';
import ProductDetailModal from '@/components/modals/ProductDetailModal';

interface ProductWithLocation extends Product {
  locationDetails?: Location[];
}

interface ShelfData {
  raftId: number;
  shelfId: number;
  products: ProductWithLocation[];
  location?: Location;
}

const WarehouseVisualization: React.FC = () => {
  const [products, setProducts] = useState<ProductWithLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shelves, setShelves] = useState<ShelfData[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<ShelfData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [highlightedShelves, setHighlightedShelves] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductWithLocation[]>([]);
  const [showAddItems, setShowAddItems] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{productId: string, quantity: number}[]>([]);
  const [actionMode, setActionMode] = useState<'add' | 'remove'>('add');
  const [formError, setFormError] = useState<string | null>(null);
  const [rackFilter, setRackFilter] = useState<'all' | number>('all');

  // Capacity edit state
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [newCapacity, setNewCapacity] = useState<number | ''>('');

  // Product details modal state
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize warehouse structure (3 rafts, 5 shelves each)
  const warehouseStructure = {
    rafts: 3,
    shelvesPerRaft: 5
  };

  const getShelfCapacityUsage = (shelf: ShelfData) => {
    try {
      const totalQty = getShelfProductCount(shelf);
      const cap = shelf.location?.capacity ?? 10; // default capacity
      if (!cap || cap <= 0) return { pct: 0, cap: 10, qty: totalQty };
      const pct = Math.min(100, Math.round((totalQty / cap) * 100));
      return { pct, cap, qty: totalQty };
    } catch {
      return { pct: 0, cap: 10, qty: 0 };
    }
  };

  // Compute which rack IDs are visible based on the rack filter
  const visibleRafts = useMemo(() => {
    const all = Array.from({ length: warehouseStructure.rafts }, (_, i) => i + 1);
    return rackFilter === 'all' ? all : all.filter((id) => id === rackFilter);
  }, [rackFilter]);

  useEffect(() => {
    fetchWarehouseData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounce the search query for smoother UX
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      handleSearch();
    } else {
      setHighlightedShelves(new Set());
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, products]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWarehouseData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch products and locations in parallel
      const [productsResponse, locationsResponse] = await Promise.all([
        fetch('/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/locations', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!productsResponse.ok || !locationsResponse.ok) {
        throw new Error('Failed to fetch warehouse data');
      }

      const productsData = await productsResponse.json();
      const locationsData = await locationsResponse.json();
      
      setLocations(locationsData);
      
      // Enrich products with location details
      const enrichedProducts = await enrichProductsWithLocations(productsData, locationsData);
      setProducts(enrichedProducts);
      setAllProducts(productsData);
      
      // Organize products into shelf structure
      organizeShelves(enrichedProducts, locationsData);
      
      setError(null);
    } catch (error) {
      setError('Error fetching warehouse data');
      console.error('Error fetching warehouse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichProductsWithLocations = async (products: Product[], locations: Location[]): Promise<ProductWithLocation[]> => {
    if (!products || !Array.isArray(products)) return [];
    if (!locations || !Array.isArray(locations)) return products;
    
    return products.map(product => {
      // Return empty product object if product is null/undefined
      if (!product || typeof product !== 'object') {
        return {} as ProductWithLocation;
      }
      
      // Use the product as-is with fallback defaults only where needed
      const safeProduct = {
        ...product,
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category: product.category || '',
        locations: product.locations || []
      };
      
      if (safeProduct.locations && Array.isArray(safeProduct.locations) && safeProduct.locations.length > 0) {
        const locationDetails = safeProduct.locations
          .map(prodLoc => {
            // More comprehensive null checks
            if (!prodLoc || typeof prodLoc !== 'object' || !prodLoc.locationId) {
              return null;
            }
            
            // Ensure locationId can be converted to string safely
            let locationIdStr: string;
            try {
              if (typeof prodLoc.locationId === 'string') {
                locationIdStr = prodLoc.locationId;
              } else if (prodLoc.locationId && typeof prodLoc.locationId.toString === 'function') {
                locationIdStr = prodLoc.locationId.toString();
              } else {
                return null;
              }
            } catch (error) {
              console.warn('Error converting locationId to string:', error);
              return null;
            }
            
            return locations.find(loc => {
              if (!loc || typeof loc !== 'object' || !loc._id) return false;
              try {
                let locIdStr: string;
                if (typeof loc._id === 'string') {
                  locIdStr = loc._id;
                } else if (loc._id && typeof loc._id.toString === 'function') {
                  locIdStr = loc._id.toString();
                } else {
                  return false;
                }
                return locIdStr === locationIdStr;
              } catch (error) {
                console.warn('Error comparing location IDs:', error);
                return false;
              }
            });
          })
          .filter(item => item !== null && item !== undefined) as Location[];
        
        return {
          ...safeProduct,
          locationDetails
        };
      }
      return safeProduct;
    });
  };

  const organizeShelves = (products: ProductWithLocation[], locations: Location[]) => {
    if (!products || !Array.isArray(products)) products = [];
    if (!locations || !Array.isArray(locations)) locations = [];
    
    const shelfData: ShelfData[] = [];
    
    // Create shelf structure
    for (let raftId = 1; raftId <= warehouseStructure.rafts; raftId++) {
      for (let shelfId = 1; shelfId <= warehouseStructure.shelvesPerRaft; shelfId++) {
        const shelfCode = `R${raftId}S${shelfId}`;
        
        // Find location that matches this shelf
        const shelfLocation = locations.find(loc => {
          if (!loc || !loc.code || !loc.name) return false;
          try {
            return (
              loc.code === shelfCode || 
              loc.name.toLowerCase().includes(`raft ${raftId} shelf ${shelfId}`) ||
              loc.name.toLowerCase().includes(`r${raftId}s${shelfId}`)
            );
          } catch {
            return false;
          }
        });
        
        // Find products in this location
        const shelfProducts = products.filter(product => {
          if (!product || !product.locationDetails || !Array.isArray(product.locationDetails)) {
            return false;
          }
          return product.locationDetails.some(loc => {
            if (!loc || !loc._id || !shelfLocation || !shelfLocation._id) {
              return false;
            }
            try {
              const locIdStr = typeof loc._id === 'string' ? loc._id : loc._id.toString();
              const shelfIdStr = typeof shelfLocation._id === 'string' ? shelfLocation._id : shelfLocation._id.toString();
              return locIdStr === shelfIdStr;
            } catch {
              return false;
            }
          });
        });
        
        shelfData.push({
          raftId,
          shelfId,
          products: shelfProducts || [],
          location: shelfLocation
        });
      }
    }
    
    setShelves(shelfData);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setHighlightedShelves(new Set());
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matchingProducts = products.filter(product => {
      if (!product) return false;
      const name = product.name || '';
      const sku = product.sku || '';
      const description = product.description || '';
      const category = product.category || '';
      
      return (
        name.toLowerCase().includes(query) ||
        sku.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );
    });

    setSearchResults(matchingProducts);

    // Highlight shelves containing matching products
    const highlightedShelfIds = new Set<string>();
    matchingProducts.forEach(product => {
      if (!product.locationDetails || !Array.isArray(product.locationDetails)) {
        return;
      }
      product.locationDetails.forEach(location => {
        if (!location || !location._id) return;
        // Find shelf that contains this location
        const shelf = shelves.find(s => {
          if (!s.location || !s.location._id) return false;
          return s.location._id.toString() === location._id!.toString();
        });
        if (shelf) {
          highlightedShelfIds.add(`${shelf.raftId}-${shelf.shelfId}`);
        }
      });
    });

    setHighlightedShelves(highlightedShelfIds);
  };

  const handleShelfClick = (shelf: ShelfData, event: React.MouseEvent) => {
    // Check if clicked with modifier key to add items, otherwise just select
    if (event.shiftKey || event.ctrlKey) {
      handleAddItemsClick(shelf);
    } else {
      setSelectedShelf(shelf);
    }
  };

  const handleAddItemsClick = (shelf: ShelfData) => {
    setSelectedShelf(shelf);
    setShowAddItems(true);
    setSelectedProducts([]);
    setActionMode('add');
    setFormError(null);
  };

  const handleRemoveItemsClick = (shelf: ShelfData) => {
    setSelectedShelf(shelf);
    setShowAddItems(true);
    setSelectedProducts([]);
    setActionMode('remove');
    setFormError(null);
  };

  const openProductDetails = (product: Product) => {
    setDetailProduct(product);
    setShowProductDetail(true);
  };

  const startEditCapacity = () => {
    if (!selectedShelf?.location) return;
    setNewCapacity(selectedShelf.location.capacity ?? 10);
    setEditingCapacity(true);
  };

  const cancelEditCapacity = () => {
    setEditingCapacity(false);
    setNewCapacity('');
  };

  const saveCapacity = async () => {
    try {
      if (!selectedShelf?.location?._id || newCapacity === '' || newCapacity < 0) return;
      setLoading(true);
      const token = localStorage.getItem('token');
      const id = typeof selectedShelf.location._id === 'string' ? selectedShelf.location._id : selectedShelf.location._id.toString();
      const res = await fetch(`/api/locations/${id}` , {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capacity: Number(newCapacity) })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update capacity');
      }
      // Refresh data and UI
      await fetchWarehouseData();
      setEditingCapacity(false);
      setNewCapacity('');
      // Keep the same shelf selected after refresh
      if (selectedShelf) {
        const refreshed = shelves.find(s => s.raftId === selectedShelf.raftId && s.shelfId === selectedShelf.shelfId);
        if (refreshed) setSelectedShelf(refreshed);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update capacity';
      setError(msg);
      console.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setSelectedProducts([...selectedProducts, { productId: '', quantity: 1 }]);
  };

  const updateSelectedProduct = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
    setFormError(null);
  };

  const removeSelectedProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const saveItemsToShelf = async () => {
    if (!selectedShelf || selectedProducts.length === 0) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Helper to safely convert various ID shapes to string
      const idToString = (id: any): string | null => {
        try {
          if (!id) return null;
          if (typeof id === 'string') return id;
          if (typeof id === 'object' && typeof id.toString === 'function') return id.toString();
          return String(id);
        } catch {
          return null;
        }
      };

      // First, ensure we have a location for this shelf
      let shelfLocation = selectedShelf.location;
      
      if (!shelfLocation) {
        // Create location for this shelf
        const locationResponse = await fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Rack ${selectedShelf.raftId} Shelf ${selectedShelf.shelfId}`,
            code: `R${selectedShelf.raftId}S${selectedShelf.shelfId}`,
            type: 'shelf',
            description: `Shelf ${selectedShelf.shelfId} on Rack ${selectedShelf.raftId}`,
            capacity: 10,
            isActive: true
          }),
        });

        if (!locationResponse.ok) {
          // If conflict, try to resolve the existing location by code
          if (locationResponse.status === 409) {
            const code = `R${selectedShelf.raftId}S${selectedShelf.shelfId}`;
            // Try to find in current state first
            let existing = locations.find(l => l && l.code === code);
            if (!existing) {
              // Fallback: refetch locations
              const refetch = await fetch('/api/locations', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (refetch.ok) {
                const list = await refetch.json();
                existing = Array.isArray(list) ? list.find((l: any) => l && l.code === code) : undefined;
              }
            }
            if (existing) {
              shelfLocation = existing as any;
            } else {
              const errorData = await locationResponse.json().catch(() => ({}));
              throw new Error(`Failed to create or find existing location (${code}): ${errorData.message || 'Conflict'}`);
            }
          } else {
            const errorData = await locationResponse.json().catch(() => ({}));
            throw new Error(`Failed to create location: ${errorData.message || 'Unknown error'}`);
          }
        } else {
          shelfLocation = await locationResponse.json();
        }
      }

      // Helpers
      const getAllocatedQuantity = (prod: any): number => {
        try {
          const locs = Array.isArray(prod?.locations) ? prod.locations : [];
          return locs.reduce((sum: number, l: any) => sum + (typeof l?.quantity === 'number' ? l.quantity : 0), 0);
        } catch {
          return 0;
        }
      };

      // Update each product's location
      for (const item of selectedProducts) {
        if (item.productId && item.quantity > 0) {
          // Get current product data first
          const getResponse = await fetch(`/api/products/${item.productId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!getResponse.ok) {
            throw new Error(`Failed to fetch product ${item.productId}`);
          }
          
          const currentProduct = await getResponse.json();
          const existingLocations = currentProduct.locations || [];
          const shelfIdStr = idToString(shelfLocation?._id);
          const existingLocationIndex = existingLocations.findIndex(
            (loc: { locationId: any }) => idToString(loc?.locationId) === shelfIdStr
          );

          let updatedLocations = [...existingLocations];

          if (actionMode === 'add') {
            // Enforce not exceeding available inventory
            const allocated = getAllocatedQuantity(currentProduct);
            const available = Math.max(0, (currentProduct.quantity || 0) - allocated);
            if (available <= 0) {
              throw new Error(`No available stock to allocate for ${currentProduct.name}`);
            }
            if (item.quantity > available) {
              throw new Error(`Cannot allocate ${item.quantity} for ${currentProduct.name}. Available: ${available}`);
            }

            if (existingLocationIndex >= 0) {
              updatedLocations[existingLocationIndex] = {
                ...updatedLocations[existingLocationIndex],
                quantity: (updatedLocations[existingLocationIndex].quantity || 0) + item.quantity,
                lastUpdated: new Date()
              };
            } else {
              updatedLocations.push({
                locationId: shelfLocation!._id,
                quantity: item.quantity,
                lastUpdated: new Date()
              });
            }
          } else {
            // actionMode === 'remove': enforce not removing more than exists on this shelf
            if (existingLocationIndex < 0) {
              throw new Error(`${currentProduct.name} is not on this shelf`);
            }
            const currentQtyOnShelf = updatedLocations[existingLocationIndex]?.quantity || 0;
            if (item.quantity > currentQtyOnShelf) {
              throw new Error(`Cannot remove ${item.quantity} from shelf for ${currentProduct.name}. On shelf: ${currentQtyOnShelf}`);
            }
            const newQty = currentQtyOnShelf - item.quantity;
            if (newQty > 0) {
              updatedLocations[existingLocationIndex] = {
                ...updatedLocations[existingLocationIndex],
                quantity: newQty,
                lastUpdated: new Date()
              };
            } else {
              // remove this location entry entirely
              updatedLocations.splice(existingLocationIndex, 1);
            }
          }

          // Update the product with new locations
          const updateResponse = await fetch(`/api/products/${item.productId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...currentProduct,
              locations: updatedLocations,
              updatedAt: new Date()
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Failed to update product ${item.productId}: ${errorData.message || 'Unknown error'}`);
          }
        }
      }

      // Refresh warehouse data
      await fetchWarehouseData();
      setShowAddItems(false);
      setSelectedProducts([]);
      setError(null);
      setFormError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error ${actionMode === 'add' ? 'adding' : 'removing'} items: ${msg}`);
      setFormError(msg);
      console.error('Error updating items on shelf:', error);
    } finally {
      setLoading(false);
    }
  };

  const getShelfColor = (shelf: ShelfData) => {
    const shelfKey = `${shelf.raftId}-${shelf.shelfId}`;
    const isHighlighted = highlightedShelves.has(shelfKey);
    const hasProducts = shelf.products.length > 0;
    
    if (isHighlighted) {
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50 animate-pulse';
    } else if (hasProducts) {
      return 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700';
    } else {
      return 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600';
    }
  };

  const getShelfProductCount = (shelf: ShelfData) => {
    if (!shelf || !shelf.products || !Array.isArray(shelf.products)) {
      return 0;
    }
    return shelf.products.reduce((total, product) => {
      if (!product || !product.locations || !Array.isArray(product.locations) || !shelf.location || !shelf.location._id) {
        return total;
      }
      try {
        const locationQuantity = product.locations.find(loc => {
          if (!loc || !loc.locationId) return false;
          try {
            const locIdStr = typeof loc.locationId === 'string' ? loc.locationId : loc.locationId.toString();
            const shelfIdStr = typeof shelf.location!._id === 'string' ? shelf.location!._id : shelf.location!._id!.toString();
            return locIdStr === shelfIdStr;
          } catch {
            return false;
          }
        })?.quantity || 0;
        return total + locationQuantity;
      } catch {
        return total;
      }
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

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

          {/* Header */}
          <div className="flex items-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Warehouse Layout
            </h1>
          </div>

          {/* Action Bar: sticky search + rack filter + legend */}
          <div className="mb-8 sticky top-4 z-20">
            <div className="flex flex-col md:flex-row gap-3 md:items-center bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3">
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products by name, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 pr-9 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Rack filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Rack</label>
                <select
                  value={rackFilter}
                  onChange={(e) => setRackFilter((e.target.value as any) === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">All</option>
                  {Array.from({ length: warehouseStructure.rafts }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>Rack {r}</option>
                  ))}
                </select>
              </div>

              {/* Legend + results */}
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-gradient-to-r from-green-500 to-emerald-600"></span>
                  <span>Has Products</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-gradient-to-r from-slate-600 to-slate-700"></span>
                  <span>Empty</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-gradient-to-r from-yellow-400 to-orange-500"></span>
                  <span>Match</span>
                </div>
                {searchResults.length > 0 && (
                  <div className="text-xs text-slate-400">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Warehouse Layout */}
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Warehouse Layout - 3 Vertical Racks × 5 Shelves Each</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {visibleRafts.map((raftId) => {
                    const raftShelves = shelves.filter(shelf => shelf.raftId === raftId);
                    
                    return (
                      <div key={raftId} className="bg-slate-700/30 rounded-xl p-4 relative">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-cyan-400">Rack {raftId}</h3>
                          <div className="text-xs text-slate-400">Click shelf to add/remove</div>
                        </div>
                        
                        {/* Vertical rack visualization */}
                        <div className="relative">
                          {/* Rack frame */}
                          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-slate-500 h-full rounded"></div>
                          <div className="absolute left-2 top-0 w-1 bg-slate-500 h-full rounded"></div>
                          <div className="absolute right-2 top-0 w-1 bg-slate-500 h-full rounded"></div>
                          
                          {/* Shelves - from top to bottom */}
                          <div className="space-y-3">
                            {raftShelves.sort((a, b) => a.shelfId - b.shelfId).map((shelf) => {
                              const productCount = getShelfProductCount(shelf);
                              const isSelected = selectedShelf?.raftId === shelf.raftId && selectedShelf?.shelfId === shelf.shelfId;
                              const usage = getShelfCapacityUsage(shelf);
                              const shelfKey = `${shelf.raftId}-${shelf.shelfId}`;

                              return (
                                <div key={shelfKey} className="relative">
                                  <button
                                    onClick={(e) => handleShelfClick(shelf, e)}
                                    onDoubleClick={() => handleAddItemsClick(shelf)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleShelfClick(shelf, e as any);
                                      if (e.key === 'A' && (e.ctrlKey || e.metaKey)) handleAddItemsClick(shelf);
                                      if (e.key === 'R' && (e.ctrlKey || e.metaKey)) handleRemoveItemsClick(shelf);
                                    }}
                                    tabIndex={0}
                                    aria-label={`Rack ${shelf.raftId} shelf ${shelf.shelfId}`}
                                    className={`
                                      w-full p-2.5 rounded-lg transition-all duration-200
                                      ${getShelfColor(shelf)}
                                      ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-800' : ''}
                                      relative z-10 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                                    `}
                                  >
                                    {/* Hover actions */}
                                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); handleAddItemsClick(shelf); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleAddItemsClick(shelf); } }}
                                        className="px-1.5 py-0.5 text-[10px] bg-emerald-500/90 hover:bg-emerald-600 text-white rounded cursor-pointer select-none"
                                        title="Add items"
                                      >+ Add</span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); handleRemoveItemsClick(shelf); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleRemoveItemsClick(shelf); } }}
                                        className="px-1.5 py-0.5 text-[10px] bg-rose-500/90 hover:bg-rose-600 text-white rounded cursor-pointer select-none"
                                        title="Remove items"
                                      >− Rem</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded">S{shelf.shelfId}</span>
                                        <span className="text-[11px] text-white/80">{shelf.products.length} items</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {productCount > 0 && (
                                          <span className="text-[11px] text-white/90 bg-white/20 px-2 py-0.5 rounded">{productCount} qty</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Capacity bar */}
                                    <div className="mt-2 h-1.5 w-full bg-black/20 rounded overflow-hidden">
                                      <div
                                        className={`${usage.pct >= 90 ? 'bg-rose-500' : usage.pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'} h-full`}
                                        style={{ width: `${usage.pct}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 text-[10px] text-white/70">
                                      {usage.qty}/{usage.cap} used
                                    </div>

                                    {highlightedShelves.has(shelfKey) && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
                    <span className="text-slate-400">Has Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-slate-600 to-slate-700 rounded"></div>
                    <span className="text-slate-400">Empty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded animate-pulse"></div>
                    <span className="text-slate-400">Search Match</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shelf Details */}
            <div className="lg:col-span-1">
              {selectedShelf ? (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
                  <div className="px-6 py-4 border-b border-slate-700/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-medium text-white">
                          Raft {selectedShelf.raftId} - Shelf {selectedShelf.shelfId}
                        </h2>
                        {selectedShelf.location && (
                          <div className="mt-1 flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-slate-400 whitespace-nowrap">Rack {selectedShelf.raftId}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 whitespace-nowrap">Shelf {selectedShelf.shelfId}</span>
                            <span className="text-slate-500">•</span>
                            {!editingCapacity ? (
                              <>
                                <span className="text-slate-300 whitespace-nowrap">Capacity: {selectedShelf.location.capacity ?? 10}</span>
                                <button
                                  onClick={startEditCapacity}
                                  className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700/50 whitespace-nowrap"
                                >Edit</button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-slate-400">Capacity:</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={newCapacity}
                                  onChange={(e) => setNewCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button
                                  onClick={saveCapacity}
                                  className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={loading}
                                >Save</button>
                                <button
                                  onClick={cancelEditCapacity}
                                  className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                >Cancel</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setActionMode('add'); setShowAddItems(true); }}
                          className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                        >Add Items</button>
                        <button
                          onClick={() => { setActionMode('remove'); setShowAddItems(true); }}
                          className="px-3 py-1.5 text-xs rounded bg-rose-600 hover:bg-rose-700 text-white"
                        >Remove Items</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {selectedShelf.products.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3">
                          Products ({selectedShelf.products.length})
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto nice-scrollbar pr-1">
                          {selectedShelf.products.map((product) => {
                            const locationQuantity = product.locations?.find(loc => {
                              if (!loc || !loc.locationId || !selectedShelf.location || !selectedShelf.location._id) {
                                return false;
                              }
                              try {
                                const locIdStr = typeof loc.locationId === 'string' ? loc.locationId : loc.locationId.toString();
                                const shelfIdStr = typeof selectedShelf.location._id === 'string' ? selectedShelf.location._id : selectedShelf.location._id.toString();
                                return locIdStr === shelfIdStr;
                              } catch {
                                return false;
                              }
                            })?.quantity || 0;
                            
                            return (
                              <button
                                key={product._id?.toString()}
                                onClick={() => openProductDetails(product)}
                                className="w-full text-left bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-3 transition-colors"
                              >
                                <div className="flex gap-3 items-start mb-1">
                                  <div className="flex-shrink-0">
                                    {product.images && product.images.length > 0 ? (
                                      // Using native img to avoid NextImage config inside component tree
                                      <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="h-10 w-10 rounded object-cover border border-slate-600"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/api/placeholder/40/40'; }}
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-slate-600/40 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300">No Img</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <h4 className="text-sm font-medium text-white truncate" title={product.name}>{product.name}</h4>
                                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                                        {locationQuantity} qty
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-0.5 truncate">SKU: {product.sku}</p>
                                    <p className="text-xs text-slate-400 truncate">{product.category}</p>
                                    {product.description && (
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-slate-500 mb-2">📦</div>
                        <p className="text-slate-400 text-sm">No products in this shelf</p>
                        {selectedShelf.location ? (
                          <p className="text-slate-500 text-xs mt-1">
                            Capacity: {selectedShelf.location.capacity ?? 10}
                          </p>
                        ) : (
                          <p className="text-slate-500 text-xs mt-1">
                            Location not configured
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
                  <div className="p-6 text-center">
                    <div className="text-slate-500 mb-2">👆</div>
                    <p className="text-slate-400">Click on a shelf to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add/Remove Items Modal */}
          {showAddItems && selectedShelf && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto nice-scrollbar">
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {actionMode === 'add' ? 'Add' : 'Remove'} Items — Rack {selectedShelf.raftId} · Shelf {selectedShelf.shelfId}
                  </h2>
                  <button
                    onClick={() => setShowAddItems(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-white">Select Products to {actionMode === 'add' ? 'Add' : 'Remove'}</h3>
                      <div className="text-xs text-slate-400">Mode:</div>
                      <div className="flex items-center gap-2 text-xs">
                        <button onClick={() => setActionMode('add')} className={`px-2 py-1 rounded border ${actionMode==='add'?'bg-cyan-500/20 border-cyan-500/40 text-cyan-300':'border-slate-600 text-slate-300 hover:bg-slate-700/40'}`}>Add</button>
                        <button onClick={() => setActionMode('remove')} className={`px-2 py-1 rounded border ${actionMode==='remove'?'bg-red-500/20 border-red-500/40 text-red-300':'border-slate-600 text-slate-300 hover:bg-slate-700/40'}`}>Remove</button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{actionMode === 'add' ? 'Choose products and quantities to allocate to this shelf' : 'Choose products and quantities to remove from this shelf'}</p>
                  </div>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    {selectedProducts.map((item, index) => {
                      // compute constraints
                      const product = allProducts.find(p => p._id?.toString() === item.productId);
                      let maxQty = 999999;
                      let helper = '';
                      if (product) {
                        if (actionMode === 'add') {
                          const allocated = (product.locations || []).reduce((sum, l) => sum + (l.quantity || 0), 0);
                          const available = Math.max(0, (product.quantity || 0) - allocated);
                          maxQty = available;
                          helper = `Available to allocate: ${available}`;
                        } else if (actionMode === 'remove' && selectedShelf?.location?._id) {
                          const shelfIdStr = selectedShelf.location._id?.toString();
                          const onShelf = (product.locations || []).find(l => l.locationId?.toString() === shelfIdStr)?.quantity || 0;
                          maxQty = onShelf;
                          helper = `On this shelf: ${onShelf}`;
                        }
                      }
                      return (
                      <div key={index} className="flex gap-3 items-center bg-slate-700/30 p-3 rounded-lg">
                        <select
                          value={item.productId}
                          onChange={(e) => updateSelectedProduct(index, 'productId', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">Select a product</option>
                          {(actionMode === 'add' ? allProducts : allProducts.filter(p => {
                            if (!selectedShelf?.location?._id) return false;
                            const sid = selectedShelf.location._id.toString();
                            return (p.locations || []).some(l => l.locationId?.toString() === sid && (l.quantity || 0) > 0);
                          })).map((product) => (
                            <option key={product._id?.toString()} value={product._id?.toString()}>
                              {product.name} - {product.sku}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max={isFinite(maxQty) ? maxQty : undefined}
                          value={item.quantity}
                          onChange={(e) => updateSelectedProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Qty"
                        />
                        <div className="text-xs text-slate-400 min-w-[120px]">{helper}</div>
                        <button
                          onClick={() => removeSelectedProduct(index)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={handleAddProduct}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-all"
                    >
                      + {actionMode === 'add' ? 'Add Another Product' : 'Add Product to Remove'}
                    </button>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddItems(false)}
                      className="px-6 py-3 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveItemsToShelf}
                      disabled={
                        loading ||
                        selectedProducts.length === 0 ||
                        selectedProducts.some(p => !p.productId || p.quantity <= 0)
                      }
                      className={`px-6 py-3 rounded-lg text-sm font-medium text-white transition-all ${
                        loading || selectedProducts.length === 0 || selectedProducts.some(p => !p.productId || p.quantity <= 0)
                          ? 'bg-slate-600 cursor-not-allowed opacity-50'
                          : (actionMode === 'add'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-[1.02] shadow-lg'
                              : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transform hover:scale-[1.02] shadow-lg')
                      }`}
                    >
                      {loading ? (actionMode === 'add' ? 'Adding...' : 'Removing...') : (actionMode === 'add' ? 'Add Items to Rack' : 'Remove Items from Rack')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-medium text-white">Search Results ({searchResults.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((product) => {
                    return (
                      <button
                        key={product._id?.toString()}
                        onClick={() => openProductDetails(product)}
                        className="text-left bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 transition-colors"
                      >
                        <div className="flex gap-3 items-start">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-12 w-12 rounded object-cover border border-slate-600"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/api/placeholder/48/48'; }}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded bg-slate-600/40 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300">No Img</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white mb-1 truncate" title={product.name}>{product.name}</h3>
                            <p className="text-xs text-slate-400 mb-0.5 truncate">SKU: {product.sku}</p>
                            <p className="text-xs text-slate-400 truncate">Category: {product.category}</p>
                            {product.locationDetails && product.locationDetails.length > 0 && (
                              <div className="mt-2">
                                <p className="text-[11px] text-slate-300 mb-1">Locations:</p>
                                {product.locationDetails.map((location, index) => {
                                  const locationQuantity = product.locations?.find(loc => 
                                    loc.locationId.toString() === location._id?.toString()
                                  )?.quantity || 0;
                                  return (
                                    <div key={index} className="text-[11px] text-cyan-400 truncate">
                                      {location.name} ({locationQuantity} qty)
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showProductDetail && detailProduct && (
        <ProductDetailModal
          isOpen={showProductDetail}
          onClose={() => setShowProductDetail(false)}
          onSuccess={async () => {
            await fetchWarehouseData();
          }}
          product={detailProduct}
          onEdit={() => {
            // For now just close; edit flow can be integrated with ProductModal later
            setShowProductDetail(false);
          }}
        />
      )}
    </div>
  );
};

export default WarehouseVisualization;
