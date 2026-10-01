# Focadu — contexto do projeto

> Leia isto primeiro em qualquer sessão nova. Este arquivo é um **mapa de orientação e regras de
> processo** — não duplica o estado técnico detalhado, que vive em `docs/ARQUITETURA.md`. Se algo
> aqui divergir de `docs/ARQUITETURA.md`, o `ARQUITETURA.md` vence (é o documento vivo).

## O que é

Focadu é uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto é "Web
Security" (currículo completo desde a Fase 26: 4 módulos / 12 semanas / 12 projetos; desde a Fase 69,
72 dias - 6 por semana, o 6º é a ponte pro projeto, "code comigo" desde a Fase 79). A
missão do produto é forçar compreensão real de fundamentos — não resposta fácil de IA — através de
sessões diárias com múltiplas etapas, avaliação por voz via Groq (transcrição Whisper + nota/
feedback por LLM), sistema de pontuação/reforço adaptativo, atividades variadas (quiz, ligar-
palavras, cloze, roleplay, leitura, vídeo) e prova pública de evolução (commit no GitHub +
publicação no LinkedIn ao fim de cada módulo). É construído do zero, em fases sequenciais, cada
uma via um prompt técnico colado no Claude Code — ver "Mapa da documentação" abaixo para como o
histórico disso é preservado.

Desde a Fase 12 o app é multiusuário com autenticação real (JWT). Desde a Fase 13a o domínio é
**Template vs. Instância**: `Course`/`Monthly`/`WeeklyTemplate`/`DailyTemplate`/`DailyActivity` são
currículo compartilhado (admin-authored); `Weekly`/`Daily`/`ActivityResponse`/`WeeklyProject`/
`ModulePublication` são progresso por usuário, criados na matrícula (`Enrollment`, via
`EnrollUserInCourseUseCase`).

## Estrutura do monorepo

```
focadu/
├── CLAUDE.md          <- este arquivo
├── docs/              <- documentação de todo o projeto (não só backend), ver mapa abaixo
├── backend/           <- .NET, Hexagonal (Ports & Adapters) + DDD
├── frontend/          <- Vite + React + TypeScript
├── whatsapp-service/  <- serviço Node isolado de notificação, fase futura (ainda placeholder)
└── secret/            <- git próprio, ignorado pelo repo principal (ver .gitignore).
                          Documento de produto/negócio (MESTRE.md) + curadoria de conteúdo
                          didático + rascunhos de ideias não decididas. NÃO é a referência
                          técnica — isso é sempre docs/ARQUITETURA.md.
```

## Stack

- **Backend**: .NET 10, C# puro no domínio, PostgreSQL + EF Core (Code-First), xUnit, ASP.NET Core
  minimal APIs. Camadas com regra de dependência única: `Api -> Infrastructure -> Application ->
  Domain` (`Domain` nunca depende de nada externo). `Focadu.Tests` cobre só domínio puro e funções
  `internal static` da Application — não há fakes de repositório no projeto.
- **Frontend**: Vite + React 19 + TypeScript + React Router 7 + Tailwind CSS v4 (tokens via
  `@theme`), client HTTP tipado com fetch nativo, sem lib de estado extra.
- **Serviços externos**: Groq (Whisper `whisper-large-v3` p/ transcrição, `openai/gpt-oss-120b` p/
  avaliação e analogias personalizadas, sempre JSON mode) e GitHub API (commit de módulo, base do
  futuro SAST). Validação de post no LinkedIn é só estrutural (formato da URL).

## Mapa da documentação — leia antes de explorar o código a frio

