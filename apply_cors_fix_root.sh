#!/bin/bash

echo "🔧 Aplicando correções de CORS para ChipFlow (ROOT)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Reiniciar aplicação Node.js (PM2)
echo "🔄 Reiniciando aplicação Node.js..."
if command -v pm2 &> /dev/null; then
    echo "   ➤ Parando PM2..."
    pm2 stop chipflow-backend 2>/dev/null || true
    
    echo "   ➤ Iniciando PM2 com novas configurações..."
    pm2 start pm2.config.cjs --env production
    
    echo "   ➤ Salvando configuração PM2..."
    pm2 save
else
    echo "   ⚠️  PM2 não encontrado. Reiniciando processo Node.js..."
    
    # Matar processos Node.js existentes do ChipFlow
    pkill -f "node.*index.js" 2>/dev/null || true
    sleep 2
    
    # Iniciar novo processo em background
    echo "   ➤ Iniciando novo processo..."
    nohup node src/index.js > logs/app.log 2>&1 &
    sleep 3
    
    if pgrep -f "node.*index.js" > /dev/null; then
        echo "   ✅ Processo Node.js iniciado"
    else
        echo "   ❌ Falha ao iniciar processo Node.js"
    fi
fi

# 2. Recarregar Nginx
echo ""
echo "🔄 Recarregando configuração do Nginx..."
echo "   ➤ Testando configuração..."
nginx -t

if [ $? -eq 0 ]; then
    echo "   ✅ Configuração Nginx válida"
    echo "   ➤ Recarregando Nginx..."
    systemctl reload nginx
    echo "   ✅ Nginx recarregado"
else
    echo "   ❌ Erro na configuração do Nginx"
    echo "   ⚠️  Verifique o arquivo nginx.conf"
    exit 1
fi

# 3. Verificar status dos serviços
echo ""
echo "🔍 Verificando status dos serviços..."

# Status PM2
if command -v pm2 &> /dev/null; then
    echo "   📊 Status PM2:"
    pm2 status
else
    echo "   📊 Status Node.js:"
    if pgrep -f "node.*index.js" > /dev/null; then
        echo "      ✅ Processo Node.js rodando (PID: $(pgrep -f 'node.*index.js'))"
    else
        echo "      ❌ Processo Node.js não encontrado"
    fi
fi

# Status Nginx
echo "   📊 Status Nginx:"
systemctl status nginx --no-pager -l | head -10

# 4. Aguardar servidor inicializar
echo ""
echo "⏳ Aguardando servidor inicializar (5 segundos)..."
sleep 5

# 5. Testar CORS
echo ""
echo "🧪 Testando CORS..."
echo "   ➤ Testando health check local..."

# Teste local primeiro
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
if [ "$LOCAL_TEST" = "200" ]; then
    echo "   ✅ Servidor local respondendo (porta 3001)"
else
    echo "   ⚠️  Servidor local não responde na porta 3001 (HTTP $LOCAL_TEST)"
fi

echo "   ➤ Testando CORS via HTTPS..."
RESPONSE=$(curl -s -I "https://backchipflow.villelatech.com.br/health" \
  -H "Origin: https://chipflow.netlify.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "   ✅ Headers CORS encontrados"
    echo "   ➤ Headers CORS relevantes:"
    echo "$RESPONSE" | grep -i "access-control" | head -5
else
    echo "   ⚠️  Headers CORS não encontrados ainda"
    echo "   ➤ Response headers:"
    echo "$RESPONSE" | head -10
fi

# 6. Teste específico Netlify
echo ""
echo "🎯 Teste específico para Netlify..."
NETLIFY_TEST=$(curl -s -H "Origin: https://chipflow.netlify.app" \
  "https://backchipflow.villelatech.com.br/health" 2>/dev/null)

if echo "$NETLIFY_TEST" | grep -q "Servidor funcionando"; then
    echo "   ✅ Netlify pode acessar a API!"
else
    echo "   ❌ Netlify ainda não consegue acessar"
    echo "   ➤ Response: $NETLIFY_TEST"
fi

# 7. Instruções finais
echo ""
echo "✨ Aplicação das correções concluída!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs para testar:"
echo "   • Frontend: https://chipflow.netlify.app/"
echo "   • Backend Health: https://backchipflow.villelatech.com.br/health"
echo "   • Backend API: https://backchipflow.villelatech.com.br/api/"
echo ""
echo "🔍 Para testar CORS agora:"
echo "   curl -H 'Origin: https://chipflow.netlify.app' \\"
echo "        https://backchipflow.villelatech.com.br/health"
echo ""
echo "📝 Próximos passos:"
echo "   1. Abrir https://chipflow.netlify.app/ no browser"
echo "   2. F12 → Console → Verificar se não há mais erros CORS"
echo "   3. Testar login e funcionalidades"
echo ""
echo "🔧 Se ainda houver problemas:"
echo "   • Logs aplicação: tail -f logs/app.log"
echo "   • Logs Nginx: journalctl -u nginx -f"
echo "   • Status processos: ps aux | grep node" 