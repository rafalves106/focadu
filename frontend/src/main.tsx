import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { AchievementsPage } from './routes/AchievementsPage';
import { AdminContentPage } from './routes/AdminContentPage';
import { CourseSelectionPage } from './routes/CourseSelectionPage';
import { LoginPage } from './routes/LoginPage';
import { MarketplacePage } from './routes/MarketplacePage';
import { OnboardingWelcomePage } from './routes/OnboardingWelcomePage';
import { ProfileInterviewPage } from './routes/ProfileInterviewPage';
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
          <Route element={<ProtectedRoute />}>
            {/* Onboarding (Fase 13b): fora do <App/> de proposito - sem o nav de Hoje/Início/
                Conteúdo, mesmo tratamento full-bleed de LoginPage/SplashPage. */}
            <Route path="onboarding" element={<OnboardingWelcomePage />} />
            <Route path="onboarding/perfil" element={<ProfileInterviewPage />} />
            <Route path="selecionar-curso" element={<CourseSelectionPage />} />
            {/* Backend continua exigindo [Authorize] em tudo desde a Fase 13a, ver docs/ARQUITETURA.md. */}
            <Route element={<App />}>
              <Route path="hoje" element={<TodayPage />} />
              <Route path="start" element={<StartPage />} />
              <Route path="loja" element={<MarketplacePage />} />
              <Route path="conquistas" element={<AchievementsPage />} />
              <Route path="admin/conteudo" element={<AdminContentPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
