import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Calendar, 
  User, 
  DollarSign, 
  AlertCircle,
  FileText,
  Printer,
  ChevronRight
} from 'lucide-react';
import { CreditRecord, RestaurantSettings, Order } from '../types';

interface CreditsProps {
  settings: RestaurantSettings | null;
}

export default function Credits({ settings }: CreditsProps) {
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | ''>('');
  const [settlingId, setSettlingId] = useState<string | null>(null);

  // Bill virtual print preview modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchCredits();
  }, [searchQuery, statusFilter]);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/credits?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCredits(data.data);
      } else {
        setError(data.message || 'Failed to retrieve debtor ledgers');
      }
    } catch (err) {
      console.error(err);
      setError('An expected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to mark this credit as settled and paid in full?')) return;
    try {
      setSettlingId(id);
      const res = await fetch(`/api/credits/${id}/settle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchCredits();
      } else {
        setError(data.message || 'Failed to settle ledger dues');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure on settling credit balance.');
    } finally {
      setSettlingId(null);
    }
  };

  const handleViewReceipt = async (orderNumber: string) => {
    try {
      // Find the associated invoice or order snapshot to show virtual receipt
      const res = await fetch(`/api/invoices`);
      const data = await res.json();
      if (data.success) {
        // find invoice with order reference number
        const matchingInv = data.data.find((inv: any) => inv.orderSnapshot?.orderNumber === orderNumber);
        if (matchingInv) {
          setSelectedOrder(matchingInv.orderSnapshot);
          setShowReceiptModal(true);
        } else {
          alert('No printable invoice snapshot could be located for this order.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching invoice snapshot details.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Summarize stats
  const totalOutstanding = credits
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalSettled = credits
    .filter(c => c.status === 'settled')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalDebtors = credits.filter(c => c.status === 'pending').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 border-b border-[#E4E4E7] pb-5">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#0f223a] flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-[#0f223a]" />
          Credit Registry Ledger
        </h1>
        <p className="mt-1 text-xs text-[#71717A]">
          Manage and track dining transactions placed on credit, verify custom due dates, and record hand-to-hand cash settlement logs.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2.5 border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E9E9E9] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Total Outstanding Credit</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-100 uppercase">Awaiting Collection</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f223a]">
            ${totalOutstanding.toFixed(2)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#71717A]">
            <span className="font-extrabold text-[#0f223a]">{totalDebtors}</span> active unpaid ledger files.
          </div>
        </div>

        <div className="rounded-xl border border-[#E9E9E9] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Collected / Settled Balance</span>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-extrabold text-green-700 border border-green-100 uppercase">Received</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f223a]">
            ${totalSettled.toFixed(2)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#71717A]">
            Dues fully recovered from regular clients.
          </div>
        </div>

        <div className="rounded-xl border border-[#E9E9E9] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-extrabold text-[#71717A] uppercase tracking-wide">Dues Recovery Rate</span>
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f223a]">
            {totalOutstanding + totalSettled > 0 
              ? `${((totalSettled / (totalOutstanding + totalSettled)) * 100).toFixed(0)}%` 
              : '100%'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#71717A]">
            Performance indicator ratio.
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-[#D4D4D8]/60 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#A1A1AA]">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search debtor name, phone number, order ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#E4E4E7] pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-xs bg-white text-[#0f223a]"
          >
            <option value="">All Transactions</option>
            <option value="pending">Pending Credit</option>
            <option value="settled">Settled Logs</option>
          </select>
        </div>
      </div>

      {/* Credit Ledger Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="font-sans text-xs text-[#71717A] animate-pulse">Scanning ledger nodes...</span>
        </div>
      ) : credits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E4E4E7] bg-white py-14 text-center">
          <User className="mx-auto h-12 w-12 text-[#A1A1AA]" />
          <h3 className="mt-4 font-sans text-sm font-bold text-[#0f223a]">No Credit Records</h3>
          <p className="mt-1 text-xs text-[#71717A] max-w-xs mx-auto">
            Order entries marked "On Credit" directly compile onto this screen.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-[#FAF9F9] border-b border-[#E4E4E7] text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Debt Client</th>
                  <th className="px-6 py-4">Linked Order</th>
                  <th className="px-6 py-4">Credit Amount</th>
                  <th className="px-6 py-4">Register Date</th>
                  <th className="px-6 py-4">Target Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {credits.map((rec) => {
                  const isPending = rec.status === 'pending';
                  const isOverdue = isPending && rec.dueDate && new Date(rec.dueDate) < new Date();

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[#0f223a] font-semibold text-xs uppercase uppercase">
                            {rec.customerName.charAt(0)}
                          </span>
                          <div>
                            <p className="font-semibold text-[#0f223a]">{rec.customerName}</p>
                            {rec.customerPhone && (
                              <p className="text-[10px] text-[#71717A]">{rec.customerPhone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-slate-800">
                        {rec.orderNumber}
                      </td>

                      <td className="px-6 py-4 font-bold text-[#0f223a] text-[13px]">
                        ${rec.amount.toFixed(2)}
                      </td>

                      <td className="px-6 py-4 text-[#71717A]">
                        {new Date(rec.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>

                      <td className="px-6 py-4">
                        {rec.dueDate ? (
                          <div className={`flex items-center gap-1 font-mono text-[11px] ${
                            isOverdue ? 'text-red-600 font-bold' : isPending ? 'text-amber-700' : 'text-[#71717A]'
                          }`}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{rec.dueDate}</span>
                            {isOverdue && <span className="ml-1 text-[8px] uppercase bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-extrabold">Overdue</span>}
                          </div>
                        ) : (
                          <span className="text-[#A1A1AA] italic">None declared</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isPending 
                            ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                            : 'bg-green-50 text-green-800 border border-green-150'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${isPending ? 'bg-amber-600' : 'bg-green-600'}`}></span>
                          {rec.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewReceipt(rec.orderNumber)}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-[#0f1d3a] px-2 py-1 text-[10px] font-semibold transition-colors"
                            title="Direct Receipt Preview"
                          >
                            <FileText className="h-3 w-3" />
                            Direct Invoice
                          </button>

                          {isPending && (
                            <button
                              onClick={() => handleSettle(rec.id)}
                              disabled={settlingId === rec.id}
                              className="inline-flex items-center gap-1 rounded bg-[#0f223a] text-white hover:opacity-90 px-3 py-1 text-[10px] font-bold"
                            >
                              {settlingId === rec.id ? 'Settling...' : 'Settle'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIRTUAL THERMAL RECEIPT PRINT MODAL */}
      {showReceiptModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-[#D4D4D8] no-print">
            
            {/* Action buttons at modal header */}
            <div className="mb-4 flex items-center justify-between border-b pb-2">
              <span className="text-[10px] font-extrabold text-[#71717A] uppercase tracking-wider">Thermal Receipt Preview</span>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Close Preview
              </button>
            </div>

            {/* Simulated scroll printed roll receipt with custom margins. Matches 76mm receipt papers perfectly */}
            <div className="bg-[#FAF9F9] border rounded-lg p-5 flex flex-col items-center">
              <div className="w-full max-w-[280px] bg-white p-4 shadow-sm font-mono text-black text-[12px] border-dashed border-2 border-slate-300">
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <h3 className="font-extrabold text-sm uppercase font-sans tracking-wide">
                    {settings?.restaurantName || 'The Royal Spice'}
                  </h3>
                  <p className="text-[10px] text-[#555]">{settings?.address}</p>
                  <p className="text-[10px] text-[#555]">{settings?.phone}</p>
                </div>

                <div className="py-2.5 text-[11px] border-b border-dashed border-slate-400 leading-normal space-y-1">
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-semibold">{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date-Time:</span>
                    <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-extrabold bg-red-100 text-red-800 px-1 text-[9px] uppercase">
                      CREDIT DUE
                    </span>
                  </div>
                  {selectedOrder.customerName && (
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="truncate max-w-[120px]">{selectedOrder.customerName}</span>
                    </div>
                  )}
                </div>

                {/* Receipt Items list */}
                <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px]">
                  <div className="flex justify-between font-bold mb-1 pb-1 border-b border-slate-200">
                    <span>Item description</span>
                    <span>Qty x Price</span>
                  </div>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between leading-relaxed py-0.5">
                      <div className="pr-2 truncate max-w-[140px]">
                        {item.productName}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        {item.quantity} x ${item.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Section */}
                <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-0.5">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between font-medium text-red-600">
                      <span>Discount</span>
                      <span>-${selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-100">
                    <span>GRAND TOTAL:</span>
                    <span>${selectedOrder.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center pt-3 text-[10px] text-[#555] leading-normal italic">
                  <p>{settings?.invoiceFooterText || 'Dues to be recovered'}</p>
                  <p className="mt-1">Hand-picked selection.</p>
                </div>
              </div>
            </div>

            {/* Direct Print Trigger buttons */}
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f223a] text-white py-2 font-bold text-xs hover:opacity-90 transition-opacity"
              >
                <Printer className="h-4 w-4" />
                Dashed receipt PDF Print
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E9E9E9] bg-white py-2 font-bold text-xs hover:bg-[#F4F4F5] text-[#0f223a]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLED HIDDEN PRINT CONTENT (Dashed receipts styled block for physical POS printers) */}
      {selectedOrder && (
        <div className="thermal-print-invoice font-mono text-black">
          <div className="thermal-invoice-header">
            <h2>{settings?.restaurantName || 'The Royal Spice'}</h2>
            <p>{settings?.address}</p>
            <p>{settings?.phone}</p>
            <p>CONSIGNED SLIP</p>
          </div>
          <div className="kitchen-divider" style={{ borderTop: '1.5px dashed #000' }}></div>
          <div className="thermal-invoice-meta pb-2">
            <div>Order NO: {selectedOrder.orderNumber}</div>
            <div>Date Slip: {new Date(selectedOrder.createdAt).toLocaleDateString()}</div>
            <div className="font-bold">STATUS: CREDIT INVOICE</div>
            {selectedOrder.customerName && <div>Consignee: {selectedOrder.customerName}</div>}
          </div>
          <div className="kitchen-divider" style={{ borderTop: '1.5px dashed #000' }}></div>
          
          <div className="thermal-invoice-items">
            {selectedOrder.items.map((item, id) => (
              <div key={id} className="thermal-invoice-row py-0.5">
                <span>{item.productName} (x{item.quantity})</span>
                <span>${item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="kitchen-divider" style={{ borderTop: '1.5px dashed #000' }}></div>
          
          <div className="thermal-invoice-totals font-bold space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${selectedOrder.subtotal.toFixed(2)}</span>
            </div>
            {selectedOrder.discount > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Discount:</span>
                <span>-${selectedOrder.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between thermal-invoice-total-bold text-base font-extrabold">
              <span>TOTAL OUTSTANDING:</span>
              <span>${selectedOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="kitchen-divider" style={{ borderTop: '1.5px dashed #000' }}></div>
          <div className="thermal-invoice-footer">
            <p>{settings?.invoiceFooterText}</p>
            <p className="mt-1 font-sans text-[7pt]">Printed directly from POS system</p>
          </div>
        </div>
      )}
    </div>
  );
}
