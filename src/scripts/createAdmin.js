import bcrypt from 'bcryptjs';
import { executeQuery } from '../lib/mysql.js';

async function createAdminUser() {
  try {
    // Verificar se o usuário admin já existe
    const existingUsers = await executeQuery(
      'SELECT * FROM User WHERE email = ?',
      ['admin@admin.com']
    );

    if (existingUsers.length > 0) {
      console.log('Usuário admin já existe');
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Inserir usuário admin
    await executeQuery(
      'INSERT INTO User (name, email, password) VALUES (?, ?, ?)',
      ['Admin', 'admin@admin.com', hashedPassword]
    );

    console.log('Usuário admin criado com sucesso');
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
}

createAdminUser(); 