import { Router, Request, Response, NextFunction } from 'express';
import { getDb, saveDb, Expense, ExpenseCategory, CategoryPerformance } from '../db';
import { formatSuccess, AppError } from '../helpers/response';
import { analyzeReceiptImage } from '../geminiService';

const router = Router();

// --- EXPENSE CATEGORIES ---
router.get('/expense-categories', (req: Request, res: Response) => {
  const db = getDb();
  const activeOnly = req.query.active === 'true';
  let list = db.expenseCategories;
  if (activeOnly) {
    list = list.filter(c => c.isActive);
  }
  res.json(formatSuccess('Expense categories retrieved successfully', list));
});

router.post('/expense-categories', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError('Category name is required', 400);

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
    res.status(201).json(formatSuccess('Expense category created successfully', newCat));
  } catch (err) {
    next(err);
  }
});

// --- LEDGER EXPENSES ---
router.get('/expenses', (req: Request, res: Response) => {
  const db = getDb();
  const { category, search, startDate, endDate } = req.query;
  let list = db.expenses;

  if (category) {
    list = list.filter(e => e.category === category);
  }
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(e => e.title.toLowerCase().includes(s) || (e.notes && e.notes.toLowerCase().includes(s)));
  }
  if (startDate) {
    list = list.filter(e => e.date >= String(startDate));
  }
  if (endDate) {
    list = list.filter(e => e.date <= String(endDate));
  }

  res.json(formatSuccess('Expenses retrieved successfully', list));
});

router.post('/expenses', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category, amount, date, notes } = req.body;
    if (!title) throw new AppError('Expense title is required', 400);
    if (!category) throw new AppError('Expense category is required', 400);
    if (amount === undefined || Number(amount) <= 0) throw new AppError('Valid positive amount is required', 400);

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
    res.status(201).json(formatSuccess('Expense registered successfully', newExpense));
  } catch (err) {
    next(err);
  }
});

router.delete('/expenses/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idx = db.expenses.findIndex(e => e.id === id);
    if (idx === -1) throw new AppError('Expense not found', 404);

    const deleted = db.expenses.splice(idx, 1)[0];
    saveDb(db);
    res.json(formatSuccess('Expense deleted successfully', deleted));
  } catch (err) {
    next(err);
  }
});

// --- NEW FEATURE: CATEGORY DAILY OPERATIONAL PERFORMANCE ---
router.get('/category-performances', (req: Request, res: Response) => {
  const db = getDb();
  const { date, categoryName, search } = req.query;
  let list = db.categoryPerformances || [];

  if (date) {
    list = list.filter(p => p.date === String(date));
  }
  if (categoryName) {
    list = list.filter(p => p.categoryName === String(categoryName));
  }
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(p => p.categoryName.toLowerCase().includes(s) || (p.profitSharingNotes && p.profitSharingNotes.toLowerCase().includes(s)));
  }

  res.json(formatSuccess('Category daily performances loaded', list));
});

router.post('/category-performances', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryName, date, dailyExpenses, dailyEarnings, profitSharingRatio, profitSharingNotes } = req.body;
    if (!categoryName) throw new AppError('Category Name is required (e.g. Fast Food)', 400);
    const resolvedDate = date || new Date().toISOString().split('T')[0];

    const db = getDb();
    if (!db.categoryPerformances) db.categoryPerformances = [];

    // Check if duplicate for category name and date exists - if so, let's update it!
    const existingIdx = db.categoryPerformances.findIndex(
      p => p.categoryName.toLowerCase() === categoryName.toLowerCase() && p.date === resolvedDate
    );

    const expenseVal = Number(dailyExpenses) || 0;
    const earningVal = Number(dailyEarnings) || 0;
    const ratioVal = Number(profitSharingRatio) || 0;

    if (existingIdx !== -1) {
      db.categoryPerformances[existingIdx] = {
        ...db.categoryPerformances[existingIdx],
        dailyExpenses: expenseVal,
        dailyEarnings: earningVal,
        profitSharingRatio: ratioVal,
        profitSharingNotes: profitSharingNotes !== undefined ? profitSharingNotes : db.categoryPerformances[existingIdx].profitSharingNotes
      };
      saveDb(db);
      return res.json(formatSuccess('Category daily performance updated', db.categoryPerformances[existingIdx]));
    }

    const newPerformance: CategoryPerformance = {
      id: `cp-${Date.now()}`,
      categoryName,
      date: resolvedDate,
      dailyExpenses: expenseVal,
      dailyEarnings: earningVal,
      profitSharingRatio: ratioVal,
      profitSharingNotes,
      createdAt: new Date().toISOString()
    };

    db.categoryPerformances.push(newPerformance);
    saveDb(db);
    res.status(201).json(formatSuccess('Category daily performance created', newPerformance));
  } catch (err) {
    next(err);
  }
});

router.put('/category-performances/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { dailyExpenses, dailyEarnings, profitSharingRatio, profitSharingNotes, date, categoryName } = req.body;
    const db = getDb();
    if (!db.categoryPerformances) db.categoryPerformances = [];

    const idx = db.categoryPerformances.findIndex(p => p.id === id);
    if (idx === -1) throw new AppError('Category performance record not found', 404);

    const entry = db.categoryPerformances[idx];
    db.categoryPerformances[idx] = {
      ...entry,
      categoryName: categoryName !== undefined ? categoryName : entry.categoryName,
      date: date !== undefined ? date : entry.date,
      dailyExpenses: dailyExpenses !== undefined ? Number(dailyExpenses) : entry.dailyExpenses,
      dailyEarnings: dailyEarnings !== undefined ? Number(dailyEarnings) : entry.dailyEarnings,
      profitSharingRatio: profitSharingRatio !== undefined ? Number(profitSharingRatio) : entry.profitSharingRatio,
      profitSharingNotes: profitSharingNotes !== undefined ? profitSharingNotes : entry.profitSharingNotes
    };

    saveDb(db);
    res.json(formatSuccess('Category performance record updated', db.categoryPerformances[idx]));
  } catch (err) {
    next(err);
  }
});

router.delete('/category-performances/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    if (!db.categoryPerformances) db.categoryPerformances = [];

    const idx = db.categoryPerformances.findIndex(p => p.id === id);
    if (idx === -1) throw new AppError('Category performance record not found', 404);

    const deleted = db.categoryPerformances.splice(idx, 1)[0];
    saveDb(db);
    res.json(formatSuccess('Category performance record deleted', deleted));
  } catch (err) {
    next(err);
  }
});

// --- GEMINI PRO RECEIPT OCR PARSING ---
router.post('/gemini/analyze-receipt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = req.body;
    if (!image) throw new AppError('Base64 image attachment is required', 400);

    const analyzedResult = await analyzeReceiptImage(image);
    res.json(formatSuccess('Receipt automatically decoded with Gemini Pro OCR successfully', analyzedResult));
  } catch (err: any) {
    next(new AppError(err.message || 'Gemini Pro OCR parser error', 500));
  }
});

export default router;
