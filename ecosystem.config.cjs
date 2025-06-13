module.exports = {
  apps: [{
    name: 'chipflow-backend',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      FRONTEND_URL: 'https://chipflow.villelatech.com.br',
      TRUST_PROXY: 'true'  // Importante para funcionar com Nginx
    },
    // Configurações de logs
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_rotate: true,
    max_logs: 30,  // Mantém logs por 30 dias
    
    // Configurações de restart
    max_memory_restart: '512M',
    restart_delay: 5000,  // Aumentado para 5s
    max_restarts: 3,      // Reduzido para evitar loops infinitos
    min_uptime: '30s',    // Aumentado para garantir estabilidade
    exp_backoff_restart_delay: 100,
    
    // Configurações de watch (desabilitado para produção)
    watch: false,
    ignore_watch: ['node_modules', '.git', 'logs', '*.log'],
    
    // Configurações de kill timeout
    kill_timeout: 10000,    // Aumentado para 10s
    listen_timeout: 15000,  // Aumentado para 15s
    wait_ready: true,       // Espera pelo sinal ready
    
    // Configurações de performance
    node_args: '--max-old-space-size=512',
    
    // Health check
    health_check_grace_period: 5000,  // Aumentado para 5s
    autorestart: true
  }]
} 