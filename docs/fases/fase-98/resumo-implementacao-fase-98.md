# Resumo — Fase 98: Higiene da base

Aberta e fechada em 14/10/2026, na branch `fase-98-higiene-da-base`. Primeira fase do plano da v0.1.0 (cenário A, primeira leva com ~5
pessoas), em `secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`. Origem: pente fino de 14/10/2026 em código, docs e curadoria.

## O que foi implementado

- **Testes que falhavam (3 → 0; 738 de 738 passam):** três testes do Linux ainda esperavam o conteúdo anterior à Fase 92.
  - D2: tem 3 missões de terminal, não 4.
  - D6 (ponte): foi refeito em missões de terminal, sem `CodeStep`, e o domínio só reconhecia ponte com `CodeStep` ou `Language`;
    o D6 do Linux aparecia como dia comum na trilha. Ver "Decisões".
  - Teste novo `DailyTemplateBridgeTests.IsBridge_MarkedDayWithoutCodeStep_IsTrue`; o teste de ponte do Linux virou
    `LinuxBridge_IsMarkedInTheJson_AndRunsOnTerminalMissions`; `RealLinuxBridges_...` recebeu a expectativa de editor por dia.
- **Ponte marcada no JSON:** `DailyTemplate.BridgeMark` (coluna nova `DailyTemplates.BridgeMark`, migration `Fase98PonteMarcada`),
  lida de `"ponte": true` no `dia-N.json` por `CuratedDayImporter`. `IsBridge` passou a ser `BridgeMark || Language != null || tem CodeStep`.
  O schema (`secret/processo/molde/dia.schema.json`) aceita o campo; o `dia-6.json` do Linux o traz.
- **`frontend/mock/sessionMock.ts`:** lia `secret/curadoria/`, que não existe desde a Fase 92. Agora procura em `secret/conteudo/` e cai em
  `secret/processo/arquivo/conteudo-antigo/` para o que ainda não foi refeito (pontes do Web Security, Linux semana 2). O mock sobe e
  carrega todos os cenários.
- **CI (`ci.yml`):** passo que reprova com pacote .NET vulnerável (inclui transitivos; `dotnet list` sai com 0 mesmo achando, então o
  passo lê a saída) e `npm audit --omit=dev --audit-level=high`. Hoje os dois dão 0 vulnerabilidades. Comentário do passo de teste
  corrigido para `secret/conteudo/`.
- **Pacotes do backend:** Microsoft.* 10.0.11 → 10.0.13 e `System.IdentityModel.Tokens.Jwt` 8.22 → 8.23.

## Decisões técnicas tomadas que não estavam no prompt original

- **Ponte de terminal por marca explícita, não por inferência.** O D6 do Linux tem a mesma estrutura de atividades do D2 a D5
  (`TerminalMission`, Quiz, Cloze...), então nada no conteúdo o distingue; o dono escolheu o marcador `"ponte": true`.
- **Atualização de pacotes do frontend revertida.** `npm update` mexeu em ~1300 linhas do lockfile e o `oxlint` novo passou a acusar
  5 avisos `react(purity)` em código das Fases 94/97. Fica para quando houver motivo.
- **Versão `0.1.0` não aplicada ainda** (prevista nesta fase no plano): vai junto da tag no fechamento da v0.1.0.
- **Branches remotas antigas não apagadas:** apagar branch remota é ação externa; ficou para o dono confirmar.
- As 2 menções a "equivalência" em `secret/processo` são texto interno do processo (curadoria), nunca mostrado ao aluno: mantidas.

## Como verificar

- `dotnet build backend/Focadu.slnx` (0 erros, 5 avisos antigos) e `dotnet test`: 738 aprovados, 0 falhas.
- Frontend: `npx tsc -b` limpo, `npm run build` ok, `npm run lint` com os 2 avisos de sempre (`TodayPage.tsx`, `ScrollArea.tsx`).
- Linter do `dia-6.json` do Linux: PASSOU; os testes do linter passam.
- Mock: `npx vite --config vite.mock.config.ts` sobe sem erro (carrega todos os dias do laboratório).

## Dúvidas ou pontos abertos para a próxima fase

- **Em produção:** a migration roda sozinha no boot da Api no deploy. Para o D6 do Linux virar ponte lá, é preciso **importar o dia de
  novo** (`importar linux`), porque a marca só entra com o hash novo do arquivo; e o push do `focadu-secret` tem que ir antes do deploy.
- **Achado, não corrigido:** os dias 5 a 9 da semana 2 do Banco de Dados têm `CodeStep` (SQL) e por isso `IsBridge` os trata como
  ponte (sem analogia, aquecimento e selo de ponte na trilha). Se isso não é a intenção, `IsBridge` precisa deixar de inferir por `CodeStep`.
- A marca `"ponte"` não está documentada em `molde-v1.md`/`ponte.md` além do schema.
- O build do frontend não foi conferido no navegador (as sessões não têm navegador).
