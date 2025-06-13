#!/bin/bash

# Script de Instalação - ChipFlow Backend
echo "🔧 Instalando dependências do ChipFlow Backend..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] $1${NC}"
}

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado. Instale Node.js v18+ antes de continuar."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    error "npm não está instalado. Instale npm antes de continuar."
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js v18+ é necessário. Versão atual: $(node -v)"
    exit 1
fi

log "✅ Node.js $(node -v) detectado"

# Criar diretório de logs
log "📁 Criando diretório de logs..."
mkdir -p logs

# Instalar dependências
log "📦 Instalando dependências..."
npm install

# Verificar se PM2 está instalado globalmente
if ! command -v pm2 &> /dev/null; then
    warn "PM2 não está instalado globalmente."
    warn "Para instalar globalmente: npm install -g pm2"
    warn "Ou use: npx pm2 nos comandos"
fi

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    warn "Arquivo .env não encontrado."
    log "📄 Criando arquivo .env de exemplo..."
    cat > .env << EOL
# Configurações do Servidor
PORT=3001
NODE_ENV=production

# URL do Frontend (para CORS)
FRONTEND_URL=https://chipflow.villelatech.com.br

# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chipflow
DB_USER=root
DB_PASSWORD=

# JWT Secret (ALTERE ESTE VALOR!)
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_$(date +%s)

# APIs Externas
JUS_API_URL=https://jus.villelatech.com.br
VBSENDER_API_URL=https://vbsender.villelatech.com.br
VB_EMAIL=admin@admin.com
VB_PASSWORD=123456

# Log Level
LOG_LEVEL=info
EOL
    warn "⚠️  Configure o arquivo .env antes de executar o servidor!"
    warn "⚠️  Especialmente: DB_PASSWORD e JWT_SECRET"
fi

log "✅ Instalação concluída!"
echo ""
log "🚀 Para iniciar o servidor:"
echo "  - Desenvolvimento: npm run dev"
echo "  - Produção com PM2: npm run pm2"
echo "  - Setup do banco: npm run setup"
echo ""
log "📋 Outros comandos úteis:"
echo "  - Ver logs PM2: npm run pm2:logs"
echo "  - Status PM2: npm run pm2:status"
echo "  - Parar PM2: npm run pm2:stop" 