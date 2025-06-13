import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/users.js';
// import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rota de teste simples
router.get('/test', (req, res) => {
  res.json({ message: 'Rota de usuários funcionando!', route: '/api/users/test' });
});

// GET /api/users - Listar todos os usuários (SEM AUTENTICAÇÃO POR ENQUANTO)
router.get('/', getAllUsers);

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', getUserById);

// POST /api/users - Criar novo usuário
router.post('/', createUser);

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', updateUser);

// DELETE /api/users/:id - Deletar usuário
router.delete('/:id', deleteUser);

export default router; 