# Telas do aluno - estado atual (antes do redesign)

Capturado em 11/11/2026, ambiente local (Api :5282, Vite :5174, Postgres local), curso Web Security (Dia 1 a Dia 6 da Semana 1). Sem `/gestao`.
Figma: arquivo https://www.figma.com/design/KZkoT5d33KsbBWEcQ0EBXj/Redesign---Focadu (fileKey KZkoT5d33KsbBWEcQ0EBXj), pagina "Atual - telas do aluno (2026-11-11)" (node 5:2): https://www.figma.com/design/KZkoT5d33KsbBWEcQ0EBXj/Redesign---Focadu?node-id=5-2
Secoes (node id): Entrada 5:3 (54 prints), Inicio e trilha 7:2 (18), Sessao diaria 7:27 (80), Progresso 7:139 (73), Resto do app 7:240 (75). Cada linha tem desktop, notebook e celular lado a lado; frame = nome do arquivo; sao imagens 1x (os `*-full.png` so existem em disco).

Como ler: pastas `desktop` (1440x900), `notebook` (1366x768), `celular` (390x844, touch). Numeracao: 01-64 aluno novo (cadastro novo por tamanho, Dia 1 completo), 101-1xx aluno com 5 dias feitos e a ponte (uma conta unica para os 3 tamanhos), 201-205 Projeto Semanal. Arquivos `*-full.png` sao a pagina inteira quando a viewport rola. As colunas "Observacao" trazem so medidas automaticas do script (rolagem, estouro horizontal, erro 5xx) e fatos que o capturador viu; opiniao de design e do diretor.

Fatos gerais
- `/confirmar-email` e `/aceite` sem sessao redirecionam para `/login`: os prints 08 e 09 mostram a tela de login.
- O print `semana-sem-progresso` (23) foi tirado a partir do primeiro link com `weekly=` da pagina, que e o link do castelo: mostra o Projeto da Semana 1 bloqueado (`&project=1`), nao a visao da semana do aluno novo. A visao da semana aparece nos prints 103 e 202 (aluno veterano).
- Desktop e notebook: as telas sao sem rolagem externa, exceto termos, privacidade e catalogo de cursos (o catalogo rola por dentro da pagina). Areas com rolagem interna aparecem na coluna Observacao.
- Notebook: a criacao de conta rola em 842 a 883px de 768px. O Dia 1 usa trilhos laterais fechados (Material/Pomodoro a esquerda, Notas/Duvida a direita) e abre gavetas.
- Celular: quase toda tela rola (Inicio 1350px, trilha 3250px, Perfil 2217px, Loja 2855px, Projeto Semanal 3467px de 844px). Sessao diaria com barra inferior Material/Notas/Duvida/Pomodoro.
- O balao "Primeira vez aqui? Aperte ?" aparece em todas as telas na primeira visita e cobre o canto inferior direito.
- A tela de loja de quem nao criou o agente mostra o botao "Criar agente" cortado na base (desktop 1440x900).
- A conta de teste faz 3 erros no Dia 1 em todos os tamanhos (voz com audio sintetico, quiz sempre na opcao 1), entao o selo de reforco aparece.
- A Daily e a ponte (Dia 6) usam o mesmo estado da conta unica; por isso notebook e celular mostram a ponte um passo adiante do desktop (ver "nao capturado").


