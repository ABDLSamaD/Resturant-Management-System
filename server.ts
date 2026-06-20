import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

import settingsRouter from './src/server/controllers/settingsController';
import employeeRouter from './src/server/controllers/employeeController';
import productRouter from './src/server/controllers/productController';
import orderRouter from './src/server/controllers/orderController';
import expenseRouter from './src/server/controllers/expenseController';
import { errorMiddleware } from './src/server/middleware/errorMiddleware';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API ROUTER REGISTRATIONS ---
  app.use('/api/settings', settingsRouter);
  app.use('/api', employeeRouter);
  app.use('/api', productRouter);
  app.use('/api', orderRouter);
  app.use('/api', expenseRouter);

  // --- STATIC OR MODULE GATEWAYS ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error logging interceptor
  app.use(errorMiddleware);

  // Catch unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Endpoint path '${req.originalUrl}' does not exist on this high-performance modular server.`
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM INFO] Server booted successfully. Ready at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FATAL SERVER MAIN ENCOUNTERED:', err);
});
