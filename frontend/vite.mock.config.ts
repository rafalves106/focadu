import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';
import { sessionMock } from './mock/sessionMock';

// Vite com a API falsa da sessao diaria (mock/sessionMock.ts) - `npm run dev:mock`, porta 5199.
// Nunca fala com a API de producao: VITE_API_BASE_URL vazio mantem as chamadas relativas, e o
// plugin responde /api/* antes de qualquer proxy.
export default mergeConfig(baseConfig, defineConfig({ plugins: [sessionMock()] }));
