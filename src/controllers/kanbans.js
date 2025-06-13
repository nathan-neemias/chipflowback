import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllKanbans = async (req, res) => {
  try {
    // Buscar todos os kanbans
    const [kanbans] = await pool.execute(
      'SELECT * FROM kanbans ORDER BY created_at DESC'
    );

    // Para cada kanban, contar colunas e tarefas
    const kanbansWithCounts = await Promise.all(
      kanbans.map(async (kanban) => {
        // Contar colunas
        const [columnResult] = await pool.execute(
          'SELECT COUNT(*) as count FROM columns WHERE kanban_id = ?',
          [kanban.id]
        );
        const columnCount = columnResult[0]?.count || 0;

        // Contar tarefas
        const [taskResult] = await pool.execute(
          'SELECT COUNT(*) as count FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE kanban_id = ?)',
          [kanban.id]
        );
        const taskCount = taskResult[0]?.count || 0;

        return {
          id: kanban.id,
          title: kanban.title,
          description: kanban.description,
          columnsCount: columnCount,
          tasksCount: taskCount,
        };
      })
    );

    res.json(kanbansWithCounts);
  } catch (error) {
    console.error('Erro ao buscar kanbans:', error);
    res.status(500).json({
      error: 'Falha ao carregar kanbans',
      details: error.message
    });
  }
};

export const createKanban = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { title, description, columns } = req.body;
    const userId = req.user.userId; // Obtido do middleware de autenticação

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    await connection.beginTransaction();

    try {
      // Gerar UUID para o kanban
      const kanbanId = uuidv4();

      // Criar kanban
      await connection.execute(
        'INSERT INTO kanbans (id, title, description, user_id) VALUES (?, ?, ?, ?)',
        [kanbanId, title, description || null, userId]
      );

      // Criar colunas (usar colunas personalizadas se fornecidas, senão usar padrão)
      const defaultColumns = ['A fazer', 'Em progresso', 'Concluído'];
      const columnsToCreate = columns && columns.length > 0 ? columns : defaultColumns;
      
      const createdColumns = [];
      for (let i = 0; i < columnsToCreate.length; i++) {
        const columnTitle = columnsToCreate[i];
        if (columnTitle && columnTitle.trim()) {
          const columnId = uuidv4();
          await connection.execute(
            'INSERT INTO columns (id, title, kanban_id, `order`) VALUES (?, ?, ?, ?)',
            [columnId, columnTitle.trim(), kanbanId, i]
          );
          createdColumns.push({ id: columnId, title: columnTitle.trim() });
        }
      }

      await connection.commit();

      res.status(201).json({
        id: kanbanId,
        title,
        description,
        columnsCount: createdColumns.length,
        tasksCount: 0,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar kanban:', error);
    res.status(500).json({
      error: 'Falha ao criar kanban',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const getKanbanById = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar kanban
    const [kanbans] = await pool.execute(
      'SELECT * FROM kanbans WHERE id = ?',
      [id]
    );

    if (kanbans.length === 0) {
      return res.status(404).json({ error: 'Kanban não encontrado' });
    }

    const kanban = kanbans[0];

    // Buscar colunas do kanban
    const [columns] = await pool.execute(
      'SELECT * FROM columns WHERE kanban_id = ? ORDER BY `order`',
      [id]
    );

    // Para cada coluna, buscar suas tarefas
    const columnsWithTasks = await Promise.all(
      columns.map(async (column) => {
        const [tasks] = await pool.execute(
          'SELECT * FROM tasks WHERE column_id = ? ORDER BY `order`',
          [column.id]
        );

        return {
          ...column,
          tasks
        };
      })
    );

    res.json({
      ...kanban,
      columns: columnsWithTasks
    });
  } catch (error) {
    console.error('Erro ao buscar kanban:', error);
    res.status(500).json({
      error: 'Falha ao carregar kanban',
      details: error.message
    });
  }
};

export const updateKanban = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    await connection.beginTransaction();

    try {
      // Verificar se o kanban existe
      const [existing] = await connection.execute(
        'SELECT * FROM kanbans WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Kanban não encontrado' });
      }

      // Atualizar kanban
      await connection.execute(
        'UPDATE kanbans SET title = ?, description = ?, updated_at = NOW() WHERE id = ?',
        [title, description || null, id]
      );

      await connection.commit();

      // Buscar kanban atualizado com contagens
      const [kanban] = await connection.execute(
        'SELECT * FROM kanbans WHERE id = ?',
        [id]
      );

      const [columnCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM columns WHERE kanban_id = ?',
        [id]
      );

      const [taskCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE kanban_id = ?)',
        [id]
      );

      res.json({
        ...kanban[0],
        columnsCount: columnCount[0].count,
        tasksCount: taskCount[0].count
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar kanban:', error);
    res.status(500).json({
      error: 'Falha ao atualizar kanban',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const deleteKanban = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    try {
      // Verificar se o kanban existe
      const [existing] = await connection.execute(
        'SELECT * FROM kanbans WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Kanban não encontrado' });
      }

      // Deletar tarefas das colunas do kanban
      await connection.execute(
        'DELETE FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE kanban_id = ?)',
        [id]
      );

      // Deletar colunas do kanban
      await connection.execute(
        'DELETE FROM columns WHERE kanban_id = ?',
        [id]
      );

      // Deletar o kanban
      await connection.execute(
        'DELETE FROM kanbans WHERE id = ?',
        [id]
      );

      await connection.commit();
      res.status(204).send();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao deletar kanban:', error);
    res.status(500).json({
      error: 'Falha ao deletar kanban',
      details: error.message
    });
  } finally {
    connection.release();
  }
}; 