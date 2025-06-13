#!/usr/bin/env node

/**
 * Health Check Script para ChipFlow Backend
 * 
 * Este script verifica se o servidor está funcionando corretamente
 * Uso: node healthcheck.js [url]
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const TARGET_URL = process.argv[2] || process.env.BACKEND_URL || 'http://localhost:3001';
const TIMEOUT = parseInt(process.env.HEALTH_TIMEOUT || '5000');

function healthCheck(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url + '/health');
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'ChipFlow-HealthCheck/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: response,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        url: url
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        timeout: TIMEOUT,
        url: url
      });
    });

    req.end();
  });
}

async function main() {
  const startTime = Date.now();
  
  console.log(`🔍 Verificando saúde do servidor: ${TARGET_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  console.log('─'.repeat(50));

  try {
    const result = await healthCheck(TARGET_URL);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Status: ${result.status}`);
    console.log(`⏱️  Tempo de resposta: ${responseTime}ms`);
    
    if (result.data && typeof result.data === 'object') {
      console.log(`🆙 Uptime: ${result.data.uptime ? Math.floor(result.data.uptime) + 's' : 'N/A'}`);
      console.log(`🌍 Ambiente: ${result.data.environment || 'N/A'}`);
      console.log(`📝 Mensagem: ${result.data.message || 'N/A'}`);
      
      if (result.data.memory) {
        console.log(`💾 Memória: ${result.data.memory.used || 'N/A'} / ${result.data.memory.total || 'N/A'}`);
      }
    } else {
      console.log(`📄 Resposta: ${result.data}`);
    }
    
    // Critérios de saúde
    const isHealthy = result.status === 200 && responseTime < 10000; // 10s
    
    if (isHealthy) {
      console.log('\n🎉 Servidor está saudável!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Servidor apresenta problemas:');
      if (result.status !== 200) {
        console.log(`   - Status code inválido: ${result.status}`);
      }
      if (responseTime >= 10000) {
        console.log(`   - Tempo de resposta alto: ${responseTime}ms`);
      }
      process.exit(1);
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.log(`❌ Erro após ${responseTime}ms:`);
    console.log(`   - ${error.error}`);
    
    if (error.code) {
      console.log(`   - Código: ${error.code}`);
    }
    
    if (error.timeout) {
      console.log(`   - Timeout: ${error.timeout}ms`);
    }
    
    console.log('\n💀 Servidor não está respondendo!');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Erro inesperado:', error);
    process.exit(1);
  });
}

export { healthCheck }; 