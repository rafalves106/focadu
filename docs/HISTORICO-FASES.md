# Histórico por fase

Tirado do `CLAUDE.md` em 06/10/2026 (economia de contexto: o `CLAUDE.md` entra em toda sessão). Ao fechar uma fase, acrescente a linha dela no fim do bloco certo. Detalhe de cada uma em `docs/fase-N/`; o porquê das decisões 25–87 em `docs/ESTADO-HISTORICO.md`.

## Uma linha por fase

Detalhe de cada uma em `docs/fase-N/resumo-implementacao-fase-N.md`; o porquê das decisões 25–87 em
`docs/ESTADO-HISTORICO.md`. 13a/13b/27b/38b existem como fases próprias; 24b/24c só têm commit.

**Fundação (1–11)**
- **1** Domínio e schema .NET hexagonal/DDD: penalidade (3 pts → Daily de reforço), 2 dias fracos → reforço semanal, nota de corte 80.
- **2** Monorepo Git + API real (8 endpoints, envelope `{error,message}` com `DomainException.Code`).
- **3** Score no servidor (Quiz/WordMatch), seed do curso, 1º frontend; achou o bug do EF (`ValueGenerated.Never`) e o CORS.
- **4** Autoria de conteúdo curado, conclusão da Daily, telas WordMatch/Cloze/Roleplay; Score no servidor pros 4 tipos.
- **5** Voz: Whisper + Groq, `ActivityType.VoiceSummary`; `GET /api/today` determinístico.
- **6** Tela `/admin/conteudo` de autoria; diagramas da Semana 1. **7** Leitura e Vídeo, Projeto Semanal, menu de configurações.
- **8** Telas de navegação (Start, visão da semana, detalhe do curso). **9** Polimento das atividades (IntroCard, OptionCard, resumo de conclusão).
- **10** Estados de erro (`ApiErrorScreen`, `ErrorBoundary`, timeout). **11** Publicação pública (commit no GitHub + LinkedIn), bloqueio entre semanas.

**Multiusuário e gamificação (12–24)**
- **12** Auth JWT em cookie `HttpOnly`, splash/login. **13a** Template vs. Instância + matrícula (`Enrollment`). **13b** Onboarding com interesses + correção do `/admin/conteudo`.
- **14** Gems (cap mensal 20/20/30) + Streak. **15** Bônus de superação em reforço (+2). **16** Score de estudo ponderado + ranking. **17** Marketplace de cosméticos, badges e indicação.
- **18** Perfil em 3 abas. **19/20** Fidelidade visual (sessão diária; navegação/perfil; `/hoje` fora do shell).
- **21** Avaliação de projeto por IA (lê o repo), analogias "Pra você", narração de voz, `CuratedDayImporter`. **22** Modal global de sessão expirada.
- **23** Ligar Palavras em 2 colunas (`WordMatchPair`). **24** Squad (24b sucessão de liderança, 24c paginação do ranking e checks do SAST).

**Currículo e IA (25–35)**
- **25** Mapa 2D navegável (hoje desativado). **26** Currículo Web Security completo (60 dias/12 projetos), seed genérico, teste que varre toda a curadoria.
- **27** Analogia estendida a voz e LinkedIn; **27b** avaliação automática do projeto ao submeter. **28** Badge de status da IA. **29** Caderninho de anotações.
- **30/31** Diagramas no Texto Cru (4 tipos) e bloco de código. **32** Suporte Rápido de IA; **33** histórico curto + `/clear`.
- **34** `cursor:pointer` global. **35** Reler anotações antes de gravar o Resumo Falado.

**Sessão e correções ao vivo (36–45)**
- **36** "Etapa anterior", contador de erros no header, Pomodoro. **37** Sessão em 2 colunas + chat fixo.
- **38/38b** Bloqueio do Projeto Semanal, carrossel de cursos, **sequenciamento por progresso** (`DailySequencing`). **39** Correção de transcrição + título do dia.
- **40** Docker + CI/CD de deploy. **41** Redefinição de senha por SMTP. **42** Nota injusta do Resumo Falado (2 chamadas). **43** `TZ=America/Sao_Paulo` no container.
- **44** Flash "tudo errado" em Ligar Palavras. **45** Certificações de mercado por módulo (informativo).

**Forgejo, travas e conteúdo (46–60)**
- **46** Repositórios de Projeto Semanal no Forgejo interno (fork do template na matrícula). **47/48** Analogia sem contexto forçado + guarda de idioma.
- **49/50/53** Fim da homologação e da branch `develop`; docs do host corrigidas. **51/52** Itálico e código inline (crase) no Texto Cru.
- **54** Travas de acesso (reforço no mesmo dia, "1 Daily por dia" na matrícula inteira, projeto libera a próxima semana). **55** Reforço fora da cota; projeto pendente bloqueia todas as semanas seguintes.
- **56** Botão de reforço sempre visível. **57** Reforço puxa as anotações do dia base. **58** Projeto Semanal renderiza Markdown.
- **59** Linguagem do Projeto Semanal (Python/JavaScript, piloto Semana 1). **60** Token do Forgejo gerado sob demanda (não fica no banco).

