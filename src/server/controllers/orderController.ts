import { Router, Request, Response, NextFunction } from 'express';
import { getDb, saveDb, Order, Invoice } from '../db';
import { formatSuccess, AppError } from '../helpers/response';
import { 
  generateInvoicePDF, 
  generateDailyReportPDF, 
  generateMonthlyReportPDF,
  generateProfessionalInvoicePDF
} from '../pdf';

const router = Router();

// --- ORDERS ---
router.get('/orders', (req: Request, res: Response) => {
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

router.post('/orders', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      orderType, 
      tableNumber, 
      customerName, 
      customerPhone, 
      customerAddress, 
      items, 
      discount,
      paymentStatus,
      paymentDueDate 
    } = req.body;

    if (!orderType) throw new AppError('Order type is required (dine-in, takeaway, delivery, hand-to-hand, on-table, cash)', 400);
    if (!items || !Array.isArray(items) || items.length === 0) throw new AppError('Order items are required', 400);

    const db = getDb();
    let subtotal = 0;
    const resolvedItems = items.map((it: any) => {
      const prod = db.products.find(p => p.id === it.productId);
      if (!prod) throw new AppError(`Product ID ${it.productId} not found`, 404);
      
      const price = prod.price;
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

    const parsedPaymentStatus = paymentStatus === 'credit' ? 'credit' : 'paid';

    const newOrder: Order = {
      id: `o-${Date.now()}`,
      orderNumber: orderNum,
      orderType,
      tableNumber: (orderType === 'dine-in' || orderType === 'on-table') ? tableNumber : undefined,
      customerName: (orderType !== 'dine-in' && orderType !== 'on-table') ? customerName : undefined,
      customerPhone: (orderType !== 'dine-in' && orderType !== 'on-table') ? customerPhone : undefined,
      customerAddress: (orderType === 'delivery' || orderType === 'hand-to-hand') ? customerAddress : undefined,
      items: resolvedItems,
      subtotal,
      discount: disc,
      grandTotal,
      status: 'pending',
      paymentStatus: parsedPaymentStatus,
      paymentDueDate: parsedPaymentStatus === 'credit' ? paymentDueDate : undefined,
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);

    // If checkout payment is designated as credit, trigger separate credit ledger transaction
    if (parsedPaymentStatus === 'credit') {
      const creditCustName = customerName || (tableNumber ? `Table ${tableNumber}` : 'Walk-in Credit Customer');
      const newCredit: any = {
        id: `cred-${Date.now()}`,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerName: creditCustName,
        customerPhone: customerPhone || undefined,
        amount: grandTotal,
        dueDate: paymentDueDate || undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      db.credits = db.credits || [];
      db.credits.push(newCredit);
    }

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

router.put('/orders/:id/status', (req: Request, res: Response, next: NextFunction) => {
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

// --- INVOICES ---
router.get('/invoices', (req: Request, res: Response) => {
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
    const now = new Date();
    if (dateRange === 'daily') {
      const todayStr = now.toISOString().split('T')[0];
      list = list.filter(inv => inv.generatedAt.startsWith(todayStr));
    } else if (dateRange === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(inv => new Date(inv.generatedAt) >= oneWeekAgo);
    } else if (dateRange === 'monthly') {
      const thisMonthStr = now.toISOString().slice(0, 7);
      list = list.filter(inv => inv.generatedAt.startsWith(thisMonthStr));
    }
  }

  res.json(formatSuccess('Invoices retrieved successfully', list));
});

// Thermal PDF Printer
router.get('/invoices/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
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

// High-Res A4 size PDF Printer
router.get('/invoices/:id/professional', async (req: Request, res: Response, next: NextFunction) => {
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

// --- METRICS / REPORTS ---
router.get('/reports/7day-trend', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const trendData = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      
      const dayInvoices = db.invoices.filter(inv => {
        return inv.generatedAt.startsWith(dayStr) && inv.orderSnapshot.status === 'completed';
      });
      
      const totalAmount = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
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

router.get('/reports/daily', (req: Request, res: Response) => {
  const db = getDb();
  const selectedDate = String(req.query.date) || new Date().toISOString().split('T')[0];

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

  res.json(formatSuccess('Daily metrics calculated', {
    date: selectedDate,
    totalRevenue,
    totalOrders,
    totalItemsSold,
    productBreakdown,
    orderTypeBreakdown
  }));
});

router.get('/reports/daily/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const selectedDate = String(req.query.date) || new Date().toISOString().split('T')[0];
    const db = getDb();

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

router.get('/reports/monthly', (req: Request, res: Response) => {
  const db = getDb();
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || (new Date().getMonth() + 1);

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

router.get('/reports/monthly/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

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

// --- CREDIT SYSTEM ---
router.get('/credits', (req: Request, res: Response) => {
  const db = getDb();
  let list = db.credits || [];
  const { search, status } = req.query;

  if (status) {
    list = list.filter(c => c.status === status);
  }
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(c => 
      c.customerName.toLowerCase().includes(s) || 
      c.orderNumber.toLowerCase().includes(s) ||
      (c.customerPhone && c.customerPhone.includes(s))
    );
  }

  res.json(formatSuccess('Credits retrieved successfully', list));
});

router.post('/credits/:id/settle', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    db.credits = db.credits || [];
    const idx = db.credits.findIndex(c => c.id === id);
    if (idx === -1) throw new AppError('Credit record not found', 404);

    db.credits[idx].status = 'settled';
    db.credits[idx].settledAt = new Date().toISOString();

    const orderId = db.credits[idx].orderId;
    const oIdx = db.orders.findIndex(o => o.id === orderId);
    if (oIdx !== -1) {
      db.orders[oIdx].paymentStatus = 'paid';
    }

    const invIdx = db.invoices.findIndex(inv => inv.order === orderId);
    if (invIdx !== -1) {
      db.invoices[invIdx].orderSnapshot.paymentStatus = 'paid';
    }

    saveDb(db);
    res.json(formatSuccess('Credit balance settled successfully!', db.credits[idx]));
  } catch (err) {
    next(err);
  }
});

export default router;