## desktop (1440x900) - 103 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-login-entrar.png | /login | aba Entrar, vazia |  |
| 02-login-entrar-erro.png | /login | credenciais invalidas |  |
| 03-login-criar-conta.png | /login | aba Criar conta, vazia |  |
| 04-login-criar-conta-erro.png | /login | envio vazio, validacao |  |
| 05-login-criar-conta-erro-valores.png | /login | valores invalidos (nome curto, e-mail ruim, senha fraca, confirmacao diferente) |  |
| 06-esqueci-senha.png | /esqueci-senha | formulario |  |
| 07-esqueci-senha-enviado.png | /esqueci-senha | depois de enviar |  |
| 08-confirmar-email-sem-sessao.png | /login | aberta sem sessao (a confirmacao so e exigida com Signup:* ligado) |  |
| 09-aceite-sem-sessao.png | /login | aberta sem sessao (o aceite so e exigido com Signup:* ligado) |  |
| 10-termos.png | /termos | Termos de Uso | A pagina rola (2561px de 900px); fullPage em 10-termos-full.png. |
| 11-privacidade.png | /privacidade | Politica de Privacidade | A pagina rola (2709px de 900px); fullPage em 11-privacidade-full.png. |
| 12-login-criar-conta-preenchida.png | /login | formulario preenchido, antes de enviar |  |
| 13-onboarding-1-boas-vindas.png | /onboarding | passo 1 de 3 |  |
| 14-onboarding-2-perfil.png | /onboarding/perfil | passo 2 de 3, nenhum interesse marcado |  |
| 15-onboarding-2-perfil-preenchido.png | /onboarding/perfil | passo 2 de 3, interesses marcados e texto livre |  |
| 16-selecionar-curso-linguagem.png | /selecionar-curso | passo 3 de 3, janela da linguagem dos projetos | A pagina rola (1293px de 900px); fullPage em 16-selecionar-curso-linguagem-full.png. |
| 17-selecionar-curso.png | /selecionar-curso | catalogo de cursos (Web Security aparece por CoursePreview__Emails) | A pagina rola (1293px de 900px); fullPage em 17-selecionar-curso-full.png. |
| 18-selecionar-curso-ver-curso.png | /selecionar-curso | "Ver curso" aberto no Web Security | A pagina rola (1293px de 900px); fullPage em 18-selecionar-curso-ver-curso-full.png. |
| 19-inicio-tour-passo-1.png | /start | Inicio de aluno novo com o tour do guia "?" no passo 1 de 10 |  |
| 20-inicio-aluno-novo.png | /start | Inicio de aluno novo, sem progresso, tour fechado |  |
| 21-inicio-guia-aberto.png | /start | guia da tela "?" aberto | 1 area(s) com rolagem interna. |
| 22-trilha-mapa-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso sem progresso | 1 area(s) com rolagem interna. |
| 23-semana-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=91927d38-86b6-4f7a-9ff3-2dba176d0be7&project=1 | visao da semana 1 sem progresso |  |
| 24-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso, aluno novo | 1 area(s) com rolagem interna. |
| 25-hoje-etapa-1-leitura.png | /hoje | Dia 1, primeira etapa, primeira visita (balao "Primeira vez aqui?" visivel) | 1 area(s) com rolagem interna. |
| 26-hoje-anotacao-preenchida.png | /hoje | anotacao rapida preenchida (trilho direito) | 1 area(s) com rolagem interna. |
| 27-hoje-anotacao-salva.png | /hoje | anotacao salva | 1 area(s) com rolagem interna. |
| 28-hoje-suporte-rapido-pensando.png | /hoje | Suporte Rapido logo depois de enviar a duvida | 2 area(s) com rolagem interna. |
| 29-hoje-suporte-rapido-resposta.png | /hoje | Suporte Rapido com a resposta da IA | 2 area(s) com rolagem interna. |
| 30-hoje-leitura.png | /hoje | leitura (etapa 1 de 14) | 2 area(s) com rolagem interna. |
| 31-hoje-voz-pronta.png | /hoje | conversa por voz, antes de gravar |  |
| 32-hoje-voz-gravando.png | /hoje | conversa por voz gravando (microfone falso com fala sintetica) |  |
| 33-hoje-voz-processando.png | /hoje | logo depois de enviar, transcricao e nota em andamento |  |
| 34-hoje-voz-devolutiva.png | /hoje | devolutiva da conversa por voz (nota e comentario da Focada) |  |
| 35-hoje-quiz-abertura.png | /hoje | abertura do bloco "quiz" (etapa 7 de 14) |  |
| 36-hoje-quiz.png | /hoje | quiz, questao aberta (etapa 7 de 14) |  |
| 37-hoje-quiz-erro-focada.png | /hoje | quiz respondido, feedback da Focada (a opcao 1 e escolhida sempre) | 1 area(s) com rolagem interna. |
| 38-hoje-complete-a-lacuna-abertura.png | /hoje | abertura do bloco "complete a lacuna" (etapa 10 de 14) |  |
| 39-hoje-lacuna.png | /hoje | lacuna aberta |  |
| 40-hoje-lacuna-resposta.png | /hoje | lacuna respondida |  |
| 41-hoje-ligar-palavras-abertura.png | /hoje | abertura do bloco "ligar palavras" (etapa 12 de 14) |  |
| 42-hoje-ligar-palavras.png | /hoje | ligar palavras, nenhum par |  |
| 43-hoje-ligar-palavras-pares.png | /hoje | ligar palavras, pares feitos antes de confirmar |  |
| 44-hoje-ligar-palavras-resposta.png | /hoje | ligar palavras corrigido | 1 area(s) com rolagem interna. |
| 45-hoje-roleplay-abertura.png | /hoje | abertura do bloco "roleplay" (etapa 13 de 14) |  |
| 46-hoje-roleplay.png | /hoje | roleplay, decisao aberta |  |
| 47-hoje-roleplay-resposta.png | /hoje | roleplay, depois da escolha 1 |  |
| 48-hoje-fim-da-sessao.png | /hoje | tudo respondido, antes de concluir a sessao |  |
| 49-hoje-feedback-do-dia.png | /hoje | tela "Como foi o dia" antes da recompensa, nada marcado |  |
| 50-hoje-feedback-do-dia-preenchido.png | /hoje | nota 4 e comentario preenchidos |  |
| 51-hoje-sessao-concluida.png | /hoje | depois de enviar o feedback do dia |  |
| 52-perfil.png | /perfil | perfil do aluno novo, ainda sem agente |  |
| 53-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal |  |
| 54-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal |  |
| 55-squad-sem-squad.png | /squad | QG sem squad: criar squad ou entrar por codigo |  |
| 56-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso | 1 area(s) com rolagem interna. |
| 57-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso |  |
| 58-caderninho-com-nota.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho com a nota feita na sessao do Dia 1 |  |
| 59-configuracoes.png | /start | menu de Configuracoes aberto |  |
| 60-status-da-ia.png | /start | menu de status da IA aberto |  |
| 61-loja-criar-agente.png | /loja | loja de quem ainda nao criou o agente (tom de pele e cabelo) | 1 area(s) com rolagem interna. |
| 62-loja-criar-agente-escolhas.png | /loja | pele 2 e cabelo Black power escolhidos | 1 area(s) com rolagem interna. |
| 63-loja-vitrine.png | /loja | loja depois de criar o agente: vitrine e saldo |  |
| 101-inicio-com-progresso.png | /start | Inicio com 5 dias feitos, ofensiva de 5 dias, selos de reforco e Ponte do Dia 6 em destaque |  |
| 102-trilha-com-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso com 5 dias feitos (a trilha agora lista as 12 semanas do curso apos importar o curso inteiro no banco local) | 1 area(s) com rolagem interna. |
| 103-semana-com-dias-feitos.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1: 5 dias feitos, selos de reforco pendente, ponte em andamento, castelo bloqueado |  |
| 104-reforco-abertura.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | sessao de reforco de um dia anterior (abertura) |  |
| 105-reforco-etapa-1.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | primeira etapa do reforco | 1 area(s) com rolagem interna. |
| 106-reforco-leitura.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | leitura (etapa 1 de 6) | 1 area(s) com rolagem interna. |
| 107-hoje-voz-pronta.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | conversa por voz, antes de gravar |  |
| 108-hoje-voz-gravando.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | conversa por voz gravando (microfone falso com fala sintetica) |  |
| 109-hoje-voz-processando.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | logo depois de enviar, transcricao e nota em andamento |  |
| 110-hoje-voz-devolutiva.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | devolutiva da conversa por voz (nota e comentario da Focada) |  |
| 111-reforco-fim.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | reforco todo respondido, antes de concluir |  |
| 112-reforco-concluido.png | /hoje?daily=6e2390fe-c535-4c8c-9490-09e97a45ded7 | depois de concluir o reforco |  |
| 141-aquecimento-pergunta.png | /hoje | aquecimento no comeco do Dia 6 (pergunta de um dia anterior, sem nota) |  |
| 142-aquecimento-resposta.png | /hoje | aquecimento respondido |  |
| 143-ponte-leitura.png | /hoje | Dia 6 (ponte "code comigo"): leitura com o arquivo do dia para baixar | 1 area(s) com rolagem interna. |
| 144-ponte-abertura-passos.png | /hoje | abertura dos passos de codigo |  |
| 145-ponte-passo-1-preparando.png | /hoje | passo de codigo 1: editor e o laboratorio ainda preparando os arquivos |  |
| 146-ponte-passo-1-pronto.png | /hoje | passo de codigo 1: laboratorio pronto (terminal bash no navegador) |  |
| 147-ponte-passo-1-rodado.png | /hoje | codigo escrito e rodado no terminal do laboratorio |  |
| 148-ponte-passo-1-devolutiva.png | /hoje | passo enviado, devolutiva da Focada |  |
| 149-projeto-bloqueado.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto da Semana 1 antes de fechar a ponte: cadeado e aviso de repositorio nao provisionado (Forgejo local sem provisionamento) |  |
| 150-reforco-bloqueado.png | /hoje?daily=9e3ae551-6bbe-40a7-836f-76fe972326d2 | tentar abrir um reforco com a ponte do dia em andamento: aviso de sessao em andamento |  |
| 151-perfil.png | /perfil | perfil do aluno com progresso e agente |  |
| 152-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal | 1 area(s) com rolagem interna. |
| 153-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal |  |
| 154-squad-sem-squad.png | /squad | QG sem squad: criar squad ou entrar por codigo |  |
| 155-squad-criado.png | /squad | QG com squad criado (so o aluno, sem outros membros) | 1 area(s) com rolagem interna. |
| 156-loja-vitrine.png | /loja | vitrine da semana e agente, saldo baixo |  |
| 157-loja-provador.png | /loja | peca da vitrine no provador (frente) |  |
| 158-loja-provador-costas.png | /loja | provador de costas |  |
| 159-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso com o aluno veterano | 1 area(s) com rolagem interna. |
| 160-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso |  |
| 161-caderninho-vazio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho sem nenhuma nota |  |
| 162-configuracoes.png | /start | menu de Configuracoes aberto |  |
| 163-status-da-ia.png | /start | menu de status da IA aberto |  |
| 201-inicio-ponte-concluida.png | /start | Inicio com a ponte concluida (6 dias), aponta pro projeto |  |
| 202-semana-ponte-concluida.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1 com a ponte concluida, castelo/projeto liberado |  |
| 203-projeto-dialogo-focada.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: dialogo de abertura da Focada (1 de 4) | 1 area(s) com rolagem interna. |
| 204-projeto-briefing.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: briefing (objetivo, entregavel) | 1 area(s) com rolagem interna. |
| 205-projeto-criterios-e-repositorio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: fim da pagina, criterios e aviso de repositorio nao provisionado (Forgejo local) | 1 area(s) com rolagem interna. |

