'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Location } from '@/types/database';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Warehouse layout state
  const [racks, setRacks] = useState<number[]>([1, 2, 3]);
  const [shelvesByRack, setShelvesByRack] = useState<Record<number, number>>({ 1: 5, 2: 5, 3: 5 });
  const [selectedRack, setSelectedRack] = useState<number>(1);
  const [selectedShelf, setSelectedShelf] = useState<number>(1);

  // New location form state
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: 'warehouse' as Location['type'],
    code: '',
    description: '',
    capacity: 0,
    parentLocationId: '',
    isActive: true
  });

  const selectedCode = useMemo(() => `R${selectedRack}S${selectedShelf}`, [selectedRack, selectedShelf]);

  // Fetch locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      setLocations(data);
      // Build rack/shelf structure from codes like R{rack}S{shelf}
      const rackSet = new Set<number>();
      const shelvesMap: Record<number, number> = {};
      const codeRegex = /^R(\d+)S(\d+)$/i;
      for (const loc of data as Location[]) {
        const m = codeRegex.exec(loc.code || '');
        if (!m) continue;
        const r = parseInt(m[1], 10);
        const s = parseInt(m[2], 10);
        rackSet.add(r);
        shelvesMap[r] = Math.max(shelvesMap[r] || 0, s);
      }
      const defaultRacks = [1, 2, 3];
      const rackArr = Array.from(new Set<number>([...defaultRacks, ...Array.from(rackSet)])).sort((a, b) => a - b);
      for (const r of rackArr) {
        if (!shelvesMap[r]) shelvesMap[r] = 5;
        shelvesMap[r] = Math.max(shelvesMap[r], 5);
      }
      setRacks(rackArr);
      setShelvesByRack(shelvesMap);
      setError(null);
    } catch (error) {
      setError('Error fetching locations');
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewLocation(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'capacity' ? parseInt(value) || 0 : value
    }));
  };

  const handleCreateLocation = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const locationData = {
        ...newLocation,
        parentLocationId: newLocation.parentLocationId || undefined
      };

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create location');
      }

      // Reset form and close modal
      setNewLocation({
        name: '',
        type: 'warehouse',
        code: '',
        description: '',
        capacity: 0,
        parentLocationId: '',
        isActive: true
      });
      setShowCreateLocation(false);
      
      // Refresh locations list
      await fetchLocations();
      
    } catch (error) {
      setError('Error creating location: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Error creating location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation?._id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/locations/${editingLocation._id.toString()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update location');
      }

      setEditingLocation(null);
      setShowCreateLocation(false);
      setNewLocation({
        name: '',
        type: 'warehouse',
        code: '',
        description: '',
        capacity: 0,
        parentLocationId: '',
        isActive: true
      });
      
      await fetchLocations();
      
    } catch (error) {
      setError('Error updating location: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Error updating location:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete location');
      }

      // Clear selected location if it was the deleted one
      if (selectedLocation?._id?.toString() === locationId) {
        setSelectedLocation(null);
      }

      await fetchLocations();
    } catch (error) {
      setError('Error deleting location');
      console.error('Error deleting location:', error);
    }
  };

  const startEditing = (location: Location) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name,
      type: location.type,
      code: location.code,
      description: location.description || '',
      capacity: location.capacity,
      parentLocationId: location.parentLocationId?.toString() || '',
      isActive: location.isActive
    });
    setShowCreateLocation(true);
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warehouse':
        return 'bg-blue-100 text-blue-800';
      case 'shelf':
        return 'bg-green-100 text-green-800';
      case 'bin':
        return 'bg-yellow-100 text-yellow-800';
      case 'zone':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (location.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || location.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
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

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Locations
            </h1>
            <button
              onClick={() => setShowCreateLocation(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              Add New Location
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, code, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              >
                <option value="all">All Types</option>
                <option value="warehouse">Warehouse</option>
                <option value="shelf">Shelf</option>
                <option value="bin">Bin</option>
                <option value="zone">Zone</option>
              </select>
            </div>
          </div>

          {/* Warehouse Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-white">Warehouse Layout - Vertical Racks × Shelves</h2>
                  <span className="text-slate-400 text-sm">Click shelf to select</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {racks.map((rack) => (
                    <div key={rack} className={`relative rounded-2xl border ${selectedRack === rack ? 'border-cyan-500' : 'border-slate-600/50'} bg-slate-900/40 p-5`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-cyan-300 font-semibold">Rack {rack}</span>
                        <span className="text-slate-500 text-xs">R{rack}</span>
                      </div>
                      {/* Vertical spine */}
                      <div className="absolute left-1/2 top-16 bottom-5 -translate-x-1/2 w-px bg-slate-600/30 hidden md:block" />

                      <div className="space-y-3">
                        {Array.from({ length: shelvesByRack[rack] || 5 }, (_, i) => i + 1).map((shelf) => {
                          const active = selectedRack === rack && selectedShelf === shelf;
                          const code = `R${rack}S${shelf}`;
                          const matchesSearch = searchQuery.trim() && code.toLowerCase().includes(searchQuery.toLowerCase());
                          return (
                            <button
                              key={shelf}
                              type="button"
                              onClick={() => { setSelectedRack(rack); setSelectedShelf(shelf); setSelectedLocation(null); }}
                              className={`relative w-full text-left px-4 py-3 rounded-xl border transition-all group
                                ${active ? 'bg-green-500 border-green-400 text-white shadow-inner'
                                          : 'bg-slate-800/60 border-slate-600/60 text-slate-300 hover:bg-slate-700/60'}
                                ${matchesSearch ? 'ring-2 ring-amber-400/70' : ''}`}
                              title={code}
                            >
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
                <div className="mt-5 flex items-center space-x-6 text-sm text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-green-500 border border-green-400" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-slate-800/60 border border-slate-600/60" />
                    <span>Empty</span>
                  </div>
                  {searchQuery && (
                    <div className="flex items-center space-x-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-amber-400/70 border border-amber-300/70" />
                      <span>Search Match</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected details */}
            <div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{`Rack ${selectedRack} · Shelf ${selectedShelf}`}</h3>
                  <span className="text-xs text-slate-400">{selectedCode}</span>
                </div>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>No product data linked. Select shelves to assign via the Product modal.</p>
                  <p className="text-slate-400">Tip: Use the search box to quickly find a code like "{selectedCode}".</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Locations List */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50">
                  <h2 className="text-lg font-medium text-white">Locations ({filteredLocations.length})</h2>
                </div>
                
                {loading && (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
                    <p className="mt-2 text-slate-400">Loading locations...</p>
                  </div>
                )}

                <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                  {filteredLocations.map((location) => (
                    <div
                      key={location._id?.toString()}
                      className={`p-6 cursor-pointer hover:bg-slate-700/30 transition-colors ${
                        selectedLocation?._id?.toString() === location._id?.toString() ? 'bg-slate-700/50 border-l-4 border-cyan-500' : ''
                      }`}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-medium text-white">{location.name}</h3>
                          <p className="text-sm text-slate-300">Code: {location.code}</p>
                          {location.description && (
                            <p className="text-sm text-slate-400 mt-1">{location.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(location.type)}`}>
                            {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
                          </span>
                          <p className="text-sm text-slate-300 mt-1">Capacity: {location.capacity}</p>
                          {!location.isActive && (
                            <p className="text-xs text-red-400 mt-1">Inactive</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-slate-400">
                        <span>Created: {formatDate(location.createdAt)}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(location);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLocation(location._id!.toString());
                            }}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="lg:col-span-1">
              {selectedLocation ? (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
                  <div className="px-6 py-4 border-b border-slate-700/50">
                    <h2 className="text-lg font-medium text-white">Location Details</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Name</h3>
                        <p className="text-white">{selectedLocation.name}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Code</h3>
                        <p className="text-white">{selectedLocation.code}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Type</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(selectedLocation.type)}`}>
                          {selectedLocation.type.charAt(0).toUpperCase() + selectedLocation.type.slice(1)}
                        </span>
                      </div>

                      {selectedLocation.description && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Description</h3>
                          <p className="text-white">{selectedLocation.description}</p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Capacity</h3>
                        <p className="text-white">{selectedLocation.capacity}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Status</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          selectedLocation.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedLocation.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Created</h3>
                        <p className="text-white">{formatDate(selectedLocation.createdAt)}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Last Updated</h3>
                        <p className="text-white">{formatDate(selectedLocation.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl">
                  <div className="p-6 text-center">
                    <p className="text-slate-400">Select a location to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create/Edit Location Modal */}
          {showCreateLocation && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {editingLocation ? 'Edit Location' : 'Create New Location'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateLocation(false);
                      setEditingLocation(null);
                      setNewLocation({
                        name: '',
                        type: 'warehouse',
                        code: '',
                        description: '',
                        capacity: 0,
                        parentLocationId: '',
                        isActive: true
                      });
                    }}
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
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={newLocation.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Code</label>
                      <input
                        type="text"
                        name="code"
                        value={newLocation.code}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                      <select
                        name="type"
                        value={newLocation.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        <option value="warehouse">Warehouse</option>
                        <option value="shelf">Shelf</option>
                        <option value="bin">Bin</option>
                        <option value="zone">Zone</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={newLocation.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        value={newLocation.capacity}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Parent Location (Optional)</label>
                      <select
                        name="parentLocationId"
                        value={newLocation.parentLocationId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        <option value="">No parent location</option>
                        {locations.filter(loc => loc._id?.toString() !== editingLocation?._id?.toString()).map((location) => (
                          <option key={location._id?.toString()} value={location._id?.toString()}>
                            {location.name} ({location.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={newLocation.isActive}
                        onChange={handleInputChange}
                        className="mr-2 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                      />
                      <label className="text-sm text-slate-300">Active</label>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateLocation(false);
                        setEditingLocation(null);
                        setNewLocation({
                          name: '',
                          type: 'warehouse',
                          code: '',
                          description: '',
                          capacity: 0,
                          parentLocationId: '',
                          isActive: true
                        });
                      }}
                      className="px-6 py-3 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={editingLocation ? handleUpdateLocation : handleCreateLocation}
                      disabled={loading || !newLocation.name || !newLocation.code}
                      className={`px-6 py-3 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        loading || !newLocation.name || !newLocation.code 
                          ? 'bg-slate-600 cursor-not-allowed opacity-50' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg'
                      }`}
                    >
                      {loading ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
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

export default Locations;
