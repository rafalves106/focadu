# Resumo — Fase 59: Linguagem do Projeto Semanal (piloto Semana 1: Python/JavaScript)

## O que foi implementado

Origem: `secret/rascunhos/linguagem-preferida-e-referencias-do-projeto.md` (pedido do dono,
21/09/2026, logo após a Fase 58) — o aluno passa a marcar no perfil quais linguagens topa usar nos
Projetos Semanais, e escolhe (de forma definitiva) em qual delas vai realizar cada projeto, ganhando
um repositório-modelo (só a base — a implementação é dele) e referências (bibliotecas/documentação)
curadas manualmente pra aquela linguagem. Piloto só na Semana 1, pra ver se fica bom antes de curar
as outras 11.

- **Perfil do aluno**: `User.PreferredLanguages` (Fase 59), lista fechada (`ProjectLanguage`: Python,
  JavaScript), marcada na Entrevista de Perfil (`ProfileInterviewPage`, chip reaproveitado de
  `InterestChip`) e editável na aba Informações do Perfil. Opcional no perfil (como os interesses) —
  quem não marca só vê o aviso na hora de abrir o projeto.
- **Curadoria por semana**: `WeeklyTemplate` ganhou `LanguageVariants` (1 repositório-modelo por
  linguagem, `WeeklyTemplateLanguage`) e `References` (links de referência, `WeeklyTemplateReference`,
  com `Language` nulo = comum a todas). `CuratedProjectImporter` lê os campos novos e opcionais
  `languages`/`references` do `projeto.json` — semana sem eles fica exatamente como antes da Fase 59.
- **Estado por aluno**: `WeeklyProject.Language`, nulo até a escolha, gravado uma única vez
  (`ChooseLanguage`) — junto com a URL do fork daquela linguagem, substituindo um eventual fork
  legado (fork único de antes desta fase). `Weekly.EnsureProjectLanguageCanBeChosen`/
  `ChooseProjectLanguage` repetem a mesma trava de `SubmitProject` (só com as Dailies da semana
  concluídas — decisão do dono: a escolha só acontece com o projeto já desbloqueado).
- **Caso de uso novo**: `ChooseWeeklyProjectLanguageUseCase` — valida tudo (semana com variante,
  linguagem marcada no perfil, projeto desbloqueado e ainda sem linguagem) antes de qualquer chamada
  externa, garante a conta do aluno no Forgejo, faz o fork do repositório-modelo daquela linguagem, e
  só então grava a escolha. `POST /weeklies/{id}/project/language`, 409 pra qualquer tentativa depois
  da 1ª (`linguagem_ja_escolhida`).
- **`WeeklyProjectDtoMapper`** (novo, substitui a montagem manual do DTO que existia em 3 casos de
  uso): calcula `ProjectLanguageStep` (`None`/`NeedsPreference`/`NeedsChoice`/`Chosen`) e só libera
  `specText`/`submissionUrl`/credenciais/referências depois da escolha — "o projeto só é
  disponibilizado depois da linguagem" (decisão do dono). Semana sem variante é sempre `None`,
  idêntico ao comportamento de antes desta fase.
- **Avaliação por IA**: `EvaluateWeeklyProjectUseCase` resolve o repositório via
  `WeeklyTemplate.ResolveForgejoTemplateSlug(project.Language)` — pega o slug da linguagem escolhida;
  sem linguagem (semana sem variante, ou projeto que já andava antes desta fase), cai no slug único de
  sempre.
- **Matrícula**: `EnrollUserInCourseUseCase` não faz mais fork automático em semana com variantes — o
  fork passa a acontecer na escolha da linguagem, não mais na matrícula.
- **Frontend**: `WeeklyProjectPage` ganhou os 3 estados novos antes da spec (aviso pra marcar
  linguagem no perfil / seletor com confirmação em 2 passos — decisão do dono, escolha irreversível —
  / card de referências depois de escolhida), sem tocar no layout de semana sem variante. O
  bloqueio de Dailies (`isLocked`) passou a valer também pro seletor de linguagem, não só pro envio.