## notebook (1366x768) - 98 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-login-entrar.png | /login | aba Entrar, vazia |  |
| 02-login-entrar-erro.png | /login | credenciais invalidas |  |
| 03-login-criar-conta.png | /login | aba Criar conta, vazia | A pagina rola (842px de 768px); fullPage em 03-login-criar-conta-full.png. |
| 04-login-criar-conta-erro.png | /login | envio vazio, validacao | A pagina rola (883px de 768px); fullPage em 04-login-criar-conta-erro-full.png. |
| 05-login-criar-conta-erro-valores.png | /login | valores invalidos (nome curto, e-mail ruim, senha fraca, confirmacao diferente) | A pagina rola (883px de 768px); fullPage em 05-login-criar-conta-erro-valores-full.png. |
| 06-esqueci-senha.png | /esqueci-senha | formulario |  |
| 07-esqueci-senha-enviado.png | /esqueci-senha | depois de enviar |  |
| 08-confirmar-email-sem-sessao.png | /login | aberta sem sessao (a confirmacao so e exigida com Signup:* ligado) |  |
| 09-aceite-sem-sessao.png | /login | aberta sem sessao (o aceite so e exigido com Signup:* ligado) |  |
| 10-termos.png | /termos | Termos de Uso | A pagina rola (2561px de 768px); fullPage em 10-termos-full.png. |
| 11-privacidade.png | /privacidade | Politica de Privacidade | A pagina rola (2709px de 768px); fullPage em 11-privacidade-full.png. |
| 12-login-criar-conta-preenchida.png | /login | formulario preenchido, antes de enviar | A pagina rola (842px de 768px); fullPage em 12-login-criar-conta-preenchida-full.png. |
| 13-onboarding-1-boas-vindas.png | /onboarding | passo 1 de 3 |  |
| 14-onboarding-2-perfil.png | /onboarding/perfil | passo 2 de 3, nenhum interesse marcado |  |
| 15-onboarding-2-perfil-preenchido.png | /onboarding/perfil | passo 2 de 3, interesses marcados e texto livre |  |
| 16-selecionar-curso-linguagem.png | /selecionar-curso | passo 3 de 3, janela da linguagem dos projetos | A pagina rola (1293px de 768px); fullPage em 16-selecionar-curso-linguagem-full.png. |
| 17-selecionar-curso.png | /selecionar-curso | catalogo de cursos (Web Security aparece por CoursePreview__Emails) | A pagina rola (1293px de 768px); fullPage em 17-selecionar-curso-full.png. |
| 18-selecionar-curso-ver-curso.png | /selecionar-curso | "Ver curso" aberto no Web Security | A pagina rola (1293px de 768px); fullPage em 18-selecionar-curso-ver-curso-full.png. |
| 19-inicio-tour-passo-1.png | /start | Inicio de aluno novo com o tour do guia "?" no passo 1 de 10 |  |
| 20-inicio-aluno-novo.png | /start | Inicio de aluno novo, sem progresso, tour fechado |  |
| 21-inicio-guia-aberto.png | /start | guia da tela "?" aberto | 1 area(s) com rolagem interna. |
| 22-trilha-mapa-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso sem progresso | 1 area(s) com rolagem interna. |
| 23-semana-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=2bf688e3-bf87-41ba-92a8-7e58d741cdc0&project=1 | visao da semana 1 sem progresso |  |
| 24-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso, aluno novo | 1 area(s) com rolagem interna. |
| 25-hoje-etapa-1-leitura.png | /hoje | Dia 1, primeira etapa, primeira visita (balao "Primeira vez aqui?" visivel) | 1 area(s) com rolagem interna. |
| 26-hoje-gaveta-material.png | /hoje | gaveta Material aberta | 1 area(s) com rolagem interna. |
| 27-hoje-gaveta-notas.png | /hoje | gaveta Notas aberta (anotacao rapida) | 1 area(s) com rolagem interna. |
| 28-hoje-gaveta-duvida.png | /hoje | gaveta Duvida aberta (Suporte Rapido) | 2 area(s) com rolagem interna. |
| 29-hoje-leitura.png | /hoje | leitura (etapa 1 de 14) | 2 area(s) com rolagem interna. |
| 30-hoje-voz-pronta.png | /hoje | conversa por voz, antes de gravar |  |
| 31-hoje-voz-gravando.png | /hoje | conversa por voz gravando (microfone falso com fala sintetica) |  |
| 32-hoje-voz-processando.png | /hoje | logo depois de enviar, transcricao e nota em andamento |  |
| 33-hoje-voz-devolutiva.png | /hoje | devolutiva da conversa por voz (nota e comentario da Focada) |  |
| 34-hoje-quiz-abertura.png | /hoje | abertura do bloco "quiz" (etapa 7 de 14) |  |
| 35-hoje-quiz.png | /hoje | quiz, questao aberta (etapa 7 de 14) |  |
| 36-hoje-quiz-erro-focada.png | /hoje | quiz respondido, feedback da Focada (a opcao 1 e escolhida sempre) |  |
| 37-hoje-complete-a-lacuna-abertura.png | /hoje | abertura do bloco "complete a lacuna" (etapa 10 de 14) |  |
| 38-hoje-lacuna.png | /hoje | lacuna aberta |  |
| 39-hoje-lacuna-resposta.png | /hoje | lacuna respondida |  |
| 40-hoje-ligar-palavras-abertura.png | /hoje | abertura do bloco "ligar palavras" (etapa 12 de 14) |  |
| 41-hoje-ligar-palavras.png | /hoje | ligar palavras, nenhum par |  |
| 42-hoje-ligar-palavras-pares.png | /hoje | ligar palavras, pares feitos antes de confirmar |  |
| 43-hoje-ligar-palavras-resposta.png | /hoje | ligar palavras corrigido | 1 area(s) com rolagem interna. |
| 44-hoje-roleplay-abertura.png | /hoje | abertura do bloco "roleplay" (etapa 13 de 14) |  |
| 45-hoje-roleplay.png | /hoje | roleplay, decisao aberta |  |
| 46-hoje-roleplay-resposta.png | /hoje | roleplay, depois da escolha 1 |  |
| 47-hoje-fim-da-sessao.png | /hoje | tudo respondido, antes de concluir a sessao |  |
| 48-hoje-feedback-do-dia.png | /hoje | tela "Como foi o dia" antes da recompensa, nada marcado |  |
| 49-hoje-feedback-do-dia-preenchido.png | /hoje | nota 4 e comentario preenchidos |  |
| 50-hoje-sessao-concluida.png | /hoje | depois de enviar o feedback do dia |  |
| 51-perfil.png | /perfil | perfil do aluno novo, ainda sem agente |  |
| 52-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal | 1 area(s) com rolagem interna. |
| 53-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal |  |
| 54-squad-sem-squad.png | /squad | QG sem squad: criar squad ou entrar por codigo | 1 area(s) com rolagem interna. |
| 55-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso | 1 area(s) com rolagem interna. |
| 56-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso |  |
| 57-caderninho-com-nota.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho com a nota feita na sessao do Dia 1 |  |
| 58-configuracoes.png | /start | menu de Configuracoes aberto | 1 area(s) com rolagem interna. |
| 59-status-da-ia.png | /start | menu de status da IA aberto |  |
| 60-loja-criar-agente.png | /loja | loja de quem ainda nao criou o agente (tom de pele e cabelo) | 1 area(s) com rolagem interna. |
| 61-loja-criar-agente-escolhas.png | /loja | pele 2 e cabelo Black power escolhidos | 1 area(s) com rolagem interna. |
| 62-loja-vitrine.png | /loja | loja depois de criar o agente: vitrine e saldo |  |
| 101-inicio-com-progresso.png | /start | Inicio com 5 dias feitos, ofensiva de 5 dias, selos de reforco e Ponte do Dia 6 em destaque |  |
| 102-trilha-com-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso com 5 dias feitos (a trilha agora lista as 12 semanas do curso apos importar o curso inteiro no banco local) | 1 area(s) com rolagem interna. |
| 103-semana-com-dias-feitos.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1: 5 dias feitos, selos de reforco pendente, ponte em andamento, castelo bloqueado |  |
| 104-reforco-abertura.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | sessao de reforco de um dia anterior (abertura) |  |
| 105-reforco-etapa-1.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | primeira etapa do reforco | 1 area(s) com rolagem interna. |
| 106-reforco-leitura.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | leitura (etapa 1 de 6) | 1 area(s) com rolagem interna. |
| 107-hoje-voz-pronta.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | conversa por voz, antes de gravar |  |
| 108-hoje-voz-gravando.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | conversa por voz gravando (microfone falso com fala sintetica) |  |
| 109-hoje-voz-processando.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | logo depois de enviar, transcricao e nota em andamento |  |
| 110-hoje-voz-devolutiva.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | devolutiva da conversa por voz (nota e comentario da Focada) |  |
| 111-reforco-fim.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | reforco todo respondido, antes de concluir |  |
| 112-reforco-concluido.png | /hoje?daily=184e3766-eeaf-4af3-b6a9-72ed9df0aba3 | depois de concluir o reforco |  |
| 141-ponte-leitura.png | /hoje | Dia 6 (ponte "code comigo"): leitura com o arquivo do dia para baixar |  |
| 142-ponte-passo-1-preparando.png | /hoje | passo de codigo 1: editor e o laboratorio ainda preparando os arquivos |  |
| 143-ponte-passo-1-pronto.png | /hoje | passo de codigo 1: laboratorio pronto (terminal bash no navegador) |  |
| 144-ponte-passo-1-rodado.png | /hoje | codigo escrito e rodado no terminal do laboratorio |  |
| 145-ponte-passo-1-devolutiva.png | /hoje | passo enviado, devolutiva da Focada |  |
| 146-projeto-bloqueado.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto da Semana 1 antes de fechar a ponte: cadeado e aviso de repositorio nao provisionado (Forgejo local sem provisionamento) |  |
| 147-reforco-bloqueado.png | /hoje?daily=9e3ae551-6bbe-40a7-836f-76fe972326d2 | tentar abrir um reforco com a ponte do dia em andamento: aviso de sessao em andamento |  |
| 148-perfil.png | /perfil | perfil do aluno com progresso e agente |  |
| 149-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal | 1 area(s) com rolagem interna. |
| 150-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal |  |
| 151-squad-criado.png | /squad | QG com squad criado (so o aluno, sem outros membros) | 1 area(s) com rolagem interna. |
| 152-loja-vitrine.png | /loja | vitrine da semana e agente, saldo baixo |  |
| 153-loja-provador.png | /loja | peca da vitrine no provador (frente) |  |
| 154-loja-provador-costas.png | /loja | provador de costas |  |
| 155-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso com o aluno veterano | 1 area(s) com rolagem interna. |
| 156-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso |  |
| 157-caderninho-vazio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho sem nenhuma nota |  |
| 158-configuracoes.png | /start | menu de Configuracoes aberto | 1 area(s) com rolagem interna. |
| 159-status-da-ia.png | /start | menu de status da IA aberto |  |
| 201-inicio-ponte-concluida.png | /start | Inicio com a ponte concluida (6 dias), aponta pro projeto |  |
| 202-semana-ponte-concluida.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1 com a ponte concluida, castelo/projeto liberado |  |
| 203-projeto-dialogo-focada.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: dialogo de abertura da Focada (1 de 4) | 1 area(s) com rolagem interna. |
| 204-projeto-briefing.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: briefing (objetivo, entregavel) | 1 area(s) com rolagem interna. |
| 205-projeto-criterios-e-repositorio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: fim da pagina, criterios e aviso de repositorio nao provisionado (Forgejo local) | 1 area(s) com rolagem interna. |

