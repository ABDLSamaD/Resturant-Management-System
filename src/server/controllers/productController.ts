import { Router, Request, Response, NextFunction } from 'express';
import { getDb, saveDb, Product, ProductCategory, Shop } from '../db';
import { formatSuccess, AppError } from '../helpers/response';
import { generateImageFromPrompt, editImageWithPrompt } from '../geminiService';

const router = Router();

// --- PRODUCT CATEGORIES ---
router.get('/product-categories', (req: Request, res: Response) => {
  const db = getDb();
  const activeOnly = req.query.active === 'true';
  let list = db.productCategories;
  if (activeOnly) {
    list = list.filter(c => c.isActive);
  }
  res.json(formatSuccess('Product categories retrieved successfully', list));
});

router.post('/product-categories', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, shopId } = req.body;
    if (!name) throw new AppError('Category name is required', 400);

    const db = getDb();
    const duplicate = db.productCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) throw new AppError('Category already exists', 400);

    const newCat: ProductCategory = {
      id: `pc-${Date.now()}`,
      name,
      description,
      isActive: true,
      shopId,
      createdAt: new Date().toISOString()
    };

    db.productCategories.push(newCat);
    saveDb(db);
    res.status(201).json(formatSuccess('Product Category created successfully', newCat));
  } catch (err) {
    next(err);
  }
});

router.put('/product-categories/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, shopId } = req.body;
    const db = getDb();
    const idx = db.productCategories.findIndex(c => c.id === id);
    if (idx === -1) throw new AppError('Category not found', 404);

    db.productCategories[idx] = {
      ...db.productCategories[idx],
      name: name !== undefined ? name : db.productCategories[idx].name,
      description: description !== undefined ? description : db.productCategories[idx].description,
      isActive: isActive !== undefined ? isActive : db.productCategories[idx].isActive,
      shopId: shopId !== undefined ? shopId : db.productCategories[idx].shopId
    };
    saveDb(db);
    res.json(formatSuccess('Category updated successfully', db.productCategories[idx]));
  } catch (err) {
    next(err);
  }
});

router.delete('/product-categories/:id', (req: Request, res: Response, next: NextFunction) => {
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

// --- DISH PRODUCTS ---
router.get('/products', (req: Request, res: Response) => {
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

router.post('/products', (req: Request, res: Response, next: NextFunction) => {
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

router.put('/products/:id', (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/products/:id', (req: Request, res: Response, next: NextFunction) => {
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

// --- GEMINI PRO CREATIVE IMAGES ---
router.post('/gemini/generate-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) throw new AppError('Image prompt is required', 400);

    const resultUrl = await generateImageFromPrompt(prompt, aspectRatio);
    res.json(formatSuccess('AI image generated successfully', { imageUrl: resultUrl }));
  } catch (err: any) {
    next(new AppError(err.message || 'Gemini image generation failed', 500));
  }
});

router.post('/gemini/edit-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, prompt } = req.body;
    if (!image) throw new AppError('Baseline base64 image data is required', 400);
    if (!prompt) throw new AppError('Edit instructions prompt are required', 400);

    const resultUrl = await editImageWithPrompt(image, prompt);
    res.json(formatSuccess('AI image modified successfully', { imageUrl: resultUrl }));
  } catch (err: any) {
    next(new AppError(err.message || 'Gemini image editing failed', 500));
  }
});

// --- SHOPS CONFIGURATION SYSTEM ---
router.get('/shops', (req: Request, res: Response) => {
  const db = getDb();
  res.json(formatSuccess('Shops retrieved successfully', db.shops || []));
});

router.post('/shops', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, description, address } = req.body;
    if (!name) throw new AppError('Shop name reference is required', 400);

    const db = getDb();
    const newShop: Shop = {
      id: `shop-${Date.now()}`,
      name,
      phone,
      description,
      address,
      createdAt: new Date().toISOString()
    };
    db.shops = db.shops || [];
    db.shops.push(newShop);
    saveDb(db);
    res.status(201).json(formatSuccess('Shop details added successfully', newShop));
  } catch (err) {
    next(err);
  }
});

router.put('/shops/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, description, address } = req.body;
    const db = getDb();
    db.shops = db.shops || [];
    const idx = db.shops.findIndex(s => s.id === id);
    if (idx === -1) throw new AppError('Shop registry not found', 404);

    db.shops[idx] = {
      ...db.shops[idx],
      name: name !== undefined ? name : db.shops[idx].name,
      phone: phone !== undefined ? phone : db.shops[idx].phone,
      description: description !== undefined ? description : db.shops[idx].description,
      address: address !== undefined ? address : db.shops[idx].address
    };
    saveDb(db);
    res.json(formatSuccess('Shop details updated successfully', db.shops[idx]));
  } catch (err) {
    next(err);
  }
});

router.delete('/shops/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();
    db.shops = db.shops || [];
    const idx = db.shops.findIndex(s => s.id === id);
    if (idx === -1) throw new AppError('Shop registry not found', 404);

    db.shops.splice(idx, 1);
    saveDb(db);
    res.json(formatSuccess('Shop deleted successfully'));
  } catch (err) {
    next(err);
  }
});

// --- DURABLE DATABASE BACKUPS & RESTORE SLOTS ---
router.get('/backup', (req: Request, res: Response) => {
  const db = getDb();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="restaurant-rms-backup.json"');
  res.send(JSON.stringify(db, null, 2));
});

router.post('/restore', (req: Request, res: Response, next: NextFunction) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      throw new AppError('Invalid backup file parsed.', 400);
    }
    if (!backupData.settings || !backupData.products || !backupData.productCategories) {
      throw new AppError('Backup file validation failed. Required tables are missing.', 400);
    }

    // Overwrite physical save file
    saveDb(backupData);
    res.json(formatSuccess('The custom database backup has been successfully restored!', backupData.settings));
  } catch (err) {
    next(err);
  }
});

export default router;
