import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../lib/mysql.js';

// Garantir que sempre temos um JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'chipflow_jwt_secret_default_key_2024';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    console.log('Login attempt:', { email });

    // Buscar usuário pelo email
    const users = await executeQuery(
      'SELECT * FROM User WHERE email = ?',
      [email]
    );

    console.log('User query result:', users);

    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Senha inválida' });
    }

    // Gerar token JWT para o backend
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Atualizar token no banco
    await executeQuery(
      'UPDATE User SET token = ? WHERE id = ?',
      [token, user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await executeQuery(
      'SELECT * FROM User WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await executeQuery(
      'INSERT INTO User (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const token = jwt.sign(
      { userId: result.insertId, email: email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email: email,
        name: name
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const verifyToken = async (req, res) => {
  try {
    // O usuário já foi verificado pelo middleware
    const users = await executeQuery(
      'SELECT * FROM User WHERE id = ?',
      [req.user.userId]
    );

    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    // O token já foi validado pelo middleware authMiddleware
    const user = req.user;
    
    // Buscar dados atualizados do usuário
    const users = await executeQuery(
      'SELECT id, name, email FROM User WHERE id = ?',
      [user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const userData = users[0];

    // Gerar novo token com dados atualizados
    const newToken = jwt.sign(
      { userId: userData.id, email: userData.email, name: userData.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: newToken,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}; 