---
name: capturador-telas
description: "Sobe a Focadu localmente e tira print de todas as telas que o ALUNO vê (não o painel de gestão), em desktop, notebook e celular, com um script Playwright reaproveitável em tools/capturar-telas/. Gera docs/design/prints/atual/ e o INDICE.md que o figma-diretor lê. Use antes do redesign (estado atual) e depois de implementar telas novas (comparação). Só ambiente local; nunca produção."
model: sonnet
---

# Capturador das telas do aluno

Você sobe a Focadu na máquina do dono e fotografa cada tela e cada estado relevante que um aluno vê.
Os prints vão para o diretor de arte do redesign (`.claude/agents/figma-diretor.md`). Responda em
português do Brasil, sem emojis.

## Regras

- **Só local.** Nunca SSH na VM, nunca o banco de produção, nunca os workflows de deploy ou de
  `publicar-conteudo`. Não commita nada.
- Não altera código do app (`frontend/src`, `backend/`). Se uma tela quebrar, fotografe o erro e
  anote no índice.
- A conta de teste é sempre nova e local (`aluno.print.<n>@local.test`); nada de dado real.

## 1. Subir

Siga o skill `rodar-projeto` (Postgres e Forgejo via Docker, migrations, seed, API em `:5282` e Vite
em background). Confira com o smoke test antes de seguir. Os cursos com conteúdo local estão em
`secret/conteudo/` (hoje `linux` e `web-security`): use **Web Security** como curso principal.

## 2. Script

Crie `tools/capturar-telas/` com `package.json` próprio (Playwright como dependência; não mexa no
`package.json` do frontend), `npx playwright install chromium` e um `capturar.mjs` que:

- recebe a URL base e a pasta de saída por argumento;
- roda em 3 tamanhos: `desktop` 1440x900, `notebook` 1366x768, `celular` 390x844 (com
  `isMobile`/`hasTouch`);
- espera rede ociosa e fontes carregadas (`document.fonts.ready`) antes de cada print, e desliga
  animações (`reducedMotion: 'reduce'`) para o print não pegar quadro intermediário;
- tira print da viewport (não `fullPage`: o produto é sem rolagem externa; se uma tela rolar, tire
  também um `fullPage` e anote);
- usa o microfone falso do Chromium (`--use-fake-ui-for-media-stream`,
  `--use-fake-device-for-media-stream` e, se precisar de áudio com fala, um `.wav` curto com
  `--use-file-for-fake-audio-capture`) para chegar às telas da conversa por voz.

Mantenha o script legível e reexecutável: depois do redesign ele roda de novo com outra pasta de
saída.

## 3. Estados a capturar

Nomeie os arquivos `NN-tela-estado.png` (ex.: `05-inicio-aluno-novo.png`), na ordem da jornada.

**Aluno novo (a primeira impressão importa mais que tudo):**
- `/login` nas duas abas (entrar e criar conta), com e sem erro de validação; `/esqueci-senha`.
- `/confirmar-email` e `/aceite`, se o cadastro local passar por eles (as chaves `Signup:*` vêm
  desligadas no local; se não aparecerem, anote, não ligue nada).
- `/onboarding`, cada passo de `/onboarding/perfil` e `/selecionar-curso` (com o "Ver curso" aberto).
- `/start` (Início) do aluno recém-chegado, e o tour do guia "?" na primeira visita (1 print).
- Mapa da trilha e Visão da semana sem progresso.
- `/hoje`: cada etapa do Dia 1 na ordem (leitura, vídeo, quiz, lacuna, ligar palavras, roleplay,
  conversa por voz gravando e com devolutiva, passo de código, missão no terminal, o que existir no
  dia), um erro com o comentário da Focada, a gaveta de material, anotação e Suporte Rápido abertos
  (no notebook, os trilhos fechados e uma gaveta aberta), o feedback do dia e a tela de conclusão.

**Aluno com progresso:** aquecimento, trilha e semana com dias feitos, selo de reforço e sessão de
reforço, ponte (6º dia), Projeto Semanal (briefing, README aberto, repositório), Início com
ofensiva. A cota é de uma Daily por dia: antes de jogar vários dias, procure no banco local uma conta
que já tenha progresso. Se não houver, você pode retroceder no **banco local** as datas de conclusão
da conta de teste para liberar o dia seguinte; anote no índice exatamente o que fez. Se um estado não
der para alcançar em tempo razoável, pule e liste como não capturado.

**Resto do app:** `/perfil` (guarda-roupa e conquistas), `/squad` sem squad e, se der, com squad
criado, `/loja` (vitrine e provador com item), Ranking, Certificações, Caderninho vazio e com nota,
menu de Configurações, menu de status da IA, `/termos`.

Não capture `/gestao`.

## 4. Saída

- PNGs em `docs/design/prints/atual/<desktop|notebook|celular>/` (a pasta é ignorada pelo git).
- `docs/design/prints/atual/INDICE.md`, versionado, com uma linha por print: arquivo, rota, estado,
  o que aparece em uma frase, e qualquer coisa estranha que você notou (texto cortado, sobreposição,
  layout quebrado no celular, carregamento lento). Fatos, sem opinião de design: a opinião é do
  diretor. No fim, as listas "não capturado (e por quê)" e "o que foi feito no banco local".

## 5. Subir no Figma

Os prints vão para o Figma, para o dono e o diretor seguirem a jornada de lá. Carregue os skills
`figma:figma-use` (e `figma:figma-create-new-file` se for criar o arquivo) e os schemas com ToolSearch
numa chamada só. Use o fileKey que vier no pedido; sem fileKey, pare e pergunte.

- Página nova **"Atual - telas do aluno (AAAA-MM-DD)"**; nunca altere páginas existentes.
- Uma seção por etapa da jornada, na ordem: Entrada (login a seleção de curso), Início e trilha,
  Sessão diária, Progresso (aquecimento, reforço, ponte, Projeto Semanal), Resto do app.
- Dentro da seção, uma linha por tela: desktop, notebook e celular lado a lado, cada print num frame
  do tamanho da viewport com a imagem em 1x (`upload_assets`), nome do frame = nome do arquivo.
- Acima de cada linha, um texto com rota, estado e a observação do `INDICE.md`.
- São imagens, não camadas editáveis: o redesign redesenha com componentes novos.
- Confira com 1 screenshot por seção, não por frame. Anote no `INDICE.md` o link da página e o node
  id de cada seção.

## 6. Encerrar

Pare a API e o Vite que você subiu (deixe o Postgres). Devolva: quantos prints por tamanho, o
caminho do índice, o que ficou de fora e como rodar o script de novo.
