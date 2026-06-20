import { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Eye, 
  Printer, 
  X, 
  Download,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Invoice, RestaurantSettings } from '../types';

interface InvoicesProps {
  settings: RestaurantSettings | null;
}

export default function Invoices({ settings }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected invoice for thermal draft previewing drawer
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [search]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);

      const res = await fetch(`/api/invoices?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data.reverse()); // latest first
      }
    } catch (err) {
      console.error('Error fetching invoices', err);
    } finally {
      setLoading(false);
    }
  }

  // Action hook to download the thermal receipt PDF
  const handleDownloadPdf = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice.id}/pdf`);
  };

  // Action hook to download the professional high-res PKR A4 invoice PDF
  const handleDownloadProfessionalPdf = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice.id}/professional`);
  };

  // Action hook to open the small interactive printable POS slip on a new page (tab)
  const handleOpenPrintPage = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice.id}/print`, '_blank');
  };

  return (
    <div className="space-y-6 p-6 md:p-8 grid gap-8 lg:grid-cols-3 align-start">
      {/* List section */}
      <div className="lg:col-span-2 space-y-4 pt-0 md:pt-4">
        <div>
          <h1 id="invoices-title" className="font-sans text-2xl font-bold tracking-tight text-slate-900">Billing & Companion Invoices</h1>
          <p className="font-sans text-xs text-slate-500">Search archived customer orders, inspect items and prices, and reprint official receipts.</p>
        </div>

        {/* Filter Bar */}
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search invoice number, client info or tables..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        {/* Invoices List table container */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50 font-sans font-bold text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Archived Invoice</th>
                    <th className="px-4 py-3 hidden md:table-cell">Checkout Date</th>
                    <th className="px-4 py-3">Order Type</th>
                    <th className="px-4 py-3">Check Total</th>
                    <th className="px-4 py-3 text-right">Reprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-sans">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Snapshot Ref: {inv.orderSnapshot?.orderNumber || 'Legacy'}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-650 font-medium hidden md:table-cell">
                        {new Date(inv.generatedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-4 uppercase">
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-600">
                          {inv.orderSnapshot?.orderType || 'Dine-In'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-extrabold text-slate-800">Rs. {inv.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            id={`btn-view-inv-${inv.id}`}
                            onClick={() => setActiveInvoice(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                            title="View Slip Draft"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenPrintPage(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-orange-600 hover:bg-slate-50"
                            title="Print Small Slip (New Tab)"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-amber-500"
                            title="Download Thermal PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center italic text-slate-400">
                        No checked invoices verified.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right Column / Centered Modal Overlay on mobile, side-by-side on desktop */}
      <div 
        onClick={() => setActiveInvoice(null)}
        className={`${activeInvoice ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm lg:p-0 lg:bg-transparent lg:shadow-none lg:z-0 lg:relative lg:flex lg:col-span-1' : 'hidden lg:flex lg:col-span-1'} flex-col`}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl lg:shadow-sm space-y-4 max-h-[90vh] overflow-y-auto lg:max-h-none lg:min-h-[70vh] flex flex-col justify-between w-full max-w-sm lg:max-w-none"
        >
          {activeInvoice ? (
            <div className="space-y-4 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="font-sans text-[11px] font-extrabold tracking-widest text-[#ea580c]">Interactive POS Receipt</span>
                  <button onClick={() => setActiveInvoice(null)} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200" title="Close Preview">
                    <X className="h-4 w-4" />
                  </button>
                </div>

              {/* Thermal container mimicking a physical paper role */}
              <div id="virtual-receipt-preview" className="rounded-lg border border-slate-350 border-slate-300 bg-amber-50/20 font-mono text-xs text-slate-800 p-4 shadow-inner space-y-3 relative overflow-hidden select-text">
                {/* Decorative cut borders for receipts paper */}
                <div className="absolute top-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.3%,#e2e8f0_33.3%,#e2e8f0_66.6%,transparent_66.6%)] bg-[length:6px_4px]" />
                
                {/* Center Store details */}
                <div className="text-center pt-2 space-y-1">
                  <h3 className="font-serif text-sm font-extrabold tracking-tight uppercase leading-none text-slate-950">{settings?.restaurantName || 'RESTAURANT RMS'}</h3>
                  <p className="text-[10px] text-slate-600 truncate">{settings?.address || 'Operational Block Centre'}</p>
                  <p className="text-[10px] text-slate-600">TEL: {settings?.phone || '555-0399'}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-3 text-[11px] space-y-1">
                  <p className="font-bold">INVOICE RECEIPT</p>
                  <p>Check: {activeInvoice.invoiceNumber}</p>
                  <p>Ref: {activeInvoice.orderSnapshot?.orderNumber}</p>
                  <p>Date: {new Date(activeInvoice.generatedAt).toLocaleString()}</p>
                  <p className="uppercase">Type: {activeInvoice.orderSnapshot?.orderType || 'Dine-In'}</p>
                  {activeInvoice.orderSnapshot?.tableNumber && (
                    <p className="font-bold">Table: {activeInvoice.orderSnapshot.tableNumber}</p>
                  )}
                  {activeInvoice.orderSnapshot?.customerName && (
                    <p className="truncate">Client: {activeInvoice.orderSnapshot.customerName}</p>
                  )}
                </div>

                {/* Dashed line divider */}
                <div className="text-center text-slate-400 tracking-tighter leading-none select-none">---------------------------------</div>

                {/* Items columns */}
                <div className="space-y-1.5 text-[11px] font-mono">
                  {activeInvoice.orderSnapshot?.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-950">{it.productName}</p>
                        <p className="text-[10px] text-slate-500">Rs. {it.price.toFixed(2)} x {it.quantity}</p>
                      </div>
                      <span className="font-bold shrink-0 text-slate-900">Rs. {it.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center text-slate-400 tracking-tighter leading-none select-none">---------------------------------</div>

                {/* Total breakdowns */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {activeInvoice.orderSnapshot?.subtotal.toFixed(2)}</span>
                  </div>
                  {activeInvoice.orderSnapshot?.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Applied Discount</span>
                      <span>-Rs. {activeInvoice.orderSnapshot.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-slate-950 text-sm border-t border-dashed border-slate-350 pt-2 mt-1.5">
                    <span>GRAND TOTAL</span>
                    <span>Rs. {activeInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-slate-400 tracking-tighter leading-none select-none">---------------------------------</div>

                {/* Footer text */}
                <div className="text-center text-[10px] text-slate-650 leading-normal pt-1 break-words font-medium">
                  <p>{settings?.invoiceFooterText || 'Thank you for dining with us! Come back soon.'}</p>
                  <p className="text-[8px] text-slate-400 mt-2 font-mono uppercase tracking-wider">Companion Invoice Generated Automatically</p>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.3%,#e2e8f0_33.3%,#e2e8f0_66.6%,transparent_66.6%)] bg-[length:6px_4px] transform rotate-180" />
              </div>
            </div>

            {/* Print action buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button 
                id="btn-direct-pos-print"
                onClick={() => handleOpenPrintPage(activeInvoice)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-sans text-xs font-bold py-2.5 transition shadow"
              >
                <Printer className="h-4 w-4" />
                Reprint Compact Slip (Separate Page)
              </button>

              <button 
                id="btn-thermal-reprint"
                onClick={() => handleDownloadPdf(activeInvoice)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-sans text-xs font-bold py-2 shadow-sm transition"
              >
                <Download className="h-4 w-4" />
                Download 58mm POS PDF
              </button>
              
              <button 
                id="btn-professional-print"
                onClick={() => handleDownloadProfessionalPdf(activeInvoice)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-sans text-xs font-bold py-2 transition"
              >
                <Sparkles className="h-4 w-4" />
                Download Professional A4 PDF
              </button>

              <button 
                onClick={() => setActiveInvoice(null)}
                className="w-full lg:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-sans text-xs py-2 shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <Receipt className="h-12 w-12 text-slate-200 mb-2 stroke-1" />
            <p className="font-sans text-xs font-medium">No selected invoice check active.</p>
            <p className="font-sans text-[10px] text-slate-400 mt-1">Pick a listed check to draft print previews instantly.</p>
          </div>
        )}
        </div>
      </div>

      {/* Hidden print-only thermal invoice ticket for physical printer matching */}
      {activeInvoice && (
        <div className="thermal-print-invoice">
          <div className="thermal-invoice-header">
            <h2>{settings?.restaurantName || 'RESTAURANT RMS'}</h2>
            <p>{settings?.address || 'Operational Block Centre'}</p>
            <p>TEL: {settings?.phone || '555-0399'}</p>
          </div>

          <div className="kitchen-divider"></div>

          <div className="thermal-invoice-meta">
            <p><strong>INVOICE RECEIPT</strong></p>
            <p>Invoice No: {activeInvoice.invoiceNumber}</p>
            <p>Order Ref: {activeInvoice.orderSnapshot?.orderNumber}</p>
            <p>Date: {new Date(activeInvoice.generatedAt).toLocaleString()}</p>
            <p>Service: {activeInvoice.orderSnapshot?.orderType.toUpperCase()}</p>
            {activeInvoice.orderSnapshot?.tableNumber && (
              <p><strong>Table No:</strong> {activeInvoice.orderSnapshot.tableNumber}</p>
            )}
            {activeInvoice.orderSnapshot?.customerName && (
              <p><strong>Customer:</strong> {activeInvoice.orderSnapshot.customerName}</p>
            )}
          </div>

          <div className="kitchen-divider"></div>

          <div className="thermal-invoice-items">
            {activeInvoice.orderSnapshot?.items.map((it: any, i: number) => (
              <div key={i} className="thermal-invoice-row font-bold">
                <span className="flex-1 pr-2">{it.productName} (x{it.quantity})</span>
                <span>Rs. {it.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="kitchen-divider"></div>

          <div className="thermal-invoice-totals">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {activeInvoice.orderSnapshot?.subtotal.toFixed(2)}</span>
            </div>
            {activeInvoice.orderSnapshot?.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span>-Rs. {activeInvoice.orderSnapshot.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="kitchen-divider"></div>
            <div className="flex justify-between thermal-invoice-total-bold">
              <span>GRAND TOTAL</span>
              <span>Rs. {activeInvoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="kitchen-divider"></div>

          <div className="thermal-invoice-footer">
            <p>{settings?.invoiceFooterText || 'Thank you for dining with us! Come back soon.'}</p>
            <p style={{ marginTop: '10px', fontSize: '7pt' }}>Generated via Advanced Restaurant RMS</p>
          </div>
        </div>
      )}
    </div>
  );
}
