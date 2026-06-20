import PDFDocument from 'pdfkit';
import { Invoice, Order, RestaurantSettings } from './db';

/**
 * Generate a beautiful thermal-style 80mm roll size PDF receipt
 * 80mm roughly equals 226 points. Margins are small.
 */
export function generateInvoicePDF(invoice: Invoice, settings: RestaurantSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const itemCount = invoice.orderSnapshot.items?.length || 0;
    const pageHeight = 160 + (itemCount * 20) + 110; // estimated vertical space needed

    const doc = new PDFDocument({
      size: [164, pageHeight],
      margins: { top: 12, bottom: 12, left: 5, right: 5 }
    });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    // Logo & Header
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text(settings.restaurantName, { align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#4b5563')
       .text(settings.address || '', { align: 'center' })
       .text(`Tel: ${settings.phone || ''}`, { align: 'center' });

    doc.moveDown(0.4);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(5, doc.y).lineTo(159, doc.y).stroke();
    doc.moveDown(0.4);

    // Invoice Meta info
    doc.fontSize(7).fillColor('#1f2937')
       .text(`Receipt: ${invoice.invoiceNumber}`)
       .text(`Type: ${invoice.orderSnapshot.orderType.toUpperCase()}`);
    
    if (invoice.orderSnapshot.orderType === 'dine-in' && invoice.orderSnapshot.tableNumber) {
      doc.text(`Table: ${invoice.orderSnapshot.tableNumber}`);
    } else if (invoice.orderSnapshot.customerName && invoice.orderSnapshot.customerName.trim() !== '') {
      doc.text(`Guest: ${invoice.orderSnapshot.customerName}`);
    }

    const dateStr = new Date(invoice.generatedAt).toLocaleString();
    doc.text(`Date: ${dateStr}`);

    doc.moveDown(0.4);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(5, doc.y).lineTo(159, doc.y).stroke();
    doc.moveDown(0.4);

    // Items table header
    doc.font('Helvetica-Bold').fontSize(6.5)
       .text('Item', 5, doc.y, { width: 70, continued: true })
       .text('Qty', { width: 22, align: 'center', continued: true })
       .text('Price', { width: 28, align: 'right', continued: true })
       .text('Total', { width: 34, align: 'right' });

    doc.moveDown(0.2);
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(5, doc.y).lineTo(159, doc.y).stroke();
    doc.moveDown(0.3);

    // Items list
    doc.font('Helvetica').fontSize(6.5).fillColor('#374151');
    invoice.orderSnapshot.items.forEach(item => {
      const startY = doc.y;
      doc.text(item.productName, 5, startY, { width: 70, lineBreak: true });
      const nextY = doc.y;
      doc.text(String(item.quantity), 75, startY, { width: 22, align: 'center' });
      doc.text(item.price.toFixed(2), 97, startY, { width: 28, align: 'right' });
      doc.text(item.lineTotal.toFixed(2), 125, startY, { width: 34, align: 'right' });
      doc.y = Math.max(nextY, startY + 11); // advance cursor correctly
    });

    doc.moveDown(0.4);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(5, doc.y).lineTo(159, doc.y).stroke();
    doc.moveDown(0.4);

    // Totals calculations
    const totalsX = 70;
    doc.font('Helvetica').fontSize(7).fillColor('#1f2937');
    doc.text('Subtotal:', totalsX, doc.y, { width: 45, continued: true })
       .text(`Rs.${invoice.orderSnapshot.subtotal.toFixed(2)}`, { align: 'right', width: 44 });
    
    if (invoice.orderSnapshot.discount > 0) {
      doc.text('Discount:', totalsX, doc.y, { width: 45, continued: true })
         .text(`-Rs.${invoice.orderSnapshot.discount.toFixed(2)}`, { align: 'right', width: 44 });
    }

    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(7.5)
       .text('TOTAL:', totalsX, doc.y, { width: 45, continued: true })
       .text(`Rs.${invoice.totalAmount.toFixed(2)}`, { align: 'right', width: 44 });

    // Footer Text
    doc.moveDown(1.2);
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#6b7280')
       .text(settings.invoiceFooterText || 'Thank you for your business!', { align: 'center', width: 154 });

    doc.end();
  });
}

/**
 * General report style header helper
 */
function drawReportHeader(doc: any, title: string, subtitle: string, settings: RestaurantSettings) {
  // Brand color banner (Slate gray)
  doc.rect(40, 40, 515, 60).fill('#1e293b');
  
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(settings.restaurantName.toUpperCase(), 50, 52);
  doc.font('Helvetica').fontSize(10).fillColor('#94a3b8').text(title, 50, 78);
  
  doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(`Generated on: ${new Date().toLocaleString()}`, 380, 55, { align: 'right', width: 165 });
  doc.text(`Period/Filter: ${subtitle}`, 380, 70, { align: 'right', width: 165 });
  
  doc.y = 120; // set starting y position for body
}

