import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  getDb, 
  saveDb, 
  Employee, 
  EmployeeCategory, 
  SalaryHistory, 
  EmployeeAdvance, 
  SalaryPayment, 
  Product, 
  ProductCategory, 
  Order, 
  Invoice, 
  Expense, 
  ExpenseCategory, 
  RestaurantSettings 
} from './src/server/db';
import { 
  generateInvoicePDF, 
  generateDailyReportPDF, 
  generateMonthlyReportPDF,
  generateProfessionalInvoicePDF
} from './src/server/pdf';
import { 
  generateImageFromPrompt, 
  editImageWithPrompt, 
  analyzeReceiptImage 
} from './src/server/geminiService';

// Standard AppError class as requested
class AppError extends Error {
  statusCode: number;
  errors: any[];
  constructor(message: string, statusCode: number, errors: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Helper response wrap formaters
  const formatSuccess = (message: string, data: any = {}, meta: any = {}) => ({
    success: true,
    message,
    data,
    meta
  });

  // CORS Headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ======================== API ROUTES ========================

  // --- HEALTH CHECK ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // --- RESTAURANT SETTINGS ---
  app.get('/api/settings', (req, res) => {
    const db = getDb();
    res.json(formatSuccess('Settings retrieved successfully', db.settings));
  });

  app.put('/api/settings', (req, res) => {
    const db = getDb();
    const updated = req.body;
    db.settings = { ...db.settings, ...updated };
    saveDb(db);
    res.json(formatSuccess('Settings updated successfully', db.settings));
  });

  // --- EMPLOYEE CATEGORIES ---
  app.get('/api/employee-categories', (req, res) => {
    const db = getDb();
    const activeOnly = req.query.active === 'true';
    let list = db.employeeCategories;
    if (activeOnly) {
      list = list.filter(c => c.isActive);
    }
    res.json(formatSuccess('Categories retrieved successfully', list));
  });

  app.post('/api/employee-categories', (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name) throw new AppError('Category name is required', 400);

      const db = getDb();
      // Check duplicate
      const duplicate = db.employeeCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (duplicate) throw new AppError('Category name already exists', 400);

      const newCat: EmployeeCategory = {
        id: `ec-${Date.now()}`,
        name,
        description,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.employeeCategories.push(newCat);
      saveDb(db);
      res.status(201).json(formatSuccess('Category created successfully', newCat));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/employee-categories/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      const db = getDb();
      const idx = db.employeeCategories.findIndex(c => c.id === id);
      if (idx === -1) throw new AppError('Category not found', 404);

      db.employeeCategories[idx] = {
        ...db.employeeCategories[idx],
        name: name !== undefined ? name : db.employeeCategories[idx].name,
        description: description !== undefined ? description : db.employeeCategories[idx].description,
        isActive: isActive !== undefined ? isActive : db.employeeCategories[idx].isActive
      };

      saveDb(db);
      res.json(formatSuccess('Category updated successfully', db.employeeCategories[idx]));
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/employee-categories/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const cat = db.employeeCategories.find(c => c.id === id);
      if (!cat) throw new AppError('Category not found', 404);

      // Soft delete: set isActive to false
      cat.isActive = false;
      saveDb(db);
      res.json(formatSuccess('Category deactivated successfully', cat));
    } catch (err) {
      next(err);
    }
  });


  // --- EMPLOYEE MANAGEMENT ---
  app.get('/api/employees', (req, res) => {
    const db = getDb();
    const { category, salaryType, status, search } = req.query;
    let list = db.employees;

    if (category) {
      list = list.filter(e => e.category === category);
    }
    if (salaryType) {
      list = list.filter(e => e.salaryType === salaryType);
    }
    if (status) {
      list = list.filter(e => e.status === status);
    }
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || (e.phone && e.phone.includes(s)));
    }

