import jwt from 'jsonwebtoken';

// Garantir que sempre temos um JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'chipflow_jwt_secret_default_key_2024';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
}; 