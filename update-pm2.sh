#!/bin/bash

echo "🔄 Atualizando PM2 e corrigindo problemas..."

# Atualizar PM2
echo "📈 Atualizando PM2..."
pm2 update

# Parar todos os processos
echo "📛 Parando todos os processos PM2..."
pm2 stop all

# Deletar processos antigos
echo "🗑️ Removendo processos antigos..."
pm2 delete all

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Iniciar novamente
echo "🚀 Iniciando PM2 novamente..."
npm run pm2

# Salvar configuração
echo "💾 Salvando configuração PM2..."
pm2 save

# Verificar status
echo "📊 Status final:"
pm2 status

echo "✅ PM2 atualizado e funcionando!" 