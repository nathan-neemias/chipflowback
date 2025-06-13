import express from 'express';
// CORS removido - configuração apenas no Nginx para evitar duplicação
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import chipsRoutes from './routes/chips.js';
import kanbansRoutes from './routes/kanbans.js';
import proxyRoutes from './routes/proxy.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import routes from './routes/index.js';

dotenv.config();

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chipflow-backend' },
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});

// Em desenvolvimento, também log no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy ANTES de qualquer middleware que use req.ip
app.set('trust proxy', true);

// ⚠️ CORS REMOVIDO DO EXPRESS - Configuração apenas no Nginx
// Isso evita headers duplicados que causam erro CORS

// Middleware de segurança com Helmet (sem CSP para evitar conflito com Nginx)
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitado - CSP configurado no Nginx
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting com configuração aprimorada
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }
    return req.ip;
  }
});

app.use(limiter);

// Rate limiting específico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Muitas tentativas de login, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }
    return req.ip;
  }
});

// Middleware para processar JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de segurança básicos (outros no Nginx)
app.use((req, res, next) => {
  // Remover header do servidor
  res.removeHeader('X-Powered-By');
  next();
});

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Rotas
app.use('/auth', authLimiter, authRoutes);
app.use('/chips', chipsRoutes);
app.use('/kanbans', kanbansRoutes);
app.use('/proxy', proxyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', routes);

// Rota de teste/health check
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };
  
  res.json(healthcheck);
});

// Rota para status mais detalhado (apenas para admin)
app.get('/status', (req, res) => {
  const status = {
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid
  };
  
  res.json(status);
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(404).json({ 
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.originalUrl} não existe neste servidor.`
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro no servidor:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Não enviar detalhes do erro em produção
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Erro interno do servidor',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor graciosamente...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor graciosamente...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor ChipFlow rodando na porta ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    timestamp: new Date().toISOString()
  });
  
  logger.info('📋 Rotas disponíveis:', {
    routes: [
      'GET /health - Health check',
      'GET /status - Status detalhado',
      'POST /auth/login - Login de usuário',
      'GET /chips - Listar chips',
      'POST /chips - Criar chip',
      'GET /kanbans - Listar kanbans',
      'POST /kanbans - Criar kanban',
      'GET /proxy/jus/* - Proxy para API JUS',
      'GET /proxy/vbsender/* - Proxy para API VBSender'
    ]
  });
}); 