**Pixel art e telas sem rolagem (61–76)**
- **61** Projeto Semanal sem rolagem externa. **62** Menu global do Figma. **63** Projeto Semanal v2 + anotação presa ao projeto.
- **64** Identidade pixel art + a Focada (mascote/mentora). **65** Mapa da trilha. **66** Start com vários cursos. **67** Casca global sem rolagem. **68** Sessão diária.
- **69** Semana de 6 dias (ponte, 72 dias) + ofensiva com folga e pausa. **70** Perfil e Squad. **71** Loja, agente e vitrine semanal. **72** Perfil "tela do agente" e QG do Squad.
- **73** Ranking (placar de fliperama). **74** Visão da semana, Certificações, Caderninho e telas de entrada. **75** Guia das telas ("?" + tour). **76** A Focada em Ranking, Perfil e QG.

**Squad, ponte e cursos (77–85)**
- **77** Squad com pedidos de entrada. **78** Revisão por IA do Caderninho. **79** Ponte "code comigo" (6 passos de código). **80** Chat com código formatado; ponte sem analogias.
- **81** Cursos de pré-requisito (seed genérico, curso escondido, semana sem projeto). **82** Linux pronto pra publicar. **83** Telas de curso sem Projeto Semanal.
- **84** Cursos livres com recomendação. **85** Prompts de IA citam o curso certo.

**Laboratório e telas pequenas (86–91)**
- **86/87** Laboratório de código (backend; front com Pyodide/JavaScript/Bash em v86, tudo no navegador). **88** Missão no terminal (Linux embutido). **89** Mais de um curso (Hoje pergunta o curso).
- **90** Missão no terminal v3. **91** Sessão, laboratório e Projeto Semanal em telas de notebook (trilhos e gavetas).

**Refação dos cursos (92–)**
- **92** Plano de curadoria, Fase 1: `importar`, molde v1, voz com devolutiva, feedback do dia, aquecimento, `resetar-usuarios`, trilha gerada; virada dos 3 pilotos.
- **93** Cadastro só com convite de tester (`SignupInvite`, comando `convite`) e confirmação de e-mail por código de 6 dígitos (`/confirmar-email`, claim `email_verified`), atrás das chaves `Signup:*`. Branch própria.

## Resumo detalhado das Fases 86–91 (como estava no Estado atual)

- **Laboratório de código (Fases 86 e 87)**: nos dias com bloco `lab` (pontes Python/JavaScript da Semana 1 do Web
  Security, Linux Dias 6 e 12) o aluno escreve e **roda o código na própria tela** (Pyodide + Scapy, JavaScript e
  Bash num Linux emulado no v86, sempre no navegador); a saída que vai pra avaliação é a do laboratório e a dica
  da Focada (3 por passo) não gasta tentativa. O código do aluno roda em Workers de `/lab/` com CSP que só libera
  `connect-src` em `/lab/` (não alcança a API). Formato do bloco em `secret/curadoria/CURADORIA.md` 5.2, verificador
  em `secret/curadoria/scripts/lab/`. Ver `docs/fase-86/`, `docs/fase-87/`.
- **Missão no terminal (Fase 88)**: nos dias normais do Linux (piloto: Dia 2) a atividade `TerminalMission` dá ao aluno um
  Linux embutido, já logado como usuário comum, com missões de comando conferidas no navegador (sem IA, sem nota, sem
  tentativa). Formato em `secret/curadoria/CURADORIA.md` 5.3, verificador `scripts/lab/verificar-missoes.mjs`. Ver `docs/fase-88/`.
- **Telas de notebook (Fase 91)**: abaixo de 1440×820 a sessão diária (inclusive laboratório e missão) e o Projeto Semanal
  trocam as colunas laterais por trilhos de 64px que abrem gavetas (`SideSlot`, `useIsWideSession`). Ver `docs/fase-91/`.
- **Missão no terminal v3 (Fase 90)**: cada missão diz situação, objetivo e passos; ao lado do terminal, a cola "Comandos de
  hoje" (clique copia pro campo); prompt com o diretório atual e `clear` que deixa o último comando visível. Ver `docs/fase-90/`.
- **Mais de um curso (Fase 89)**: com 2+ matrículas o "Hoje" pergunta o curso (o último aberto já vem marcado) e Trilha,
  Ranking, Perfil e o ranking do Squad têm seletor de curso (`CourseSwitcher`, `lib/courseChoice.ts`). Ver `docs/fase-89/`.
