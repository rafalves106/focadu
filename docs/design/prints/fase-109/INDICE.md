# Telas do aluno - Fase 109 (redesign etapas 1 a 3, em codigo)

Capturado em 12/11/2026, ambiente LOCAL (Api :5282, Vite :5174, Postgres local), branch `fase-109-redesign-fundacao` (codigo igual ao da main em e9bf526). Curso Web Security (Dia 1 a Dia 6 da Semana 1). Comparar com os quadros do Figma `KZkoT5d33KsbBWEcQ0EBXj` (IDs em `docs/fases/fase-109/README.md`). O "antes" continua em `docs/design/prints/atual/`.

Pastas `desktop` (1440x900), `notebook` (1366x768), `celular` (390x844, touch). Os mesmos arquivos existem nos tres tamanhos. As colunas "Observacao" trazem so medidas automaticas do script (rolagem, estouro, erro 5xx) e fatos do capturador; opiniao de design e do comparador.

## Como cada estado foi montado

Todas as contas sao `aluno.f109.<n>@local.test` (senha de teste), criadas pela tela de cadastro, com onboarding e matricula em Web Security pela tela "Selecionar curso" (Web Security e Draft no banco local; a Api subiu com `CoursePreview__Emails` listando as contas). Um Dia e feito pelo fluxo normal (`dirigirDia`: leitura, voz com microfone falso, quiz sempre na opcao 1, etc.; o quiz errado gera reforco pendente) e concluido com "Pular" no feedback do dia.

| Prefixo no nome do arquivo | Conta | Como |
|---|---|---|
| `1o-dia-sem-agente` (1-9) | 1 | conta nova, nenhum Dia feito, agente NAO criado (contorno tracejado) |
| `1o-dia-com-agente` (51-59) | 5 | conta nova, nenhum Dia feito; agente criado em `/perfil?abrir=guarda-roupa` (Pele 2, Black power, "Criar agente") |
| `dia-feito-reforco-sem-agente` (101-109) | 3 | Dia 1 feito pelo fluxo normal, fotografado no mesmo dia: "Dia 1 feito", reforco pendente, sem agente |
| `dia-por-fazer-sem-agente` (151-159) | 3 | a mesma conta depois de recuar a data do Dia 1 em 1 dia no banco local (comando abaixo): Dia 2 por fazer, reforco do Dia 1 ainda pendente, sem agente |
| `dia-feito-reforco-com-agente` (201-209) | 4 | igual a conta 3, mas com o agente criado antes do Dia 1 |
| `dia-por-fazer-com-agente` (251-259) | 4 | conta 4 depois do recuo de 1 dia |
| `inicio-dois-cursos-*`, `inicio-web-security-dois-cursos-*` (301-303) | 4 | conta 4 matriculada tambem em Linux pela tela "Selecionar curso"; `/start` abre o Linux (ultimo curso matriculado); modal "Trocar curso"; escolher "Web Security" no modal |
| `login-*`, `esqueci-senha`, `termos` (401-404) | sem sessao | contexto novo, sem login |
| `*-conta-com-agente-dia-2` (501-507) e `*-conta-nova-sem-agente` (601-607) | 4 e 1 | demais telas do aluno (marcadas como NAO refeitas) |

Dentro de cada estado, a ordem dos arquivos e: Inicio, menu do agente (gaveta), confirmacao de "Sair da conta", Configuracoes, Ajuda desta tela no Inicio, Trilha, Ajuda na Trilha, Visao da semana 1, Ajuda na Visao da semana. A Trilha e a Visao da semana sao as da Semana 1 (a semana em andamento).

O que foi feito no banco local (recuo de data, so contas 3 e 4): `update "Dailies" set "CompletedAt" = "CompletedAt" - 1 dia, "Date" = "Date" - 1` nas Dailies concluidas da conta, `update "ActivityResponses" set "CreatedAt" - 1 dia` das respostas dela e `update "UserStreaks" set "LastCompletedDate" - 1` (funcao `recuarUmDia` em `tools/capturar-telas/capturar.mjs`). Nada mais foi alterado no banco, e nenhum dado de producao foi tocado.

