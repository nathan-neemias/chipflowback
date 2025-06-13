import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configurar axios-retry
const axiosInstance = axios.create();
axiosRetry(axiosInstance, { 
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 502;
  }
});

export const proxyRequest = async (req, res) => {
  try {
    const { url, method, headers, data } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    console.log('[PROXY] Iniciando requisição:', {
      url,
      method,
      hasHeaders: !!headers,
      hasData: !!data
    });

    // Configuração do Axios com retry e timeout
    const response = await axiosInstance({
      url,
      method: method || 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      data,
      timeout: 30000, // 30 segundos
      validateStatus: (status) => status < 500, // Rejeita apenas erros 500+
      maxRedirects: 5
    });

    console.log('[PROXY] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data
    });

    // Se a resposta não for bem-sucedida, loga mais detalhes
    if (response.status >= 400) {
      console.error('[PROXY] Erro na resposta:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });

      return res.status(response.status).json({
        error: response.data?.error || 'Erro na requisição',
        message: response.data?.message || response.statusText,
        status: response.status,
        details: response.data
      });
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[PROXY] Erro crítico:', error);

    // Tratamento específico para erros do Axios
    if (axios.isAxiosError(error)) {
      // Timeout
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Tempo limite excedido',
          message: 'A requisição demorou muito para responder. Por favor, tente novamente.',
          details: {
            code: error.code,
            timeout: true
          }
        });
      }

      // Erro de rede
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'Erro de conexão',
          message: 'Não foi possível conectar ao servidor. Verifique se o servidor está online e tente novamente.',
          details: {
            code: error.code,
            url: error.config?.url
          }
        });
      }

      // Erro de proxy/gateway
      if (error.response?.status === 502) {
        return res.status(502).json({
          error: 'Erro de gateway',
          message: 'O servidor está temporariamente indisponível. Por favor, tente novamente em alguns minutos.',
          details: {
            status: 502,
            url: error.config?.url
          }
        });
      }

      return res.status(error.response?.status || 500).json({
        error: 'Erro na requisição',
        message: error.message,
        details: {
          code: error.code,
          response: error.response?.data,
          status: error.response?.status
        }
      });
    }

    // Erro genérico
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      details: {
        type: error instanceof Error ? error.name : 'Unknown'
      }
    });
  }
};

export const proxyGet = async (req, res) => {
  const { url, headers } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[PROXY] Fazendo requisição GET para ${url}`);

  try {
    const requestHeaders = headers ? JSON.parse(headers) : {};
    console.log(`[PROXY] Headers:`, JSON.stringify(requestHeaders));
    
    const response = await axios({
      url,
      method: 'GET',
      headers: requestHeaders,
      responseType: 'text',
      timeout: 30000
    });
    
    // Verificar o content-type para decidir como processar a resposta
    const contentType = response.headers['content-type'] || '';
    
    // Se o content-type indicar que não é JSON, retorna o texto
    if (!contentType.includes('application/json')) {
      console.log(`[PROXY] Resposta em texto (${response.status}):`, 
        response.data.substring(0, 200) + (response.data.length > 200 ? '...' : ''));
      
      res.set('Content-Type', contentType);
      return res.status(response.status).send(response.data);
    }
    
    // Se for JSON, retorna o JSON normalmente
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[PROXY] Erro na requisição:', error);
    res.status(500).json({ error: 'Erro ao processar a requisição' });
  }
}; 