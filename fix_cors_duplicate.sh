#!/bin/bash

# 🚨 Script para Corrigir CORS Duplicado - ChipFlow
# Este script remove a configuração CORS do Express, deixando apenas no Nginx

echo "🔧 Iniciando correção de CORS duplicado..."

# Verificar se estamos no diretório correto
if [ ! -f "src/index.js" ]; then
    echo "❌ Erro: Execute este script no diretório BackendChipFlow"
    exit 1
fi

# 1. Fazer backup do index.js original
echo "📦 Criando backup do index.js..."
cp src/index.js src/index.js.backup.$(date +%Y%m%d_%H%M%S)

# 2. Remover configuração CORS do Express (mantém apenas no Nginx)
echo "🔧 Removendo CORS do Express..."
cat > src/index_temp.js << 'EOF'
import express from 'express';
// CORS removido - configuração apenas no Nginx
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

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Inicializar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

export default app;
EOF

# 3. Substituir o arquivo original
mv src/index_temp.js src/index.js

# 4. Reiniciar aplicação
echo "🔄 Reiniciando aplicação..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart chipflow-backend || pm2 restart all
    echo "✅ PM2 reiniciado"
else
    echo "⚠️  PM2 não encontrado. Reinicie manualmente: node src/index.js"
fi

# 5. Recarregar Nginx
echo "🔄 Recarregando Nginx..."
if command -v nginx >/dev/null 2>&1; then
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx recarregado"
else
    echo "⚠️  Nginx não encontrado no PATH"
fi

# 6. Verificar se funcionou
echo "🧪 Testando CORS..."
sleep 2

RESPONSE=$(curl -s -I -H "Origin: https://chipflow.netlify.app" https://backchipflow.villelatech.com.br/health 2>/dev/null)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    CORS_VALUE=$(echo "$RESPONSE" | grep "Access-Control-Allow-Origin" | head -1)
    echo "✅ CORS funcionando: $CORS_VALUE"
    
    # Verificar se ainda há duplicação
    CORS_COUNT=$(echo "$RESPONSE" | grep -c "Access-Control-Allow-Origin")
    if [ "$CORS_COUNT" -gt 1 ]; then
        echo "⚠️  Ainda há $CORS_COUNT headers CORS - verificar configuração"
    else
        echo "✅ Nenhuma duplicação de headers CORS detectada"
    fi
else
    echo "❌ CORS não funcionando - verificar configuração"
fi

echo ""
echo "🎯 Resumo das alterações:"
echo "   - Removido middleware CORS do Express"
echo "   - CORS configurado apenas no Nginx"
echo "   - Backup criado: src/index.js.backup.*"
echo ""
echo "🌐 Teste no navegador: https://chipflow.netlify.app/"
echo "📋 Log de erros: tail -f logs/error.log" 