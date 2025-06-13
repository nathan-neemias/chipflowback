import mysql from 'mysql2/promise';
import { pool } from '../config/database.js';
import * as XLSX from 'xlsx';

export const getAllChips = async (req, res) => {
  try {
    const [chips] = await pool.execute('SELECT * FROM Chip ORDER BY createdAt DESC');
    res.json(chips);
  } catch (error) {
    console.error('Erro ao buscar chips:', error);
    res.status(500).json({
      error: 'Falha ao buscar chips',
      details: error.message
    });
  }
};

export const createChip = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { number, operator, category, status = 'AVAILABLE', cid = '' } = req.body;
    
    // Validar campos obrigatórios
    if (!number || !operator || !category) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Validar formato do número
    const numberPattern = /^\d{10,11}$/;
    const cleanNumber = number.replace(/\D/g, '');
    if (!numberPattern.test(cleanNumber)) {
      return res.status(400).json({ error: 'Número de telefone inválido' });
    }

    // Converter status para formato do banco
    const dbStatus = status === 'AVAILABLE' ? 'active' : 'inactive';

    // Iniciar transação
    await connection.beginTransaction();

    try {
      // Verificar se número já existe
      const [existing] = await connection.execute(
        'SELECT id FROM Chip WHERE number = ?',
        [cleanNumber]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Um chip com este número já existe' });
      }

      // Obter próximo ID
      const [maxResult] = await connection.execute('SELECT MAX(id) as maxId FROM Chip');
      const nextId = (maxResult[0]?.maxId || 0) + 1;

      // Inserir novo chip
      await connection.execute(
        `INSERT INTO Chip (id, number, status, operator, category, cid, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [nextId, cleanNumber, dbStatus, operator, category, cid]
      );

      // Buscar o chip inserido
      const [insertedChips] = await connection.execute(
        'SELECT * FROM Chip WHERE id = ?',
        [nextId]
      );

      await connection.commit();
      res.status(201).json(insertedChips[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar chip:', error);
    res.status(500).json({
      error: 'Falha ao criar chip',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const getChipById = async (req, res) => {
  try {
    const { id } = req.params;
    const [chips] = await pool.execute('SELECT * FROM Chip WHERE id = ?', [id]);
    
    if (chips.length === 0) {
      return res.status(404).json({ error: 'Chip não encontrado' });
    }
    
    res.json(chips[0]);
  } catch (error) {
    console.error('Erro ao buscar chip:', error);
    res.status(500).json({
      error: 'Falha ao buscar chip',
      details: error.message
    });
  }
};

export const updateChip = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { number, operator, category, status, cid } = req.body;

    // Validar campos obrigatórios
    if (!number || !operator || !category) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Validar formato do número
    const numberPattern = /^\d{10,11}$/;
    const cleanNumber = number.replace(/\D/g, '');
    if (!numberPattern.test(cleanNumber)) {
      return res.status(400).json({ error: 'Número de telefone inválido' });
    }

    await connection.beginTransaction();

    try {
      // Verificar se o chip existe
      const [existing] = await connection.execute(
        'SELECT id FROM Chip WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Chip não encontrado' });
      }

      // Verificar se o número já existe em outro chip
      const [duplicateNumber] = await connection.execute(
        'SELECT id FROM Chip WHERE number = ? AND id != ?',
        [cleanNumber, id]
      );

      if (duplicateNumber.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Número já está em uso por outro chip' });
      }

      // Atualizar chip
      await connection.execute(
        `UPDATE Chip 
         SET number = ?, status = ?, operator = ?, category = ?, cid = ?, updatedAt = NOW()
         WHERE id = ?`,
        [cleanNumber, status, operator, category, cid, id]
      );

      // Buscar chip atualizado
      const [updatedChips] = await connection.execute(
        'SELECT * FROM Chip WHERE id = ?',
        [id]
      );

      await connection.commit();
      res.json(updatedChips[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar chip:', error);
    res.status(500).json({
      error: 'Falha ao atualizar chip',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const deleteChip = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    try {
      // Verificar se o chip existe
      const [existing] = await connection.execute(
        'SELECT id FROM Chip WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Chip não encontrado' });
      }

      // Deletar chip
      await connection.execute('DELETE FROM Chip WHERE id = ?', [id]);

      await connection.commit();
      res.status(204).send();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao deletar chip:', error);
    res.status(500).json({
      error: 'Falha ao deletar chip',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const importChipsFromFile = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Processar arquivo Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Arquivo vazio ou sem dados válidos' });
    }

    await connection.beginTransaction();

    try {
      // Obter próximo ID disponível
      const [maxResult] = await connection.execute('SELECT MAX(id) as maxId FROM Chip');
      let nextId = (maxResult[0]?.maxId || 0) + 1;

      const imported = [];
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2; // Excel row number

        try {
          // Extrair dados da linha usando múltiplas variações de header
          const number = getValueFromRow(row, ['numero', 'number', 'telefone', 'phone']);
          const status = getValueFromRow(row, ['status', 'estado']);
          const operator = getValueFromRow(row, ['operadora', 'operator', 'carrier']);
          const category = getValueFromRow(row, ['categoria', 'category', 'tipo', 'type']);
          const cid = getValueFromRow(row, ['cid', 'iccid', 'sim']);

          // Validar campos obrigatórios
          if (!number) {
            errors.push(`Linha ${rowNumber}: Número é obrigatório`);
            continue;
          }

          // Limpar e validar número
          const cleanNumber = String(number).replace(/[^\d]/g, '');
          if (cleanNumber.length < 10 || cleanNumber.length > 11) {
            errors.push(`Linha ${rowNumber}: Número deve ter 10 ou 11 dígitos`);
            continue;
          }

          // Verificar se número já existe
          const [existing] = await connection.execute(
            'SELECT id FROM Chip WHERE number = ?',
            [cleanNumber]
          );

          if (existing.length > 0) {
            errors.push(`Linha ${rowNumber}: Número ${cleanNumber} já existe`);
            continue;
          }

          // Mapear valores
          const mappedStatus = mapStatus(status) || 'inactive';
          const mappedOperator = mapOperator(operator) || 'VIVO';
          const mappedCategory = mapCategory(category) || 'FOR_DELIVERY';
          const cleanCid = cid ? String(cid).replace(/[^\d]/g, '') : '';

          // Inserir chip
          await connection.execute(
            `INSERT INTO Chip (id, number, status, operator, category, cid, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [nextId, cleanNumber, mappedStatus, mappedOperator, mappedCategory, cleanCid]
          );

          imported.push({ id: nextId, number: cleanNumber });
          nextId++;
        } catch (error) {
          errors.push(`Linha ${rowNumber}: ${error.message}`);
        }
      }

      if (imported.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Nenhum chip foi importado',
          errors: errors
        });
      }

      await connection.commit();
      res.status(201).json({
        imported: imported.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({
      error: 'Falha na importação',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const bulkImportChips = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const chips = req.body;

    if (!Array.isArray(chips) || chips.length === 0) {
      return res.status(400).json({ error: 'Lista de chips inválida' });
    }

    await connection.beginTransaction();

    try {
      // Obter próximo ID disponível
      const [maxResult] = await connection.execute('SELECT MAX(id) as maxId FROM Chip');
      let nextId = (maxResult[0]?.maxId || 0) + 1;

      // Processar cada chip
      const results = [];
      const errors = [];

      for (const chip of chips) {
        const { number, operator, category, status = 'AVAILABLE', cid = '' } = chip;

        // Validar campos obrigatórios
        if (!number || !operator || !category) {
          errors.push({ number, error: 'Campos obrigatórios faltando' });
          continue;
        }

        // Validar formato do número
        const numberPattern = /^\d{10,11}$/;
        const cleanNumber = number.replace(/\D/g, '');
        if (!numberPattern.test(cleanNumber)) {
          errors.push({ number, error: 'Número de telefone inválido' });
          continue;
        }

        // Verificar se número já existe
        const [existing] = await connection.execute(
          'SELECT id FROM Chip WHERE number = ?',
          [cleanNumber]
        );

        if (existing.length > 0) {
          errors.push({ number, error: 'Número já existe' });
          continue;
        }

        // Inserir chip
        const dbStatus = status === 'AVAILABLE' ? 'active' : 'inactive';
        await connection.execute(
          `INSERT INTO Chip (id, number, status, operator, category, cid, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [nextId, cleanNumber, dbStatus, operator, category, cid]
        );

        results.push({ id: nextId, number: cleanNumber });
        nextId++;
      }

      if (results.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Nenhum chip foi importado',
          details: errors
        });
      }

      await connection.commit();
      res.status(201).json({
        imported: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro na importação em lote:', error);
    res.status(500).json({
      error: 'Falha na importação em lote',
      details: error.message
    });
  } finally {
    connection.release();
  }
};

// Helper functions
const getValueFromRow = (row, possibleKeys) => {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
    
    const foundKey = Object.keys(row).find(k => 
      k.toLowerCase().trim() === key.toLowerCase().trim()
    );
    
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
      return row[foundKey];
    }
  }
  return undefined;
};

const mapStatus = (value) => {
  if (!value) return 'inactive';
  const lowerValue = String(value).toLowerCase().trim();
  if (lowerValue === 'ativo' || lowerValue === 'active') return 'active';
  return 'inactive';
};

const mapOperator = (value) => {
  if (!value) return 'VIVO';
  const upperValue = String(value).toUpperCase().trim();
  if (upperValue.includes('VIVO')) return 'VIVO';
  if (upperValue.includes('CLARO')) return 'CLARO';
  return 'VIVO';
};

const mapCategory = (value) => {
  if (!value) return 'FOR_DELIVERY';
  const normalizedValue = String(value).toLowerCase().trim();
  if (normalizedValue.includes('entrega') || normalizedValue.includes('delivery')) return 'FOR_DELIVERY';
  if (normalizedValue.includes('banido') || normalizedValue.includes('banned')) return 'BANNED';
  if (normalizedValue.includes('indisponível') || normalizedValue.includes('unavailable')) return 'UNAVAILABLE_ACCESS';
  return 'FOR_DELIVERY';
}; 