import express from 'express';
import { getAllKanbans, createKanban, getKanbanById, updateKanban, deleteKanban } from '../controllers/kanbans.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rotas principais
router.get('/', authMiddleware, getAllKanbans);
router.post('/', authMiddleware, createKanban);

// Rotas para kanban específico
router.get('/:id', authMiddleware, getKanbanById);
router.put('/:id', authMiddleware, updateKanban);
router.delete('/:id', authMiddleware, deleteKanban);

export default router; 