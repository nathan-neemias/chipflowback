# PM2 - ChipFlow Backend

Este documento explica como usar PM2 para gerenciar o backend do ChipFlow.

## Instalação

Primeiro, instale as dependências:

```bash
npm install
```

## Comandos PM2 Disponíveis

### Iniciar o aplicativo

```bash
# Desenvolvimento
npm run pm2:dev

# Produção
npm run pm2
```

### Gerenciar o aplicativo

```bash
# Parar o aplicativo
npm run pm2:stop

# Reiniciar o aplicativo
npm run pm2:restart

# Reload (zero downtime)
npm run pm2:reload

# Deletar o processo
npm run pm2:delete
```

### Monitoramento

```bash
# Ver logs
npm run pm2:logs

# Monitor em tempo real
npm run pm2:monit

# Status dos processos
npm run pm2:status

# Health check local
npm run health

# Health check produção
npm run health:prod
```

## Configurações

O arquivo `ecosystem.config.js` contém as configurações do PM2:

- **Modo Cluster**: Usa todos os CPUs disponíveis
- **Logs**: Armazenados na pasta `./logs/`
- **Restart automático**: Em caso de crashes
- **Limite de memória**: 1GB por processo

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend com:

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://chipflow.villelatech.com.br
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chipflow
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_jwt_secret_here
JUS_API_URL=https://jus.villelatech.com.br
VBSENDER_API_URL=https://vbsender.villelatech.com.br
VB_EMAIL=admin@admin.com
VB_PASSWORD=123456
```

## Deploy em Produção

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente
4. Execute o setup do banco: `npm run setup`
5. Inicie com PM2: `npm run pm2:start`

## Comandos Úteis

```bash
# Ver todos os processos PM2
pm2 list

# Salvar configuração atual
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup

# Resetar logs
pm2 flush

# Atualizar PM2
pm2 update
``` 