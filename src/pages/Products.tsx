import React, { useState, useEffect } from 'react';
import { 
  Pizza, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Check, 
  X,
  Languages,
  Image,
  Loader
} from 'lucide-react';
import { Product, ProductCategory, Shop } from '../types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter keys
  const [search, setSearch] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [activeOnly, setActiveOnly] = useState('true');

  // Product Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
    isActive: true
  });

  // AI Generation states inside Form / separate panel
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiRatio, setAiRatio] = useState<'1:1' | '16:9' | '4:3'>('1:1');

  // Category Modal states
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catShopId, setCatShopId] = useState('');

  const [shops, setShops] = useState<Shop[]>([]);

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [search, selCategory, activeOnly]);

  async function loadData() {
    try {
      setLoading(true);
      // Categories
      const catRes = await fetch('/api/product-categories');
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.data);

      // Shops
      const shopRes = await fetch('/api/shops');
      const shopData = await shopRes.json();
      if (shopData.success) setShops(shopData.data);

      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (selCategory) q.append('category', selCategory);
      if (activeOnly) q.append('active', activeOnly);

      const prodRes = await fetch(`/api/products?${q.toString()}`);
      const prodData = await prodRes.json();
      if (prodData.success) setProducts(prodData.data);
    } catch (err) {
      console.error('Error fetching menu items', err);
    } finally {
      setLoading(false);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  const handleOpenAdd = () => {
    setEditingProd(null);
    setProdForm({
      name: '',
      category: categories[0]?.name || 'Salan',
      price: '',
      description: '',
      imageUrl: '',
      isActive: true
    });
    setAiPrompt('');
    setShowProductForm(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProd(p);
    setProdForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      isActive: p.isActive
    });
    setAiPrompt('');
    setShowProductForm(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.price) {
      triggerToast('error', 'Name and Price are mandatory fields.');
      return;
    }

    try {
      const url = editingProd ? `/api/products/${editingProd.id}` : '/api/products';
      const method = editingProd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prodForm, price: Number(prodForm.price) })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', editingProd ? 'Product card modified.' : 'New dish added to menu card.');
        setShowProductForm(false);
        loadData();
      }
    } catch (err) {
      triggerToast('error', 'Network failure saving.');
    }
  };

  const handleMarkInactive = async (id: string) => {
    if (!confirm('Mark this dish inactive?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Product card disabled.');
        loadData();
      }
    } catch (err) {
      triggerToast('error', 'Network fail.');
    }
  };

  // Trigger Gemini AI Image Creator to generate menu item prompt-driven illustration
  const handleGenerateAiImage = async () => {
    if (!aiPrompt) {
      triggerToast('error', 'Please enter a descriptive prompt first (e.g. "Steaming Clay bowl of Butter Chicken").');
      return;
    }

    try {
      setIsAiGenerating(true);
      triggerToast('success', 'Gemini is drafting your promotional banner texture now...');
      
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, aspectRatio: aiRatio })
      });
      const data = await res.json();

      if (data.success && data.data?.imageUrl) {
        setProdForm({ ...prodForm, imageUrl: data.data.imageUrl });
        triggerToast('success', 'AI graphics rendered! Appended as product preview.');
      } else {
        triggerToast('error', data.message || 'Gemini model busy, please retry.');
      }
    } catch (err) {
      triggerToast('error', 'Network connection failure generating image.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    try {
      const res = await fetch('/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, description: catDesc, shopId: catShopId })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', 'Dish category structured.');
        setCatName('');
        setCatDesc('');
        setCatShopId('');
        setShowCatForm(false);
        loadData();
      } else {
        triggerToast('error', 'Category name already exists.');
      }
    } catch (err) {
      triggerToast('error', 'Network fail structuring category.');
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {statusMsg.text && (
        <div id="toast-notif" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#18181B] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E4E4E7]">
        <div>
          <h1 id="products-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">Menu & Product Catalog</h1>
          <p className="font-sans text-xs text-[#71717A]">Edit menu card listings, structure food categories, and draft promotional banners utilizing the Gemini AI image generator.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            id="btn-product-cat-open"
            onClick={() => setShowCatForm(true)}
            className="inline-flex items-center gap-1.5 rounded border border-[#E4E4E7] bg-white px-3.5 py-2 font-sans text-xs font-semibold text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
          >
            Manage Categories
          </button>
          <button 
            id="btn-product-form-open"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded bg-[#18181B] px-3.5 py-2 font-sans text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Category Modal Quick list */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7]">
            <div className="flex justify-between items-center border-b border-[#E4E4E7] pb-3">
              <h3 className="font-sans text-sm font-bold text-[#18181B]">Food Menu Categories</h3>
              <button onClick={() => setShowCatForm(false)} className="rounded p-1 hover:bg-[#F4F4F5]"><X className="h-4 w-4 text-[#18181B]" /></button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Category Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Charcoal BBQ, Traditional Soups..."
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Summary (Optional)</label>
                <input 
                  type="text"
                  placeholder="Details..."
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Assign Under Shop</label>
                <select
                  value={catShopId}
                  onChange={e => setCatShopId(e.target.value)}
                  className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#18181B]"
                >
                  <option value="">-- Let Owner Choose --No Shop linked</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full rounded bg-[#18181B] py-2 font-sans text-xs font-bold text-white hover:opacity-90">Save Category</button>
            </form>

            <div className="mt-4 border-t border-[#E4E4E7] pt-4 max-h-48 overflow-y-auto space-y-1">
              {categories.map(c => {
                const matchedShop = shops.find(s => s.id === c.shopId);
                return (
                  <div key={c.id} className="flex justify-between items-start text-xs text-[#18181B] bg-[#F4F4F5] border border-[#E4E4E7] rounded p-2 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px]">{c.name}</span>
                      {matchedShop && (
                        <span className="text-[9px] font-semibold text-[#71717A] tracking-tight truncate max-w-[170px] uppercase">
                          Shop: {matchedShop.name}
                        </span>
                      )}
                    </div>
                    {!c.isActive && <span className="text-[9px] text-[#A1A1AA] uppercase font-bold shrink-0">Disabled</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main product dialog with integrated AI image generator workspace */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg border border-[#E4E4E7] grid gap-6 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
            {/* Left Column: Product Properties Form */}
            <div>
              <h3 className="font-sans text-sm font-bold text-[#18181B] pb-3 border-b border-[#E4E4E7] mb-4">
                {editingProd ? `Edit Menu Dish - ${editingProd.name}` : 'Create New Menu Item'}
              </h3>

              <form onSubmit={handleSubmitProduct} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Dish Name</label>
                  <input 
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
                    placeholder="e.g. Mutton Roghni Karahi"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Course Category</label>
                  <select 
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#18181B]"
                  >
                    {categories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Salan">Salan</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Billing Price (Rs. / PKR)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.price}
                    onChange={e => setProdForm({ ...prodForm, price: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
                    placeholder="e.g. 14.50"
                  />
                </div>

                 <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Custom Description</label>
                  <textarea 
                    value={prodForm.description}
                    onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    rows={2}
                    placeholder="Spiced gravy clay oven dish..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Illustrative Preview URL (Optional)</label>
                  <input 
                    type="text"
                    value={prodForm.imageUrl}
                    onChange={e => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    placeholder="Dynamic AI texture or image path"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E4E4E7]">
                  <button type="button" onClick={() => setShowProductForm(false)} className="flex-1 rounded border border-[#E4E4E7] py-2.5 text-xs font-bold text-[#71717A] hover:bg-[#F4F4F5] transition-colors">Close</button>
                  <button type="submit" className="flex-1 rounded bg-[#0f223a] py-2.5 text-xs font-bold text-white hover:opacity-90">Save Listing</button>
                </div>
              </form>
            </div>

             {/* Right Column: Dynamic AIS Gemini Image generator Workspace */}
            <div className="border-l border-[#E4E4E7] pl-0 md:pl-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f223a] mb-2">
                  <Sparkles className="h-4 w-4 text-[#0f223a]" />
                  <span>AIS AI Creative Workspace</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-[#71717A] mb-4">
                  Write detailed text prompts to render high-quality promo banners. The AI generated results will auto-apply to the menu picture slot!
                </p>

                {prodForm.imageUrl ? (
                  <div className="rounded overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] h-32 flex items-center justify-center relative mb-4">
                    <img src={prodForm.imageUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setProdForm({ ...prodForm, imageUrl: '' })}
                      className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-1 text-white hover:bg-slate-950"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-[#E4E4E7] h-32 flex flex-col items-center justify-center text-[#A1A1AA] text-xs mb-4">
                    {isAiGenerating ? (
                      <div className="text-center font-sans">
                        <Loader className="h-6 w-6 animate-spin text-[#0f223a] mx-auto mb-2" />
                        <span className="text-[10px] font-semibold text-[#71717A]">Gemini Image Preview compiling...</span>
                      </div>
                    ) : (
                      <>
                        <Image className="h-8 w-8 text-[#A1A1AA] mb-1" />
                        <span>No product dish image loaded.</span>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Render Text Prompt</label>
                    <textarea 
                      placeholder="e.g. Delicious hot bowl of Dal Makhani lentils with a pat of butter, top down culinary lighting portrait style"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Dimensions Formats</label>
                    <div className="mt-1 flex gap-1.5">
                      {['1:1', '4:3', '16:9'].map(r => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setAiRatio(r as any)}
                          className={`rounded px-2.5 py-1 font-mono text-[9px] font-bold border ${aiRatio === r ? 'bg-[#0f223a] text-white border-[#0f223a]' : 'bg-white text-[#71717A] border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
                        >
                          {r} Ratio
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-ai-generate"
                disabled={isAiGenerating}
                onClick={handleGenerateAiImage}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded border border-[#E4E4E7] bg-white px-3 py-2.5 font-sans text-xs font-bold text-[#0f223a] hover:bg-[#F4F4F5] disabled:opacity-55 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Render Creative Dish Graphic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product categories quick pills */}
      <div className="flex flex-wrap gap-1.5">
        <button 
          onClick={() => setSelCategory('')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${!selCategory ? 'bg-[#0f223a] text-white' : 'bg-white text-[#71717A] border border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelCategory(c.name)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${selCategory === c.name ? 'bg-[#0f223a] text-white' : 'bg-white text-[#71717A] border border-[#E4E4E7] hover:bg-[#F4F4F5]'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Filter Options */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#A1A1AA]" />
            <input 
              type="text"
              placeholder="Search dishes by name or descriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-[#F4F4F5] pl-10 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#0f223a]"
            />
          </div>

          <div>
            <select 
              value={activeOnly}
              onChange={e => setActiveOnly(e.target.value)}
              className="w-full rounded border border-[#E4E4E7] bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#0f223a]"
            >
              <option value="true">Active List Only</option>
              <option value="">All Menu items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0f223a] border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="group rounded-xl border border-[#E4E4E7] bg-white overflow-hidden relative flex flex-col justify-between">
              <div>
                {/* Image layout placeholder */}
                {p.imageUrl ? (
                  <div className="h-40 w-full overflow-hidden bg-[#F4F4F5] relative">
                    <img src={p.imageUrl} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="h-40 w-full bg-[#F4F4F5] flex flex-col items-center justify-center text-[#71717A] border-b border-[#E4E4E7]">
                    <Pizza className="h-10 w-10 text-[#A1A1AA] stroke-1" />
                    <span className="text-[10px] text-[#A1A1AA] font-medium">No dish preview set</span>
                  </div>
                )}

                <div className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-sans text-sm font-bold text-[#0f223a]">{p.name}</h3>
                      <div className="mt-0.5 flex flex-wrap gap-1 items-center">
                        <span className="font-sans text-[9px] text-[#71717A] font-extrabold tracking-tight uppercase">{p.category}</span>
                        {(() => {
                          const catObj = categories.find(c => c.name === p.category);
                          const shObj = catObj && shops.find(s => s.id === catObj.shopId);
                          return shObj ? (
                            <span className="rounded bg-sky-50 text-sky-700 px-1 py-0.2 font-sans text-[8px] font-extrabold uppercase border border-sky-100/65 shrink-0 max-w-[100px] truncate" title={shObj.name}>
                              Shop: {shObj.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <span className="font-sans text-sm font-extrabold text-[#0f223a]">Rs. {p.price.toFixed(2)}</span>
                  </div>
                  <p className="font-sans text-xs text-[#71717A] leading-relaxed">{p.description || 'Traditional spiced hot kitchen course.'}</p>
                </div>
              </div>

              {/* Card Footer action bar */}
              <div className="border-t border-[#E4E4E7] p-3 flex justify-between items-center px-5 bg-[#F4F4F5]/40">
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-extrabold border ${p.isActive ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-[#F4F4F5] text-[#A1A1AA] border-[#E4E4E7]'}`}>
                  {p.isActive ? 'AVAILABLE' : 'DEACTIVATED'}
                </span>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 rounded border border-[#E4E4E7] bg-white text-[#71717A] hover:text-[#0f223a] hover:bg-[#F4F4F5] transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => handleMarkInactive(p.id)}
                    className="p-1.5 rounded border border-[#E4E4E7] bg-white text-[#71717A] hover:text-red-650 hover:text-red-600 hover:bg-[#F4F4F5] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 py-12 border border-dashed border-[#E4E4E7] rounded-xl text-center text-[#A1A1AA] italic">
              No product items compiled. Click Add Menu Item to populate.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
