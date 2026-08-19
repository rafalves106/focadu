# Focadu — Frontend

Vite + React + TypeScript + React Router, consumindo a API real do backend (`../backend`).

## Como rodar

```bash
cd frontend
npm install
cp .env.example .env.local   # ajuste VITE_API_BASE_URL se a Api nao estiver em localhost:5282
npm run dev
```

Pressupõe a Api rodando (`dotnet run --project ../backend/src/Focadu.Api`) e o curso "Web
Security" semeado (`dotnet run --project ../backend/src/Focadu.Api -- seed`) - sem isso, `/hoje`
não tem nenhuma Daily pra mostrar.

## Rotas

| Rota | Consome | Tela |
|---|---|---|
| `/hoje` | `GET /api/today` | Daily ativa de hoje - Quiz implementado de ponta a ponta |
| `/start` | `GET /api/courses` | Lista de cursos |
| `/start?course=` | `GET /api/courses/{courseId}` | Detalhe do curso |
| `/start?course=&weekly=` | `GET /api/weeklies/{weeklyId}` | Detalhe da semana |
| `/start?course=&weekly=&daily=` | `GET /api/dailies/{dailyId}` | Estado de uma Daily específica |

Ver `docs/ARQUITETURA.md` (raiz do monorepo) para o estado completo do projeto.