| Arquivo | O que é | Quando muda |
|---|---|---|
| `docs/ARQUITETURA.md` | **Fonte da verdade técnica.** Retrato sempre atual do estado do projeto (schema, endpoints, decisões, pendências). É grande (~200KB) — busque a seção relevante em vez de ler tudo; o cabeçalho tem a linha "Última fase que atualizou este documento", que é a forma mais barata de saber em que fase o projeto está. | Toda fase, editado em cima do que existe, nunca recriado do zero. |
| `docs/CONVENCOES.md` | A própria convenção de documentação/fechamento de fase descrita abaixo. | Só se a convenção em si mudar. |
| `docs/fase-N/resumo-implementacao-fase-N.md` | Histórico imutável de cada fase (o que foi feito, decisões, dúvidas em aberto). | Escrito uma vez ao fechar a fase N, nunca editado depois. |
| `secret/MESTRE.md` | Princípios de decisão, filosofia de produto e regras de negócio ("o porquê"), em repo próprio e ignorado. Não duplica o nível de detalhe técnico do `ARQUITETURA.md`. | Quando o escopo de produto muda (passo 4 do fechamento de fase). |
| `secret/curadoria/`, `secret/rascunhos/` | Conteúdo didático curado e ideias não decididas ainda. Geridos pelas skills `curar-conteudo` e `registrar-rascunho` já em `.claude/skills/`. | Via as skills acima. |

## Regra de fechamento de fase (obrigatória — não pedir autorização, é o próprio fechamento)

Definida em `docs/CONVENCOES.md`; resumo aqui porque este arquivo é sempre carregado e aquele não.
Ao final de **toda fase de implementação**:

1. Criar `docs/fase-N/resumo-implementacao-fase-N.md` (modelo fixo em `docs/CONVENCOES.md`).
2. Atualizar `docs/ARQUITETURA.md` in-place (nunca recriar do zero) para refletir o estado novo,
   incluindo a linha do cabeçalho "Última fase que atualizou este documento".
3. Se a fase mudou o resumo de alto nível do produto (não só detalhe técnico), atualizar a seção
   "Estado atual" deste arquivo (abaixo) com a fase/data mais recente.
4. Se a fase mudou **escopo de produto**, atualizar `secret/MESTRE.md` (commit + push próprios no
   `focadu-secret`) e marcar como implementado o rascunho que a originou, se houver.
5. Commitar tudo isso (código + os dois/três docs acima) num único commit descritivo — sem pedir
   confirmação separada, isso faz parte do fechamento da fase, não é uma ação avulsa.

## Economia de tokens — quem faz o quê (modelo, agentes, contexto)

Regra geral: **o modelo mais barato que dá conta**, e o contexto principal fica limpo.

| Tarefa | Quem faz | Por quê |
|---|---|---|
| Implementar fase, decisões de arquitetura, bug difícil, revisão de segurança | Sessão principal (Sonnet; Opus só se travar) | Precisa do contexto inteiro |
| Buscar/mapear código ("onde fica X", "quem chama Y") em vários arquivos | Subagente `Explore` (Haiku) | Devolve só a conclusão, não despeja arquivos no contexto |
| Reescrever texto de aula / analogias | Agente `editor-pedagogico-websec` (Sonnet) | Só lê e devolve Markdown; não precisa de Opus |
| Curar dia (`curar-conteudo`), retrofit visual, rascunho | Skills do projeto, **um dia por vez** | Nunca em lote (estoura contexto) |
| Rodar testes/build e resumir falhas, varrer logs do Impostor | Subagente ou `Bash` com saída filtrada (`| tail`, `grep`) | Log cru não entra no contexto |

Hábitos obrigatórios:
- Ler `docs/ARQUITETURA.md` por seção (grep no cabeçalho), nunca inteiro (~200KB).
- Não reler arquivo que acabou de ser editado; não narrar opções que não serão seguidas.
- Tarefa longa e independente (ex.: curar semana) → sessão nova por unidade (dia/semana), com `/clear` ou `/compact` entre elas.
- Só spawnar agente quando a tarefa gera muita leitura e pouca conclusão. Tarefa pequena: fazer direto.
- Esforço: `/effort` baixo/médio pra ajustes simples e docs; alto só pra fase de implementação.

## Skills do projeto já configuradas

- `curar-conteudo` — cura conteúdo didático de um dia de qualquer curso (Web Security, Linux, Python pra
  Web Security) e grava em `secret/curadoria/<curso>/semana-N/dia-N.json`.
