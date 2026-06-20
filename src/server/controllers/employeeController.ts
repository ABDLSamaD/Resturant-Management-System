import { Router, Request, Response, NextFunction } from 'express';
import { 
  getDb, 
  saveDb, 
  Employee, 
  EmployeeCategory, 
  SalaryHistory, 
  EmployeeAdvance, 
  SalaryPayment 
} from '../db';
import { formatSuccess, AppError } from '../helpers/response';

const router = Router();

// --- EMPLOYEE CATEGORIES ---
router.get('/employee-categories', (req: Request, res: Response) => {
  const db = getDb();
  const activeOnly = req.query.active === 'true';
  let list = db.employeeCategories;
  if (activeOnly) {
    list = list.filter(c => c.isActive);
  }
  res.json(formatSuccess('Categories retrieved successfully', list));
});

router.post('/employee-categories', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError('Category name is required', 400);

    const db = getDb();
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

router.put('/employee-categories/:id', (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/employee-categories/:id', (req: Request, res: Response, next: NextFunction) => {
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

// --- EMPLOYEES ---
router.get('/employees', (req: Request, res: Response) => {
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

router.post('/employees', (req: Request, res: Response, next: NextFunction) => {
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

router.put('/employees/:id', (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/employees/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idx = db.employees.findIndex(e => e.id === id);
    if (idx === -1) throw new AppError('Employee not found', 404);

    // Soft deactivation
    db.employees[idx].status = 'inactive';
    saveDb(db);
    res.json(formatSuccess('Employee deactivated successfully', db.employees[idx]));
  } catch (err) {
    next(err);
  }
});

// --- SALARY HISTORY ---
router.get('/salary-history', (req: Request, res: Response) => {
  const db = getDb();
  const { employeeId } = req.query;
  let list = db.salaryHistories;
  if (employeeId) {
    list = list.filter(sh => sh.employee === employeeId);
  }
  res.json(formatSuccess('Salary history retrieved successfully', list));
});

router.post('/salary-history', (req: Request, res: Response, next: NextFunction) => {
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

// --- ADVANCES ---
router.get('/advances', (req: Request, res: Response) => {
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

router.post('/advances', (req: Request, res: Response, next: NextFunction) => {
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
router.get('/salary-payments', (req: Request, res: Response) => {
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

router.get('/salary-payments/calculate', (req: Request, res: Response, next: NextFunction) => {
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

    let baseSalary = 0;
    if (emp.salaryType === 'monthly') {
      baseSalary = emp.monthlySalary || 0;
    } else {
      const days = Number(workedDays) || 26;
      baseSalary = (emp.dailyWage || 0) * days;
    }

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

router.post('/salary-payments', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, month, year, baseSalary, totalAdvances, paidAmount, notes, paymentDate } = req.body;
    if (!employeeId || !month || !year) throw new AppError('employeeId, month, and year are required', 400);

    const db = getDb();
    const emp = db.employees.find(e => e.id === employeeId);
    if (!emp) throw new AppError('Employee not found', 404);

    const dup = db.salaryPayments.find(sp => sp.employee === employeeId && sp.month === Number(month) && sp.year === Number(year));
    if (dup) throw new AppError('Salary already finalized and paid for this month', 400);

    const base = Number(baseSalary) || 0;
    const advs = Number(totalAdvances) || 0;
    const finalPayable = Math.max(0, base - advs);
    const paid = paidAmount !== undefined ? Number(paidAmount) : finalPayable;
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

export default router;
