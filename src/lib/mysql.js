import mysql from 'mysql2/promise';

// Singleton para conexão MySQL
class DatabaseConnection {
  static instance = null;
  connection = null;
  lastConnectionAttempt = 0;
  RECONNECT_TIMEOUT = 5000; // 5 seconds

  constructor() {}

  static getInstance() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async createConnection() {
    console.log('Creating new MySQL connection...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000, // 10 seconds
      multipleStatements: false,
      dateStrings: true
    });

    // Tratar desconexões
    connection.on('error', async (err) => {
      console.error('MySQL connection error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
          err.code === 'ECONNRESET' ||
          err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        console.log('Connection lost, will reconnect on next query...');
        this.connection = null;
      }
    });

    return connection;
  }

  async getConnection() {
    try {
      // Se não há conexão ou a última tentativa foi há mais de 5 segundos
      if (!this.connection || 
          Date.now() - this.lastConnectionAttempt > this.RECONNECT_TIMEOUT) {
        this.lastConnectionAttempt = Date.now();
        
        // Testar a conexão existente
        if (this.connection) {
          try {
            await this.connection.ping();
          } catch (error) {
            console.log('Existing connection failed ping, creating new connection...');
            this.connection = null;
          }
        }

        // Criar nova conexão se necessário
        if (!this.connection) {
          this.connection = await this.createConnection();
          console.log('New MySQL connection established');
        }
      }
      
      return this.connection;
    } catch (error) {
      console.error('Failed to get MySQL connection:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.end();
        console.log('MySQL connection closed');
      } catch (error) {
        console.error('Error closing MySQL connection:', error);
      }
      this.connection = null;
    }
  }
}

// Função para executar queries usando singleton
export async function executeQuery(query, values = []) {
  const dbInstance = DatabaseConnection.getInstance();
  let retries = 2;
  
  while (retries >= 0) {
    try {
      const connection = await dbInstance.getConnection();
      const [rows] = await connection.execute(query, values);
      return rows;
    } catch (error) {
      console.error(`Database query error (${retries} retries left):`, error);
      
      // Se for erro de conexão, resetar a conexão e tentar novamente
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNRESET' ||
          error.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
          error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        await dbInstance.disconnect();
        retries--;
        
        if (retries >= 0) {
          console.log('Retrying query after connection error...');
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries reached for database query');
}

// Create a connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vile5113_ChipFlow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to execute queries using pool
export async function executeQueryPool(query, params) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
} 