## celular (390x844) - 99 prints

| Arquivo | Rota | Estado | Observacao |
|---|---|---|---|
| 01-login-entrar.png | /login | aba Entrar, vazia |  |
| 02-login-entrar-erro.png | /login | credenciais invalidas |  |
| 03-login-criar-conta.png | /login | aba Criar conta, vazia | A pagina rola (1030px de 844px); fullPage em 03-login-criar-conta-full.png. |
| 04-login-criar-conta-erro.png | /login | envio vazio, validacao | A pagina rola (1071px de 844px); fullPage em 04-login-criar-conta-erro-full.png. |
| 05-login-criar-conta-erro-valores.png | /login | valores invalidos (nome curto, e-mail ruim, senha fraca, confirmacao diferente) | A pagina rola (1071px de 844px); fullPage em 05-login-criar-conta-erro-valores-full.png. |
| 06-esqueci-senha.png | /esqueci-senha | formulario |  |
| 07-esqueci-senha-enviado.png | /esqueci-senha | depois de enviar |  |
| 08-confirmar-email-sem-sessao.png | /login | aberta sem sessao (a confirmacao so e exigida com Signup:* ligado) |  |
| 09-aceite-sem-sessao.png | /login | aberta sem sessao (o aceite so e exigido com Signup:* ligado) |  |
| 10-termos.png | /termos | Termos de Uso | A pagina rola (3791px de 844px); fullPage em 10-termos-full.png. |
| 11-privacidade.png | /privacidade | Politica de Privacidade | A pagina rola (4363px de 844px); fullPage em 11-privacidade-full.png. |
| 12-login-criar-conta-preenchida.png | /login | formulario preenchido, antes de enviar | A pagina rola (1030px de 844px); fullPage em 12-login-criar-conta-preenchida-full.png. |
| 13-onboarding-1-boas-vindas.png | /onboarding | passo 1 de 3 | A pagina rola (1353px de 844px); fullPage em 13-onboarding-1-boas-vindas-full.png. |
| 14-onboarding-2-perfil.png | /onboarding/perfil | passo 2 de 3, nenhum interesse marcado | A pagina rola (1108px de 844px); fullPage em 14-onboarding-2-perfil-full.png. |
| 15-onboarding-2-perfil-preenchido.png | /onboarding/perfil | passo 2 de 3, interesses marcados e texto livre | A pagina rola (1108px de 844px); fullPage em 15-onboarding-2-perfil-preenchido-full.png. |
| 16-selecionar-curso-linguagem.png | /selecionar-curso | passo 3 de 3, janela da linguagem dos projetos | A pagina rola (2618px de 844px); fullPage em 16-selecionar-curso-linguagem-full.png. |
| 17-selecionar-curso.png | /selecionar-curso | catalogo de cursos (Web Security aparece por CoursePreview__Emails) | A pagina rola (2618px de 844px); fullPage em 17-selecionar-curso-full.png. |
| 18-selecionar-curso-ver-curso.png | /selecionar-curso | "Ver curso" aberto no Web Security | A pagina rola (2618px de 844px); fullPage em 18-selecionar-curso-ver-curso-full.png. |
| 19-inicio-tour-passo-1.png | /start | Inicio de aluno novo com o tour do guia "?" no passo 1 de 10 | A pagina rola (1350px de 844px); fullPage em 19-inicio-tour-passo-1-full.png. |
| 20-inicio-aluno-novo.png | /start | Inicio de aluno novo, sem progresso, tour fechado | A pagina rola (1350px de 844px); fullPage em 20-inicio-aluno-novo-full.png. |
| 21-inicio-guia-aberto.png | /start | guia da tela "?" aberto | A pagina rola (1350px de 844px); fullPage em 21-inicio-guia-aberto-full.png. 1 area(s) com rolagem interna. |
| 22-trilha-mapa-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso sem progresso | A pagina rola (3250px de 844px); fullPage em 22-trilha-mapa-sem-progresso-full.png. |
| 23-semana-sem-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=cd31319f-570b-40a0-878f-1f59a01b860f&project=1 | visao da semana 1 sem progresso | A pagina rola (1438px de 844px); fullPage em 23-semana-sem-progresso-full.png. |
| 24-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso, aluno novo | A pagina rola (1717px de 844px); fullPage em 24-ranking-full.png. |
| 25-hoje-etapa-1-leitura.png | /hoje | Dia 1, primeira etapa, primeira visita (balao "Primeira vez aqui?" visivel) | A pagina rola (1711px de 844px); fullPage em 25-hoje-etapa-1-leitura-full.png. |
| 26-hoje-gaveta-material.png | /hoje | gaveta Material aberta | A pagina rola (1711px de 844px); fullPage em 26-hoje-gaveta-material-full.png. |
| 27-hoje-gaveta-notas.png | /hoje | gaveta Notas aberta (anotacao rapida) | A pagina rola (1711px de 844px); fullPage em 27-hoje-gaveta-notas-full.png. |
| 28-hoje-gaveta-duvida.png | /hoje | gaveta Duvida aberta (Suporte Rapido) | A pagina rola (1711px de 844px); fullPage em 28-hoje-gaveta-duvida-full.png. |
| 29-hoje-gaveta-pomodoro.png | /hoje | gaveta Pomodoro aberta | A pagina rola (1711px de 844px); fullPage em 29-hoje-gaveta-pomodoro-full.png. |
| 30-hoje-leitura.png | /hoje | leitura (etapa 1 de 14) | A pagina rola (1711px de 844px); fullPage em 30-hoje-leitura-full.png. |
| 31-hoje-voz-pronta.png | /hoje | conversa por voz, antes de gravar | A pagina rola (978px de 844px); fullPage em 31-hoje-voz-pronta-full.png. |
| 32-hoje-voz-gravando.png | /hoje | conversa por voz gravando (microfone falso com fala sintetica) | A pagina rola (1026px de 844px); fullPage em 32-hoje-voz-gravando-full.png. |
| 33-hoje-voz-processando.png | /hoje | logo depois de enviar, transcricao e nota em andamento |  |
| 34-hoje-voz-devolutiva.png | /hoje | devolutiva da conversa por voz (nota e comentario da Focada) | A pagina rola (1131px de 844px); fullPage em 34-hoje-voz-devolutiva-full.png. |
| 35-hoje-quiz-abertura.png | /hoje | abertura do bloco "quiz" (etapa 7 de 14) | A pagina rola (925px de 844px); fullPage em 35-hoje-quiz-abertura-full.png. |
| 36-hoje-quiz.png | /hoje | quiz, questao aberta (etapa 7 de 14) | A pagina rola (891px de 844px); fullPage em 36-hoje-quiz-full.png. |
| 37-hoje-quiz-erro-focada.png | /hoje | quiz respondido, feedback da Focada (a opcao 1 e escolhida sempre) | A pagina rola (996px de 844px); fullPage em 37-hoje-quiz-erro-focada-full.png. |
| 38-hoje-complete-a-lacuna-abertura.png | /hoje | abertura do bloco "complete a lacuna" (etapa 10 de 14) |  |
| 39-hoje-lacuna.png | /hoje | lacuna aberta |  |
| 40-hoje-lacuna-resposta.png | /hoje | lacuna respondida |  |
| 41-hoje-ligar-palavras-abertura.png | /hoje | abertura do bloco "ligar palavras" (etapa 12 de 14) | A pagina rola (864px de 844px); fullPage em 41-hoje-ligar-palavras-abertura-full.png. |
| 42-hoje-ligar-palavras.png | /hoje | ligar palavras, nenhum par | A pagina rola (1146px de 844px); fullPage em 42-hoje-ligar-palavras-full.png. |
| 43-hoje-ligar-palavras-pares.png | /hoje | ligar palavras, pares feitos antes de confirmar | A pagina rola (1158px de 844px); fullPage em 43-hoje-ligar-palavras-pares-full.png. |
| 44-hoje-ligar-palavras-resposta.png | /hoje | ligar palavras corrigido | A pagina rola (1440px de 844px); fullPage em 44-hoje-ligar-palavras-resposta-full.png. |
| 45-hoje-roleplay-abertura.png | /hoje | abertura do bloco "roleplay" (etapa 13 de 14) |  |
| 46-hoje-roleplay.png | /hoje | roleplay, decisao aberta | A pagina rola (892px de 844px); fullPage em 46-hoje-roleplay-full.png. |
| 47-hoje-roleplay-resposta.png | /hoje | roleplay, depois da escolha 1 | A pagina rola (881px de 844px); fullPage em 47-hoje-roleplay-resposta-full.png. |
| 48-hoje-fim-da-sessao.png | /hoje | tudo respondido, antes de concluir a sessao |  |
| 49-hoje-feedback-do-dia.png | /hoje | tela "Como foi o dia" antes da recompensa, nada marcado |  |
| 50-hoje-feedback-do-dia-preenchido.png | /hoje | nota 4 e comentario preenchidos |  |
| 51-hoje-sessao-concluida.png | /hoje | depois de enviar o feedback do dia |  |
| 52-perfil.png | /perfil | perfil do aluno novo, ainda sem agente | A pagina rola (2217px de 844px); fullPage em 52-perfil-full.png. |
| 53-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal | A pagina rola (2217px de 844px); fullPage em 53-perfil-guarda-roupa-full.png. 1 area(s) com rolagem interna. |
| 54-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal | A pagina rola (2217px de 844px); fullPage em 54-perfil-conquistas-full.png. |
| 55-squad-sem-squad.png | /squad | QG sem squad: criar squad ou entrar por codigo | A pagina rola (1719px de 844px); fullPage em 55-squad-sem-squad-full.png. |
| 56-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso | A pagina rola (1717px de 844px); fullPage em 56-ranking-full.png. |
| 57-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso | A pagina rola (936px de 844px); fullPage em 57-certificacoes-full.png. |
| 58-caderninho-com-nota.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho com a nota feita na sessao do Dia 1 |  |
| 59-menu-celular.png | /start | menu hamburguer aberto (celular) | A pagina rola (1668px de 844px); fullPage em 59-menu-celular-full.png. |
| 60-configuracoes.png | /start | menu de Configuracoes aberto | A pagina rola (1286px de 844px); fullPage em 60-configuracoes-full.png. |
| 61-status-da-ia.png | /start | menu de status da IA aberto | A pagina rola (1286px de 844px); fullPage em 61-status-da-ia-full.png. |
| 62-loja-criar-agente.png | /loja | loja de quem ainda nao criou o agente (tom de pele e cabelo) | A pagina rola (1602px de 844px); fullPage em 62-loja-criar-agente-full.png. |
| 63-loja-criar-agente-escolhas.png | /loja | pele 2 e cabelo Black power escolhidos | A pagina rola (1602px de 844px); fullPage em 63-loja-criar-agente-escolhas-full.png. |
| 64-loja-vitrine.png | /loja | loja depois de criar o agente: vitrine e saldo | A pagina rola (2855px de 844px); fullPage em 64-loja-vitrine-full.png. |
| 101-inicio-com-progresso.png | /start | Inicio com 5 dias feitos, ofensiva de 5 dias, selos de reforco e Ponte do Dia 6 em destaque | A pagina rola (1342px de 844px); fullPage em 101-inicio-com-progresso-full.png. |
| 102-trilha-com-progresso.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476 | trilha do curso com 5 dias feitos (a trilha agora lista as 12 semanas do curso apos importar o curso inteiro no banco local) | A pagina rola (3230px de 844px); fullPage em 102-trilha-com-progresso-full.png. |
| 103-semana-com-dias-feitos.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1: 5 dias feitos, selos de reforco pendente, ponte em andamento, castelo bloqueado | A pagina rola (1487px de 844px); fullPage em 103-semana-com-dias-feitos-full.png. |
| 104-reforco-abertura.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | sessao de reforco de um dia anterior (abertura) |  |
| 105-reforco-etapa-1.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | primeira etapa do reforco | A pagina rola (1364px de 844px); fullPage em 105-reforco-etapa-1-full.png. |
| 106-reforco-leitura.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | leitura (etapa 1 de 6) | A pagina rola (1364px de 844px); fullPage em 106-reforco-leitura-full.png. |
| 107-hoje-voz-pronta.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | conversa por voz, antes de gravar |  |
| 108-hoje-voz-gravando.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | conversa por voz gravando (microfone falso com fala sintetica) | A pagina rola (899px de 844px); fullPage em 108-hoje-voz-gravando-full.png. |
| 109-hoje-voz-processando.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | logo depois de enviar, transcricao e nota em andamento |  |
| 110-hoje-voz-devolutiva.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | devolutiva da conversa por voz (nota e comentario da Focada) | A pagina rola (1105px de 844px); fullPage em 110-hoje-voz-devolutiva-full.png. |
| 111-reforco-fim.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | reforco todo respondido, antes de concluir |  |
| 112-reforco-concluido.png | /hoje?daily=508ee170-4826-46d7-bd06-c2aa510e8165 | depois de concluir o reforco | A pagina rola (1200px de 844px); fullPage em 112-reforco-concluido-full.png. |
| 141-ponte-leitura.png | /hoje | Dia 6 (ponte "code comigo"): leitura com o arquivo do dia para baixar | A pagina rola (973px de 844px); fullPage em 141-ponte-leitura-full.png. |
| 142-ponte-passo-1-preparando.png | /hoje | passo de codigo 1: editor e o laboratorio ainda preparando os arquivos | A pagina rola (973px de 844px); fullPage em 142-ponte-passo-1-preparando-full.png. |
| 143-ponte-passo-1-pronto.png | /hoje | passo de codigo 1: laboratorio pronto (terminal bash no navegador) | A pagina rola (973px de 844px); fullPage em 143-ponte-passo-1-pronto-full.png. |
| 144-projeto-bloqueado.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto da Semana 1 antes de fechar a ponte: cadeado e aviso de repositorio nao provisionado (Forgejo local sem provisionamento) | A pagina rola (1438px de 844px); fullPage em 144-projeto-bloqueado-full.png. |
| 145-reforco-bloqueado.png | /hoje?daily=9e3ae551-6bbe-40a7-836f-76fe972326d2 | tentar abrir um reforco com a ponte do dia em andamento: aviso de sessao em andamento |  |
| 146-perfil.png | /perfil | perfil do aluno com progresso e agente | A pagina rola (2281px de 844px); fullPage em 146-perfil-full.png. |
| 147-perfil-guarda-roupa.png | /perfil?abrir=guarda-roupa | guarda-roupa aberto em modal | A pagina rola (2281px de 844px); fullPage em 147-perfil-guarda-roupa-full.png. 1 area(s) com rolagem interna. |
| 148-perfil-conquistas.png | /perfil?abrir=conquistas | lista de conquistas em modal | A pagina rola (2281px de 844px); fullPage em 148-perfil-conquistas-full.png. |
| 149-squad-criado.png | /squad | QG com squad criado (so o aluno, sem outros membros) | A pagina rola (2299px de 844px); fullPage em 149-squad-criado-full.png. |
| 150-loja-vitrine.png | /loja | vitrine da semana e agente, saldo baixo | A pagina rola (2855px de 844px); fullPage em 150-loja-vitrine-full.png. |
| 151-loja-provador.png | /loja | peca da vitrine no provador (frente) | A pagina rola (2879px de 844px); fullPage em 151-loja-provador-full.png. |
| 152-loja-provador-costas.png | /loja | provador de costas | A pagina rola (2879px de 844px); fullPage em 152-loja-provador-costas-full.png. |
| 153-ranking.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&ranking=1 | ranking do curso com o aluno veterano | A pagina rola (1717px de 844px); fullPage em 153-ranking-full.png. |
| 154-certificacoes.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&certifications=1 | Certificacoes do curso | A pagina rola (936px de 844px); fullPage em 154-certificacoes-full.png. |
| 155-caderninho-vazio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&caderninho=1 | Caderninho sem nenhuma nota |  |
| 156-menu-celular.png | /start | menu hamburguer aberto (celular) | A pagina rola (1724px de 844px); fullPage em 156-menu-celular-full.png. |
| 157-configuracoes.png | /start | menu de Configuracoes aberto | A pagina rola (1342px de 844px); fullPage em 157-configuracoes-full.png. |
| 158-status-da-ia.png | /start | menu de status da IA aberto | A pagina rola (1342px de 844px); fullPage em 158-status-da-ia-full.png. |
| 201-inicio-ponte-concluida.png | /start | Inicio com a ponte concluida (6 dias), aponta pro projeto | A pagina rola (1326px de 844px); fullPage em 201-inicio-ponte-concluida-full.png. |
| 202-semana-ponte-concluida.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f | visao da semana 1 com a ponte concluida, castelo/projeto liberado | A pagina rola (1498px de 844px); fullPage em 202-semana-ponte-concluida-full.png. |
| 203-projeto-dialogo-focada.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: dialogo de abertura da Focada (1 de 4) | A pagina rola (3026px de 844px); fullPage em 203-projeto-dialogo-focada-full.png. |
| 204-projeto-briefing.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: briefing (objetivo, entregavel) | A pagina rola (3467px de 844px); fullPage em 204-projeto-briefing-full.png. |
| 205-projeto-criterios-e-repositorio.png | /start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476&weekly=07f913f7-94e7-4c27-80c1-bb7062eeef0f&project=1 | Projeto Semanal: fim da pagina, criterios e aviso de repositorio nao provisionado (Forgejo local) | A pagina rola (3467px de 844px); fullPage em 205-projeto-criterios-e-repositorio-full.png. |


