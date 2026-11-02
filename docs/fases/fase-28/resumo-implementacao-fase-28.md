# Resumo — Fase 28: Status de IA (badge no GlobalNav)

## Origem

Pedido direto do Falves em conversa (não um prompt técnico completo colado de outra sessão):
a aplicação faz várias chamadas à Groq (transcrição/avaliação de VoiceSummary, avaliação de
projeto, rascunho de LinkedIn, analogia de leitura) e não havia nenhum jeito de ver, direto na
tela, se a Groq estava no ar - só descobria quando uma dessas atividades falhava ao vivo. Objetivo:
um status visível que ajude a decidir quando trocar a chave da Groq ou desativar temporariamente
uma atividade que depende dela.

Duas decisões de design foram fechadas com o Falves antes de implementar (`AskUserQuestion`):

1. **Mecanismo de check:** ping ativo à Groq (não rastreio passivo do uso real) - `GET models`
   (lista o catálogo, não consome cota de geração) com cache curto no backend, pra refletir o
   estado real mesmo sem ninguém ter usado uma atividade de IA recentemente.
2. **Visibilidade:** badge persistente no header/dashboard (não escondido dentro do menu de
   Configurações) - visível o tempo todo pra qualquer usuário logado, já que o app ainda não tem
   um conceito de admin separado.

## O que foi implementado

### Backend

- **`IAiProviderHealthCheck`** (port novo, `Focadu.Application.Ports`) - `ProviderName` +
  `CheckAsync()`, desenhado pra múltiplos provedores futuros (não só Groq): o use case agrega
  `IEnumerable<IAiProviderHealthCheck>`, uma implementação nova não muda nada no use case nem no
  endpoint.
- **`GetAiProviderStatusUseCase`** (`Focadu.Application.System`) - GET puro, sem persistência,
  itera as implementações registradas e monta `AiProviderStatusDto` (provider/configured/
  available/errorMessage/checkedAt).
- **`GroqHealthCheckService`** (adapter, `Focadu.Infrastructure.Services`) - primeiro adapter Groq
  que não é `Transient` via `AddHttpClient<TService>`: é `Singleton`, guarda cache em memória de
  45s (via `IHttpClientFactory.CreateClient("GroqHealthCheck")`, não `HttpClient` injetado direto),
  com `SemaphoreSlim` pra evitar 2 chamadas de teste simultâneas quando o cache expira sob
  concorrência. Chave ausente nunca chega a tentar a chamada (`Configured=false`); falha de rede/
  timeout vira `Available=false` + `ErrorMessage` no DTO, nunca uma exceção - ao contrário dos
  outros adapters Groq, "a IA está fora do ar" é um resultado válido aqui, não um erro HTTP.
- **`GET /api/system/ai-status`** (`Program.cs`) - atrás de `.RequireAuthorization()` (mesmo
  critério "só usuário logado vê o GlobalNav"), sem filtro por usuário (status é global).

### Frontend

- **`AiProviderStatusDto`** (`api/types.ts`) + `api.getAiProviderStatus()` (`api/client.ts`).
- **`AiStatusBadge.tsx`** (novo componente) - ponto colorido (verde/âmbar/vermelho/cinza,
  reaproveitando os tokens `--color-accent/project/alert/muted` já existentes) + rótulo curto;
  polling a cada 45s (mesma janela do cache do backend) enquanto o componente está montado.
  Self-contained, mesmo padrão de `HeaderUserBadge` (busca o próprio estado, nunca bloqueia o
  resto do nav se a chamada falhar - nesse caso mostra "Status da IA" em cinza em vez de travar).
  Clique expande um painel com o detalhe por provedor (nome, "Operacional"/"Indisponível"/"Não
  configurada", `errorMessage` quando houver) + botão "Verificar agora" (força um refetch).
- **`GlobalNav.tsx`** - `AiStatusBadge` adicionado ao lado de `HeaderUserBadge`, nos dois layouts
  (desktop `md+` e a barra sempre visível do mobile) - aparece em toda tela que já usa o menu
  global (a única exceção continua sendo o mapa, `WorldMapPage`).

## Decisões técnicas tomadas que não estavam no prompt original

- **Escopo do port pensado pra mais de 1 provedor desde já** (`IEnumerable<IAiProviderHealthCheck>`
  no use case, endpoint devolve array) - o pedido original já citava "Groq ou qualquer outra [IA]",
  então a estrutura evita retrabalho se outro provedor externo aparecer depois, sem adicionar
  complexidade real (é 1 `foreach`).
- **Cache dentro do adapter (não num cache distribuído/Redis)** - escala de app de usuário único/
  poucos usuários simultâneos não justifica infraestrutura extra; `Singleton` + `SemaphoreSlim` em
  memória resolve o objetivo real (não martelar a Groq a cada refresh de tela).
- **Nunca lança exceção em `CheckAsync`** - diferente do resto dos adapters Groq (que lançam
  `ExternalServiceException`), porque aqui "fora do ar" é o próprio dado que o endpoint devolve,
  não uma falha do endpoint em si.
- **Painel do badge fecha só pelo próprio botão, sem listener de clique fora** - mesmo idioma já
  usado pelo menu suspenso mobile do `GlobalNav` (consistência, não introduz um padrão novo de UI).

## Verificação

- `dotnet build`: limpo. `dotnet test`: 323/323 (sem teste novo dedicado a `GroqHealthCheckService`
  - mesmo padrão já estabelecido pelos outros adapters Groq, nenhum tem teste unitário próprio,
  só `HttpRetry`, o helper compartilhado, é testado).
- `npx tsc -b`, `npx oxlint` e `npm run build` no frontend: limpos.
- **Verificação ao vivo feita nesta fase** (diferente da 27b, que deixou isso pendente): com a
  API rodando local e a `Groq:ApiKey` real configurada via user-secrets, `GET /api/system/ai-status`
  autenticado devolveu `{"provider":"Groq","configured":true,"available":true,...}`; uma 2ª chamada
  imediata confirmou o cache (resposta bem mais rápida, mesmo `checkedAt` dentro da janela de 45s).
  Usuário de teste criado só pra isso foi apagado do banco ao final.
