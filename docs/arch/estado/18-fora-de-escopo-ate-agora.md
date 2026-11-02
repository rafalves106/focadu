## Fora de escopo ate agora

- Servico de WhatsApp (`whatsapp-service/` e so placeholder).
- **Resolvido na Fase 13a, nao e mais pendencia:** autenticacao real (`User`, Fase 12) +
  matricula (`Enrollment`, Fase 13) + protecao (`.RequireAuthorization()` + filtro por dono) em
  todo endpoint de curso/weekly/daily/publicacao.
- **Resolvido na Fase 13b, nao e mais pendencia:** UI de onboarding/selecao de curso
  (`OnboardingWelcomePage`/`ProfileInterviewPage`/`CourseSelectionPage`/`EmptyStateStartPage`,
  ver secao de Frontend) - um usuario novo agora e guiado do registro ate `/start` sem travar em
  nenhum ponto, sem precisar de `curl` manual.
- **Resolvido na Fase 11, nao e mais pendencia:** integracao com GitHub (via `HttpClient` cru, sem
  Octokit.NET - a afirmacao do prompt de que "Octokit ja estava configurado desde a Fase 1" era
  falsa) e exigencia de publicacao publica (LinkedIn/GitHub) pra desbloquear o proximo modulo -
  ver "Publicacao publica e bloqueio de modulo" acima. O fluxo GitHub em si nunca foi exercitado
  contra a API real do GitHub (decisao explicita do usuario nesta fase).
- Geracao de conteudo/avaliacao via IA pra Cloze/Roleplay - **reconfirmado na Fase 4**:
  Cloze/FreeText usa comparacao textual simples, Roleplay usa mapeamento fixo de
  `TerminalQuality` (ver "Score no servidor") - nenhum dos dois e avaliacao inteligente de
  verdade. So `VoiceSummary` usa avaliacao por IA de verdade (Groq, desde a Fase 5).
- **Resolvido na Fase 14 (Gems/Streak), Fase 16 (Ranking/Score de Estudo), Fase 17
  (Marketplace/Cosmeticos/Trofeus/Indicacao) e Fase 24 (Squad), nao e mais pendencia:** ver
  secoes correspondentes em "Modelo de dominio" acima. **Ainda em standby:** Arcade/UGC e
  XP/Level/Elo/Patente, alem de qualquer entidade de "partida"/Challenge/PvP - confirmado
  explicitamente fora do escopo tanto da Fase 14 quanto da Fase 24 (Squad ficou so em
  owner/member + ranking, sem PvP nenhum entre squads).
- Endpoints de autoria de Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity/CuratedContent
  - nada disso tem API de criacao/edicao (CuratedContent teve, Fase 4 a 13b, removida - decisao do
  usuario, ver "Autoria de conteudo curado"). Toda a estrutura, incluindo conteudo curado, e so via
  `SeedWebSecurityCourseUseCase`/`CuratedDayImporter`.
- Exclusao (`DELETE`) de `CuratedContent` - so criacao/edicao existem; nunca foi pedido um
  endpoint de remocao.
- **Resolvido na Fase 99, nao e mais pendencia:** CORS configuravel por `Cors__AllowedOrigins` (padrao so de dev).
- **Resolvido na Fase 7, nao e mais pendencia:** menu de configuracoes no frontend - so que
  Aparencia/Som/Notificacoes/Limite de gravacao/Perfil/Atalhos continuam so visuais, sem
  persistencia (ver "Menu de configuracoes" na secao de Frontend).
- Cosmeticos/ranking (mesma pendencia acima) - reconfirmado em standby na Fase 7, mesmo aparecendo
  em telas adjacentes do Figma usado nessa fase; Gems deixou de estar nesta lista na Fase 14.
- O enunciado do Projeto Semanal (`WeeklyProjectSpecText`, hoje em `WeeklyTemplate` - Fase 13a
  moveu pra la, curriculo compartilhado) so e texto livre unico - o mockup do Figma da tela de
  Projeto Semanal mostra titulo/objetivos/recursos adicionais como campos separados, que o dominio
  nao tem (ver "Duvidas" em `docs/fase-7/resumo-implementacao-fase-7.md`).
- **Resolvido na Fase 11, nao e mais pendencia:** `WeeklyProject.Evaluate()` ganhou endpoint
  (`POST .../project/evaluate`, `EvaluateWeeklyProjectUseCase`) - so backend, sem UI (nao ha papel
  de "revisor" neste app de usuario unico), mas necessario pra `IsModuleComplete()` algum dia
  virar `true` de verdade. **Ressalva que durou ate a Fase 27b:** o endpoint existir nao bastava -
  nada no frontend o chamava, entao `IsModuleComplete()` de fato nunca virava `true` pra usuario
  nenhum ate `SubmitWeeklyProjectUseCase` passar a disparar a avaliacao sozinho.
- **Resolvido na Fase 10, nao e mais pendencia:** telas de erro no frontend (sem conexao, timeout,
  vazio, erro generico) - antes uma falha de fetch so mostrava texto vermelho solto
  (`<Centered text={error} tone="alert" />`).
- "Modo Offline" (cache local pra continuar navegando sem servidor) e "Reportar" (mailto/formulario
  de feedback no erro generico) - ambos citados no prompt da Fase 10 como "futuro", sem cache local
  nem endereco de suporte pra apontar ainda.
- **Resolvido na Fase 22, nao e mais pendencia:** sistema de sessao/expiracao - o design "Erro -
  Sessao Expirada" da Fase 10 ganhou tela, como modal global - ver "Sessao expirada: interceptor
  global de 401 (Fase 22)" acima.
- **Timer Pomodoro (Fase 36) e 100% client-side/cosmetico** - decisao explicita do Falves ao
  fechar as perguntas em aberto de `secret/rascunhos/timer-pomodoro-sessao.md`: sem endpoint novo,
  sem Gems, sem relatorio de tempo estudado (so engajamento visual, `lib/pomodoroTimer.ts`, reseta
  se a aba fechar). Persistir tempo estudado por Daily/dia (metrica nova de dominio) continua em
  aberto se um dia virar prioridade real de produto.