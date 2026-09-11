# Focadu — contexto do projeto

> Leia isto primeiro em qualquer sessão nova. Este arquivo é um **mapa de orientação e regras de
> processo** — não duplica o estado técnico detalhado, que vive em `docs/ARQUITETURA.md`. Se algo
> aqui divergir de `docs/ARQUITETURA.md`, o `ARQUITETURA.md` vence (é o documento vivo).

## O que é

Focadu é uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto é "Web
Security" (currículo completo desde a Fase 26: 4 módulos / 12 semanas / 60 dias / 12 projetos). A
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
| `secret/MESTRE.md` | Filosofia de produto e regras de negócio ("o porquê"), em repo próprio e ignorado. Não duplica o nível de detalhe técnico do `ARQUITETURA.md`. | Esporadicamente, quando produto/filosofia muda. |
| `secret/curadoria/`, `secret/rascunhos/` | Conteúdo didático curado e ideias não decididas ainda. Geridos pelas skills `curar-conteudo` e `registrar-rascunho` já em `.claude/skills/`. | Via as skills acima. |

## Regra de fechamento de fase (obrigatória — não pedir autorização, é o próprio fechamento)

Definida em `docs/CONVENCOES.md`; resumo aqui porque este arquivo é sempre carregado e aquele não.
Ao final de **toda fase de implementação**:

1. Criar `docs/fase-N/resumo-implementacao-fase-N.md` (modelo fixo em `docs/CONVENCOES.md`).
2. Atualizar `docs/ARQUITETURA.md` in-place (nunca recriar do zero) para refletir o estado novo,
   incluindo a linha do cabeçalho "Última fase que atualizou este documento".
3. Se a fase mudou o resumo de alto nível do produto (não só detalhe técnico), atualizar a seção
   "Estado atual" deste arquivo (abaixo) com a fase/data mais recente.
4. Commitar tudo isso (código + os dois/três docs acima) num único commit descritivo — sem pedir
   confirmação separada, isso faz parte do fechamento da fase, não é uma ação avulsa.

## Skills do projeto já configuradas

- `curar-conteudo` — cura conteúdo didático de um dia do curso e grava em
  `secret/curadoria/<curso>/semana-N/dia-N.json`.
- `registrar-rascunho` — detecta ideia solta/não decidida sobre o produto e registra em
  `secret/rascunhos/<slug>.md`.
- `aplicar-elementos-visuais` — retrofita um dia já curado com os elementos visuais das Fases
  30/31 (diagrama de fluxo/comparação/camadas/partes, bloco de código), um dia por vez, nunca em
  lote.

## Estado atual

Última fase concluída: **Fase 33 — Histórico Curto no Suporte Rápido de IA** (10/09/2026).

Marcos recentes (mais detalhe em `docs/ARQUITETURA.md` e nos `docs/fase-N/` correspondentes):
- Suporte Rápido de IA (Fase 32, histórico curto na Fase 33): botão flutuante em toda tela de
  sessão + Projeto Semanal, chat curto/direto via Groq pra tirar dúvida sobre o que está na tela
  (leitura/vídeo/projeto) ou o curso em geral. Guarda as últimas ~4 trocas da conversa (pra um
  "explica melhor" continuar fazendo sentido), fechar (✕/clique fora) só oculta o painel — só
  "Limpar" (ou digitar `/clear`) apaga o histórico de verdade.
- Currículo do curso piloto (Web Security) **completo** desde a Fase 26: 4 módulos / 12 semanas /
  60 dias / 12 projetos.
- Personalização por analogia (interesses do usuário) estendida a leitura, avaliação de voz e
  rascunho de LinkedIn (Fases 21/22 e 27).
- Avaliação automática do Projeto Semanal ao submeter (Fase 27b).
- Badge de status de IA (saúde dos provedores Groq/GitHub) no `GlobalNav` (Fase 28).
- Caderninho de anotações pessoal do aluno (Fase 29).
- Texto Cru da curadoria ganhou suporte a diagrama (` ```diagrama `, 4 tipos: sequência,
  comparação, camadas, partes) e bloco de código (` ``` `) — Fases 30/31. Exemplo aplicado nos
  Dias 1, 8 e 56; retrofit dos demais é backlog, feito sob demanda via skill
  `aplicar-elementos-visuais`.
- Mapa/personagem 2D (Fase 25) implementado mas **temporariamente desativado**; hub de entrada
  (`/start` sem params) voltou a ser o `StartDashboard` em cards — ver `docs/ARQUITETURA.md`.
- Pendência conhecida em aberto: auditoria estática de segurança (SAST) de repositórios de
  projeto semanal — escopo e checks já definidos (Fase 24c), implementação ainda não feita.
