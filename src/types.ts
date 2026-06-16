export interface EmployeeCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  category: string;
  salaryType: 'monthly' | 'daily';
  monthlySalary?: number;
  dailyWage?: number;
  joiningDate: string;
  status: 'active' | 'inactive';
  notes?: string;
}

export interface SalaryHistory {
  id: string;
  employee: string;
  employeeName: string;
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
  employee: string;
  employeeName: string;
  amount: number;
  date: string;
  notes?: string;
  month: number;
  year: number;
}

export interface SalaryPayment {
  id: string;
  employee: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  totalAdvances: number;
  paidAmount: number;
  remainingAmount: number;
  finalPayable: number;
  paymentDate: string;
  notes?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface OrderItem {
  product: string;
  productName: string;
  quantity: number;
  price: number;
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
  discount: number;
  grandTotal: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  order: string;
  orderSnapshot: Order;
  totalAmount: number;
  generatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  phone: string;
  address: string;
  invoiceFooterText: string;
  logoText: string;
}
