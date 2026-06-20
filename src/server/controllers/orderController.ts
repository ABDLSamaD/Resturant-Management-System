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

// Interactive HTML Thermal POS Slip Printer (renders ultra-compact receipts)
router.get('/invoices/:id/print', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const invoice = db.invoices.find(inv => inv.id === id);
    if (!invoice) throw new AppError('Invoice not found', 404);
    const settings = db.settings;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${invoice.invoiceNumber}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #f1f5f9;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .control-panel {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      width: 100%;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .control-panel h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
    }
    .control-panel p {
      margin: 0;
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .control-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
    }
    .btn {
      background: #ea580c;
      color: #fff;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn:hover {
      background: #c2410c;
    }
    .btn-secondary {
      background: #475569;
    }
    .btn-secondary:hover {
      background: #334155;
    }
    select {
      background: #334155;
      color: #fff;
      border: 1px solid #475569;
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
    }

    .receipt-paper {
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      padding: 10px 8px;
      transition: width 0.15s ease;
      border: 1px dashed #cbd5e1;
    }

    .w-58 {
      width: 58mm;
    }
    .w-80 {
      width: 80mm;
    }

    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .bold {
      font-weight: bold;
    }
    .uppercase {
      text-transform: uppercase;
    }
    
    .logo-header {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .address-line {
      font-size: 9px;
      color: #333333;
      margin-bottom: 2px;
    }

    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 3px double #000000;
      margin: 6px 0;
    }

    .meta-table, .items-table, .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    .meta-table td, .items-table td, .totals-table td {
      vertical-align: top;
      padding: 1.5px 0;
    }

    .col-qty {
      width: 15%;
      text-align: center;
    }
    .col-price {
      width: 25%;
      text-align: right;
    }
    .col-total {
      width: 25%;
      text-align: right;
    }
    
    .footer-text {
      font-size: 8px;
      margin-top: 8px;
      color: #333333;
      text-align: center;
      line-height: 1.2;
    }

    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        display: block !important;
      }
      .control-panel {
        display: none !important;
      }
      .receipt-paper {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      @page {
        margin: 0;
      }
      .w-58 {
        width: 58mm !important;
      }
      .w-80 {
        width: 80mm !important;
      }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="control-panel no-print">
    <h4>🖨️ POS Slip Printer</h4>
    <p>Set printer margins to <strong>None</strong> and size to <strong>58mm</strong> or <strong>80mm</strong>.</p>
    <div class="control-actions">
      <select id="width-select" onchange="updateWidth(this.value)">
        <option value="58" selected>Small Roll (58mm)</option>
        <option value="80">Medium Roll (80mm)</option>
      </select>
      <button class="btn" onclick="window.print()">Print</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div id="receipt" class="receipt-paper w-58">
    <div class="text-center">
      <div class="logo-header bold">${settings.restaurantName}</div>
      <div class="address-line">${settings.address || ''}</div>
      <div class="address-line">TEL: ${settings.phone || ''}</div>
    </div>
    
    <div class="divider"></div>
    
    <table class="meta-table">
      <tr>
        <td class="bold">INVOICE:</td>
        <td class="text-right bold">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td>Order Ref:</td>
        <td class="text-right">${invoice.orderSnapshot.orderNumber}</td>
      </tr>
      <tr>
        <td>Date:</td>
        <td class="text-right">${new Date(invoice.generatedAt).toLocaleString()}</td>
      </tr>
      <tr>
        <td>Type:</td>
        <td class="text-right uppercase">${invoice.orderSnapshot.orderType}</td>
      </tr>
      ${invoice.orderSnapshot.tableNumber ? `
      <tr>
        <td class="bold">Table:</td>
        <td class="text-right bold">${invoice.orderSnapshot.tableNumber}</td>
      </tr>` : ''}
      ${invoice.orderSnapshot.customerName ? `
      <tr>
        <td>Customer:</td>
        <td class="text-right">${invoice.orderSnapshot.customerName}</td>
      </tr>` : ''}
    </table>
    
    <div class="divider"></div>
    
    <table class="items-table">
      <thead>
        <tr class="bold" style="border-bottom: 1px dashed #000000;">
          <td style="text-align: left; padding-bottom: 2px;">Item Description</td>
          <td class="col-qty" style="padding-bottom: 2px;">Qty</td>
          <td class="col-price" style="padding-bottom: 2px;">Price</td>
          <td class="col-total" style="padding-bottom: 2px;">Total</td>
        </tr>
      </thead>
      <tbody>
        ${invoice.orderSnapshot.items.map(it => `
        <tr>
          <td style="text-align: left; padding: 2px 0; word-break: break-all;">${it.productName}</td>
          <td class="col-qty" style="padding: 2px 0;">${it.quantity}</td>
          <td class="col-price" style="padding: 2px 0;">${it.price.toFixed(2)}</td>
          <td class="col-total" style="padding: 2px 0;">${it.lineTotal.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="divider"></div>
    
    <table class="totals-table">
      <tr>
        <td>Subtotal:</td>
        <td class="text-right">Rs. ${invoice.orderSnapshot.subtotal.toFixed(2)}</td>
      </tr>
      ${invoice.orderSnapshot.discount > 0 ? `
      <tr>
        <td>Discount:</td>
        <td class="text-right">-Rs. ${invoice.orderSnapshot.discount.toFixed(2)}</td>
      </tr>` : ''}
      <tr class="bold" style="font-size: 10px;">
        <td style="padding-top: 3px;">GRAND TOTAL:</td>
        <td class="text-right" style="padding-top: 3px;">Rs. ${invoice.totalAmount.toFixed(2)}</td>
      </tr>
    </table>
    
    <div class="double-divider"></div>
    
    <div class="footer-text">
      ${settings.invoiceFooterText || 'Thank you for dining with us!'}
      <div style="font-size: 7px; margin-top: 5px; color: #666; font-family: monospace;">
        POWRD BY RESTAURANT RMS
      </div>
    </div>
  </div>

  <script>
    function updateWidth(size) {
      const receipt = document.getElementById('receipt');
      if (size === '58') {
        receipt.className = 'receipt-paper w-58';
      } else {
        receipt.className = 'receipt-paper w-80';
      }
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
