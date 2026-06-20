import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Phone, 
  MapPin, 
  FileText, 
  Save, 
  Sparkles,
  Printer,
  Calendar,
  CheckCircle,
  FileDown,
  Database,
  Download
} from 'lucide-react';
import { RestaurantSettings } from '../types';

interface SettingsProps {
  onSettingsSaved: (updatedSettings: RestaurantSettings) => void;
}

export default function Settings({ onSettingsSaved }: SettingsProps) {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [form, setForm] = useState({
    restaurantName: '',
    phone: '',
    address: '',
    invoiceFooterText: '',
    logoText: '',
    autoPrintOnInvoiceCreation: false
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Reporting Download states
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
          setForm({
            restaurantName: data.data.restaurantName || '',
            phone: data.data.phone || '',
            address: data.data.address || '',
            invoiceFooterText: data.data.invoiceFooterText || '',
            logoText: data.data.logoText || '',
            autoPrintOnInvoiceCreation: !!data.data.autoPrintOnInvoiceCreation
          });
        }
      } catch (err) {
        console.error('Error fetching settings values', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.success) {
        onSettingsSaved(data.data);
        triggerToast('success', 'General system defaults updated.');
      } else {
        triggerToast('error', data.message || 'Error occurred saving.');
      }
    } catch (err) {
      triggerToast('error', 'Network failure.');
    } finally {
      setSaving(false);
    }
  };

  // Download printable daily performance report PDF
  const handleDownloadDailyReport = () => {
    window.open(`/api/reports/daily/pdf?date=${reportDate}`);
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you absolutely sure you want to restore this database? Doing so will COMPLETELY OVERWRITE all current orders, employee profiles, salaries, credit records, and categories.')) {
      e.target.value = ''; // reset
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          
          const response = await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Database Backup Restored Successfully! Synced system defaults for ' + (data.data?.restaurantName || 'The Royal Spice') + '.');
            window.location.reload();
          } else {
            alert('Restore failed: ' + data.message);
          }
        } catch (err) {
          alert('Failed to parse uploaded backup file. Make sure it is valid JSON.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      alert('File reading error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0f223a] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {statusMsg.text && (
        <div id="toast-message-box" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#0f223a] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      <div className="pb-4 border-b border-[#E4E4E7]">
        <h1 id="settings-title" className="font-sans text-xl font-bold tracking-tight text-[#0f223a]">General Options & Operations Reports</h1>
        <p className="font-sans text-xs text-[#71717A]">Configure receipt typography templates, store phone numbers, addresses, and print daily reports.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
        {/* Settings Form Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-6">
            <h3 className="font-sans text-xs font-bold text-[#0f223a] border-b border-[#E4E4E7] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Store className="h-4 w-4 text-[#71717A]" />
              Store Visual Configuration
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Restaurant Tradename</label>
                  <input 
                    type="text" 
                    required
                    value={form.restaurantName}
                    onChange={e => setForm({...form, restaurantName: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    placeholder="e.g. Shalimar Curry Point"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Logo Initials Accent</label>
                  <input 
                    type="text" 
                    required
                    maxLength={3}
                    value={form.logoText}
                    onChange={e => setForm({...form, logoText: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    placeholder="e.g. S"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Customer Service Phone</label>
                  <input 
                    type="text" 
                    required
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    placeholder="e.g. 555-1900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Physical Address</label>
                  <input 
                    type="text" 
                    required
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                    placeholder="e.g. 450 Gourmet Av, Food district"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase">Dashed invoice default Footer Text</label>
                <textarea 
                  required
                  value={form.invoiceFooterText}
                  onChange={e => setForm({...form, invoiceFooterText: e.target.value})}
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#0f223a]"
                  rows={3}
                  placeholder="e.g. Thank you for choosing Shalimar Curry Point! We structure quality taste."
                />
              </div>

              <div className="flex items-[#0f223a]/10 items-start gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                <input 
                  type="checkbox" 
                  id="autoPrintOnInvoiceCreation"
                  checked={form.autoPrintOnInvoiceCreation}
                  onChange={e => setForm({...form, autoPrintOnInvoiceCreation: e.target.checked})}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="autoPrintOnInvoiceCreation" className="block text-xs font-bold text-[#0f223a] cursor-pointer select-none">
                    Auto-Trigger POS Print Dialog on New Orders
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Automatically open and prompt the compact 58mm/80mm thermal receipt printer slip dialog immediately after generating a successful order invoice.
                  </p>
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-[#0f223a] text-white font-sans text-xs font-bold py-2.5 disabled:opacity-55 hover:opacity-90"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Updating system...' : 'Save System Configuration'}
              </button>
            </form>
          </div>
        </div>

        {/* Reports Download Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 flex flex-col justify-between h-auto">
            <div>
              <h3 className="font-sans text-xs font-bold text-[#0f223a] border-b border-[#E4E4E7] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Printer className="h-4 w-4 text-[#71717A]" />
                Store Performance Exports
              </h3>
              <p className="font-sans text-[11px] leading-relaxed text-[#71717A] mb-4">
                Execute and compile daily/monthly Performance PDF reports containing active ledger balances, wages paid, and net orders invoices received.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#71717A] uppercase mb-1">Target Date of Print</label>
                  <input 
                    type="date" 
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#0f223a] bg-white"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadDailyReport}
              className="mt-6 w-full inline-flex items-center justify-center gap-1.5 rounded border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#0f223a] font-sans text-xs font-bold py-2.5 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Serve Daily Performance PDF
            </button>
          </div>

          {/* Durable Database Backups Slot */}
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-6">
            <h3 className="font-sans text-xs font-bold text-[#0f223a] border-b border-[#E4E4E7] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Database className="h-4 w-4 text-[#71717A]" />
              Durable System Backups
            </h3>
            <p className="font-sans text-[11px] leading-relaxed text-[#71717A] mb-4">
              Safeguard your restaurant configurations, chef payroll indices, debtor credit registers, and active salan inventory ledgers.
            </p>

            <div className="space-y-4">
              {/* Download JSON Backup */}
              <a 
                href="/api/backup" 
                download="restaurant-rms-backup.json"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#0f223a] font-sans text-xs font-bold py-2.5 shadow-2xs hover:shadow-xs transition-all text-center"
              >
                <Download className="h-4 w-4" />
                Download Backup (JSON)
              </a>

              {/* Restore from JSON File input wrapper */}
              <div className="border-t border-[#E4E4E7] pt-4">
                <label className="block text-[10px] font-extrabold text-[#71717A] uppercase mb-1">Restore Database from JSON</label>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="mt-1.5 text-[9px] leading-relaxed text-[#A1A1AA]">WARNING: Uploading a JSON backup completely overrides current transactional registries.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
