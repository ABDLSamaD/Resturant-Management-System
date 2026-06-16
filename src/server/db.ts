import fs from 'fs';
import path from 'path';

// Define the file paths for storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface definition
export interface EmployeeCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  category: string; // references EmployeeCategory.name or ID
  salaryType: 'monthly' | 'daily';
  monthlySalary?: number;
  dailyWage?: number;
  joiningDate: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface SalaryHistory {
  id: string;
  employee: string; // Employee ID
  employeeName: string; // Snapshot
  oldSalary: number;
  newSalary: number;
  increaseType: 'fixed' | 'percentage';
  increaseValue: number;
  reason: string;
  effectiveDate: string;
  createdAt: string;
}

export interface EmployeeAdvance {
  id: string;
  employee: string; // Employee ID
  employeeName: string; // Snapshot
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  month: number; // 1-12
  year: number;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  employee: string; // Employee ID
  employeeName: string; // Snapshot
  month: number;
  year: number;
  baseSalary: number;
  totalAdvances: number;
  paidAmount: number;
  remainingAmount: number;
  finalPayable: number;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string; // ProductCategory name or ID
  price: number;
  description?: string;
  isActive: boolean;
  imageUrl?: string; // Standard or AI-generated image
  createdAt: string;
}

export interface OrderItem {
  product: string; // Product ID
  productName: string;
  quantity: number;
  price: number; // price snapshot
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'delivery' | 'takeaway';
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number; // Default 0
  grandTotal: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  order: string; // Order ID
  orderSnapshot: Order; // Snapshotted details so changes don't affect old invoices
  totalAmount: number;
  generatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string; // ExpenseCategory.name
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  phone: string;
  address: string;
  invoiceFooterText: string;
  logoText: string;
  logoUrl?: string;
}

