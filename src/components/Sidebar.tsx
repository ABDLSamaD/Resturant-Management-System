import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Pizza, 
  ShoppingCart, 
  Receipt, 
  FolderMinus, 
  Settings, 
  Menu, 
  X,
  PlusSquare,
  Sparkles
} from 'lucide-react';
import { RestaurantSettings } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  settings: RestaurantSettings | null;
}

export default function Sidebar({ currentTab, onTabChange, settings }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Order Entry', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'products', label: 'Menu Items', icon: Pizza },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'payroll', label: 'Payroll & Advances', icon: DollarSign },
    { id: 'expenses', label: 'Expenses (OCR)', icon: FolderMinus },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const logoInitial = settings?.logoText || 'R';
  const name = settings?.restaurantName || 'Restaurant RMS';

  return (
    <>
      {/* Mobile top navigation rail */}
      <div className="flex items-center justify-between bg-white border-b border-[#E4E4E7] px-4 py-3 text-[#0f223a] md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0f223a] font-mono text-sm font-bold text-white">
            {logoInitial}
          </div>
          <span className="font-sans text-sm font-semibold tracking-tight">{name}</span>
        </div>
        <button 
          id="mobile-sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)} 
          className="rounded p-1 hover:bg-[#F4F4F5] text-[#0f223a] focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for mobile active sidebar */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Responsive Sidebar component */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E4E4E7] bg-white pt-16 md:pt-0
        transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="hidden items-center gap-3 border-b border-[#E4E4E7] px-6 py-5 md:flex">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#0f223a] font-sans text-sm font-bold text-white">
            {logoInitial}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate font-sans text-sm font-bold tracking-tight text-[#0f223a]">{name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-sans text-[9px] font-semibold text-[#71717A] uppercase tracking-wider">RMS POS</span>
              <span className="h-1 w-1 rounded-full bg-green-500"></span>
            </div>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  setIsOpen(false);
                }}
                className={`
                  flex w-full items-center justify-between rounded px-3 py-2 text-left font-sans text-xs font-medium transition-all
                  ${isActive 
                    ? 'bg-[#F4F4F5] text-[#0f223a]' 
                    : 'text-[#71717A] hover:bg-[#F9F9F9] hover:text-[#0f223a]'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0f223a]' : 'text-[#A1A1AA]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0f223a]"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info banner */}
        <div className="border-t border-[#E4E4E7] p-4">
          <div className="p-4 bg-[#F4F4F5] rounded-lg border border-[#E4E4E7]">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-[#0f223a] mt-0.5" />
              <div className="text-[11px] leading-relaxed text-[#71717A]">
                <p className="font-semibold text-[#0f223a]">AI Copilot Active</p>
                <p className="mt-0.5">Dual OCR & image synthesis engines running offline.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
