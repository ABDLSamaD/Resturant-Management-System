import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db';
import { formatSuccess } from '../helpers/response';

const router = Router();

// Retrieve restaurant settings
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json(formatSuccess('Settings retrieved successfully', db.settings));
});

// Update restaurant settings
router.put('/', (req: Request, res: Response) => {
  const db = getDb();
  const updated = req.body;
  db.settings = { ...db.settings, ...updated };
  saveDb(db);
  res.json(formatSuccess('Settings updated successfully', db.settings));
});

export default router;
