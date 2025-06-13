import express from 'express';
import { login, verifyToken, refreshToken } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/verify', authMiddleware, verifyToken);
router.post('/refresh', authMiddleware, refreshToken);

export default router; 