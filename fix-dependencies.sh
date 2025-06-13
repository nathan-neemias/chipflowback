#!/bin/bash

echo "🔧 Corrigindo dependências do BackendChipFlow..."

# Parar PM2
echo "📛 Parando PM2..."
pm2 stop chipflow-backend

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Reiniciar PM2
echo "🚀 Reiniciando PM2..."
pm2 restart chipflow-backend

# Verificar status
echo "📊 Status do PM2:"
pm2 status

echo "✅ Dependências corrigidas!" 