import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../lib/mysql.js';

// Listar todos os usuários
export const getAllUsers = async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT id, name, email, role, createdAt, updatedAt FROM User ORDER BY createdAt DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Buscar usuário por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const users = await executeQuery(
      'SELECT id, name, email, role, createdAt, updatedAt FROM User WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo usuário
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se o email já existe
    const existingUsers = await executeQuery(
      'SELECT id FROM User WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Inserir usuário
    await executeQuery(
      'INSERT INTO User (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role]
    );

    // Buscar o usuário criado
    const newUser = await executeQuery(
      'SELECT id, name, email, role, createdAt, updatedAt FROM User WHERE id = ?',
      [userId]
    );

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar usuário
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // Verificar se o usuário existe
    const existingUsers = await executeQuery(
      'SELECT id FROM User WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o email já está em uso por outro usuário
    if (email) {
      const emailUsers = await executeQuery(
        'SELECT id FROM User WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailUsers.length > 0) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }

    // Preparar campos para atualização
    let updateFields = [];
    let updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    updateValues.push(id);

    // Atualizar usuário
    await executeQuery(
      `UPDATE User SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Buscar o usuário atualizado
    const updatedUser = await executeQuery(
      'SELECT id, name, email, role, createdAt, updatedAt FROM User WHERE id = ?',
      [id]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Deletar usuário
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário existe
    const existingUsers = await executeQuery(
      'SELECT id FROM User WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Deletar usuário
    await executeQuery(
      'DELETE FROM User WHERE id = ?',
      [id]
    );

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}; 