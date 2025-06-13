# 🚨 CORREÇÃO URGENTE - CORS ChipFlow

## 🎯 **Problema:**
O site https://chipflow.netlify.app/ não consegue acessar a API https://backchipflow.villelatech.com.br/ devido a erro de CORS.

## ✅ **Status das Correções:**
- [x] **Express CORS** - Configurado no `src/index.js`
- [x] **Nginx CORS** - Configurado no `nginx.conf`
- [ ] **Aplicar no Servidor** - ⚠️ **PENDENTE**

## 🚀 **AÇÃO IMEDIATA NECESSÁRIA:**

### **Opção 1: Script Automático (Recomendado)**
```bash
# No servidor backend:
cd /caminho/para/BackendChipFlow
chmod +x apply_cors_fix.sh
./apply_cors_fix.sh
```

### **Opção 2: Manual**
```bash
# 1. Reiniciar aplicação Node.js
pm2 restart chipflow-backend
# ou se não usar PM2:
# pkill -f "node.*index.js" && nohup node src/index.js &

# 2. Recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx

# 3. Verificar se funcionou
curl -H "Origin: https://chipflow.netlify.app" https://backchipflow.villelatech.com.br/health
```

## 🔍 **Como Verificar se Funcionou:**

### **1. Teste Headers CORS:**
```bash
curl -I -H "Origin: https://chipflow.netlify.app" \
  https://backchipflow.villelatech.com.br/health
```
**Deve retornar:** `Access-Control-Allow-Origin: https://chipflow.netlify.app`

### **2. Teste no Browser:**
1. Abrir https://chipflow.netlify.app/
2. F12 → Console
3. **NÃO deve ter mais erros CORS**

## 📋 **Alterações Feitas:**

### **`src/index.js`** - Express CORS
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://chipflow.netlify.app',      // ← ADICIONADO
      'https://chipflow.villelatech.com.br',
      'http://localhost:3000'
    ];
    // ... resto da configuração
  }
};
app.use(cors(corsOptions));
```

### **`nginx.conf`** - Nginx CORS
```nginx
# Todas as rotas agora incluem:
if ($http_origin ~ "^(https://chipflow\.netlify\.app|...)$") {
    set $cors_origin $http_origin;
}
add_header 'Access-Control-Allow-Origin' $cors_origin always;
```

## ⏰ **Tempo Estimado:**
- **Aplicação:** 2-3 minutos
- **Propagação:** 30-60 segundos
- **Teste completo:** 5 minutos

## 🆘 **Se Ainda Não Funcionar:**

### **Debug Steps:**
```bash
# 1. Verificar logs aplicação
pm2 logs chipflow-backend

# 2. Verificar logs Nginx
sudo journalctl -u nginx -f

# 3. Verificar configuração ativa
sudo nginx -T | grep -A5 -B5 "chipflow.netlify.app"

# 4. Testar porta direta (pular Nginx)
curl -H "Origin: https://chipflow.netlify.app" http://localhost:3001/health
```

### **Possíveis Causas:**
1. **PM2 não reiniciou** - `pm2 restart all`
2. **Nginx não recarregou** - `sudo systemctl reload nginx`
3. **Cache do browser** - Ctrl+Shift+R
4. **Configuração não aplicada** - Verificar arquivos foram salvos

## 📞 **Contato:**
Se o problema persistir após estes passos, o erro está em outra configuração (DNS, SSL, firewall, etc).

---
**⚡ PRIORIDADE MÁXIMA:** Este problema impede o funcionamento completo da aplicação. 