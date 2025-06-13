import { executeQuery } from '../lib/mysql.js';

async function createTables() {
  try {
    // Criar tabela de usuários
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS User (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela User criada/verificada');

    // Criar tabela de kanbans
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS kanbans (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES User(id)
      )
    `);
    console.log('Tabela kanbans criada/verificada');

    // Criar tabela de colunas
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS columns (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        kanban_id VARCHAR(36) NOT NULL,
        \`order\` INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (kanban_id) REFERENCES kanbans(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela columns criada/verificada');

    // Criar tabela de tarefas
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        column_id VARCHAR(36) NOT NULL,
        \`order\` INT NOT NULL,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('todo', 'doing', 'done') DEFAULT 'todo',
        assignee VARCHAR(255),
        due_date DATE,
        labels JSON,
        checklist JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela tasks criada/verificada');

    // Criar tabela de membros do kanban
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS kanban_members (
        kanban_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('owner', 'editor', 'viewer') DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (kanban_id, user_id),
        FOREIGN KEY (kanban_id) REFERENCES kanbans(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela kanban_members criada/verificada');

  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
}

createTables(); 