Fatos gerais
- O "1o dia" e o estado da conta sem nenhum Dia fechado: nav so com Hoje e Trilha, sem Squad/Ranking e sem numeros no agente (conferido nos prints).
- No celular a nav superior tem so logo e agente; a barra inferior (Hoje, Trilha, Squad, Ranking, Voce) aparece nas telas fora do Dia. No 1o dia a barra inferior mostra so Hoje, Trilha e Voce.
- O print de conta com dois cursos: `/start` abre o ultimo curso matriculado (Linux), nao o Web Security.
- `/start?course=<id>` e a pagina Trilha; `/start?course=<id>&weekly=<id>` e a Visao da semana (rotas do app).
- As telas dos grupos 401-404, 501-507 e 601-607 AINDA NAO FORAM REFEITAS no redesign (etapas 4 a 6); diferem do Figma de proposito.
- Nos prints `*-dia-por-fazer-*` o reforco do Dia 1 continua pendente (selo ambar), porque o quiz do Dia 1 foi errado de proposito.

## desktop (1440x900) - 75 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-inicio-1o-dia-sem-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 02-menu-agente-1o-dia-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 03-sair-da-conta-1o-dia-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 04-configuracoes-1o-dia-sem-agente.png | /start | modal de Configuracoes |  |
| 05-ajuda-inicio-1o-dia-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 06-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) | 1 area(s) com rolagem interna. |
| 07-ajuda-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 08-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | Visao da semana 1 - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 09-ajuda-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 101-inicio-dia-feito-reforco-sem-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 102-menu-agente-dia-feito-reforco-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 103-sair-da-conta-dia-feito-reforco-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 104-configuracoes-dia-feito-reforco-sem-agente.png | /start | modal de Configuracoes |  |
| 105-ajuda-inicio-dia-feito-reforco-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 106-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 107-ajuda-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 108-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 109-ajuda-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 201-inicio-dia-feito-reforco-com-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (reforco pendente), com agente |  |
| 202-menu-agente-dia-feito-reforco-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (reforco pendente), com agente |  |
| 203-sair-da-conta-dia-feito-reforco-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 204-configuracoes-dia-feito-reforco-com-agente.png | /start | modal de Configuracoes |  |
| 205-ajuda-inicio-dia-feito-reforco-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 206-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 207-ajuda-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 208-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito hoje (reforco pendente), com agente |  |
| 209-ajuda-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 151-inicio-dia-por-fazer-sem-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 152-menu-agente-dia-por-fazer-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 153-sair-da-conta-dia-por-fazer-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 154-configuracoes-dia-por-fazer-sem-agente.png | /start | modal de Configuracoes |  |
| 155-ajuda-inicio-dia-por-fazer-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 156-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente | 1 area(s) com rolagem interna. |
| 157-ajuda-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 158-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 159-ajuda-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 251-inicio-dia-por-fazer-com-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 252-menu-agente-dia-por-fazer-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 253-sair-da-conta-dia-por-fazer-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 254-configuracoes-dia-por-fazer-com-agente.png | /start | modal de Configuracoes |  |
| 255-ajuda-inicio-dia-por-fazer-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 256-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente | 1 area(s) com rolagem interna. |
| 257-ajuda-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 258-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 259-ajuda-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 51-inicio-1o-dia-com-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 52-menu-agente-1o-dia-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 53-sair-da-conta-1o-dia-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 54-configuracoes-1o-dia-com-agente.png | /start | modal de Configuracoes |  |
| 55-ajuda-inicio-1o-dia-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 56-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, com agente criado pelo Perfil | 1 area(s) com rolagem interna. |
| 57-ajuda-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 58-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | Visao da semana 1 - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 59-ajuda-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | modal "Ajuda desta tela" aberto na Visao da semana |  |
| 301-inicio-dois-cursos-com-agente.png | /start | Inicio do curso aberto por padrao (Linux, o ultimo em que se matriculou) de quem tem dois cursos (Web Security e Linux); Dia 1 do Linux por fazer, com agente |  |
| 302-inicio-dois-cursos-trocar-curso.png | /start | modal "Trocar curso" aberto sobre o Inicio, com dois cursos |  |
| 303-inicio-web-security-dois-cursos-com-agente.png | /start?curso=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Inicio do Web Security depois de trocar no modal; Dia 2 por fazer, reforco pendente, com agente e dois cursos |  |
| 401-login-entrar.png | /login | aba Entrar (AINDA NAO REFEITA no redesign) |  |
| 402-login-criar-conta.png | /login | aba Criar conta (AINDA NAO REFEITA no redesign) |  |
| 403-esqueci-senha.png | /esqueci-senha | Esqueci a senha (AINDA NAO REFEITA no redesign) |  |
| 404-termos.png | /termos | Termos de Uso (AINDA NAO REFEITA no redesign) | A pagina rola (2561px de 900px); fullPage em 404-termos-full.png. |
| 601-hoje-abertura-conta-nova-sem-agente.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 602-perfil-conta-nova-sem-agente.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) |  |
| 603-squad-conta-nova-sem-agente.png | /squad | Squad (AINDA NAO REFEITA no redesign) |  |
| 604-loja-conta-nova-sem-agente.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 605-ranking-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 606-caderninho-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 607-certificacoes-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) |  |
| 501-hoje-abertura-conta-com-agente-dia-2.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) |  |
| 502-perfil-conta-com-agente-dia-2.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) |  |
| 503-squad-conta-com-agente-dia-2.png | /squad | Squad (AINDA NAO REFEITA no redesign) |  |
| 504-loja-conta-com-agente-dia-2.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) |  |
| 505-ranking-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 506-caderninho-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 507-certificacoes-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) |  |