export interface DatabaseSchema {
  employeeCategories: EmployeeCategory[];
  employees: Employee[];
  salaryHistories: SalaryHistory[];
  employeeAdvances: EmployeeAdvance[];
  salaryPayments: SalaryPayment[];
  productCategories: ProductCategory[];
  products: Product[];
  orders: Order[];
  invoices: Invoice[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  settings: RestaurantSettings;
}

// Initial/default seed data
const DEFAULT_DB: DatabaseSchema = {
  employeeCategories: [
    { id: 'ec-1', name: 'Manager', description: 'Oversees restaurant operations', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'ec-2', name: 'Cook', description: 'Kitchen culinary chef', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'ec-3', name: 'Waiter', description: 'Table service staff', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'ec-4', name: 'Cleaner', description: 'Janitorial staff', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'ec-5', name: 'Delivery Boy', description: 'Home deliveries driver', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'ec-6', name: 'Cashier', description: 'Counter POS terminal handler', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' }
  ],
  employees: [
    { id: 'emp-1', name: 'John Doe', phone: '1234567890', category: 'Manager', salaryType: 'monthly', monthlySalary: 3500, joiningDate: '2026-01-10', status: 'active', notes: 'Lead general manager', createdAt: '2026-01-10T10:00:00.000Z' },
    { id: 'emp-2', name: 'Malik Cook', phone: '9876543210', category: 'Cook', salaryType: 'monthly', monthlySalary: 3000, joiningDate: '2026-02-14', status: 'active', notes: 'Master chef', createdAt: '2026-02-14T09:00:00.000Z' },
    { id: 'emp-3', name: 'Ali Waiter', phone: '5551234567', category: 'Waiter', salaryType: 'daily', dailyWage: 80, joiningDate: '2026-03-01', status: 'active', notes: 'Service captain', createdAt: '2026-03-01T11:00:00.000Z' },
    { id: 'emp-4', name: 'Sana Cashier', phone: '4449876543', category: 'Cashier', salaryType: 'monthly', monthlySalary: 2500, joiningDate: '2026-04-15', status: 'active', notes: 'Handles cash register', createdAt: '2026-04-15T08:30:00.000Z' }
  ],
  salaryHistories: [
    { id: 'sh-1', employee: 'emp-2', employeeName: 'Malik Cook', oldSalary: 2800, newSalary: 3000, increaseType: 'fixed', increaseValue: 200, reason: 'Annual performance raise', effectiveDate: '2026-05-01', createdAt: '2026-05-01T12:00:00.000Z' }
  ],
  employeeAdvances: [
    { id: 'adv-1', employee: 'emp-1', employeeName: 'John Doe', amount: 300, date: '2026-06-02', notes: 'Emergency household expense', month: 6, year: 2026, createdAt: '2026-06-02T15:00:00.000Z' },
    { id: 'adv-2', employee: 'emp-3', employeeName: 'Ali Waiter', amount: 120, date: '2026-06-05', notes: 'Bicycle repair', month: 6, year: 2026, createdAt: '2026-06-05T14:30:00.000Z' }
  ],
  salaryPayments: [
    {
      id: 'sp-1',
      employee: 'emp-4',
      employeeName: 'Sana Cashier',
      month: 5,
      year: 2026,
      baseSalary: 2500,
      totalAdvances: 0,
      paidAmount: 2500,
      remainingAmount: 0,
      finalPayable: 2500,
      paymentDate: '2026-05-31',
      notes: 'May salary fully paid',
      createdAt: '2026-05-31T17:00:00.000Z'
    }
  ],
  productCategories: [
    { id: 'pc-1', name: 'Bread/Naan/Roti', description: 'Clay oven and flame items', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-2', name: 'Salan', description: 'Curries, stews, gravies', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-3', name: 'Rice', description: 'Standard and deluxe biryanis', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-4', name: 'Drinks', description: 'Cold beverages and juices', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-5', name: 'Tea', description: 'Karak and herbal milk teas', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-6', name: 'Fast Food', description: 'Quick burgers and pizzas', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'pc-7', name: 'Other', description: 'Fries, salads, appetizers', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' }
  ],
  products: [
    { id: 'p-1', name: 'Roghni Naan', category: 'Bread/Naan/Roti', price: 1.50, description: 'Freshly baked sesame butter naan', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-2', name: 'Tandoori Roti', category: 'Bread/Naan/Roti', price: 0.75, description: 'Traditional whole wheat flatbread', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-3', name: 'Chicken Karahi', category: 'Salan', price: 18.00, description: 'Spicy stir-fried chicken in karahi wok', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-4', name: 'Daal Makhni', category: 'Salan', price: 8.50, description: 'Creamy slow-cooked black lentils', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-5', name: 'Special Biryani', category: 'Rice', price: 12.00, description: 'Fragrant basmati rice layered with spiced mutton', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-6', name: 'Soda Can', category: 'Drinks', price: 2.00, description: 'Ice cold carbonated drink', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-7', name: 'Karak Tea', category: 'Tea', price: 1.50, description: 'Strong brewed tea with condensed milk', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-8', name: 'Gourmet Burger', category: 'Fast Food', price: 10.00, description: 'Flame grilled beef patty with house sauce', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'p-9', name: 'French Fries', category: 'Other', price: 4.00, description: 'Crispy salted potato fries', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' }
  ],
  orders: [
    {
      id: 'o-1001',
      orderNumber: 'Order-20260616-001',
      orderType: 'dine-in',
      tableNumber: '5',
      items: [
        { product: 'p-5', productName: 'Special Biryani', quantity: 2, price: 12.00, lineTotal: 24.00 },
        { product: 'p-3', productName: 'Chicken Karahi', quantity: 1, price: 18.00, lineTotal: 18.00 },
        { product: 'p-6', productName: 'Soda Can', quantity: 3, price: 2.00, lineTotal: 6.00 }
      ],
      subtotal: 48.00,
      discount: 3.00,
      grandTotal: 45.00,
      status: 'completed',
      createdAt: '2026-06-16T12:00:00.000Z'
    },
    {
      id: 'o-1002',
      orderNumber: 'Order-20260616-002',
      orderType: 'delivery',
      customerName: 'Jane Smith',
      customerPhone: '555-888-9999',
      customerAddress: '456 Garden Lane, Block B',
      items: [
        { product: 'p-8', productName: 'Gourmet Burger', quantity: 1, price: 10.00, lineTotal: 10.00 },
        { product: 'p-9', productName: 'French Fries', quantity: 1, price: 4.00, lineTotal: 4.00 },
        { product: 'p-7', productName: 'Karak Tea', quantity: 2, price: 1.50, lineTotal: 3.00 }
      ],
      subtotal: 17.00,
      discount: 0,
      grandTotal: 17.00,
      status: 'completed',
      createdAt: '2026-06-16T13:30:00.000Z'
    },
    {
      id: 'o-1003',
      orderNumber: 'Order-20260616-003',
      orderType: 'takeaway',
      items: [
        { product: 'p-1', productName: 'Roghni Naan', quantity: 3, price: 1.50, lineTotal: 4.50 },
        { product: 'p-4', productName: 'Daal Makhni', quantity: 1, price: 8.50, lineTotal: 8.50 }
      ],
      subtotal: 13.00,
      discount: 0,
      grandTotal: 13.00,
      status: 'pending',
      createdAt: '2026-06-16T14:00:00.000Z'
    }
  ],
  invoices: [
    {
      id: 'inv-1001',
      invoiceNumber: 'INV-20260616-001',
      order: 'o-1001',
      orderSnapshot: {
        id: 'o-1001',
        orderNumber: 'Order-20260616-001',
        orderType: 'dine-in',
        tableNumber: '5',
        items: [
          { product: 'p-5', productName: 'Special Biryani', quantity: 2, price: 12.00, lineTotal: 24.00 },
          { product: 'p-3', productName: 'Chicken Karahi', quantity: 1, price: 18.00, lineTotal: 18.00 },
          { product: 'p-6', productName: 'Soda Can', quantity: 3, price: 2.00, lineTotal: 6.00 }
        ],
        subtotal: 48.00,
        discount: 3.00,
        grandTotal: 45.00,
        status: 'completed',
        createdAt: '2026-06-16T12:00:00.000Z'
      },
      totalAmount: 45.00,
      generatedAt: '2026-06-16T12:05:00.000Z'
    },
    {
      id: 'inv-1002',
      invoiceNumber: 'INV-20260616-002',
      order: 'o-1002',
      orderSnapshot: {
        id: 'o-1002',
        orderNumber: 'Order-20260616-002',
        orderType: 'delivery',
        customerName: 'Jane Smith',
        customerPhone: '555-888-9999',
        customerAddress: '456 Garden Lane, Block B',
        items: [
          { product: 'p-8', productName: 'Gourmet Burger', quantity: 1, price: 10.00, lineTotal: 10.00 },
          { product: 'p-9', productName: 'French Fries', quantity: 1, price: 4.00, lineTotal: 4.00 },
          { product: 'p-7', productName: 'Karak Tea', quantity: 2, price: 1.50, lineTotal: 3.00 }
        ],
        subtotal: 17.00,
        discount: 0,
        grandTotal: 17.00,
        status: 'completed',
        createdAt: '2026-06-16T13:30:00.000Z'
      },
      totalAmount: 17.00,
      generatedAt: '2026-06-16T13:31:00.000Z'
    }
  ],
  expenseCategories: [
    { id: 'exc-1', name: 'Rent', description: 'Restaurant space monthly charges', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'exc-2', name: 'Utility Bills', description: 'Water, gas, electricity, internet', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'exc-3', name: 'Raw Material', description: 'Groceries, meat, vegetables, wheat', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'exc-4', name: 'Maintenance', description: 'Equipments fixing, plumbing, filters', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' },
    { id: 'exc-5', name: 'Other', description: 'Miscellaneous expenditures', isActive: true, createdAt: '2026-05-15T00:00:00.000Z' }
  ],
  expenses: [
    { id: 'exp-1', title: 'Monthly Venue Rent', category: 'Rent', amount: 1500, date: '2026-06-01', notes: 'June rent paid in full', createdAt: '2026-06-01T09:00:00.000Z' },
    { id: 'exp-2', title: 'Electricity Bill May', category: 'Utility Bills', amount: 320, date: '2026-06-03', notes: 'State Power invoice #9910', createdAt: '2026-06-03T11:00:00.000Z' },
    { id: 'exp-3', title: 'Meat and Poultry supplies', category: 'Raw Material', amount: 450, date: '2026-06-10', notes: 'Direct purchase from Halal meat wholesalers', createdAt: '2026-06-10T14:00:00.000Z' }
  ],
  settings: {
    restaurantName: 'The Royal Spice',
    phone: '+1 (555) 123-4567',
    address: '123 Gourmet Blvd, Food District, Capital City',
    invoiceFooterText: 'Thank you for dining with us! Come back soon.',
    logoText: 'R'
  }
};

// Ensure data folder and file exists
export function initializeDB(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }

  try {
    const rawContent = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(rawContent);

    // Merge settings if missing or new tables to ensure schema completeness
    const merged: DatabaseSchema = {
      ...DEFAULT_DB,
      ...parsed,
      settings: parsed.settings ? { ...DEFAULT_DB.settings, ...parsed.settings } : DEFAULT_DB.settings
    };

    return merged;
  } catch (err) {
    console.error('Error reading/parsing db.json, resetting to default.', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }
}

export function getDb(): DatabaseSchema {
  return initializeDB();
}

export function saveDb(data: DatabaseSchema): void {
  initializeDB(); // ensure directory exists
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