- **Curadoria da Semana 1**: `projeto.json` ficou agnóstico de linguagem (saiu "em qualquer linguagem"
  e a lista de bibliotecas de "Ferramentas esperadas"); 2 repositórios-modelo (`modelos/python`,
  `modelos/javascript`, cada um só esqueleto com `TODO`/`NotImplementedError` + README com o
  checklist dos "Critérios de pronto"); 10 referências por linguagem (4 Python + 4 JavaScript + 6
  comuns), cada link conferido um a um contra a documentação oficial (RFCs do IETF, `scapy`,
  `pyshark`, `tshark`, `cap`, `pcap-parser`, `child_process`, `Buffer`).
- **Publicação dos modelos**: `secret/curadoria/scripts/publicar_modelo_forgejo.py` — publica uma
  pasta de modelo como repositório-template no Forgejo (`focadu-admin`), nunca sobrescreve um que já
  existe. Ainda **não rodado contra o Forgejo de produção** (ver "Dúvidas em aberto").
- **Patch pra produção**: `secret/curadoria/patches/2026-09-21-semana-1-linguagens.sql` — mesmo texto/
  variantes/referências do `projeto.json` novo, pro banco de produção (que não recarrega currículo já
  semeado). Gerado, conferido linha a linha contra o JSON, **ainda não aplicado em produção**.

## Decisões técnicas tomadas que não estavam no prompt original

- **Par de linguagens: Python + JavaScript** (proposta do Claude, confirmada pelo dono) — Python é
  citado em 11 dos 12 `projeto.json`, JavaScript em 7; a 3ª opção original (Java) só aparecia em 2,
  como uma opção entre outras.
- **Referências como registro estruturado** (`WeeklyTemplateReference`, com `Id`/`Position`/
  `LastVerifiedAt`), não texto solto dentro do `SpecText` — é o que o roteiro de manutenção do dono
  (aviso de link quebrado → painel de gestão) vai precisar: apontar pra um link específico exige que
  ele tenha identidade própria.
- **`ChooseWeeklyProjectLanguageUseCase` valida tudo antes de chamar o Forgejo**, e só grava a escolha
  depois do fork dar certo — se o fork falhar, o aluno pode tentar de novo (nada ficou "meio
  escolhido"). O fork do Forgejo virou idempotente (`ForgejoService.ForkTemplateAsync` trata 409
  reaproveitando o fork existente) por causa disso: uma escolha que falhou depois do fork mas antes de
  gravar precisa poder repetir sem travar num fork "já existe".
- **Confirmação em 2 passos na escolha de linguagem** (decisão do dono) — a UI só chama a API depois
  de um segundo clique de confirmação explícita ("depois de confirmar, não dá mais pra trocar"), sem
  nenhum caminho de desfazer pelo próprio aluno.
- **O bloqueio de Dailies (`isLocked`) esconde o seletor de linguagem inteiro**, não só o botão de
  envio — decisão do dono ("só depois de desbloqueado"). Enquanto travada, a tela mostra só o cadeado,
  igual a antes desta fase, mesmo em semana com variantes.
- **`CompleteProfileUseCase`/`User.CompleteProfile` tratam `preferredLanguages` nulo como "não mexe"**
  (mantém o que já tinha) e lista vazia como "limpa" — mesmo cuidado que teria sido necessário num
  cliente antigo sem o campo nunca chegando a existir de fato (só há 1 chamador no frontend hoje, que
  sempre manda a seleção atual).
- **Modelo-base é só o esqueleto** (estrutura, dependências, README com o checklist, funções com
  `TODO`/`NotImplementedError`) — nunca a solução, e nunca a aplicação vulnerável pronta onde a spec
  pede pro aluno construí-la (confirmado pelo dono).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/
  Enums/ProjectLanguage.cs
  Weeklies/WeeklyTemplateLanguage.cs
  Weeklies/WeeklyTemplateReference.cs
