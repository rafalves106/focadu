# Resumo — Fase 100: Backup e Forgejo privado

Aberta e fechada em 14/10/2026, na branch `fase-100-backup-e-forgejo-privado` (parte da `fase-99-seguranca-de-borda`). Terceira fase do plano da v0.1.0
(`secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`). Pré-requisitos da pauta: backup do banco antes de cada deploy com restauração testada, e forks de
aluno privados no Forgejo. **Metade foi feita e provada na VM** (acesso SSH liberado pelo dono em `.claude/settings.local.json`); o passo que deixa os
templates privados **fica para o momento do deploy**, ver "Pontos abertos".

## O que foi implementado

- **Backup antes do deploy (`deploy.yml`)**: `pg_dump -Fc` para `~/backups/focadu-pre-deploy-<data>.dump` antes do `up --build` (a migration roda no boot da Api,
  depois). Falha fechado (dump vazio com o banco no ar derruba o deploy); primeiro deploy, sem container, segue. `umask 077` e guarda os 14 últimos.
- **Fork de aluno privado (`ForgejoService.ForkTemplateAsync`)**: o Forgejo força o fork a herdar a visibilidade do template, então os templates têm que ser privados.
  O método agora concede `read` ao aluno no template (`PUT .../collaborators/{aluno}`), faz o fork e exige `private: true` (`RequirePrivateFork`, erro
  `forgejo_fork_publico` se vier público, também no caminho do 409 que reaproveita fork). `publicar_modelo_forgejo.py` (no `focadu-secret`) passou a criar template privado.
- **Compose**: Postgres (`5432`) e Api (`5282`) só em `127.0.0.1`; Forgejo com `DEFAULT_PRIVATE=private` e `REQUIRE_SIGNIN_VIEW=true`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Template privado + leitura por colaborador, e não "tornar o fork privado depois"**: a API recusa (fork sincroniza a visibilidade com a origem). Alternativas
  (organização com time de alunos; fork como admin) são mais pesadas e mexem em quem é dono do template.
- **Falha fechada em vez de seguir com fork público.** Um template tornado público por engano passa a dar erro visível, não vazamento silencioso.
- **`5280` e `3020` ficaram abertos no host**: o `cloudflared` da VM usa `localhost:5280` e `localhost:3020`; mexer nisso sem poder testar o túnel é risco sem ganho (de fora só a 22 responde).
- **Sem criptografia nem cópia fora da VM**: precisam de um destino (Object Storage da Oracle) e de uma chave, decisão do dono.

## Como verificar (feito ao vivo na VM, 14/10/2026)

- **Fork privado**: usuários e repositório descartáveis `zz-f100*`: fork sem leitura = 404; com leitura = 202 e `private: true`; anônimo e outro aluno = 404; dono = 200;
  `git ls-remote` anônimo pede senha. Tudo apagado depois (conferido: 0 restos).
- **Restauração**: dump de 13/10 (`focadu-pre-importar-20261013-1230.dump`) restaurado num `postgres:16-alpine` temporário, sem rede: `pg_restore --exit-on-error` saiu com 0 e trouxe
  47 tabelas (produção também tem 47; contagens de linhas menores, como esperado, porque o dump é anterior a 1 usuário, 1 curso, 1 dia e 1 migration).
- **Portas de fora**: só a 22 responde; 5280, 5282, 5432, 3020 e 2222 filtradas pela Oracle. `dotnet test` 738 aprovados; build 0 erros; `deploy.yml`/`docker-compose.yml` são YAML válido.
- **Feito na VM**: `chmod 600` nos 4 dumps antigos (estavam legíveis por qualquer usuário); apagado o fork público órfão `aluno-7087…/template-web-security-semana-1` (conta que não existe mais
  no banco, nenhum projeto apontava para ele).
- **Não verificado**: o novo passo de backup do `deploy.yml` rodando no runner (só roda num deploy real); `ForkTemplateAsync` novo ponta a ponta com o app (o mecanismo foi provado direto na API do Forgejo).

## Dúvidas ou pontos abertos para a próxima fase

- **Passo operacional no deploy (nesta ordem)**: (1) `PATCH /repos/focadu-admin/<template>` com `{"private": true}` nos 22 templates (isso também torna privado o fork `aluno-2758…/template-web-security-semana-1-python`, da conta
  do dono, que tem os mesmos 2 commits do template, sem trabalho dele); (2) merge/deploy do código novo. **Entre (1) e (2) o fork de aluno falha** (o código antigo não concede leitura), então só vale quando o deploy puder sair logo.
  Se (2) vier antes de (1), o fork falha com `forgejo_fork_publico`. Depois: conferir `repos/search` sem login (esperado: 0).
- **Push bloqueado**: as branches 98, 99 e 100 não foram publicadas porque o token do `gh` não tem o escopo `workflow` (a 98 altera `ci.yml`, esta altera `deploy.yml`). `gh auth refresh -h github.com -s workflow`.
- **Falta**: cópia do backup fora da VM + criptografia (destino e chave); contas do Forgejo `aluno-7087…` e `aluno-8660…` (de usuários apagados) ainda existem, sem repositórios.
- O repositório do aluno deixa de abrir no navegador sem login no Forgejo (o aluno nunca teve senha de web): se a tela do Projeto Semanal mostra um link "abrir no Forgejo", ele passa a pedir login. Conferir e, se for o caso, tirar o link.
