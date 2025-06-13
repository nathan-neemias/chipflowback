import express from 'express';
import axios from 'axios';

const router = express.Router();

// Configuração das APIs externas
const API_JUS_URL = process.env.API_JUS_URL || 'https://apijus.villelatech.com.br';
const API_VBSENDER_URL = process.env.API_VBSENDER_URL || 'https://apivbsender.villelatech.com.br';

// Proxy para API JUS
router.post('/jus/auth/login', async (req, res) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${API_JUS_URL}/auth/login`,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(API_JUS_URL).host,
        origin: 'https://jus.villelatech.com.br'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro no proxy JUS (login):', error);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Erro interno' });
  }
});

router.get('/jus/whatsapp-all', async (req, res) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_JUS_URL}/whatsapp-all`,
      headers: {
        ...req.headers,
        host: new URL(API_JUS_URL).host,
        origin: 'https://jus.villelatech.com.br'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro no proxy JUS (whatsapp):', error);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Erro interno' });
  }
});

// Proxy para API VBSender
router.post('/vbsender/auth/login', async (req, res) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${API_VBSENDER_URL}/auth/login`,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(API_VBSENDER_URL).host,
        origin: 'https://vbsender.villelatech.com.br'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro no proxy VBSender (login):', error);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Erro interno' });
  }
});

router.get('/vbsender/whatsapp-all', async (req, res) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_VBSENDER_URL}/whatsapp-all`,
      headers: {
        ...req.headers,
        host: new URL(API_VBSENDER_URL).host,
        origin: 'https://vbsender.villelatech.com.br'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro no proxy VBSender (whatsapp):', error);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Erro interno' });
  }
});

export default router; 