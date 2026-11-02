# Resumo — Fase 73: Ranking em pixel art (placar de fliperama)

Pedido do Falves (24-25/09/2026): desenhar o Ranking no Figma, a última tela interna ainda no estilo
antigo, e adaptar a responsividade de todas as telas pra evitar ao máximo a rolagem vertical. O desenho
está no Figma "Focadu — Pixel Art", página "Ranking — v2 (proposta)" (node `133:4502`): desktop
`133:4503`, celular com você fora do top 10 `134:6707` e notas `134:8174`. O Falves pediu o push da
responsividade e a implementação do Ranking na mesma mensagem.

## O que foi implementado

- **Ranking (`/start?course=&ranking=1`)**:
  - pódio com os 3 primeiros em pixel art (agente de frente 4x, 3x em tela baixa) em cima de blocos
    com medalha, holofote e piso;
  - recorte Semana/Mês/Curso e a regra do Score embaixo do pódio;
  - placar **HIGH SCORE** do top 10 à direita: posição em 2 dígitos, mini agente, linha pontilhada, 1º
    em âmbar, a sua linha em verde com cursor piscando;
  - fora do top 10, a sua linha fica presa no pé do placar depois de "· · ·";
  - cartões **Próximo alvo** (quanto falta pra passar quem está logo acima; no topo, "Defenda o topo")
    e **Como subir**;
  - sem rolagem externa a partir de `lg`; no celular empilha.
- **Backend**:
  - `RankingEntryDto.Look` (agente de cada pessoa, também no ranking do squad);
  - `RankingResultDto` ganhou `AheadEntry`, `TotalEntries`, `CurrentWeekNumber` e `CurrentWeekScored`;
  - `AgentLookDto` e a montagem dele saíram do QG pra `Application/Shared/AgentLooks.cs`.
- **Responsividade** (commit próprio, `5437546`, já em produção antes desta fase fechar):
  - variantes `short:` (menos de 880px de altura) e `tight:` (menos de 760px);
  - colunas laterais mais finas entre 1024 e 1279px;
  - sessão diária, Loja, QG do Squad, Projeto Semanal e visão da semana cabem na janela de 1024×768 a
    1920×1080. Só conteúdo de tamanho livre rola dentro do cartão;
  - o Perfil já tinha sido ajustado antes (commit `ee59965`).
- **Mock**: ranking com top 10 e agentes, o recorte Mês te coloca em 27º e a Semana vem com a sua ainda
  aberta. O detalhe do curso ficou completo (72 dias em 4 regiões), então a trilha voltou a abrir no
  mock.

## Decisões técnicas tomadas que não estavam no prompt original

- **Recorte "Semana"**: a pergunta das notas do Figma (avisar ou trocar por "semana passada") ficou
  sem resposta. Mantive o recorte e mostro o aviso "Sua Semana N ainda não fechou: ela entra no
  placar quando o projeto for avaliado". Trocar pra semana passada continua possível.
- **`AheadEntry`** é quem está uma posição acima na lista inteira, não só no top 10. O cartão diz
  "Rumo ao top 10" quando você é o 11º.
- **Removidos**: `RankingScopeTabs`, `RankingTable` e `CurrentUserRankingCard` (sem outro uso).
- **Placar**: o efeito de CRT é um `repeating-linear-gradient` de 4px. O cursor pisca com
  `animate-pulse` e para com `prefers-reduced-motion`.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/
├── Shared/AgentLooks.cs                  AgentLookDto + AgentLooks.Resolve (saiu do QG)
├── Ranking/GetCourseRankingUseCase.cs    Look, EntryAhead, semana atual do aluno
└── Squads/GetSquadRankingUseCase.cs      Look nas entradas
backend/tests/Focadu.Tests/Ranking/GetCourseRankingUseCaseTests.cs   +2 testes
frontend/src/
├── components/ranking/Scoreboard.tsx     PodiumPanel, ScoreBoard, NextTarget, HowToClimb (novo)
├── routes/RankingPage.tsx                reescrito
└── api/types.ts                          RankingEntryDto.look, RankingResultDto (+4 campos)
frontend/mock/sessionMock.ts              ranking por recorte, detalhe do curso completo
```

## Testes

- `dotnet test`: 522 passando. Os novos cobrem "quem está logo acima" (nulo pro 1º e pra quem não
  está no curso) e o agente atravessando o `RankEntries`.
- `tsc -b` e `npm run build` ok. `npm run lint` só com os 3 avisos que já existiam.
- Playwright + Chrome contra o mock, em 1920×1080, 1440×900, 1366×768, 1280×720 e 1024×768: sem
  rolagem de página. O placar sobra 5px só em 1024×768. No celular (390px) empilha sem rolagem
  horizontal.
- Estados conferidos em tela: Curso (você em 3º), Mês (você em 27º, preso no pé) e Semana (com o
  aviso). Console sem erro.

## Dúvidas ou pontos abertos para a próxima fase

- **Recorte Semana**: manter com o aviso (como está) ou trocar por "semana passada"?
- **Visão da semana**: ainda no estilo antigo (só ganhou a casca sem rolagem). É o próximo passo do
  plano das telas em pixel art, junto do modal de publicação do módulo.
- **Valor da recompensa da meta da semana do squad**: segue pendente (Fase 72).