## Nao capturado (e por que)
- `/confirmar-email` e `/aceite` com conta: as chaves `Signup:*` vem desligadas no local; as telas foram fotografadas abertas sem sessao (08 e 09).
- Video, passo de codigo alem do passo 1, missao no terminal: o Dia 1 a 6 do Web Security nao tem video nem missao de terminal; a ponte so foi capturada no passo 1 (desktop) e no passo seguinte que o estado da conta unica estava (notebook, celular). No celular o script nao conseguiu digitar no editor da ponte (timeout), entao faltam "passo 1 rodado", "devolutiva" e "dica" nesse tamanho; no notebook idem para as telas depois do passo pronto.
- Projeto Semanal: repositorio e README abertos. O Forgejo local nao provisiona o repositorio ("Seu repositorio ainda nao foi provisionado"), entao so briefing e criterios. Tambem faltam entrega/avaliacao e o castelo concluido.
- Squad com outros membros, notificacoes, convite; Certificacoes com cobertura; Caderninho com notas no veterano (so o aluno novo tem nota).
- Dias 2 a 5 do aluno novo, a segunda sessao de reforco e o fim do modulo (publicacao LinkedIn).
- Curso Linux e Linux/terminal.

## O que foi feito no banco local
- Postgres/Forgejo locais religados (estavam parados). Contas `aluno.print.N@local.test` (N = 3 a 7, 21 a 23, 30 a 44) criadas pela interface; Web Security (Draft no banco local) liberado por `CoursePreview__Emails` so no processo da Api local.
- Api reiniciada com `Cors__AllowedOrigins`/`Frontend__BaseUrl` para a porta 5174 do Vite (a 5173 estava ocupada por outro projeto).
- Cota de 1 Daily por dia: `UPDATE` em `Dailies` (`CompletedAt` e `Date` menos 1 dia), `ActivityResponses.CreatedAt` e `UserStreaks.LastCompletedDate` do aluno veterano (aluno.print.22/23), 5 vezes, uma por dia feito.
- Sem querer, rodei `importar web-security` sem `--dry-run`: importou os 72 dias do Web Security no banco local (585 Dailies adicionadas aos alunos matriculados) e criou os projetos semanais; depois `importar web-security --projeto --confirmar` e `seed` (sem mudanca). Isso so afeta o banco local; a trilha dos prints 102 em diante lista as 12 semanas.
- Ponte (Dia 6) do aluno veterano marcada como concluida por `UPDATE` em `Dailies` (Status Completed) para abrir o Projeto Semanal (prints 201 a 205).

## Como rodar de novo
`cd tools/capturar-telas && npm i && npx playwright install chromium`; Api com `CoursePreview__Emails` listando as contas, `Cors__AllowedOrigins` e Vite na mesma porta; `node capturar.mjs <urlBase> <pastaSaida> --conta N` (aluno novo), `--so veterano --conta N` (prepara a conta com 5 dias), `--so progresso`, `--so projeto`; depois `node indice.mjs <pastaSaida> <textoExtra.md>`.
