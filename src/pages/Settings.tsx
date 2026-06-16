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
  FileDown
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
    logoText: ''
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
            logoText: data.data.logoText || ''
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#18181B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 bg-[#F4F4F5] min-h-screen">
      {statusMsg.text && (
        <div id="toast-message-box" className={`fixed top-4 right-4 z-50 rounded border border-[#E4E4E7] p-4 font-sans text-xs font-semibold text-[#18181B] bg-white shadow-sm flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {statusMsg.text}
        </div>
      )}

      <div className="pb-4 border-b border-[#E4E4E7]">
        <h1 id="settings-title" className="font-sans text-xl font-bold tracking-tight text-[#18181B]">General Options & Operations Reports</h1>
        <p className="font-sans text-xs text-[#71717A]">Configure receipt typography templates, store phone numbers, addresses, and print daily reports.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
        {/* Settings Form Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-6">
            <h3 className="font-sans text-xs font-bold text-[#18181B] border-b border-[#E4E4E7] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
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
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
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
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
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
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
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
                    className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
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
                  className="mt-1 w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none bg-white text-[#18181B]"
                  rows={3}
                  placeholder="e.g. Thank you for choosing Shalimar Curry Point! We structure quality taste."
                />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-[#18181B] text-white font-sans text-xs font-bold py-2.5 disabled:opacity-55 hover:opacity-90"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Updating system...' : 'Save System Configuration'}
              </button>
            </form>
          </div>
        </div>

        {/* Reports Download Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-sans text-xs font-bold text-[#18181B] border-b border-[#E4E4E7] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
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
                    className="w-full rounded border border-[#E4E4E7] px-3 py-1.5 text-xs focus:ring-1 focus:ring-black focus:outline-none text-[#18181B] bg-white"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadDailyReport}
              className="mt-6 w-full inline-flex items-center justify-center gap-1.5 rounded border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#18181B] font-sans text-xs font-bold py-2.5 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Serve Daily Performance PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
