import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { TodayPage } from './routes/TodayPage';
import { StartPage } from './routes/StartPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/hoje" replace />} />
          <Route path="hoje" element={<TodayPage />} />
          <Route path="start" element={<StartPage />} />
          <Route path="*" element={<Navigate to="/hoje" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