/**
 * Generate a daily sales PDF report in A4 portrait format
 */
export function generateDailyReportPDF(reportData: any, selectedDate: string, settings: RestaurantSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    drawReportHeader(doc, 'DAILY PERFORMANCE & SALES REPORT', `Date: ${selectedDate}`, settings);

    // KPI summary cards
    const startY = doc.y;
    // Box 1: Revenue
    doc.rect(40, startY, 155, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(`Rs. ${reportData.totalRevenue.toFixed(2)}`, 50, startY + 12);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Total Revenue', 50, startY + 36);

    // Box 2: Total Orders / Invoices
    doc.rect(210, startY, 160, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(String(reportData.totalOrders), 220, startY + 12);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Orders / Completed Invoices', 220, startY + 36);

    // Box 3: Items Sold
    doc.rect(385, startY, 170, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(String(reportData.totalItemsSold), 395, startY + 12);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Total Menu Items Sold', 395, startY + 36);

    doc.y = startY + 80;

    // Table of Product Sales Breakdown
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Product-wise Sales Quantity Breakdown', 40, doc.y);
    doc.moveDown(0.4);

    const tableY = doc.y;
    // Table Header
    doc.rect(40, tableY, 515, 20).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155');
    doc.text('No.', 50, tableY + 5, { width: 30 });
    doc.text('Product Name', 90, tableY + 5, { width: 200 });
    doc.text('Category', 290, tableY + 5, { width: 100 });
    doc.text('Qty Sold', 390, tableY + 5, { width: 60, align: 'center' });
    doc.text('Revenue', 470, tableY + 5, { width: 80, align: 'right' });

    let currentY = tableY + 20;
    doc.font('Helvetica').fontSize(8).fillColor('#475569');

    if (reportData.productBreakdown && reportData.productBreakdown.length > 0) {
      reportData.productBreakdown.forEach((item: any, index: number) => {
        // Draw alternate rows colored
        if (index % 2 === 1) {
          doc.rect(40, currentY, 515, 18).fill('#f8fafc');
        }
        doc.fillColor('#475569');
        doc.text(String(index + 1), 50, currentY + 5, { width: 30 });
        doc.text(item.productName, 90, currentY + 5, { width: 200 });
        doc.text(item.category || 'Other', 290, currentY + 5, { width: 100 });
        doc.text(String(item.quantity), 390, currentY + 5, { width: 60, align: 'center' });
        doc.text(`Rs. ${item.totalRevenue.toFixed(2)}`, 470, currentY + 5, { width: 80, align: 'right' });
        currentY += 18;
      });
    } else {
      doc.font('Helvetica-Oblique').text('No product sales recorded for this date.', 50, currentY + 10);
      doc.font('Helvetica');
      currentY += 30;
    }

    doc.y = currentY + 20;

    // Order type breakdown & Details
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Order Type Distribution', 40, doc.y);
    doc.moveDown(0.4);

    const summaryY = doc.y;
    doc.rect(40, summaryY, 240, 80).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(`Dine-in Orders: ${reportData.orderTypeBreakdown.dineIn || 0}`, 50, summaryY + 15);
    doc.text(`Takeaway Orders: ${reportData.orderTypeBreakdown.takeaway || 0}`, 50, summaryY + 35);
    doc.text(`Delivery Orders: ${reportData.orderTypeBreakdown.delivery || 0}`, 50, summaryY + 55);

    // Guidelines signature area
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
       .text('Official System Report generated by Restaurant Management Admin.', 40, 770, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate a monthly financial PDF report in A4 portrait format
 */
export function generateMonthlyReportPDF(reportData: any, year: number, month: number, settings: RestaurantSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthStr = monthNames[month - 1] || `Month ${month}`;

    drawReportHeader(doc, 'MONTHLY FINANCIAL SOUNDNESS STATEMENT', `${monthStr} ${year}`, settings);

    // Monthly Profit/Loss Calculation Equation
    const startY = doc.y;
    doc.rect(40, startY, 515, 60).fill('#f0f9ff').stroke('#bae6fd');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0369a1').text(`Rs. ${reportData.estimatedNetProfit.toFixed(2)}`, 60, startY + 12);
    doc.font('Helvetica').fontSize(9).fillColor('#0284c7').text('Estimated Monthly Net Profit (Formulated: Revenue - Salaries Paid - Expenses)', 60, startY + 36);

    doc.y = startY + 80;

    // Left side: Detailed Financial Breakdown table
    const leftX = 40;
    const rightX = 300;
    const tableY = doc.y;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Inflow & Outflow Ledger Summary', leftX, tableY);
    doc.moveDown(0.4);

    const subTableY = doc.y;
    doc.rect(leftX, subTableY, 240, 110).fill('#f8fafc').stroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text('TOTAL REVENUE (Sales Invoices)', leftX + 10, subTableY + 12);
    doc.font('Helvetica').text(`Rs. ${reportData.totalRevenue.toFixed(2)}`, leftX + 170, subTableY + 12, { align: 'right', width: 60 });
    
    doc.font('Helvetica-Bold').text('TOTAL OUTFLOWS', leftX + 10, subTableY + 36);
    doc.font('Helvetica').fillColor('#b91c1c')
       .text(`Rs. ${(reportData.totalSalaryPaid + reportData.totalExpenses).toFixed(2)}`, leftX + 170, subTableY + 36, { align: 'right', width: 60 });

    doc.fontSize(7).fillColor('#475569')
       .text(`- Emp Salaries Paid: Rs. ${reportData.totalSalaryPaid.toFixed(2)}`, leftX + 20, subTableY + 54)
       .text(`- Emp Advances Handed: Rs. ${reportData.totalSalaryAdvances.toFixed(2)}`, leftX + 20, subTableY + 68)
       .text(`- Store Operational Expenses: Rs. ${reportData.totalExpenses.toFixed(2)}`, leftX + 20, subTableY + 82);

    // Right side: Top metrics / numbers
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Operational Volume', rightX, tableY);
    doc.fontSize(8);
    const metricsY = subTableY;
    doc.rect(rightX, metricsY, 255, 110).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#334155');
    doc.text(`Completed Orders Count: ${reportData.totalOrders}`, rightX + 15, metricsY + 15);
    doc.text(`Total Food Products Circulated: ${reportData.totalProductsSold}`, rightX + 15, metricsY + 35);
    doc.text(`Daily Inflow Invoices Issued: ${reportData.totalOrders}`, rightX + 15, metricsY + 55);
    doc.text(`Active Employees on Payroll: ${reportData.employeeCount || 0}`, rightX + 15, metricsY + 75);

    // Product Category Performance Table
    doc.y = Math.max(doc.y, subTableY + 130);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Product Sales Contribution', 40, doc.y);
    doc.moveDown(0.4);

    const gridY = doc.y;
    doc.rect(40, gridY, 515, 20).fill('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
    doc.text('Menu Product Name', 50, gridY + 6, { width: 220 });
    doc.text('Units Sold', 300, gridY + 6, { width: 80, align: 'center' });
    doc.text('Unit Price', 380, gridY + 6, { width: 80, align: 'right' });
    doc.text('Sum Total', 460, gridY + 6, { width: 80, align: 'right' });

    let pY = gridY + 20;
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    
    if (reportData.productBreakdown && reportData.productBreakdown.length > 0) {
      reportData.productBreakdown.forEach((p: any, idx: number) => {
        if (idx % 2 === 1) {
          doc.rect(40, pY, 515, 16).fill('#f8fafc');
        }
        doc.fillColor('#475569');
        doc.text(p.productName, 50, pY + 4, { width: 220 });
        doc.text(String(p.quantity), 300, pY + 4, { width: 80, align: 'center' });
        doc.text(`Rs. ${p.price.toFixed(2)}`, 380, pY + 4, { width: 80, align: 'right' });
        doc.text(`Rs. ${p.totalRevenue.toFixed(2)}`, 460, pY + 4, { width: 80, align: 'right' });
        pY += 16;
      });
    } else {
      doc.font('Helvetica-Oblique').text('No sales distributed this month.', 50, pY + 8);
      doc.font('Helvetica');
      pY += 25;
    }

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
       .text('This compiled report represents an validated financial ledger calculation of restaurant operations.', 40, 770, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate a beautiful professional high-resolution A4 size PDF invoice
 */
export function generateProfessionalInvoicePDF(invoice: Invoice, settings: RestaurantSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    // Elegant Header Banner (Deep Slate Accent)
    doc.rect(40, 40, 515, 80).fill('#0f172a');

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text(settings.restaurantName.toUpperCase(), 55, 55);
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text('PROFESSIONAL SALES & SERVICE INVOICE', 55, 85);
    
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('INVOICE', 400, 55, { align: 'right', width: 140 });
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text(`Invoice #: ${invoice.invoiceNumber}`, 400, 75, { align: 'right', width: 140 });
    doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString()}`, 400, 88, { align: 'right', width: 140 });

    const topSectionY = 140;

    // Left Column: Restaurant Info / Issuer
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('ISSUED BY:', 40, topSectionY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(settings.restaurantName, 40, topSectionY + 15);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(settings.address, 40, topSectionY + 30, { width: 220 });
    doc.text(`Phone: ${settings.phone}`, 40, topSectionY + 55);

    // Right Column: Customer Info / Bill To
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('BILLED TO:', 300, topSectionY);
    
    // Determine customer title or table count
    let customerTitle = 'Valued Guest';
    let customerDetails = '';
    
    if (invoice.orderSnapshot.orderType === 'dine-in') {
      customerTitle = `Dine-In Guest (Table ${invoice.orderSnapshot.tableNumber || 'N/A'})`;
      customerDetails = 'Seat Service Dining';
    } else if (invoice.orderSnapshot.orderType === 'takeaway') {
      customerTitle = 'Takeaway Customer';
      customerDetails = 'Self-Pickup Checkout';
    } else if (invoice.orderSnapshot.orderType === 'delivery') {
      customerTitle = invoice.orderSnapshot.customerName || 'Delivery Guest';
      customerDetails = `Phone: ${invoice.orderSnapshot.customerPhone || 'N/A'}\nAddress: ${invoice.orderSnapshot.customerAddress || 'N/A'}`;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(customerTitle, 300, topSectionY + 15);
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(customerDetails, 300, topSectionY + 30, { width: 250 });

    // Middle Divider Line
    const dividerY = Math.max(doc.y, topSectionY + 80);
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, dividerY).lineTo(555, dividerY).stroke();

    // Meta Row: Reference & Payment Info
    const metaY = dividerY + 15;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
    doc.text('Order Ref:', 40, metaY);
    doc.text('Order Strategy:', 160, metaY);
    doc.text('Payment Status:', 300, metaY);
    doc.text('Currency:', 440, metaY);

    doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
    doc.text(invoice.orderSnapshot.orderNumber, 40, metaY + 14);
    doc.text(invoice.orderSnapshot.orderType.toUpperCase(), 160, metaY + 14);
    
    doc.font('Helvetica-Bold').fillColor('#16a34a');
    doc.text('PAID (CASH/CARD)', 300, metaY + 14);
    
    doc.font('Helvetica').fillColor('#0f172a');
    doc.text('PKR (Rs.)', 440, metaY + 14);
    
    // Items Grid Header
    const gridY = metaY + 50;
    doc.rect(40, gridY, 515, 20).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
    doc.text('Item Description', 50, gridY + 6, { width: 220 });
    doc.text('Quantity', 300, gridY + 6, { width: 60, align: 'center' });
    doc.text('Unit Price', 370, gridY + 6, { width: 80, align: 'right' });
    doc.text('Total (PKR)', 460, gridY + 6, { width: 80, align: 'right' });

    let pY = gridY + 20;
    doc.font('Helvetica').fontSize(9).fillColor('#475569');

    // List out items
    invoice.orderSnapshot.items.forEach((item, idx) => {
      // Shading alternative rows
      if (idx % 2 === 1) {
        doc.rect(40, pY, 515, 18).fill('#f8fafc');
      }
      doc.fillColor('#0f172a');
      doc.text(item.productName, 50, pY + 5, { width: 220, lineBreak: true });
      const nextY = doc.y;
      
      doc.fillColor('#334155');
      doc.text(String(item.quantity), 300, pY + 5, { width: 60, align: 'center' });
      doc.text(`Rs. ${item.price.toFixed(2)}`, 370, pY + 5, { width: 80, align: 'right' });
      doc.text(`Rs. ${item.lineTotal.toFixed(2)}`, 460, pY + 5, { width: 80, align: 'right' });
      pY = Math.max(nextY + 5, pY + 18);
    });

    const totalBlockY = pY + 15;

    // Totals Block (Right aligned)
    const totalBlockX = 320;

    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text('Subtotal:', totalBlockX, totalBlockY);
    doc.text(`Rs. ${invoice.orderSnapshot.subtotal.toFixed(2)}`, 470, totalBlockY, { align: 'right', width: 70 });

    let currentTotalY = totalBlockY + 15;

    if (invoice.orderSnapshot.discount > 0) {
      doc.text('Discount:', totalBlockX, currentTotalY);
      doc.font('Helvetica-Bold').fillColor('#dc2626')
         .text(`-Rs. ${invoice.orderSnapshot.discount.toFixed(2)}`, 470, currentTotalY, { align: 'right', width: 70 });
      doc.font('Helvetica').fillColor('#475569');
      currentTotalY += 15;
    }

    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(totalBlockX, currentTotalY).lineTo(540, currentTotalY).stroke();
    currentTotalY += 6;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
    doc.text('Grand Total:', totalBlockX, currentTotalY);
    doc.text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 450, currentTotalY, { align: 'right', width: 90 });

    // Footer note
    doc.font('Helvetica-BoldOblique').fontSize(8).fillColor('#64748b')
       .text(settings.invoiceFooterText || 'Thank you for your visit!', 40, 740, { align: 'center', width: 515 });
    
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
       .text('This is an computer-generated professional invoice copy valid for all financial accounting.', 40, 755, { align: 'center', width: 515 });

    doc.end();
  });
}
