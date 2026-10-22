---
name: importar-producao
description: "Importa conteúdo curado (dias e projeto semanal) no banco de PRODUÇÃO da Focadu pelo workflow `publicar-conteudo` (roda na VM Oracle, com linter, dry-run, backup e conferência): confere o que está empurrado, dispara o dry-run, mostra o resultado e só aplica depois do ok do dono. Use quando o dono pedir para importar, atualizar ou publicar dia/projeto em produção, ou invocar /importar-producao. Não usar para o banco local (use `dotnet run ... importar`)."
metadata:
  version: 2.0.0
---

# Importar conteúdo em produção

Responda em português do Brasil. Runbook em `docs/DOCKER.md`, seção "Importar conteúdo em produção".

O caminho padrão é o workflow `publicar-conteudo.yml` (disparo manual, runner da VM). **Não use SSH**: o modo automático do Claude Code
bloqueia SSH para a VM, e o workflow já faz o que o SSH faria, com backup do banco antes de gravar e conferência depois.

## Passos

1. **Conteúdo empurrado**: o workflow faz `reset --hard origin/main` no `secret/` da VM. Arquivo só local não chega lá.
   `git -C secret status --short` (nada de `??`/`M` do que será importado) e `git -C secret log origin/main..` (vazio).
   O código do `importar` também precisa estar na `main` e com `Deploy` verde: `gh run list --branch main --limit 3`.
2. **Dry-run** (grava nada; é o padrão do workflow):
   ```
   gh workflow run publicar-conteudo.yml -f curso=<slug> -f dias=<N,N> -f projeto=<nao|junto|so> -f aplicar=false -f confirmar=false
   ```
   `dias` vazio = todos os dias que têm arquivo. `projeto=so` importa só o `semana-N/projeto.json`, sem tocar nos dias.
   Acompanhe: `gh run watch $(gh run list --workflow=publicar-conteudo.yml --limit 1 --json databaseId --jq '.[0].databaseId')`
   e leia o resumo: `gh run view <id> --log | grep -E "Dia |Projeto semana|Resumo|recus|confirmar"`.
3. **Resumir ao dono** em poucas linhas: dias `Created/Updated/Unchanged`, `Projeto semana N`, recusados.
   - `NeedsConfirmation`: diga quantos alunos têm resposta ou projeto iniciado e peça decisão sobre `confirmar`.
   - Linter reprovou: nada foi importado; corrija o JSON e repita.
4. **Aplicar só com o "ok" do dono** (grava no banco de produção; o workflow faz backup antes):
   ```
   gh workflow run publicar-conteudo.yml -f curso=<slug> -f dias=<N,N> -f projeto=<...> -f aplicar=true -f confirmar=<false|true>
   ```
   `confirmar=true` apaga respostas das atividades trocadas e recomeça Dailies não concluídas: só com autorização explícita.
5. **Conferir**: o workflow já repete o dry-run e falha se algo não ficou igual ao arquivo. Atualize o `estado.md` do curso se for a etapa D8/P6.

## Plano B (workflow indisponível)

Dry-run manual no container, que o dono roda com `!` (a skill não consegue por SSH):
`! ssh focadu-oracle 'docker exec focadu-backend dotnet Focadu.Api.dll importar <curso> --dry-run'`. O alias `focadu-oracle` mora no
`~/.ssh/config` do dono. Sem backup automático: peça um antes de qualquer gravação.

## Nunca

- `UPDATE` direto no banco de produção: corrigir é editar o JSON e importar de novo.
- `confirmar=true` ou apagar dia sem pedido do dono. Mexer no `.env` da VM.
- Gravar IP, usuário ou caminho de chave da VM em arquivo versionado.
