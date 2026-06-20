import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Shops from './pages/Shops';
import Credits from './pages/Credits';
import { RestaurantSettings } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  // Load settings globally upon initialization
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
        }
      } catch (err) {
        console.error('Failed to query restaurant settings', err);
      }
    }
    loadSettings();
  }, []);

  const handleSettingsSaved = (updated: RestaurantSettings) => {
    setSettings(updated);
  };

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
  };

  // Switch tabs
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'orders':
        return <Orders settings={settings} />;
      case 'invoices':
        return <Invoices settings={settings} />;
      case 'products':
        return <Products />;
      case 'shops':
        return <Shops />;
      case 'credits':
        return <Credits settings={settings} />;
      case 'employees':
        return <Employees />;
      case 'payroll':
        return <Payroll />;
      case 'expenses':
        return <Expenses />;
      case 'settings':
        return <Settings onSettingsSaved={handleSettingsSaved} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      {/* Desktop & Mobile Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        settings={settings}
      />

      {/* Main viewport segment */}
      <main id="app-main-viewport" className="flex-1 overflow-y-auto bg-slate-50 relative pb-12 md:pb-0">
        {renderContent()}
      </main>
    </div>
  );
}
