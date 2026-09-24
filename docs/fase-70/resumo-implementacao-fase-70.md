# Resumo — Fase 70: Perfil e Squad em pixel art

Pedido do Falves (24/09/2026), 4º passo das telas em pixel art antes da v0.1.0
(`secret/rascunhos/telas-pixel-art-antes-da-0-1-0.md`). Primeiro o redesenho do `/perfil` foi feito no
Figma "Focadu — Pixel Art", página "Perfil — redesign proposto" (node `85:4502`: 7 telas + notas de UX).
Depois de ver as telas exportadas, o Falves pediu a implementação.

## O que foi implementado

- **Casca igual à da Daily**: a partir de `lg`, 3 colunas sem rolagem externa, cada uma com `ScrollArea`;
  topo com "Voltar pro start", título e o HUD de saldo (Gems, que abre a Loja, + streak + recorde) no
  lugar do conta-giros. Abaixo de `lg`, tudo empilhado com rolagem normal.
- **Ficha do agente** (`AgentSheet`, coluna esquerda, a mesma em todas as abas): avatar quadrado com a
  moldura equipada (`AgentAvatar`), nome na cor equipada, e-mail, cursos, recorde, score e posição no
  curso ativo (medalha no top 3), vitrine das 5 badges ("Ver todas" abre a aba) e atalhos pro ranking
  do curso e pras Configurações.
- **Abas em pixel** (`ProfileTabs`): Informações, Conquistas, Customização (selo "Em breve"), Squad.
  Viram uma grade 2x2 no celular. Continuam em `?tab=`.
- **Informações**: conta (somente leitura), interesses + notas, linguagem dos Projetos Semanais; os dois
  "Editar ›" continuam indo pra entrevista (`?edit=1`). As estatísticas foram pra ficha.
- **Conquistas**: cada badge vira uma linha com barra em blocos até a meta (regras de
  `GetUserBadgesUseCase`), selo "Conquistada" ou o que falta ("faltam 23 dias").
- **Customização**: segue "em breve", agora mostrando como o agente aparece hoje e os slots trancados
  (Moldura, Cor do nome, Banner, Roupa) + aviso da Loja.
- **Squad**: cabeçalho com código + copiar, co-líder com a coroa em sprite (saiu o 👑), "Sair do squad"
  em vermelho; recorte Semana/Mês/Curso; resumo (score total, médio, Gems); ranking com medalhas, a
  linha do aluno em verde, selos LÍDER/CO-LÍDER/VOCÊ. O dono gerencia na própria linha (tornar
  co-líder, rebaixar, remover) - o cartão "Gerenciar membros" separado saiu. Sem squad: criar ou
  entrar com código.
- **Coluna direita**: a Focada fala sobre a aba aberta (conquistas: quantas e qual é a próxima; squad:
  posição e quem está na frente, ou liderança/co-líder) e o **Indique um amigo** (`ReferralPanel`),
  que saiu da aba Conquistas pra ficar sempre visível.
- **Mock** (`npm run dev:mock`): badges, indicação, ranking do curso e squad em memória, com
  `/__mock/squad?as=membro|lider|nenhum` e as ações de squad funcionando.

## Decisões técnicas tomadas que não estavam no prompt original

- **Badges e indicação subiram pra `ProfilePage`**: aparecem fora das abas (ficha e coluna direita),
  então a página busca os 4 recursos de uma vez. `BADGE_INFO` saiu do `BadgeGrid` pra `lib/badgeInfo.ts`
  e ganhou a meta e o texto do que falta.
- **Fala da Focada do Squad vem do `SquadTab`** (`onSay`), porque depende do ranking que só a aba busca.
- **`FocadaSays` ganhou `stacked`**: retrato em cima e fala solta embaixo, pra caber na coluna de 256px.
- **Selo "Em breve" da aba some entre `sm` e 1400px**: em 1280px as 4 abas não cabem numa linha com ele
  (a própria aba repete o aviso).
- **Iniciais ignoram partes sem letra** (`"Falves (mock)"` virava "F(").
- **Fora do desenho**: "Gems médio" do squad não aparece mais (a API continua mandando). A moldura
  ainda usa as cores de raridade da loja (`RARITY_STYLE`, fora da paleta pixel) até os itens de verdade.
- Removidos: `ProfileHeader`, `BadgeGrid`, `ReferralCard`. `RankingTable`/`CurrentUserRankingCard`/
  `RankingScopeTabs` ficam só no `RankingPage` (a refazer).

## Estrutura de arquivos criada

```
frontend/src/
├── components/profile/  AgentSheet.tsx, ReferralPanel.tsx (novos); ProfileTabs, InformationTab,
│                        ConquestsTab, CustomizationTab, SquadTab (reescritos)
├── lib/                 badgeInfo.ts, profileLook.ts (MEDALS, equippedLook)
└── routes/ProfilePage.tsx (reescrito)
frontend/mock/sessionMock.ts (rotas do perfil e do squad)
```

## Testes

- `tsc -b`, `npm run build`; `npm run lint` só com os 4 avisos que já existiam.
- Playwright + Chrome contra o mock: as 4 abas e os 3 estados do Squad em 1440x900 e 1280x720 com
  `scrollHeight == innerHeight` (sem rolagem externa); celular 390x844 sem rolagem horizontal; nenhum
  erro no console (fora os 404 esperados de "sem squad").
- Interação: tornar co-líder (o cabeçalho troca pra "Co-líder · Diego"), remover membro (6 → 5 linhas),
  sair do squad (cai no "sem squad" com a fala certa da Focada), criar squad (volta como líder),
  "Ver todas" (vai pra `?tab=conquistas`), "Configurações ›" (abre o modal).

## Dúvidas ou pontos abertos para a próxima fase

- Slot **Roupa** na Customização é promessa visual: exige slot novo em `UserEquippedCosmetics` e
  migration, junto com a sessão de arte da Loja.
- Moldura e cor do nome saem da paleta pixel (`RARITY_STYLE`/`NAME_COLOR_STYLE`) até a Loja.
- Próximo passo do plano: visão da semana (inclui o modal de publicação do módulo); o Ranking também
  segue no estilo antigo.
