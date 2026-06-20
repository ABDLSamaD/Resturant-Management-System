import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  PhoneCall, 
  Store, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Shop, ProductCategory } from '../types';

export default function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shopsRes, categoriesRes] = await Promise.all([
        fetch('/api/shops'),
        fetch('/api/product-categories')
      ]);
      
      const shopsData = await shopsRes.json();
      const categoriesData = await categoriesRes.json();

      if (shopsData.success) setShops(shopsData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
    } catch (err) {
      setError('Failed to fetch store database details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingShop(null);
    setFormData({ name: '', phone: '', address: '', description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name,
      phone: shop.phone || '',
      address: shop.address || '',
      description: shop.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const url = editingShop ? `/api/shops/${editingShop.id}` : '/api/shops';
      const method = editingShop ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      setError('An expected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this shop registration? Categories linked to this shop will lose association.')) return;

    try {
      const res = await fetch(`/api/shops/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setError(data.message || 'Deletion failed');
      }
    } catch (err) {
      console.error(err);
      setError('Could not contact server to delete shop block.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-[#E4E4E7] pb-5">
        <div>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#0f223a] flex items-center gap-2">
            <Store className="h-7 w-7 text-[#0f223a]" />
            Registered Shops
          </h1>
          <p className="mt-1 text-xs text-[#71717A]">
            Configure independent merchant counters, service blocks, and organize menu categories.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f223a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add New Shop
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2.5 border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="font-sans text-xs text-[#71717A] animate-pulse">Scanning shop nodes...</span>
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E4E4E7] bg-white py-14 text-center">
          <Building2 className="mx-auto h-12 w-12 text-[#A1A1AA]" />
          <h3 className="mt-4 font-sans text-sm font-bold text-[#0f223a]">No Registered Shops</h3>
          <p className="mt-1 text-xs text-[#71717A] max-w-xs mx-auto">
            Get started by adding independent food stalls, fast food counters, and barbecue stations.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0f223a] px-3.5 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Shop Slot
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => {
            // Count categories under this shop
            const linkedCats = categories.filter(c => c.shopId === shop.id && c.isActive);

            return (
              <div 
                key={shop.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[#E4E4E7] bg-white p-5 transition-all hover:shadow-xs hover:border-[#D4D4D8]"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#0f223a]">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(shop)}
                        className="rounded p-1 text-[#71717A] hover:bg-slate-100 hover:text-[#0f223a] transition-colors"
                        title="Edit Shop Details"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shop.id)}
                        className="rounded p-1 text-[#71717A] hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Shop"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-sans text-sm font-bold text-[#0f223a] group-hover:text-[#0f223a] transition-colors">
                      {shop.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#71717A] font-sans line-clamp-2 leading-relaxed min-h-[32px]">
                      {shop.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metadata Indicators */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[11px] text-[#71717A]">
                    {shop.phone && (
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>{shop.phone}</span>
                      </div>
                    )}
                    {shop.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                      <span className="font-semibold text-slate-800">
                        {linkedCats.length} Categories Linked
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subcategories preview tags */}
                {linkedCats.length > 0 && (
                  <div className="mt-4 pt-2.5 flex flex-wrap gap-1 border-t border-slate-50">
                    {linkedCats.map(cat => (
                      <span 
                        key={cat.id} 
                        className="inline-flex items-center rounded bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-600 border border-slate-100"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#E4E4E7]">
            <h2 className="font-sans text-sm font-extrabold text-[#0f223a] border-b border-[#E4E4E7] pb-3 mb-4 uppercase tracking-wider">
              {editingShop ? 'Modify Shop Settings' : 'Add New Counter Slot'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Shop Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Royal Tandoor"
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 555-1200"
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Physical Counter / Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Counter 1, Stall 4"
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Description / Offerings</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Naan, Chapati, Dal lentils, spicy handis..."
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border border-[#E4E4E7] px-4 py-1.5 text-xs font-semibold text-[#0f223a] hover:bg-[#F4F4F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-[#0f223a] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : editingShop ? 'Update Details' : 'Save Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
