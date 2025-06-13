import express from 'express';
import authRoutes from './auth.js';
import proxyRoutes from './proxy.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/proxy', proxyRoutes);

export default router; 