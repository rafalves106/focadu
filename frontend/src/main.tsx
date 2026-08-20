import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { AdminContentPage } from './routes/AdminContentPage';
import { LoginPage } from './routes/LoginPage';
import { SplashPage } from './routes/SplashPage';
import { StartPage } from './routes/StartPage';
import { TodayPage } from './routes/TodayPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route index element={<SplashPage />} />
          <Route path="login" element={<LoginPage />} />
          {/* Fase 12: so o frontend exige sessao pra estas rotas por enquanto - os endpoints que
              elas consomem continuam abertos no backend, ver docs/ARQUITETURA.md. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<App />}>
              <Route path="hoje" element={<TodayPage />} />
              <Route path="start" element={<StartPage />} />
              <Route path="admin/conteudo" element={<AdminContentPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
