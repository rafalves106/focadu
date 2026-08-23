import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { AdminContentPage } from './routes/AdminContentPage';
import { CourseSelectionPage } from './routes/CourseSelectionPage';
import { LoginPage } from './routes/LoginPage';
import { MarketplacePage } from './routes/MarketplacePage';
import { OnboardingWelcomePage } from './routes/OnboardingWelcomePage';
import { ProfileInterviewPage } from './routes/ProfileInterviewPage';
import { ProfilePage } from './routes/ProfilePage';
import { SplashPage } from './routes/SplashPage';
import { StartPage } from './routes/StartPage';
import { TodayRoute } from './routes/TodayPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route index element={<SplashPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {/* Onboarding (Fase 13b): fora do <App/> de proposito - sem o nav de Hoje/Início/
                Conteúdo, mesmo tratamento full-bleed de LoginPage/SplashPage. /hoje (Fase 20) e o
                mesmo tratamento - as telas de sessao (SessionLayout, Fase 19) sao desenhadas
                full-bleed, sem chrome de nav por cima (ver TodayRoute em routes/TodayPage.tsx). */}
            <Route path="onboarding" element={<OnboardingWelcomePage />} />
            <Route path="onboarding/perfil" element={<ProfileInterviewPage />} />
            <Route path="selecionar-curso" element={<CourseSelectionPage />} />
            <Route path="hoje" element={<TodayRoute />} />
            {/* Backend continua exigindo [Authorize] em tudo desde a Fase 13a, ver docs/ARQUITETURA.md. */}
            <Route element={<App />}>
              <Route path="start" element={<StartPage />} />
              <Route path="loja" element={<MarketplacePage />} />
              <Route path="perfil" element={<ProfilePage />} />
              {/* Fase 18: /conquistas virou a aba "Conquistas" do Perfil - redirect em vez de
                  quebrar links/favoritos antigos (decisao documentada em docs/fase-18). */}
              <Route path="conquistas" element={<Navigate to="/perfil?tab=conquistas" replace />} />
              <Route path="admin/conteudo" element={<AdminContentPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
