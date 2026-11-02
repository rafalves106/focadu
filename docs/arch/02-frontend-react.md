# Contexto Frontend: React, Vite e Tailwind v4

## Stack

- **Frontend**: Vite + React 19 + TypeScript + React Router 7 + Tailwind CSS v4 (tokens via `@theme`).
- **Estado Global**: Sem lib de estado extra (Redux/Zustand). Estado que sobrevive à navegação usa `useSyncExternalStore` encapsulado em hooks na pasta `lib/` (ex: `pomodoroTimer.ts`).
- **Estética**: Tudo em Pixel Art (mapa, start, daily, perfil, loja, ranking). Telas sem rolagem externa. Ao criar novas interfaces, siga os componentes base em `components/entry/Entry.tsx` e `components/PixelPage.tsx`.

## Convenções e Regras (Leitura Obrigatória)

- **Um arquivo, um propósito**: NUNCA coloque um hook e um componente no mesmo arquivo. Isso quebra o Fast Refresh do React.
- **Requisições HTTP**: Usamos client HTTP tipado com `fetch` nativo (`api/client.ts`). Retornos de erro sempre usam a tipagem `ApiFailure` via função `classifyApiError`.
- **Sessões e UX**:
  - Toda tela da sessão diária (Dailies) roda dentro de `SessionLayout` (fornecido por `TodayPage.tsx` via `SessionContext`).
  - O relógio Pomodoro e o conta-giros (Penalty) operam exclusivamente **dentro** da sessão diária.
  - Componentes de UI NÃO fazem chamadas de API avulsas; use os hooks de domínio (ex: `useApiResource.ts` ou chamadas mapeadas) passando por tratamento centralizado de erro.
- **Teste Visual e IAs**: Sessões automatizadas de IA não têm navegador. Não tente validar layout ou fluxos complexos baseados em áudio/microfone sozinhos. Informe as alterações de UI para validação manual. Atualize `lib/guiaTelas.ts` sempre que alterar uma tela.

## Estrutura de Diretórios e Roteamento

### Core e Configuração

- `src/main.tsx` -> Entrypoint. `BrowserRouter`, `AuthProvider`, `SettingsProvider`.
- `src/App.tsx` -> Shell global com `<GlobalNav/>` e `<ErrorBoundary>`.
- `src/index.css` -> Tema e Tailwind v4. Variável `--nav-height` base para telas sem rolagem.
- `src/api/` -> Tipagens que espelham DTOs do backend (`types.ts`), cliente HTTP e hooks (`useApiResource.ts`).
- `src/contexts/` -> Objetos, Providers e hooks (`AuthContext`, `SettingsContext`). Contextos só provêm estado, não buscam dados sozinhos pós-mount.

### Rotas Principais (`src/routes/`)

| Rota                               | Arquivo                                                 | Lógica Principal                                                                          |
| :--------------------------------- | :------------------------------------------------------ | :---------------------------------------------------------------------------------------- |
| `/`                                | `SplashPage.tsx`                                        | Decide destino pós-login via `resolveLandingPath`.                                        |
| `/login`, `/esqueci-senha`         | `LoginPage.tsx`, `ForgotPasswordPage.tsx`               | Fora de `ProtectedRoute`. Telas baseadas em pixel art (`EntryPitch`).                     |
| `/onboarding/*`                    | `OnboardingWelcomePage.tsx`, `ProfileInterviewPage.tsx` | Cadastro guiado. Salvamento via `PUT /api/users/me/profile`.                              |
| `/selecionar-curso`                | `CourseSelectionPage.tsx`                               | Busca cursos e faz `POST /api/enrollments`.                                               |
| `/start`                           | `StartDashboard.tsx`                                    | Dashboard principal (Pixel art, 2 colunas). Mapa top-down desativado temporariamente.     |
| `/start?course=`                   | `CourseDetailPage.tsx`                                  | Trilha do curso (pixel art, mapa visual da trilha).                                       |
| `/hoje` (ou `?daily=`)             | `TodayPage.tsx`                                         | Motor da Sessão Diária. Orquestra as 7 atividades avaliáveis. Fornece `SessionContext`.   |
| `/start?course=&weekly=&project=1` | `WeeklyProjectPage.tsx`                                 | Projeto da semana. Usa `MarkdownBlock` para renderizar specs.                             |
| `/perfil`                          | `ProfilePage.tsx`                                       | Palco do Agente (`AgentStage`), ProfileCards. Roteia modais via query params (`?abrir=`). |

### Componentes Base (`src/components/`)

- **Atividades (`activities/`)**: Componentes de avaliação (`QuizActivity`, `WordMatchActivity`, `VoiceSummaryActivity`, etc). Todos consomem `SessionShell.tsx` e injetam resultados via `FeedbackPanel.tsx`.
- **UI Global**: `GlobalNav.tsx` (Menu superior pixel art responsivo), `UserMenu.tsx` (Dropdown do perfil).
- **Gamificação (`gamification/`)**: `GemBadge.tsx`, `StreakIndicator.tsx`.
- **Agente (`agent/`)**: `AgentSprite.tsx` (Personagem multicamadas pixel art), `AgentCreator.tsx`.
- **Trilhas e Dashboard (`start/`, `week/`)**: `WeekTrail.tsx` (trilha vertical), `CourseSlots`, `SegmentedBar.tsx`.
- **Tratamento de Erros (`errors/`)**: Telas padronizadas baseadas na tipagem de `ApiFailure` (ex: `TimeoutError`, `NoConnectionError`).
