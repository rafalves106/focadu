# Resumo — Fase 92: Pipeline de curso novo (da curadoria à publicação) e seed que descobre cursos pelo disco

## O que foi implementado

Pedido do dono (02/10/2026): o curso de Arquitetura de Software foi lançado, mas só existia no banco — cadastrado à mão —,
então um deploy/PR novo podia fazê-lo desaparecer. Faltava um fluxo único e barato, da busca de fontes ao curso publicado.

- **Causa raiz corrigida no backend:** `SeedCuratedCoursesUseCase.CourseSlugs` (`["linux","python-websec"]`) era lista fixa em C#;
  curso novo só entrava com mudança de código. Agora `CuratedContentLocator.ListCourseSlugs()` varre `curadoria/*/curso.json`
  (exceto `web-security`, que tem seed próprio) — curso novo existe só de ter a pasta no `focadu-secret`. `SeedCuratedCoursesUseCase`
  e `SyncLabConfigUseCase` usam a descoberta. Teste novo `ListCourseSlugs_FindsEveryCuratedCourse_AndEachOneImportsCleanly`
  importa **todo** curso do disco (dias no disco = dias importados; `published:true` exige todos os dias).
- **Documento do fluxo:** `secret/curadoria/PIPELINE-NOVO-CURSO.md` — regra zero (o curso mora no `focadu-secret`, nunca só no banco),
  8 fases, 3 portões humanos (briefing, roteiro, prévia), modelo por tarefa, loop redação→validação→auditoria com escalada, retomada e medição.
- **Política de fontes:** `secret/curadoria/FONTES-CONFIAVEIS.md` — níveis T1/T2/T3/vetada, 2 fontes independentes com ≥ 1 T1/T2,
  frescor, verificação de vídeo por oEmbed, dossiê `fontes/semana-N.json` (sidecar fora do `dia-N.json`, que não aceita chave nova).
- **Skill `/criar-curso`** (Sonnet) e **3 agentes** com modelo fixo: `pesquisador-fontes` (Haiku — Opus nunca pesquisa), `redator-dia` (Sonnet),
  `auditor-dia` (Sonnet, só lê). Opus só como 3ª rodada do redator num dia que reprovou duas vezes.
- **Scripts sem LLM** em `secret/curadoria/scripts/curso/`: `novo-curso.mjs` (esqueleto com `published:false`, `PROGRESSO.json`) e
  `validar-curso.mjs` (manifesto, schema do dia, contagens do molde, Quiz 4/1, critérios 2.2 mecânicos 3 e 4, Roleplay alcançável,
  Cloze, dossiê de fontes; `--dia N`, `--final`). Calibrado contra os 12 dias reais do Linux: 0 erros, 3 avisos.

## Decisões técnicas tomadas que não estavam no prompt original

- **Descoberta pelo disco em vez de lista em C#.** Alternativa (lista em `appsettings`) manteria um segundo lugar pra esquecer.
- **Fontes em sidecar**, não em `dia-N.json`: o schema não aceita chave nova e o backend não precisa delas; o validador cobra a procedência.
- **Auditor e redator em Sonnet, Haiku só pesquisa/verifica.** O auditor precisa de julgamento (critérios 2.2); medir no piloto se pode descer.
- **Piloto antes do completo:** a 1ª execução faz só a Semana 1 e para pra relatório; o ajuste vai no harness (docs/agentes/validador), não no dia.
- **Limite assumido:** o seed genérico gera curso sem Projeto Semanal (`IsPracticeOnly`). Curso com projeto exige backend novo — decisão da fase 0.
- **Gap de deploy documentado, não mexido:** o deploy só dispara por push em `main` do `focadu`; mudança só no `focadu-secret` não deploya.

## Estrutura de arquivos criada

```
.claude/skills/criar-curso/SKILL.md
.claude/agents/{pesquisador-fontes,redator-dia,auditor-dia}.md
secret/curadoria/{PIPELINE-NOVO-CURSO.md,FONTES-CONFIAVEIS.md}
secret/curadoria/scripts/curso/{novo-curso.mjs,validar-curso.mjs}
```

## Testes

`dotnet test --filter CuratedCourseImporterTests|SyncCourseRecommendations`: 12/12. `validar-curso.mjs linux --molde pratico`: 0 erros.
`novo-curso.mjs` + `--final` num curso vazio de teste reprova como esperado (removido). Os agentes e a skill ainda **não** rodaram um curso real.

## Dúvidas ou pontos abertos para a próxima fase

- **Rodar o piloto:** `/criar-curso` num curso novo (ou refazer Arquitetura de Software, hoje só no banco, sem `curso.json`) com `--piloto`, só a Semana 1.
- **Arquitetura de Software em produção:** sem pasta na curadoria, precisa ser reconstruída pelo pipeline (ou exportada do banco pra `curso.json` + `dia-N.json`) antes de o curso estar protegido.
- **Disparo de deploy por mudança só no `focadu-secret`** (ex.: `repository_dispatch`): hoje o commit de fechamento no `focadu` cobre.
- **Curso com Projeto Semanal** via seed genérico: não suportado.