    res.json(formatSuccess('Employees retrieved successfully', list));
  });

  app.post('/api/employees', (req, res, next) => {
    try {
      const { name, phone, category, salaryType, monthlySalary, dailyWage, joiningDate, notes } = req.body;
      if (!name) throw new AppError('Employee name is required', 400);
      if (!category) throw new AppError('Category is required', 400);
      if (!salaryType) throw new AppError('Salary type is required', 400);

      const db = getDb();
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name,
        phone,
        category,
        salaryType,
        monthlySalary: salaryType === 'monthly' ? Number(monthlySalary) || 0 : undefined,
        dailyWage: salaryType === 'daily' ? Number(dailyWage) || 0 : undefined,
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        status: 'active',
        notes,
        createdAt: new Date().toISOString()
      };

      db.employees.push(newEmp);
      saveDb(db);
      res.status(201).json(formatSuccess('Employee added successfully', newEmp));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/employees/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = getDb();
      const idx = db.employees.findIndex(e => e.id === id);
      if (idx === -1) throw new AppError('Employee not found', 404);

      const oldEmp = db.employees[idx];
      const category = data.category !== undefined ? data.category : oldEmp.category;
      const salaryType = data.salaryType !== undefined ? data.salaryType : oldEmp.salaryType;

      db.employees[idx] = {
        ...oldEmp,
        name: data.name !== undefined ? data.name : oldEmp.name,
        phone: data.phone !== undefined ? data.phone : oldEmp.phone,
        category: category,
        salaryType: salaryType,
        monthlySalary: salaryType === 'monthly' ? (data.monthlySalary !== undefined ? Number(data.monthlySalary) : oldEmp.monthlySalary) : undefined,
        dailyWage: salaryType === 'daily' ? (data.dailyWage !== undefined ? Number(data.dailyWage) : oldEmp.dailyWage) : undefined,
        joiningDate: data.joiningDate !== undefined ? data.joiningDate : oldEmp.joiningDate,
        status: data.status !== undefined ? data.status : oldEmp.status,
        notes: data.notes !== undefined ? data.notes : oldEmp.notes
      };

      saveDb(db);
      res.json(formatSuccess('Employee updated successfully', db.employees[idx]));
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/employees/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const idx = db.employees.findIndex(e => e.id === id);
      if (idx === -1) throw new AppError('Employee not found', 404);

      // Disable or Soft delete
      db.employees[idx].status = 'inactive';
      saveDb(db);
      res.json(formatSuccess('Employee deactivated successfully', db.employees[idx]));
    } catch (err) {
      next(err);
    }
  });


  // --- SALARY INCREASE / HISTORY ---
  app.get('/api/salary-history', (req, res) => {
    const db = getDb();
    const { employeeId } = req.query;
    let list = db.salaryHistories;
    if (employeeId) {
      list = list.filter(sh => sh.employee === employeeId);
    }
    res.json(formatSuccess('Salary history retrieved successfully', list));
  });

  app.post('/api/salary-history', (req, res, next) => {
    try {
      const { employeeId, increaseType, increaseValue, reason, effectiveDate } = req.body;
      if (!employeeId) throw new AppError('Employee is required', 400);
      if (!increaseValue) throw new AppError('Increase amount is required', 400);

      const db = getDb();
      const empIdx = db.employees.findIndex(e => e.id === employeeId);
      if (empIdx === -1) throw new AppError('Employee not found', 404);

      const emp = db.employees[empIdx];
      const oldSalary = emp.salaryType === 'monthly' ? (emp.monthlySalary || 0) : (emp.dailyWage || 0);
      
      let val = Number(increaseValue);
      let newSalary = oldSalary;
      if (increaseType === 'fixed') {
        newSalary += val;
      } else if (increaseType === 'percentage') {
        newSalary += Math.round(oldSalary * (val / 100));
      }

      // Update Employee Current Salary directly (Strict guideline rule!)
      if (emp.salaryType === 'monthly') {
        emp.monthlySalary = newSalary;
      } else {
        emp.dailyWage = newSalary;
      }

      const historyEntry: SalaryHistory = {
        id: `sh-${Date.now()}`,
        employee: employeeId,
        employeeName: emp.name,
        oldSalary,
        newSalary,
        increaseType,
        increaseValue: val,
        reason: reason || 'Salary incremental revision',
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      db.salaryHistories.push(historyEntry);
      saveDb(db);
      res.status(201).json(formatSuccess('Salary increase recorded successfully', historyEntry));
    } catch (err) {
      next(err);
    }
  });


  // --- EMPLOYEE ADVANCES ---
  app.get('/api/advances', (req, res) => {
    const db = getDb();
    const { employeeId, month, year } = req.query;
    let list = db.employeeAdvances;
    if (employeeId) {
      list = list.filter(a => a.employee === employeeId);
    }
    if (month) {
      list = list.filter(a => a.month === Number(month));
    }
    if (year) {
      list = list.filter(a => a.year === Number(year));
    }
    res.json(formatSuccess('Employee advances retrieved successfully', list));
  });

  app.post('/api/advances', (req, res, next) => {
    try {
      const { employeeId, amount, date, notes } = req.body;
      if (!employeeId) throw new AppError('Employee is required', 400);
      if (!amount || Number(amount) <= 0) throw new AppError('Valid advance amount is required', 400);

      const db = getDb();
      const emp = db.employees.find(e => e.id === employeeId);
      if (!emp) throw new AppError('Employee not found', 404);

      const d = date ? new Date(date) : new Date();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const newAdvance: EmployeeAdvance = {
        id: `adv-${Date.now()}`,
        employee: employeeId,
        employeeName: emp.name,
        amount: Number(amount),
        date: date || new Date().toISOString().split('T')[0],
        notes,
        month,
        year,
        createdAt: new Date().toISOString()
      };

      db.employeeAdvances.push(newAdvance);
      saveDb(db);
      res.status(201).json(formatSuccess('Advance recorded successfully', newAdvance));
    } catch (err) {
      next(err);
    }
  });


  // --- SALARY PAYMENTS ---
  app.get('/api/salary-payments', (req, res) => {
    const db = getDb();
    const { employeeId, month, year } = req.query;
    let list = db.salaryPayments;
    if (employeeId) {
      list = list.filter(sp => sp.employee === employeeId);
    }
    if (month) {
      list = list.filter(sp => sp.month === Number(month));
    }
    if (year) {
      list = list.filter(sp => sp.year === Number(year));
    }
    res.json(formatSuccess('Salary payments retrieved successfully', list));
  });

  // Calculate salary details for processing
  app.get('/api/salary-payments/calculate', (req, res, next) => {
    try {
      const { employeeId, month, year, workedDays } = req.query;
      if (!employeeId || !month || !year) {
        throw new AppError('employeeId, month, and year are required parameters', 400);
      }

      const db = getDb();
      const emp = db.employees.find(e => e.id === employeeId);
      if (!emp) throw new AppError('Employee not found', 404);

      const m = Number(month);
      const y = Number(year);

      // Base salary calculation
      let baseSalary = 0;
      if (emp.salaryType === 'monthly') {
        baseSalary = emp.monthlySalary || 0;
      } else {
        // Daily wage scaling based on days worked query
        const days = Number(workedDays) || 26; // assume standard 26 workdays if not supplied
        baseSalary = (emp.dailyWage || 0) * days;
      }

      // Sum all advances taken in this month/year range (Strict guideline rule!)
      const monthlyAdvances = db.employeeAdvances
        .filter(adv => adv.employee === employeeId && adv.month === m && adv.year === y)
        .reduce((sum, adv) => sum + adv.amount, 0);

      const finalPayable = Math.max(0, baseSalary - monthlyAdvances);

      res.json(formatSuccess('Salary calculation completed', {
        employeeId: emp.id,
        employeeName: emp.name,
        salaryType: emp.salaryType,
        baseSalary,
        totalAdvances: monthlyAdvances,
        finalPayable,
        suggestedWorkedDays: Number(workedDays) || (emp.salaryType === 'daily' ? 26 : undefined)
      }));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/salary-payments', (req, res, next) => {
    try {
      const { employeeId, month, year, baseSalary, totalAdvances, paidAmount, notes, paymentDate } = req.body;
      if (!employeeId || !month || !year) throw new AppError('employeeId, month, and year are required', 400);

      const db = getDb();
      const emp = db.employees.find(e => e.id === employeeId);
      if (!emp) throw new AppError('Employee not found', 404);

      // check duplicate payment for this month/year combo
      const dup = db.salaryPayments.find(sp => sp.employee === employeeId && sp.month === Number(month) && sp.year === Number(year));
      if (dup) throw new AppError('Salary already finalized and paid for this month', 400);

      const base = Number(baseSalary) || 0;
      const advs = Number(totalAdvances) || 0;
      const finalPayable = Math.max(0, base - advs);
      const paid = Number(paidAmount) !== undefined ? Number(paidAmount) : finalPayable;
      const remainingAmount = Math.max(0, finalPayable - paid);

      const newPayment: SalaryPayment = {
        id: `sp-${Date.now()}`,
        employee: employeeId,
        employeeName: emp.name,
        month: Number(month),
        year: Number(year),
        baseSalary: base,
        totalAdvances: advs,
        paidAmount: paid,
        remainingAmount,
        finalPayable,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        notes,
        createdAt: new Date().toISOString()
      };

      db.salaryPayments.push(newPayment);
      saveDb(db);
      res.status(201).json(formatSuccess('Salary payment registered successfully', newPayment));
    } catch (err) {
      next(err);
    }
  });


  // --- PRODUCT CATEGORIES ---
  app.get('/api/product-categories', (req, res) => {
    const db = getDb();
    const activeOnly = req.query.active === 'true';
    let list = db.productCategories;
    if (activeOnly) {
      list = list.filter(c => c.isActive);
    }
    res.json(formatSuccess('Product categories retrieved successfully', list));
  });

  app.post('/api/product-categories', (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name) throw new AppError('Category name is required', 400);

      const db = getDb();
      const duplicate = db.productCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (duplicate) throw new AppError('Category already exists', 400);

      const newCat: ProductCategory = {
        id: `pc-${Date.now()}`,
        name,
        description,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.productCategories.push(newCat);
      saveDb(db);
      res.status(201).json(formatSuccess('Product Category created successfully', newCat));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/product-categories/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      const db = getDb();
      const idx = db.productCategories.findIndex(c => c.id === id);
      if (idx === -1) throw new AppError('Category not found', 404);

      db.productCategories[idx] = {
        ...db.productCategories[idx],
        name: name !== undefined ? name : db.productCategories[idx].name,
        description: description !== undefined ? description : db.productCategories[idx].description,
        isActive: isActive !== undefined ? isActive : db.productCategories[idx].isActive
      };
      saveDb(db);
      res.json(formatSuccess('Category updated successfully', db.productCategories[idx]));
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/product-categories/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const cat = db.productCategories.find(c => c.id === id);
      if (!cat) throw new AppError('Category not found', 404);

      cat.isActive = false;
      saveDb(db);
      res.json(formatSuccess('Category deactivated', cat));
    } catch (err) {
      next(err);
    }
  });


  // --- PRODUCT MANAGEMENT ---
  app.get('/api/products', (req, res) => {
    const db = getDb();
    const { category, active, search } = req.query;
    let list = db.products;

    if (category) {
      list = list.filter(p => p.category === category);
    }
    if (active === 'true') {
      list = list.filter(p => p.isActive);
    }
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
    }
    res.json(formatSuccess('Products retrieved successfully', list));
  });

  app.post('/api/products', (req, res, next) => {
    try {
      const { name, category, price, description, imageUrl, isActive } = req.body;
      if (!name) throw new AppError('Product name is required', 400);
      if (!category) throw new AppError('Product category is required', 400);
      if (price === undefined || Number(price) < 0) throw new AppError('Valid price is required', 400);

      const db = getDb();
      const newProduct: Product = {
        id: `p-${Date.now()}`,
        name,
        category,
        price: Number(price),
        description,
        imageUrl,
        isActive: isActive !== undefined ? !!isActive : true,
        createdAt: new Date().toISOString()
      };

      db.products.push(newProduct);
      saveDb(db);
      res.status(201).json(formatSuccess('Product added successfully', newProduct));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/products/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = getDb();
      const idx = db.products.findIndex(p => p.id === id);
      if (idx === -1) throw new AppError('Product not found', 404);

      db.products[idx] = {
        ...db.products[idx],
        name: data.name !== undefined ? data.name : db.products[idx].name,
        category: data.category !== undefined ? data.category : db.products[idx].category,
        price: data.price !== undefined ? Number(data.price) : db.products[idx].price,
        description: data.description !== undefined ? data.description : db.products[idx].description,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : db.products[idx].imageUrl,
        isActive: data.isActive !== undefined ? !!data.isActive : db.products[idx].isActive
      };

      saveDb(db);
      res.json(formatSuccess('Product updated successfully', db.products[idx]));
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/products/:id', (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const idx = db.products.findIndex(p => p.id === id);
      if (idx === -1) throw new AppError('Product not found', 404);

      db.products[idx].isActive = false;
      saveDb(db);
      res.json(formatSuccess('Product marked inactive', db.products[idx]));
    } catch (err) {
      next(err);
    }
  });


  // --- ORDER MANAGEMENT ---
  app.get('/api/orders', (req, res) => {
    const db = getDb();
    const { status, type, search } = req.query;
    let list = db.orders;

    if (status) {
      list = list.filter(o => o.status === status);
    }
    if (type) {
      list = list.filter(o => o.orderType === type);
    }
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(o => 
        o.orderNumber.toLowerCase().includes(s) || 
        (o.customerName && o.customerName.toLowerCase().includes(s)) ||
        (o.customerPhone && o.customerPhone.includes(s))
      );
    }

    res.json(formatSuccess('Orders retrieved successfully', list));
  });

  app.post('/api/orders', (req, res, next) => {
    try {
      const { orderType, tableNumber, customerName, customerPhone, customerAddress, items, discount } = req.body;
      if (!orderType) throw new AppError('Order type is required (dine-in, takeaway, delivery)', 400);
      if (!items || !Array.isArray(items) || items.length === 0) throw new AppError('Order items are required', 400);

      const db = getDb();
      
      // Calculate subtotal, snapshoting product price (Strict guideline rule!)
      let subtotal = 0;
      const resolvedItems = items.map((it: any) => {
        const prod = db.products.find(p => p.id === it.productId);
        if (!prod) throw new AppError(`Product ID ${it.productId} not found`, 404);
        
        const price = prod.price; // snapshotted price
        const quantity = Number(it.quantity) || 1;
        const lineTotal = price * quantity;
        subtotal += lineTotal;

        return {
          product: prod.id,
          productName: prod.name,
          quantity,
          price,
          lineTotal
        };
      });

      const disc = Number(discount) || 0;
      const grandTotal = Math.max(0, subtotal - disc);

      const orderNum = `Order-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      const newOrder: Order = {
        id: `o-${Date.now()}`,
        orderNumber: orderNum,
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        customerName: orderType === 'delivery' || orderType === 'takeaway' ? customerName : undefined,
        customerPhone: orderType === 'delivery' || orderType === 'takeaway' ? customerPhone : undefined,
        customerAddress: orderType === 'delivery' ? customerAddress : undefined,
        items: resolvedItems,
        subtotal,
        discount: disc,
        grandTotal,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      db.orders.push(newOrder);

      // Automatically generate a companion Invoice upon order placement (Strict guideline rule!)
      const invNum = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const companionInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: invNum,
        order: newOrder.id,
        orderSnapshot: newOrder,
        totalAmount: grandTotal,
        generatedAt: new Date().toISOString()
      };
      db.invoices.push(companionInvoice);

      saveDb(db);
      res.status(201).json(formatSuccess('Order placed and invoice generated', { order: newOrder, invoice: companionInvoice }));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/orders/:id/status', (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        throw new AppError('Invalid order status', 400);
      }

      const db = getDb();
      const oIdx = db.orders.findIndex(o => o.id === id);
      if (oIdx === -1) throw new AppError('Order not found', 404);

      db.orders[oIdx].status = status;

      // Keep invoice sync updated if status changes
      const invIdx = db.invoices.findIndex(inv => inv.order === id);
      if (invIdx !== -1) {
        db.invoices[invIdx].orderSnapshot.status = status;
      }

      saveDb(db);
      res.json(formatSuccess('OrderStatus modified successfully', db.orders[oIdx]));
    } catch (err) {
      next(err);
    }
  });


  // --- INVOICE MANAGEMENT ---
  app.get('/api/invoices', (req, res) => {
    const db = getDb();
    const { search, orderType, dateRange } = req.query;
    let list = db.invoices;

    if (orderType) {
      list = list.filter(inv => inv.orderSnapshot.orderType === orderType);
    }

    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(s) ||
        (inv.orderSnapshot.customerName && inv.orderSnapshot.customerName.toLowerCase().includes(s)) ||
        (inv.orderSnapshot.orderNumber && inv.orderSnapshot.orderNumber.toLowerCase().includes(s))
      );
    }

    if (dateRange) {
      // filters: daily, weekly, monthly
      const now = new Date();
      if (dateRange === 'daily') {
        const todayStr = now.toISOString().split('T')[0];
        list = list.filter(inv => inv.generatedAt.startsWith(todayStr));
      } else if (dateRange === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        list = list.filter(inv => new Date(inv.generatedAt) >= oneWeekAgo);
      } else if (dateRange === 'monthly') {
        const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
        list = list.filter(inv => inv.generatedAt.startsWith(thisMonthStr));
      }
    }

    res.json(formatSuccess('Invoices retrieved successfully', list));
  });

  // Serve printed thermal PDF receipt (Strict guideline rule!)
  app.get('/api/invoices/:id/pdf', async (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const invoice = db.invoices.find(inv => inv.id === id);
      if (!invoice) throw new AppError('Invoice not found', 404);

      const pdfBuffer = await generateInvoicePDF(invoice, db.settings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  // Serve printed professional high-resolution A4 size PDF invoice in PKR
  app.get('/api/invoices/:id/professional', async (req, res, next) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const invoice = db.invoices.find(inv => inv.id === id);
      if (!invoice) throw new AppError('Professional invoice not found', 404);

      const pdfBuffer = await generateProfessionalInvoicePDF(invoice, db.settings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="professional-invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  // Serve daily completed order totals (PKR) for past 7 days to Dashboard Recharts
  app.get('/api/reports/7day-trend', (req, res, next) => {
    try {
      const db = getDb();
      const trendData = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Find completed invoices for this day
        const dayInvoices = db.invoices.filter(inv => {
          return inv.generatedAt.startsWith(dayStr) && inv.orderSnapshot.status === 'completed';
        });
        
        const totalAmount = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        
        // formats date to "weekday (day/month)"
        const weekdayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        trendData.push({
          date: dayStr,
          dayLabel: `${weekdayName} (${d.getDate()}/${d.getMonth()+1})`,
          totalAmount: totalAmount
        });
      }
      
      res.json(formatSuccess('7-day trend calculated successfully', trendData));
    } catch (err) {
      next(err);
    }
  });


  // --- EXPENSE CATEGORIES ---
  app.get('/api/expense-categories', (req, res) => {
    const db = getDb();
    const activeOnly = req.query.active === 'true';
    let list = db.expenseCategories;
    if (activeOnly) {
      list = list.filter(c => c.isActive);
    }
    res.json(formatSuccess('Expense categories retrieved successfully', list));
  });

  app.post('/api/expense-categories', (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name) throw new AppError('Expense category name is required', 400);

      const db = getDb();
      const duplicate = db.expenseCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (duplicate) throw new AppError('Category already exists', 400);

      const newCat: ExpenseCategory = {
        id: `exc-${Date.now()}`,
        name,
        description,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.expenseCategories.push(newCat);
      saveDb(db);
      res.status(201).json(formatSuccess('Expense Category added', newCat));
    } catch (err) {
      next(err);
    }
  });


  // --- EXPENSE RECORDS ---
  app.get('/api/expenses', (req, res) => {
    const db = getDb();
    const { category, search } = req.query;
    let list = db.expenses;

    if (category) {
      list = list.filter(exp => exp.category === category);
    }
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(exp => exp.title.toLowerCase().includes(s) || (exp.notes && exp.notes.toLowerCase().includes(s)));
    }
    res.json(formatSuccess('Expenses retrieved successfully', list));
  });

  app.post('/api/expenses', (req, res, next) => {
    try {
      const { title, category, amount, date, notes } = req.body;
      if (!title) throw new AppError('Expense title is required', 400);
      if (!category) throw new AppError('Expense category is required', 400);
      if (amount === undefined || Number(amount) <= 0) throw new AppError('Valid positive expense amount is required', 400);

      const db = getDb();
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        title,
        category,
        amount: Number(amount),
        date: date || new Date().toISOString().split('T')[0],
        notes,
        createdAt: new Date().toISOString()
      };

      db.expenses.push(newExpense);
      saveDb(db);
      res.status(201).json(formatSuccess('Expense recorded successfully', newExpense));
    } catch (err) {
      next(err);
    }
  });


  // --- DAILY REPORTING METRICS ---
  app.get('/api/reports/daily', (req, res) => {
    const db = getDb();
    const selectedDate = String(req.query.date) || new Date().toISOString().split('T')[0];

    // Filter completed invoices for day
    const dayInvoices = db.invoices.filter(inv => {
      return inv.generatedAt.startsWith(selectedDate) && inv.orderSnapshot.status === 'completed';
    });

    const totalRevenue = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalOrders = dayInvoices.length;

    // Food product quantities sold
    const itemsMap: { [prodName: string]: { productName: string; category: string; quantity: number; totalRevenue: number } } = {};
    let totalItemsSold = 0;

    dayInvoices.forEach(inv => {
      inv.orderSnapshot.items.forEach(item => {
        totalItemsSold += item.quantity;
        if (!itemsMap[item.productName]) {
          // find product category for mapping
          const itemProduct = db.products.find(p => p.id === item.product);
          itemsMap[item.productName] = {
            productName: item.productName,
            category: itemProduct ? itemProduct.category : 'Other',
            quantity: 0,
            totalRevenue: 0
          };
        }
        itemsMap[item.productName].quantity += item.quantity;
        itemsMap[item.productName].totalRevenue += item.lineTotal;
      });
    });

    const productBreakdown = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity);

    // Order type distribute breakdown
    const orderTypeBreakdown = {
      dineIn: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'dine-in').length,
      delivery: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'delivery').length,
      takeaway: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'takeaway').length
    };

    res.json(formatSuccess('Daily metrics calculated', {
      date: selectedDate,
      totalRevenue,
      totalOrders,
      totalItemsSold,
      productBreakdown,
      orderTypeBreakdown
    }));
  });

  // Serve printable Daily Performance PDF report (Strict guideline!)
  app.get('/api/reports/daily/pdf', async (req, res, next) => {
    try {
      const selectedDate = String(req.query.date) || new Date().toISOString().split('T')[0];
      const db = getDb();

      // Recalculate same values for PDF render
      const dayInvoices = db.invoices.filter(inv => {
        return inv.generatedAt.startsWith(selectedDate) && inv.orderSnapshot.status === 'completed';
      });

      const totalRevenue = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalOrders = dayInvoices.length;

      const itemsMap: { [prodName: string]: { productName: string; category: string; quantity: number; totalRevenue: number } } = {};
      let totalItemsSold = 0;

      dayInvoices.forEach(inv => {
        inv.orderSnapshot.items.forEach(item => {
          totalItemsSold += item.quantity;
          if (!itemsMap[item.productName]) {
            const itemProduct = db.products.find(p => p.id === item.product);
            itemsMap[item.productName] = {
              productName: item.productName,
              category: itemProduct ? itemProduct.category : 'Other',
              quantity: 0,
              totalRevenue: 0
            };
          }
          itemsMap[item.productName].quantity += item.quantity;
          itemsMap[item.productName].totalRevenue += item.lineTotal;
        });
      });

      const productBreakdown = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity);

      const orderTypeBreakdown = {
        dineIn: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'dine-in').length,
        delivery: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'delivery').length,
        takeaway: dayInvoices.filter(inv => inv.orderSnapshot.orderType === 'takeaway').length
      };

      const reportData = {
        totalRevenue,
        totalOrders,
        totalItemsSold,
        productBreakdown,
        orderTypeBreakdown
      };

      const pdfBuffer = await generateDailyReportPDF(reportData, selectedDate, db.settings);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily-sales-report-${selectedDate}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });


  // --- MONTHLY FINANCIAL PERFORMANCE REPORT ---
  app.get('/api/reports/monthly', (req, res) => {
    const db = getDb();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    const monthStr = String(month).padStart(2, '0');
    const filterPrefix = `${year}-${monthStr}`; // YYYY-MM

    // 1. Monthly completed order revenue (Inflow)
    const monthInvoices = db.invoices.filter(inv => {
      return inv.generatedAt.startsWith(filterPrefix) && inv.orderSnapshot.status === 'completed';
    });
    const totalRevenue = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalOrders = monthInvoices.length;

    // 2. Monthly salaries paid (Outflow)
    const monthSalaries = db.salaryPayments.filter(sp => sp.month === month && sp.year === year);
    const totalSalaryPaid = monthSalaries.reduce((sum, sp) => sum + sp.paidAmount, 0);

    // 3. Monthly salary Advances taken
    const monthAdvances = db.employeeAdvances.filter(adv => adv.month === month && adv.year === year);
    const totalSalaryAdvances = monthAdvances.reduce((sum, adv) => sum + adv.amount, 0);

    // 4. Monthly operational Expenses
    const monthExpenses = db.expenses.filter(exp => exp.date.startsWith(filterPrefix));
    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 5. Estimated Net Profit Calculation Formula (Strict guideline rule)
    // Formula: monthly revenue - salary payments - expenses
    const estimatedNetProfit = totalRevenue - totalSalaryPaid - totalExpenses;

    // Total products sold breakdown
    const itemsMap: { [pName: string]: { productName: string; price: number; quantity: number; totalRevenue: number } } = {};
    let totalProductsSold = 0;

    monthInvoices.forEach(inv => {
      inv.orderSnapshot.items.forEach(item => {
        totalProductsSold += item.quantity;
        if (!itemsMap[item.productName]) {
          itemsMap[item.productName] = {
            productName: item.productName,
            price: item.price,
            quantity: 0,
            totalRevenue: 0
          };
        }
        itemsMap[item.productName].quantity += item.quantity;
        itemsMap[item.productName].totalRevenue += item.lineTotal;
      });
    });

    const productBreakdown = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity);

    res.json(formatSuccess('Monthly financials statement calculated', {
      year,
      month,
      totalRevenue,
      totalOrders,
      totalProductsSold,
      totalSalaryPaid,
      totalSalaryAdvances,
      totalExpenses,
      estimatedNetProfit,
      productBreakdown,
      employeeCount: db.employees.filter(e => e.status === 'active').length
    }));
  });

  // Serve Monthly Financial Statement PDF Report
  app.get('/api/reports/monthly/pdf', async (req, res, next) => {
    try {
      const db = getDb();
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || (new Date().getMonth() + 1);

      // Fetch monthly metrics manually
      const monthStr = String(month).padStart(2, '0');
      const filterPrefix = `${year}-${monthStr}`;

      const monthInvoices = db.invoices.filter(inv => {
        return inv.generatedAt.startsWith(filterPrefix) && inv.orderSnapshot.status === 'completed';
      });
      const totalRevenue = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalOrders = monthInvoices.length;

      const monthSalaries = db.salaryPayments.filter(sp => sp.month === month && sp.year === year);
      const totalSalaryPaid = monthSalaries.reduce((sum, sp) => sum + sp.paidAmount, 0);

      const monthAdvances = db.employeeAdvances.filter(adv => adv.month === month && adv.year === year);
      const totalSalaryAdvances = monthAdvances.reduce((sum, adv) => sum + adv.amount, 0);

      const monthExpenses = db.expenses.filter(exp => exp.date.startsWith(filterPrefix));
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const estimatedNetProfit = totalRevenue - totalSalaryPaid - totalExpenses;

      const itemsMap: { [pName: string]: { productName: string; price: number; quantity: number; totalRevenue: number } } = {};
      let totalProductsSold = 0;

      monthInvoices.forEach(inv => {
        inv.orderSnapshot.items.forEach(item => {
          totalProductsSold += item.quantity;
          if (!itemsMap[item.productName]) {
            itemsMap[item.productName] = {
              productName: item.productName,
              price: item.price,
              quantity: 0,
              totalRevenue: 0
            };
          }
          itemsMap[item.productName].quantity += item.quantity;
          itemsMap[item.productName].totalRevenue += item.lineTotal;
        });
      });

      const productBreakdown = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity);

      const reportData = {
        totalRevenue,
        totalOrders,
        totalProductsSold,
        totalSalaryPaid,
        totalSalaryAdvances,
        totalExpenses,
        estimatedNetProfit,
        productBreakdown,
        employeeCount: db.employees.filter(e => e.status === 'active').length
      };

      const pdfBuffer = await generateMonthlyReportPDF(reportData, year, month, db.settings);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-financial-report-${year}-${monthStr}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });


  // --- GEMINI ARTIFICIAL INTELLIGENCE ENDPOINTS (Creative Workspace / OCR Receipt parser) ---

  // Generate Menu product promotional graphics with prompt (Create & edit images)
  app.post('/api/gemini/generate-image', async (req, res, next) => {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) throw new AppError('Image prompt is required', 400);

      const resultUrl = await generateImageFromPrompt(prompt, aspectRatio);
      res.json(formatSuccess('AI image generated successfully', { imageUrl: resultUrl }));
    } catch (err: any) {
      next(new AppError(err.message || 'Gemini image generation failed', 500));
    }
  });

  // Edit images with prompt in active workspace
  app.post('/api/gemini/edit-image', async (req, res, next) => {
    try {
      const { image, prompt } = req.body; // base64 encoded
      if (!image) throw new AppError('Baseline base64 image data is required', 400);
      if (!prompt) throw new AppError('Edit instructions prompt are required', 400);

      const resultUrl = await editImageWithPrompt(image, prompt);
      res.json(formatSuccess('AI image modified successfully', { imageUrl: resultUrl }));
    } catch (err: any) {
      next(new AppError(err.message || 'Gemini image editing failed', 500));
    }
  });

  // Automatically parse uploaded store invoice image with OCR Pro (Analyze photo)
  app.post('/api/gemini/analyze-receipt', async (req, res, next) => {
    try {
      const { image } = req.body; // base64 encoded receipt image
      if (!image) throw new AppError('Image attachment is required', 400);

      const analyzedResult = await analyzeReceiptImage(image);
      res.json(formatSuccess('Receipt automatically decoded with Gemini Pro OCR successfully', analyzedResult));
    } catch (err: any) {
      next(new AppError(err.message || 'Gemini Pro OCR decryption failed', 500));
    }
  });


  // ======================== END API ROUTES ========================


  // In production, serve built React assets, but in dev setup Vite proxy middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for SPA router fallbacks
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centeralized Global Error Middleware (Strict guideline constraint!)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('SERVER ERROR METRICS:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors || [];
    
    res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  });

  // Catch unmatched routes (404 route handler)
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `REST endpoint path '${req.originalUrl}' does not exist on server.`
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting up successfully at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FATAL SYSTEM ENGINE BOOT ENCOUNTERED:', err);
});