## notebook (1366x768) - 75 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-inicio-1o-dia-sem-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 02-menu-agente-1o-dia-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 03-sair-da-conta-1o-dia-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 04-configuracoes-1o-dia-sem-agente.png | /start | modal de Configuracoes |  |
| 05-ajuda-inicio-1o-dia-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 06-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) | 1 area(s) com rolagem interna. |
| 07-ajuda-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 08-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | Visao da semana 1 - conta nova, nenhum Dia feito, sem agente (contorno tracejado) | 1 area(s) com rolagem interna. |
| 09-ajuda-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 101-inicio-dia-feito-reforco-sem-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 102-menu-agente-dia-feito-reforco-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 103-sair-da-conta-dia-feito-reforco-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 104-configuracoes-dia-feito-reforco-sem-agente.png | /start | modal de Configuracoes |  |
| 105-ajuda-inicio-dia-feito-reforco-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 106-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 107-ajuda-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 108-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 109-ajuda-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 201-inicio-dia-feito-reforco-com-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (reforco pendente), com agente |  |
| 202-menu-agente-dia-feito-reforco-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (reforco pendente), com agente |  |
| 203-sair-da-conta-dia-feito-reforco-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 204-configuracoes-dia-feito-reforco-com-agente.png | /start | modal de Configuracoes |  |
| 205-ajuda-inicio-dia-feito-reforco-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 206-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 207-ajuda-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 208-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 209-ajuda-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 151-inicio-dia-por-fazer-sem-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 152-menu-agente-dia-por-fazer-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 153-sair-da-conta-dia-por-fazer-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 154-configuracoes-dia-por-fazer-sem-agente.png | /start | modal de Configuracoes |  |
| 155-ajuda-inicio-dia-por-fazer-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 156-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente | 1 area(s) com rolagem interna. |
| 157-ajuda-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 158-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente | 1 area(s) com rolagem interna. |
| 159-ajuda-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 251-inicio-dia-por-fazer-com-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 252-menu-agente-dia-por-fazer-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 253-sair-da-conta-dia-por-fazer-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 254-configuracoes-dia-por-fazer-com-agente.png | /start | modal de Configuracoes |  |
| 255-ajuda-inicio-dia-por-fazer-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 256-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente | 1 area(s) com rolagem interna. |
| 257-ajuda-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 258-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente | 1 area(s) com rolagem interna. |
| 259-ajuda-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 51-inicio-1o-dia-com-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 52-menu-agente-1o-dia-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 53-sair-da-conta-1o-dia-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 54-configuracoes-1o-dia-com-agente.png | /start | modal de Configuracoes |  |
| 55-ajuda-inicio-1o-dia-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 56-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, com agente criado pelo Perfil | 1 area(s) com rolagem interna. |
| 57-ajuda-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 1 area(s) com rolagem interna. |
| 58-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | Visao da semana 1 - conta nova, nenhum Dia feito, com agente criado pelo Perfil | 1 area(s) com rolagem interna. |
| 59-ajuda-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | modal "Ajuda desta tela" aberto na Visao da semana | 2 area(s) com rolagem interna. |
| 301-inicio-dois-cursos-com-agente.png | /start | Inicio do curso aberto por padrao (Linux, o ultimo em que se matriculou) de quem tem dois cursos (Web Security e Linux); Dia 1 do Linux por fazer, com agente |  |
| 302-inicio-dois-cursos-trocar-curso.png | /start | modal "Trocar curso" aberto sobre o Inicio, com dois cursos |  |
| 303-inicio-web-security-dois-cursos-com-agente.png | /start?curso=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Inicio do Web Security depois de trocar no modal; Dia 2 por fazer, reforco pendente, com agente e dois cursos |  |
| 401-login-entrar.png | /login | aba Entrar (AINDA NAO REFEITA no redesign) |  |
| 402-login-criar-conta.png | /login | aba Criar conta (AINDA NAO REFEITA no redesign) | A pagina rola (842px de 768px); fullPage em 402-login-criar-conta-full.png. |
| 403-esqueci-senha.png | /esqueci-senha | Esqueci a senha (AINDA NAO REFEITA no redesign) |  |
| 404-termos.png | /termos | Termos de Uso (AINDA NAO REFEITA no redesign) | A pagina rola (2561px de 768px); fullPage em 404-termos-full.png. |
| 601-hoje-abertura-conta-nova-sem-agente.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 602-perfil-conta-nova-sem-agente.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) |  |
| 603-squad-conta-nova-sem-agente.png | /squad | Squad (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 604-loja-conta-nova-sem-agente.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 605-ranking-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 606-caderninho-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 607-certificacoes-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) |  |
| 501-hoje-abertura-conta-com-agente-dia-2.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) |  |
| 502-perfil-conta-com-agente-dia-2.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) |  |
| 503-squad-conta-com-agente-dia-2.png | /squad | Squad (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 504-loja-conta-com-agente-dia-2.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) |  |
| 505-ranking-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | 1 area(s) com rolagem interna. |
| 506-caderninho-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 507-certificacoes-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) |  |

