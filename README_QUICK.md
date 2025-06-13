# ChipFlow Backend - Guia Rápido

## 🚀 Comandos Essenciais

### Instalação
```bash
chmod +x install.sh
./install.sh
```

### Iniciar
```bash
# Produção
npm run pm2

# Desenvolvimento  
npm run pm2:dev

# Modo tradicional (sem PM2)
npm start
```

### Gerenciar
```bash
npm run pm2:stop      # Parar
npm run pm2:restart   # Reiniciar
npm run pm2:status    # Ver status
npm run pm2:logs      # Ver logs
```

### Verificar Saúde
```bash
npm run health        # Local
npm run health:prod   # Produção
```

### Comandos PM2 Diretos
```bash
pm2 start pm2.config.cjs --env production
pm2 stop chipflow-backend
pm2 restart chipflow-backend
pm2 logs chipflow-backend
pm2 status
pm2 delete chipflow-backend
```

## 📁 Arquivos Importantes

- `pm2.config.cjs` - Configuração PM2 simplificada
- `ecosystem.config.cjs` - Configuração PM2 avançada
- `healthcheck.js` - Script de verificação de saúde
- `.env` - Variáveis de ambiente (criado automaticamente)

## 🔧 URLs

- **Desenvolvimento**: http://localhost:3001
- **Produção**: https://backchipflow.villelatech.com.br
- **Health Check**: `/health`
- **Status Detalhado**: `/status`

## ⚠️ Problemas Comuns

1. **Erro "File malformated"**: Use arquivos `.cjs` 
2. **Porta em uso**: Mude a PORT no `.env`
3. **CORS errors**: Verifique FRONTEND_URL no `.env` 