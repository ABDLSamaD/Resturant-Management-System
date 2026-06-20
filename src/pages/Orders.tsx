import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Coins, 
  Plus, 
  Minus, 
  Utensils, 
  Truck, 
  ShoppingBag,
  Sparkles,
  Layers,
  CircleCheck,
  Check,
  Printer
} from 'lucide-react';
import { Product, ProductCategory, Order } from '../types';

export default function Orders() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selCategory, setSelCategory] = useState('');

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  
  // Custom metadata based on Order types
  const [orderType, setOrderType] = useState<'dine-in' | 'delivery' | 'takeaway'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // UI state
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isPlacing, setIsPlacing] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState<Order | null>(null);

  // Credit inputs
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [dueDate, setDueDate] = useState<string>('');

  // Trigger browser print for kitchen staff ticket
  const triggerPrintTicket = (order: Order) => {
    setTicketToPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    loadProducts();
    loadRecentOrders();
  }, [search, selCategory]);

  async function loadProducts() {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/product-categories'),
        fetch(`/api/products?active=true`)
      ]);

      const catData = await catRes.json();
      const prodData = await prodRes.json();

      if (catData.success) setCategories(catData.data);
      if (prodData.success) {
        let list = prodData.data;
        if (search) {
          list = list.filter((p: Product) => p.name.toLowerCase().includes(search.toLowerCase()));
        }
        if (selCategory) {
          list = list.filter((p: Product) => p.category === selCategory);
        }
        setProducts(list);
      }
    } catch (err) {
      console.error('Error loading products', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentOrders() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setRecentOrders(data.data.slice(-5).reverse()); // last 5 orders
      }
    } catch (err) {
      console.error('Error fetching recent orders', err);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Add item to cart
  const addToCart = (p: Product) => {
    const existing = cart.find(it => it.productId === p.id);
    if (existing) {
      setCart(cart.map(it => it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, {
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1
      }]);
    }
    triggerToast('success', `${p.name} added to cart.`);
  };

  // Adjust line quantities
  const adjustQty = (id: string, amount: number) => {
    const item = cart.find(it => it.productId === id);
    if (!item) return;

    const targetQty = item.quantity + amount;
    if (targetQty <= 0) {
      setCart(cart.filter(it => it.productId !== id));
      triggerToast('success', `${item.name} removed from cart.`);
    } else {
      setCart(cart.map(it => it.productId === id ? { ...it, quantity: targetQty } : it));
    }
  };

  const removeFromCart = (id: string, name: string) => {
    setCart(cart.filter(it => it.productId !== id));
    triggerToast('success', `${name} removed.`);
  };

  // Subtotal, Discount, GrandTotal equations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discValue = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discValue);

  // Submit order to API
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      triggerToast('error', 'Cart is empty. Select menu items first.');
      return;
    }

    if (orderType === 'dine-in' && !tableNumber) {
      triggerToast('error', 'Please enter a Table Number for dine-in orders.');
      return;
    }

    if (paymentType === 'credit' && (!customerName.trim() || !customerPhone.trim() || !dueDate)) {
      triggerToast('error', 'Debtor Name, Contact Phone, and Payment Due Date are mandatory for credit terms.');
      return;
    }

    try {
      setIsPlacing(true);
      const payload = {
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        customerName: (orderType !== 'dine-in' || paymentType === 'credit') ? customerName : undefined,
        customerPhone: (orderType !== 'dine-in' || paymentType === 'credit') ? customerPhone : undefined,
        customerAddress: orderType === 'delivery' ? customerAddress : undefined,
        items: cart.map(it => ({ productId: it.productId, quantity: it.quantity })),
        discount: discValue,
        paymentType,
        dueDate: paymentType === 'credit' ? dueDate : undefined
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        triggerToast('success', 'Order submitted successfully and invoice generated!');
        // clear cart & entries
        setCart([]);
        setDiscount('0');
        setTableNumber('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setPaymentType('cash');
        setDueDate('');
        loadRecentOrders();
      } else {
        triggerToast('error', data.message || 'Error executing order.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure compiling checkout.');
    } finally {
      setIsPlacing(false);
    }
  };

  const updateOrderStatus = async (id: string, nextStatus: 'completed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('success', `Order status marked ${nextStatus}.`);
        loadRecentOrders();
      }
    } catch (err) {
      triggerToast('error', 'Error updating status.');
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 grid gap-8 lg:grid-cols-3 align-start">
      {statusMsg.text && (
        <div id="toast-notif-container" className={`fixed top-4 right-4 z-50 rounded-lg p-4 font-sans text-xs font-semibold text-white shadow-lg ${statusMsg.type === 'success' ? 'bg-slate-900 border-l-4 border-amber-400' : 'bg-red-650'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Left Columns (Menu Dishes / POS Catalog selection) */}
      <div className="lg:col-span-2 space-y-6 pt-0 md:pt-4">
        <div>
          <h1 id="orders-title" className="font-sans text-2xl font-bold tracking-tight text-slate-900">Interactive Order Entrance Desk</h1>
          <p className="font-sans text-xs text-slate-500">Pick course dishes, filter courses, and process client checks live.</p>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
          <button 
            onClick={() => setSelCategory('')}
            className={`rounded-full px-4 py-1 text-xs font-bold transition-colors ${!selCategory ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            All Items
          </button>
          {categories.filter(c => c.isActive).map(c => (
            <button
              key={c.id}
              onClick={() => setSelCategory(c.name)}
              className={`rounded-full px-4 py-1 text-xs font-bold transition-colors ${selCategory === c.name ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search menu */}
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search catalog items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        {/* Catalog grid */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 max-h-[50vh] overflow-y-auto pr-1">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col justify-between items-start rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-400"
              >
                <div className="w-full">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="h-20 w-full object-cover rounded-md mb-2" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-16 w-full bg-slate-50 rounded-md flex items-center justify-center mb-2 text-slate-350">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                  )}
                  <h4 className="font-sans text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                  <p className="font-mono text-[9px] uppercase font-bold text-amber-600 mt-0.5">{p.category}</p>
                </div>
                <div className="flex justify-between items-center w-full mt-2 border-t border-slate-50 pt-1.5 font-sans">
                  <span className="text-xs font-bold text-slate-900">Rs. {p.price.toFixed(2)}</span>
                  <Plus className="h-3 w-3 text-slate-400 group-hover:text-slate-900" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Direct order states layout list */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 mt-6">
          <h3 className="font-sans text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Today Pending Queue / Recents</h3>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.id} className="flex justify-between items-center rounded-lg bg-white border border-slate-100 p-3 text-xs leading-none">
                <div>
                  <p className="font-bold text-slate-800">{o.orderNumber}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">Type: {o.orderType} • Rs. {o.grandTotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : o.status === 'cancelled' ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                    {o.status.toUpperCase()}
                  </span>

                  <button 
                    onClick={() => triggerPrintTicket(o)}
                    className="rounded bg-slate-100 hover:bg-slate-205 hover:bg-slate-200 p-1 text-slate-700 transition"
                    title="Print Kitchen Ticket"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>

                  {o.status === 'pending' && (
                    <div className="flex gap-1 border-l pl-2 border-slate-200">
                      <button 
                        onClick={() => updateOrderStatus(o.id, 'completed')}
                        className="rounded bg-teal-50 hover:bg-teal-100 p-1 text-teal-700"
                        title="Completed"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => updateOrderStatus(o.id, 'cancelled')}
                        className="rounded bg-rose-50 hover:bg-rose-100 p-1 text-rose-700"
                        title="Cancel Order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">No companion order entries compiled.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (The Checkout Cart) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[75vh]">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-sans text-sm font-bold text-slate-900">Current Order Checkout</h3>
            <span className="font-mono text-xs font-bold bg-slate-50 border px-2 py-0.5 rounded text-slate-600">{cart.length} items</span>
          </div>

          {/* Cart item elements */}
          <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1">
            {cart.map(it => (
              <div key={it.productId} className="flex justify-between items-center text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{it.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rs. {it.price.toFixed(2)} x {it.quantity}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg p-0.5">
                    <button onClick={() => adjustQty(it.productId, -1)} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-900"><Minus className="h-3 w-3" /></button>
                    <span className="px-2 font-bold text-slate-800">{it.quantity}</span>
                    <button onClick={() => adjustQty(it.productId, 1)} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-900"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => removeFromCart(it.productId, it.name)} className="text-slate-300 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">Cart is pristine. Pitch menu items.</div>
            )}
          </div>

          {/* Configuration form for Order context selection */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Service Method</label>
              <div className="flex gap-1.5 mt-1">
                <button 
                  onClick={() => setOrderType('dine-in')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${orderType === 'dine-in' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  <Utensils className="h-3 w-3" /> Dine-in
                </button>
                <button 
                  onClick={() => setOrderType('takeaway')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${orderType === 'takeaway' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  <ShoppingBag className="h-3 w-3" /> Takeaway
                </button>
                <button 
                  onClick={() => setOrderType('delivery')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${orderType === 'delivery' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  <Truck className="h-3 w-3" /> Delivery
                </button>
              </div>
            </div>

            {/* Custom delivery or table details conditional */}
            {orderType === 'dine-in' ? (
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Table Designation No. *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Table 5, Terrace Lounge..."
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white text-slate-800"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Client Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Jane Jenkins"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Client Phone (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 555-1200"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white text-slate-800 font-sans"
                  />
                </div>
                {orderType === 'delivery' && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Disbursement Address (Optional)</label>
                    <textarea 
                      placeholder="e.g. Apartment 4B, Food district..."
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none bg-white text-slate-800"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Payment Option Type</label>
              <div className="flex gap-1.5 mt-1">
                <button 
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-colors ${paymentType === 'cash' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Cash / Card
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setPaymentType('credit');
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setDueDate(d.toISOString().split('T')[0]);
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold border transition-colors ${paymentType === 'credit' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  On Credit
                </button>
              </div>
            </div>

            {/* Conditional debtor collection fields */}
            {paymentType === 'credit' && orderType === 'dine-in' && (
              <div className="space-y-2 border border-dashed border-amber-300 bg-amber-50/40 p-3 rounded-lg">
                <span className="text-[9px] font-extrabold text-amber-800 uppercase">Debtor Ledger Details</span>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Client Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Wali Khan"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:outline-none bg-white text-slate-800 font-sans font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-550 uppercase">Phone Number *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. +92 300 1234567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:outline-none bg-white text-slate-805"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Target Due Date *</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:outline-none bg-white text-slate-800"
                  />
                </div>
              </div>
            )}

            {paymentType === 'credit' && orderType !== 'dine-in' && (
              <div className="space-y-2 border border-dashed border-amber-300 bg-amber-50/40 p-3 rounded-lg">
                <span className="text-[9px] font-extrabold text-amber-800 uppercase">Target Settlement Date</span>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Credit Due date *</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:outline-none bg-white text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Discount box field */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Companion Discount (Rs. / PKR)</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Cart Subtotal footer calculations */}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          {discValue > 0 && (
            <div className="flex justify-between items-center text-xs font-semibold text-rose-500">
              <span>Applied Discount</span>
              <span>-Rs. {discValue.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 border-t border-slate-50 pt-2 pb-2">
            <span>Amount Due</span>
            <span className="text-xl text-slate-1000">Rs. {grandTotal.toFixed(2)}</span>
          </div>

          <button 
            id="btn-pos-dispatch"
            onClick={handlePlaceOrder}
            disabled={isPlacing || cart.length === 0}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 disabled:opacity-55"
          >
            <ShoppingCart className="h-4 w-4" />
            {isPlacing ? 'Submitting checkout...' : 'Submit Order & Render Invoice'}
          </button>
        </div>
      </div>

      {/* Hidden print-only kitchen ticket container */}
      {ticketToPrint && (
        <div className="kitchen-print-ticket">
          <h1>KITCHEN ORDER</h1>
          <h2>{ticketToPrint.orderType === 'dine-in' ? `TABLE ${ticketToPrint.tableNumber || 'N/A'}` : ticketToPrint.orderType.toUpperCase()}</h2>
          
          <div className="kitchen-meta">
            <p><strong>Ticket #:</strong> {ticketToPrint.orderNumber}</p>
            <p><strong>Date:</strong> {new Date(ticketToPrint.createdAt).toLocaleString('en-US')}</p>
            {ticketToPrint.customerName && (
              <p><strong>Client:</strong> {ticketToPrint.customerName}</p>
            )}
            {ticketToPrint.customerPhone && (
              <p><strong>Phone:</strong> {ticketToPrint.customerPhone}</p>
            )}
            {ticketToPrint.customerAddress && (
              <p><strong>Addr:</strong> {ticketToPrint.customerAddress}</p>
            )}
          </div>

          <div className="kitchen-divider"></div>

          <div className="kitchen-items-container">
            {ticketToPrint.items.map((it, idx) => (
              <div key={idx} className="kitchen-item-row">
                <span className="kitchen-item-name">{it.productName}</span>
                <span className="kitchen-item-qty">x {it.quantity}</span>
              </div>
            ))}
          </div>

          <div className="kitchen-divider"></div>

          <p className="kitchen-footer">
            *** END OF ACTIVE STAFF KITCHEN TICKET ***
          </p>
        </div>
      )}
    </div>
  );
}