backend/src/Focadu.Application/Weeklies/
  ProjectLanguages.cs               <- parse de texto -> ProjectLanguage (compartilhado Api/Seed)
  ForgejoAccountProvisioner.cs      <- extraído de EnrollUserInCourseUseCase (agora usado em 2 lugares)
  WeeklyProjectDtoMapper.cs         <- monta o DTO com o estado de linguagem (usado em 3 casos de uso)
  ChooseWeeklyProjectLanguageUseCase.cs
backend/src/Focadu.Infrastructure/
  Persistence/Configurations/WeeklyTemplateLanguageConfiguration.cs
  Persistence/Configurations/WeeklyTemplateReferenceConfiguration.cs
  Migrations/20260921230435_AddProjectLanguages.cs
backend/tests/Focadu.Tests/Weeklies/ProjectLanguageTests.cs   <- 30 casos novos
secret/curadoria/web-security/semana-1/
  projeto.json                      <- editado: agnóstico + languages[] + references[]
  modelos/python/                   <- repositório-modelo (README, requirements.txt, sniffer.py, .gitignore)
  modelos/javascript/                <- idem (package.json, sniffer.js)
secret/curadoria/scripts/publicar_modelo_forgejo.py
secret/curadoria/patches/2026-09-21-semana-1-linguagens.sql
docs/fase-59/resumo-implementacao-fase-59.md   (este arquivo)
```

Arquivos alterados (não criados): `WeeklyTemplate.cs`, `WeeklyProject.cs`, `Weekly.cs`, `User.cs`
(domínio); `Dtos.cs`/`GetWeeklyDetailUseCase.cs`/`EvaluateWeeklyProjectUseCase.cs`/
`SubmitWeeklyProjectUseCase.cs`/`EnrollUserInCourseUseCase.cs`/`CuratedProjectImporter.cs`/
`CompleteProfileUseCase.cs`/`DependencyInjection.cs` (aplicação); `UserConfiguration.cs`/
`WeeklyProjectConfiguration.cs`/`WeeklyTemplateConfiguration.cs`/`CourseRepository.cs`/
`WeeklyRepository.cs`/`ForgejoService.cs` (infra); `Program.cs`/`ApiExceptionHandler.cs`/
`ProfileRequests.cs`/`WeeklyProjectRequests.cs` (Api); `types.ts`/`client.ts`/`WeeklyProjectPage.tsx`/
`ProfileInterviewPage.tsx`/`InformationTab.tsx`/`OnboardingWelcomePage.tsx` (frontend); `docs/
ARQUITETURA.md`, `CLAUDE.md`.

## Testes

- **Domínio**: 438 testes (30 novos, `ProjectLanguageTests.cs`) cobrindo variantes/referências da
  `WeeklyTemplate`, `ChooseLanguage` (irreversível, exige `Pending`), o gate de Dailies em
  `Weekly.EnsureProjectLanguageCanBeChosen`, e `User.CompleteProfile` com linguagens. `tsc -b`/
  `oxlint`/`vite build` do frontend limpos (só o aviso pré-existente em `TodayPage.tsx`).
- **Ponta a ponta, contra infraestrutura descartável** (Postgres + Forgejo próprios, containers
  Docker à parte dos de produção, nunca tocados): migrations aplicadas, seed do curso (que já
  importa `languages`/`references` do `projeto.json` real pelo caminho normal da aplicação, sem
  SQL solto), backend próprio rodando contra esse par. Fluxo real via HTTP: registro → perfil com
  Python marcado → matrícula → 409 ao tentar escolher linguagem com o projeto travado
  (`projeto_semana_bloqueado`) → Dailies concluídas → escolha de Python → **fork real confirmado no
  Forgejo** (`fork: true`, dono correto, não-vazio) e no banco (`Language='Python'`,
  `SubmissionUrl` = URL do fork) → 10 referências corretas (4 Python + 6 comuns, 0 vazamento de
  JavaScript) → reescolher a mesma linguagem e tentar trocar pra JavaScript, ambos 409
  `linguagem_ja_escolhida` → refetch confirma o estado persistido → **Semana 2 (fora do piloto)
  continua `languageStep=None`, spec liberada na hora, sem nenhum efeito da fase** → `submit` +
  `evaluate` reais: o backend buscou o repositório **Python** (confirmado nos logs, URLs com
  `.../template-web-security-semana-1-python/...`), nunca o slug antigo.
- **Frontend, visual**: os 3 estados novos + confirmação em 2 passos (clique real via Playwright) +
  estado liberado com referências + edição do perfil com o chip já marcado, todos com a API mockada
  (Chrome real, Vite numa porta livre) — 0 erro de console/página nas 7 capturas.
- **2 incidentes durante a validação, ambos com o dono já avisado e decidido**:
  1. A migration `AddProjectLanguages` foi aplicada **em produção por engano** (variável de ambiente
     errada no `dotnet ef database update`: `ConnectionStrings__Focadu`, que a Api usa em runtime,
     não é a que `FocaduDbContextFactory` lê pra `dotnet ef` — essa é `FOCADU_CONNECTION_STRING`).
     Confirmado sem dano real: a migration só é aditiva (`ADD COLUMN`/`CREATE TABLE`), as 2 tabelas
     novas ficaram com 0 linhas, nenhum `WeeklyProject.Language`/`User.PreferredLanguages` foi
     preenchido, o texto da Semana 1 seguiu o original, e o backend de produção continuou saudável.
     O dono decidiu deixar como está (é inofensivo pro binário antigo e o deploy de verdade só vai
     pular a migration por já estar aplicada).
  2. A avaliação de teste chamou a **API real do Groq** (o processo herdou a chave de
     `dotnet user-secrets` do ambiente de dev local, sem eu ter configurado nenhuma) — o dono
     confirmou que é uso gratuito, sem problema.

## Dúvidas ou pontos abertos para a próxima fase

- **Repositórios-modelo ainda não publicados no Forgejo de produção** — `publicar_modelo_forgejo.py`
  só rodou contra o Forgejo descartável do teste. Falta rodar contra `focadu-forgejo` de verdade
  (`FORGEJO_ADMIN_TOKEN` + `--apply`) antes do patch SQL fazer sentido em produção.
- **Patch SQL da Semana 1 ainda não aplicado em produção** — depende do item acima (a avaliação
  quebraria se o repositório-modelo referenciado no banco não existir no Forgejo de verdade).
- **Quem já tinha o fork antigo da Semana 1** (inclusive o próprio dono, que será o testador) segue
  com o projeto em `None`/legado até isso ser decidido explicitamente — `ResolveForgejoTemplateSlug`
  já cobre a avaliação desse caso (usa o slug antigo), mas ninguém "migra" um fork existente pra uma
  linguagem escolhida automaticamente.
- **Painel de gestão** (aviso de link fora do ar, IA ajudando a corrigir) — combinado com o dono como
  fase futura, fora de escopo aqui.
- **Semana 6 em JavaScript** (fora do piloto, mas vale registrar): a deserialização insegura da spec
  original pede um "formato nativo" (Java/PHP/`pickle`), que não tem equivalente direto em JS —
  quando a Semana 6 for curada, decidir entre ensinar o caminho via biblioteca de terceiros (ex:
  `node-serialize`) ou usar a saída que a própria spec já prevê ("documente por que não se aplica").
- **Escolha errada** — sem desfazer pelo próprio aluno (decisão do dono); hoje só dá pra corrigir
  direto no banco, até o painel de gestão existir.