- `registrar-rascunho` — detecta ideia solta/não decidida sobre o produto e registra em
  `secret/rascunhos/<slug>.md`.
- `aplicar-elementos-visuais` — retrofita um dia já curado com os elementos visuais das Fases
  30/31 (diagrama de fluxo/comparação/camadas/partes, bloco de código), um dia por vez, nunca em
  lote.

## Estado atual

Última fase concluída: **Fase 89 — Mais de um curso** (01/10/2026; missão no terminal: Fase 88; laboratório de código: Fases 86 e 87).

Histórico completo dos marcos (Fases 25–87, com o porquê de cada decisão): `docs/ESTADO-HISTORICO.md` —
só abrir quando precisar. Estado técnico vivo: `docs/ARQUITETURA.md`; detalhe por fase: `docs/fase-N/`.

Resumo do que existe hoje:
- **Cursos**: Web Security (4 módulos / 12 semanas / 72 dias — 6 por semana, o 6º é a ponte "code comigo" —
  e 12 projetos semanais), Linux e Python pra Web Security (pré-requisitos, semana sem Projeto Semanal,
  seed genérico por `secret/curadoria/<slug>/curso.json`). Cursos livres, sem trava, com recomendação
  (Fase 84). Linux publicado em 30/09/2026.
- **Front**: tudo em pixel art (mapa, start, daily, perfil, squad, loja, ranking, visão da semana), telas sem
  rolagem externa, guia das telas com tour (`lib/guiaTelas.ts`).
- **IA (Groq/GitHub)**: avaliação de Resumo Falado, analogia "Pra você", chat rápido, revisão do Caderninho,
  avaliação de ponte/Projeto Semanal, dica da Focada no laboratório de código; prompts citam o curso (Fase 85).
- **Laboratório de código (Fases 86 e 87)**: nos dias com bloco `lab` (pontes Python/JavaScript da Semana 1 do Web
  Security, Linux Dias 6 e 12) o aluno escreve e **roda o código na própria tela** (Pyodide + Scapy, JavaScript e
  Bash num Linux emulado no v86, sempre no navegador); a saída que vai pra avaliação é a do laboratório e a dica
  da Focada (3 por passo) não gasta tentativa. O código do aluno roda em Workers de `/lab/` com CSP que só libera
  `connect-src` em `/lab/` (não alcança a API). Formato do bloco em `secret/curadoria/CURADORIA.md` 5.2, verificador
  em `secret/curadoria/scripts/lab/`. Ver `docs/fase-86/`, `docs/fase-87/`.
- **Missão no terminal (Fase 88)**: nos dias normais do Linux (piloto: Dia 2) a atividade `TerminalMission` dá ao aluno um
  Linux embutido, já logado como usuário comum, com missões de comando conferidas no navegador (sem IA, sem nota, sem
  tentativa). Formato em `secret/curadoria/CURADORIA.md` 5.3, verificador `scripts/lab/verificar-missoes.mjs`. Ver `docs/fase-88/`.
- **Mais de um curso (Fase 89)**: com 2+ matrículas o "Hoje" pergunta o curso (o último aberto já vem marcado) e Trilha,
  Ranking, Perfil e o ranking do Squad têm seletor de curso (`CourseSwitcher`, `lib/courseChoice.ts`). Ver `docs/fase-89/`.
- **Infra**: deploy automático por push (CI/CD), sem homologação, Forgejo interno pros repositórios de Projeto Semanal.

Regras que valem a partir daqui:
- **Toda tela é desenhada no Figma e aprovada antes do código** (decisão do dono, Fase 74).
- **Mudou uma tela, atualize o guia dela** em `frontend/src/lib/guiaTelas.ts`.
- Conteúdo curado novo com diagrama/bloco de código: via skill `aplicar-elementos-visuais`, um dia por vez
  (seis dias do Web Security ficaram de propósito sem diagrama — ver `secret/curadoria/CURADORIA.md` seção 4).

Pendências conhecidas: auditoria estática de segurança (SAST) dos repositórios de projeto semanal (escopo
definido na Fase 24c, não implementada).
