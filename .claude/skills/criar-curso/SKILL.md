---
name: criar-curso
description: "Conduz um curso NOVO da Focadu de ponta a ponta: briefing, pesquisa de fontes confiáveis (Haiku), roteiro, curadoria de todos os dias (Sonnet, com validação e auditoria), validação, banco e publicação. Use quando o usuário quiser criar/lançar um curso novo, retomar um curso em andamento ('continua o curso X') ou invocar /criar-curso. NÃO use para curar um dia isolado de curso que já existe (isso é /curar-conteudo)."
model: sonnet
metadata:
  version: 1.0.0
---

# Criar Curso — pipeline completo

O fluxo inteiro, com regras e porquês, está em **`secret/curadoria/PIPELINE-NOVO-CURSO.md`**. Este arquivo só diz como orquestrar. Em conflito, o PIPELINE vence.
Política de fontes: `secret/curadoria/FONTES-CONFIAVEIS.md`. Schema e molde: `secret/curadoria/CURADORIA.md`.

## Regras do orquestrador (você)

1. **Você roda em Sonnet e mantém o contexto limpo.** Nunca leia página de fonte nem um `dia-N.json` inteiro: delegue e leia só o resumo curto do agente. O que você lê: `PROGRESSO.json`, `curso.json`, `ROTEIRO.md` (na fase 2), saídas curtas do validador.
2. **Modelo por tarefa** (parâmetro `model` do `Agent`): `pesquisador-fontes` = haiku, `redator-dia` = sonnet, `auditor-dia` = sonnet. **Opus nunca pesquisa**; só `redator-dia` com `model:"opus"` na 3ª rodada de um dia que reprovou 2×, ou se o dono pedir. Nunca troque Haiku por Opus "pra garantir".
3. **O curso mora no `focadu-secret`.** Nada de SQL/INSERT à mão. Commite na pasta `secret/` (repo próprio) ao fim de cada fase, na branch que a sessão indicou, sem pedir confirmação (é o fluxo, igual ao fechamento de fase).
4. **Um dia por vez**, cada um num subagente novo. Pesquisa: um agente por semana (pode paralelizar semanas).
5. **Pendência não para o loop**: registre em `PROGRESSO.json` e siga. Só fale com o dono nos 3 portões, em pendência no fim da fase 3, ou quando um script falhar de um jeito que você não sabe consertar.
6. Sem inventar: fonte, vídeo, comando "rodado" ou dado que não veio de um agente/verificador.

## Ao iniciar

1. Pergunte/ache o `slug`. Se `secret/curadoria/<slug>/PROGRESSO.json` existe → **retomar**: leia, diga em 3 linhas fase/gates/pendências e continue da fase indicada. Se não existe → fase 0.
2. Modo: `--piloto` (padrão na 1ª execução de um curso: fases 0-3 só da **Semana 1**, depois relatório e para), `--completo` (todas as semanas e fases até onde os portões permitirem), `--fase N` (só aquela). Sem argumento: piloto se o curso é novo, completo se o piloto já foi aprovado (`gates`/`execucoes`).

## Fase a fase (detalhe no PIPELINE)

- **0 Briefing:** use `AskUserQuestion` (uma rodada, ≤ 4 perguntas, com recomendação em cada: molde, tamanho, fontes, requisitos). Rode `node secret/curadoria/scripts/curso/novo-curso.mjs ...`, preencha `FONTES.md`/`recomendacao.json`, commit. **G1** = aprovação do dono → `gates.briefing=true`.
- **1 Fontes:** `Agent(subagent_type:"pesquisador-fontes", model:"haiku")` por semana, em paralelo. Depois `node .../validar-curso.mjs <slug>` e releia só linhas `fontes/`. Conceito sem 2 fontes → 1 retentativa só daquele conceito; persistindo, pendência.
- **2 Roteiro:** escreva `ROTEIRO.md` (formato de `linux/ROTEIRO.md`, com IDs `S#`) e os títulos finais no `curso.json`. **G2** = o dono lê e aprova (`AskUserQuestion`: aprovar / pedir mudança). Sem G2 não existe fase 3.
- **3 Dias:** pra cada dia `pendente`:
  1. `Agent(subagent_type:"redator-dia", model:"sonnet")` com slug, semana, dia (+ erros/issues nas rodadas 2-3).
  2. `node .../validar-curso.mjs <slug> --dia N` → se ERRO, volta ao passo 1 (conta rodada), **sem** chamar o auditor.
  3. `Agent(subagent_type:"auditor-dia", model:"sonnet")` → JSON. `ok:false` → passo 1 com os issues (conta rodada).
  4. 3ª rodada: `redator-dia` com `model:"opus"`. Falhou de novo → `status:"pendencia"` + motivo.
  5. `ok` → `status:"validado"`. Grave em `PROGRESSO.json` (`rodadas`, `modelo` final).
  Ao fechar cada semana: atualize "Estado atual" do `ROTEIRO.md` e commit.
- **Fim do piloto:** pare e entregue o relatório (modelo em `PIPELINE` "Retomar e medir"): rodadas médias, pendências, avisos recorrentes, o que ajustar em agentes/validador/PIPELINE. Proponha os ajustes; aplique os aprovados **neste harness**, não só no dia.
- **4 Validação:** `validar-curso.mjs <slug> --final` e `cd backend && dotnet test Focadu.slnx --filter "FullyQualifiedName~CuratedCourseImporterTests"`. Falha → volta à fase 3 só no dia citado.
- **5 Visual:** skill `aplicar-elementos-visuais`, um dia por vez, só onde há estrutura real.
- **6 Prévia:** seed local (`/rodar-projeto`, `-- seed`), confira "N dias importados" = total. **G3** = dono testa na prévia (`published:false`, e-mail em `COURSE_PREVIEW_EMAILS`).
- **7 Publicar:** `published:true` → `--final` → commit/push do `focadu-secret/main`; fechamento de fase no `focadu` (resumo `docs/fase-N`, `ARQUITETURA.md`, `CLAUDE.md`), push em `main` do `focadu` dispara o deploy. Confira no log `Seed: curso '<nome>' (Active)`.

## Estado e registro

- Atualize `PROGRESSO.json` a cada dia e a cada portão (formato: `fase`, `gates`, `dias.<N> = {status, rodadas, modelo, motivo?}`).
- No fim de cada execução acrescente em `execucoes[]`: `{data, modo, fases, diasTocados, agentes:{haiku,sonnet,opus}, rodadasMedias, pendencias}`.
- Antes de dar por concluído, passe o **Checklist de "nada falta"** do PIPELINE item por item e diga o que está marcado.

## Resposta final ao dono

Curto: fase/portão em que parou, o que está pronto, lista de pendências (vazia = ótimo) e a próxima decisão que é dele.
