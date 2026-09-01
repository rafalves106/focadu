import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsProvider';
import { CourseSelectionPage } from './routes/CourseSelectionPage';
import { LoginPage } from './routes/LoginPage';
import { MarketplacePage } from './routes/MarketplacePage';
import { OnboardingWelcomePage } from './routes/OnboardingWelcomePage';
import { ProfileInterviewPage } from './routes/ProfileInterviewPage';
import { ProfilePage } from './routes/ProfilePage';
import { SplashPage } from './routes/SplashPage';
import { StartRoute } from './routes/StartPage';
import { TodayPage } from './routes/TodayPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* Precisa estar DENTRO do AuthProvider (SettingsMenu.onLogout usa useAuth()) e DENTRO do
            BrowserRouter (onExit/onLogout navegam) - ver contexts/SettingsProvider.tsx. Envolve o
            app inteiro pra o GlobalNav conseguir abrir o mesmo <SettingsMenu> de qualquer tela
            (Fase 25) - nas telas sem sessao (Login/Splash/onboarding) so fica montado sem uso. */}
        <SettingsProvider>
          <Routes>
            <Route index element={<SplashPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              {/* Onboarding (Fase 13b): fora do <App/> de proposito - sem o menu global, mesmo
                  tratamento full-bleed de LoginPage/SplashPage. /start (Fase 25): mesmo tratamento
                  so pra sub-tela sem params (mapa/personagem, WorldMapPage) - StartPage chama
                  <App> manualmente pras outras 5 sub-telas, ver StartPage.tsx. /hoje (Fase 20-24:
                  full-bleed fora do <App/>; Fase 25: voltou pra dentro - ver TodayPage.tsx). */}
              <Route path="onboarding" element={<OnboardingWelcomePage />} />
              <Route path="onboarding/perfil" element={<ProfileInterviewPage />} />
              <Route path="selecionar-curso" element={<CourseSelectionPage />} />
              <Route path="start" element={<StartRoute />} />
              {/* Backend continua exigindo [Authorize] em tudo desde a Fase 13a, ver docs/ARQUITETURA.md. */}
              <Route element={<App />}>
                <Route path="hoje" element={<TodayPage />} />
                <Route path="loja" element={<MarketplacePage />} />
                <Route path="perfil" element={<ProfilePage />} />
                {/* Fase 18: /conquistas virou a aba "Conquistas" do Perfil - redirect em vez de
                    quebrar links/favoritos antigos (decisao documentada em docs/fase-18). */}
                <Route path="conquistas" element={<Navigate to="/perfil?tab=conquistas" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
