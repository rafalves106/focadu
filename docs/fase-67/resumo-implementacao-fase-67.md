# Resumo — Fase 67: Casca global sem rolagem externa

Pedido do Falves (23/09/2026): antes da v0.1.0, refazer em pixel art todas as telas que ainda não
seguem o padrão da trilha (Fase 65), do Projeto Semanal (Fases 61/63/64) e do start (Fase 66),
incluindo a correção de largura e rolagem. Plano e ordem em
`secret/rascunhos/telas-pixel-art-antes-da-0-1-0.md`. Esta fase é o 1º passo: a casca global, que
leva a abordagem "sem rolagem externa" da Fase 61 pro app inteiro e corrige a largura das telas
simples de uma vez. O visual pixel art de cada tela vem nas próximas fases.

## O que foi implementado

- **`App.tsx`**: a partir de `lg`, o app tem a altura exata da janela (`lg:h-dvh`, `flex-col`) e o
  conteúdo fica num `<main>` `flex-1` com `lg:min-h-0 lg:overflow-y-auto`. A janela não rola mais no
  desktop; tela ainda não adaptada rola dentro do `<main>`. Abaixo de `lg`, `min-h-dvh` e a janela
  rola normalmente.
- **Trilha, Projeto Semanal e start**: trocaram `lg:h-[calc(100dvh-var(--nav-height))]` por
  `lg:min-h-0 lg:flex-1`. Nenhuma tela desconta mais a altura do menu; `--nav-height` ficou só pro
  próprio `GlobalNav`.
- **`PageShell`** (`components/Layout.tsx`, usado por Ranking, Perfil, Loja, Certificações e
  Caderninho): saiu da coluna estreita (`max-w-2xl`, `min-h-screen`, rolando a janela) pras mesmas
  margens das telas pixel art (`lg:px-16 lg:pt-[45px] lg:pb-12`, `px-4` no celular), com o
  cabeçalho fixo e o conteúdo num `ScrollArea` que rola por dentro a partir de `lg`.

## Decisões técnicas tomadas que não estavam no prompt original

- **`h-dvh` só a partir de `lg`.** No celular a rolagem continua sendo da janela: rolagem interna
  impede a barra de endereço de recolher e atrapalha o gesto nativo. Mesma exceção da Fase 61.
- **`min-h-screen` das telas da sessão diária não foi mexido** (`SessionShell`, `IntroCard`,
  `CompletionSummary`, `ActivityScreen`, `Centered`, `ErrorLayout`). Vários são renderizados
  aninhados dentro da sessão, onde `flex-1` não teria efeito; trocar agora mudaria a centralização
  sem o redesenho. Dentro do `<main>` eles passam da altura pelo tamanho do menu e rolam ali, a
  mesma sensação de antes (quando rolava a janela). Serão tratados junto com cada tela.
- **Largura cheia no `PageShell`, sem `max-w`**: segue a trilha e o start, que também não têm teto.
  Conteúdo antigo pode parecer esticado até cada tela ganhar o desenho novo (aceito pelo dono).
- `contentClassName="lg:pr-6"` no `ScrollArea` do `PageShell`, pra barra (8px da borda) não ficar
  por cima do conteúdo.

## Estrutura de arquivos criada

```
frontend/src/
├── App.tsx                        (casca h-dvh + <main>)
├── components/Layout.tsx          (PageShell largo com ScrollArea)
├── index.css                      (comentário do --nav-height)
└── routes/
    ├── CourseDetailPage.tsx       (lg:min-h-0 lg:flex-1)
    ├── StartDashboard.tsx         (idem)
    └── WeeklyProjectPage.tsx      (idem)
```

## Testes

- `tsc -b` e `npm run build` sem erro; `npm run lint` só com os 4 avisos que já existiam.
- Conferido visualmente pelo Falves no Vite local (`localhost:5173`, API de produção em
  `localhost:5282`) com o próprio usuário: aprovado.

## Dúvidas ou pontos abertos para a próxima fase

- Próximo passo decidido: sessão diária (`/hoje`) em pixel art + layout sem rolagem externa.
- As telas do `PageShell` ganharam largura, mas o conteúdo ainda é o antigo; cada uma entra na
  ordem de `secret/rascunhos/telas-pixel-art-antes-da-0-1-0.md`.