## celular (390x844) - 73 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-inicio-1o-dia-sem-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 02-menu-agente-1o-dia-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 03-sair-da-conta-1o-dia-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 04-configuracoes-1o-dia-sem-agente.png | /start | modal de Configuracoes |  |
| 05-ajuda-inicio-1o-dia-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 06-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, sem agente (contorno tracejado) | 1 area(s) com rolagem interna. |
| 07-ajuda-trilha-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 08-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | Visao da semana 1 - conta nova, nenhum Dia feito, sem agente (contorno tracejado) |  |
| 09-ajuda-semana-1o-dia-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=f06d5f25-3f4c-4ddb-afa6-9bfde7c71304 | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 101-inicio-dia-feito-reforco-sem-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 102-menu-agente-dia-feito-reforco-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 103-sair-da-conta-dia-feito-reforco-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente | 1 area(s) com rolagem interna. |
| 104-configuracoes-dia-feito-reforco-sem-agente.png | /start | modal de Configuracoes | 1 area(s) com rolagem interna. |
| 105-ajuda-inicio-dia-feito-reforco-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio | 1 area(s) com rolagem interna. |
| 106-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente | 1 area(s) com rolagem interna. |
| 107-ajuda-trilha-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 108-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito hoje (3 erros no quiz: reforco pendente), sem agente |  |
| 109-ajuda-semana-dia-feito-reforco-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 201-inicio-dia-feito-reforco-com-agente.png | /start | Inicio (/start) - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 202-menu-agente-dia-feito-reforco-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 203-sair-da-conta-dia-feito-reforco-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente | 1 area(s) com rolagem interna. |
| 204-configuracoes-dia-feito-reforco-com-agente.png | /start | modal de Configuracoes | 1 area(s) com rolagem interna. |
| 205-ajuda-inicio-dia-feito-reforco-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio | 1 area(s) com rolagem interna. |
| 206-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito hoje (reforco pendente), com agente | 1 area(s) com rolagem interna. |
| 207-ajuda-trilha-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 208-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito hoje (reforco pendente), com agente |  |
| 209-ajuda-semana-dia-feito-reforco-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 151-inicio-dia-por-fazer-sem-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 152-menu-agente-dia-por-fazer-sem-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 153-sair-da-conta-dia-por-fazer-sem-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 154-configuracoes-dia-por-fazer-sem-agente.png | /start | modal de Configuracoes |  |
| 155-ajuda-inicio-dia-por-fazer-sem-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 156-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente | 1 area(s) com rolagem interna. |
| 157-ajuda-trilha-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 158-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, sem agente |  |
| 159-ajuda-semana-dia-por-fazer-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2131fcd8-a2bb-403d-9862-4b468a28e535 | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 251-inicio-dia-por-fazer-com-agente.png | /start | Inicio (/start) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 252-menu-agente-dia-por-fazer-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 253-sair-da-conta-dia-por-fazer-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 254-configuracoes-dia-por-fazer-com-agente.png | /start | modal de Configuracoes |  |
| 255-ajuda-inicio-dia-por-fazer-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 256-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente | 1 area(s) com rolagem interna. |
| 257-ajuda-trilha-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 258-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | Visao da semana 1 - Dia 1 feito ontem (recuado no banco local), Dia 2 por fazer, com agente |  |
| 259-ajuda-semana-dia-por-fazer-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=1fe2fd38-8b0c-444f-a1a8-72153d6eb7e0 | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 51-inicio-1o-dia-com-agente.png | /start | Inicio (/start) - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 52-menu-agente-1o-dia-com-agente.png | /start | menu do agente aberto (gaveta) sobre o Inicio - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 53-sair-da-conta-1o-dia-com-agente.png | /start | confirmacao de "Sair da conta" sobre o menu do agente |  |
| 54-configuracoes-1o-dia-com-agente.png | /start | modal de Configuracoes |  |
| 55-ajuda-inicio-1o-dia-com-agente.png | /start | modal "Ajuda desta tela" aberto no Inicio |  |
| 56-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | Trilha (pagina do curso) - conta nova, nenhum Dia feito, com agente criado pelo Perfil | 1 area(s) com rolagem interna. |
| 57-ajuda-trilha-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | modal "Ajuda desta tela" aberto na Trilha | 2 area(s) com rolagem interna. |
| 58-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | Visao da semana 1 - conta nova, nenhum Dia feito, com agente criado pelo Perfil |  |
| 59-ajuda-semana-1o-dia-com-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2c81f1c9-7ec1-4851-aaff-86f7f53d721b | modal "Ajuda desta tela" aberto na Visao da semana | 1 area(s) com rolagem interna. |
| 301-inicio-dois-cursos-com-agente.png | /start | Inicio do curso aberto por padrao (Linux, o ultimo em que se matriculou) de quem tem dois cursos (Web Security e Linux); Dia 1 do Linux por fazer, com agente |  |
| 401-login-entrar.png | /login | aba Entrar (AINDA NAO REFEITA no redesign) |  |
| 402-login-criar-conta.png | /login | aba Criar conta (AINDA NAO REFEITA no redesign) | A pagina rola (1030px de 844px); fullPage em 402-login-criar-conta-full.png. |
| 403-esqueci-senha.png | /esqueci-senha | Esqueci a senha (AINDA NAO REFEITA no redesign) |  |
| 404-termos.png | /termos | Termos de Uso (AINDA NAO REFEITA no redesign) | A pagina rola (3791px de 844px); fullPage em 404-termos-full.png. |
| 601-hoje-abertura-conta-nova-sem-agente.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) | A pagina rola (1710px de 844px); fullPage em 601-hoje-abertura-conta-nova-sem-agente-full.png. |
| 602-perfil-conta-nova-sem-agente.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) | A pagina rola (2280px de 844px); fullPage em 602-perfil-conta-nova-sem-agente-full.png. |
| 603-squad-conta-nova-sem-agente.png | /squad | Squad (AINDA NAO REFEITA no redesign) | A pagina rola (1782px de 844px); fullPage em 603-squad-conta-nova-sem-agente-full.png. |
| 604-loja-conta-nova-sem-agente.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) | A pagina rola (1665px de 844px); fullPage em 604-loja-conta-nova-sem-agente-full.png. |
| 605-ranking-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | A pagina rola (1780px de 844px); fullPage em 605-ranking-conta-nova-sem-agente-full.png. |
| 606-caderninho-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 607-certificacoes-conta-nova-sem-agente.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) | A pagina rola (1000px de 844px); fullPage em 607-certificacoes-conta-nova-sem-agente-full.png. |
| 501-hoje-abertura-conta-com-agente-dia-2.png | /hoje | sessao do dia (/hoje), primeira tela (AINDA NAO REFEITA no redesign) |  |
| 502-perfil-conta-com-agente-dia-2.png | /perfil | Perfil (AINDA NAO REFEITA no redesign) | A pagina rola (2289px de 844px); fullPage em 502-perfil-conta-com-agente-dia-2-full.png. |
| 503-squad-conta-com-agente-dia-2.png | /squad | Squad (AINDA NAO REFEITA no redesign) | A pagina rola (1782px de 844px); fullPage em 503-squad-conta-com-agente-dia-2-full.png. |
| 504-loja-conta-com-agente-dia-2.png | /loja | Loja (no 1o dia a rota abre ou redireciona; ver nota) (AINDA NAO REFEITA no redesign) | A pagina rola (2918px de 844px); fullPage em 504-loja-conta-com-agente-dia-2-full.png. |
| 505-ranking-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | Ranking do curso (AINDA NAO REFEITA no redesign) | A pagina rola (1809px de 844px); fullPage em 505-ranking-conta-com-agente-dia-2-full.png. |
| 506-caderninho-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho (AINDA NAO REFEITA no redesign) |  |
| 507-certificacoes-conta-com-agente-dia-2.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes (AINDA NAO REFEITA no redesign) | A pagina rola (1000px de 844px); fullPage em 507-certificacoes-conta-com-agente-dia-2-full.png. |


## Nao capturado (e por que)
- "Trocar curso" no celular: o cartao "Seus cursos" nao existe abaixo de md (esta documentado na etapa 3); o script registrou isso.
- Estado "dia feito, projeto aberto / publicacao pendente / amanha": exige fechar a ponte (Dia 6) e o Projeto Semanal; fora do escopo pedido (so um Dia feito com reforco pendente foi montado).
- Menu do agente com o ponto de status da IA fora de "funcionando": a IA estava 100% (Groq ligado no local).
- Sessao do dia alem da primeira tela, perfil com guarda-roupa aberto, squad criado, loja com provador e Caderninho com nota: nao capturados nesta rodada (so a tela de entrada de cada uma, marcadas como nao refeitas).
