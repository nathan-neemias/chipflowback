import express from 'express';
import multer from 'multer';
import { getAllChips, createChip, getChipById, updateChip, deleteChip, bulkImportChips, importChipsFromFile } from '../controllers/chips.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado'), false);
    }
  }
});

// Rotas principais
router.get('/', authMiddleware, getAllChips);
router.post('/', authMiddleware, createChip);

// Rotas para chip específico
router.get('/:id', authMiddleware, getChipById);
router.put('/:id', authMiddleware, updateChip);
router.delete('/:id', authMiddleware, deleteChip);

// Rotas de importação
router.post('/import', authMiddleware, upload.single('file'), importChipsFromFile);
router.post('/bulk', authMiddleware, bulkImportChips); // Manter compatibilidade

export default router; 