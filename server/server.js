import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import expenditureRoutes from './routes/expenditureRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS Configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

app.use(express.json());
app.use(morgan('dev'));

// Health Check Endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    success: true,
    message: 'AEGIS MAMS API is running',
  });
});

// API Routes (mounted both with and without /api prefix for Vercel serverless rewrite compatibility)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/assets', '/assets'], assetRoutes);
app.use(['/api/purchases', '/purchases'], purchaseRoutes);
app.use(['/api/transfers', '/transfers'], transferRoutes);
app.use(['/api/assignments', '/assignments'], assignmentRoutes);
app.use(['/api/expenditures', '/expenditures'], expenditureRoutes);
app.use(['/api/audit', '/audit'], auditRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start Express Server only when not running in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🛡️  AEGIS MAMS API Server Running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

export default app;
