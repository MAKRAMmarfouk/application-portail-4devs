import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import establishmentRoutes from './routes/establishment.routes';
import groupementRoutes from './routes/groupement.routes';
import compagnieRoutes from './routes/compagnie.routes';
import studentRoutes from './routes/student.routes';
import requestRoutes from './routes/request.routes';
import absenceRoutes from './routes/absence.routes';
import gradeRoutes from './routes/grade.routes';
import dashboardRoutes from './routes/dashboard.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'Gestion Administrative des Écoles de Formation',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/establishments', establishmentRoutes);
app.use('/api/v1/groupements', groupementRoutes);
app.use('/api/v1/compagnies', compagnieRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/absences', absenceRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint introuvable.' });
});

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erreur non interceptée :', err);
  res.status(err.status || 500).json({
    error: err.message || 'Une erreur interne est survenue sur le serveur.',
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Serveur API en écoute sur : http://localhost:${PORT}`);
  console.log(` Mode : ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
