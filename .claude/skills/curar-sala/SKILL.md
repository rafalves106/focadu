---
name: curar-sala
description: "Cria uma sala prática (Fase 110, estilo TryHackMe, 30% do tempo lendo / 70% fazendo, nada cobrado sem ter sido ensinado) de um curso da Focadu: ficha da sala com os ganchos de entrevista (S1, o dono aprova), sala.json (S2), ambiente Kali + alvo (S3), validação pelo importador e teste de verdade no Docker (S4), revisão em contexto limpo (S5) e ajustes. Grava em secret/conteudo/<curso>/salas/<slug>/. Use quando o usuário pedir para criar, montar ou curar uma sala, escrever a ficha de uma sala, ou invocar /curar-sala. Para várias salas sem parar, o orquestrador é secret/processo/scripts/curar-salas-auto.sh (uma sessão limpa por etapa). NÃO cura dia nem projeto (curar-conteudo) e NÃO publica em produção."
argument-hint: "<curso> <slug> [ficha|construir|revisar|ajustar]"
model: sonnet
effort: medium
---

# Curar uma sala prática

Uma sala por sessão. Responda em português do Brasil, direto. Regras da sala: `secret/processo/molde/sala.md`
(leia sempre, é curto). Referência pronta: `secret/conteudo/web-security/salas/lojaserv/` (sala.json + ambiente/).

Caminhos (curso = `web-security`, `linux`, `python-websec`):

| o quê | onde |
|---|---|
| plano e estado das salas | `secret/processo/cursos/<curso>/salas/estado.md` |
| ficha | `secret/processo/cursos/<curso>/salas/<slug>/ficha.md` |
| teste de verdade | `secret/processo/cursos/<curso>/salas/<slug>/teste.sh` (+ `teste.log`) |
| revisão | `secret/processo/cursos/<curso>/salas/<slug>/revisao.md` |
| plano de trilha (ferramenta grande) | `secret/processo/cursos/<curso>/salas/trilha-<ferramenta>.md` |
| conferência do contrato de conteúdo | `secret/processo/scripts/conferir-cobertura-sala.py` |
| sala (vai pro importador) | `secret/conteudo/<curso>/salas/<slug>/sala.json` e `ambiente/` |

Estados no `estado.md`: `a fazer` → `ficha escrita` → `ficha ok` → `validada` → `revisada` → `no ar` → `pronto` (o dono fez a sala no app e aprovou). Atualize
logo depois de cada etapa: um corte nunca pode apagar progresso.

## Modo sessão (molde D, `molde/molde-d.md`)

Sala da sessão N de um curso no molde D (hoje `wstg`): slug `sessao-N`, `tipo: "semana"`, `ordem` = N, **3 a 5
tarefas, 25 a 35 minutos**, linter com `--sessao`. A ficha da sala é escrita junto com a ficha do dia e a matriz de
cobertura usa `ensinado em: dia N, bloco tK` além da teoria. O alvo é o **alvo único do curso**
(`secret/processo/cursos/<curso>/alvo/`): copie-o para `ambiente/alvo/` e acrescente nele (não numa cópia) o que a sessão
pede, para as salas seguintes herdarem. Kali e `iniciar.sh` da LojaServ, como sempre.

## S0. Plano da trilha (só sala de ferramenta grande, portão do dono)

Antes de qualquer ficha de uma ferramenta como nmap ou Burp, liste **todos** os ganchos de entrevista do básico
ao avançado (o que se pergunta numa entrevista de estágio e o que se usa num pentest de verdade) e divida em
salas de 5 a 8 tarefas, uma ideia por tarefa:

```
# Trilha <ferramenta> — <curso>
| sala (slug) | tema | ganchos (números) | nível | pré-requisito | alvo (o que precisa existir) |
## Ganchos (numerados, com a resposta curta)
## Fora da trilha (e por quê)
```

Grave em `trilha-<ferramenta>.md`, ponha uma linha por sala no `estado.md` (estado `a fazer`) e **pare**: o
dono aprova com `Aprovada pelo dono em <data>`. Cada sala da trilha depois passa pelo S1 normal.

## S1. Ficha da sala (portão do dono)

Leia a linha da sala no `estado.md`, o `molde/sala.md` e, se for sala de semana, a ficha da semana
(`secret/processo/cursos/<curso>/fichas/semana-N.ficha.md`). Escreva a ficha, **no máximo 1 página**:

```
# Ficha da sala — <curso>: <Título>
slug: <slug>   tipo: semana|ferramenta|desafio   semana: N (só tipo semana)   ordem: N   pré-requisitos: [slugs]
dificuldade: Fácil|Média|Difícil   minutos: N   máquina: "Kali + <alvo>"
nível: <da primeira tarefa> → <da última>   (régua de níveis do molde/sala.md, pelo ponto do curso em que a sala abre)

## Ganchos de entrevista
Perguntas que o aluno precisa responder de boca no fim (cada uma vira tarefa ou áudio de tarefa).

## Cenário
2 ou 3 frases.

## Alvo
O que roda no alvo (serviços, portas, rotas, versões, arquivos) e por que cada coisa existe.

## Tarefas
| chave | nível | o que o aluno faz | comando esperado | flag (de onde sai) | gancho coberto |

## Matriz de cobertura (contrato de conteúdo do molde)
Todo fato que um áudio ou o fechamento vai cobrar, e onde o aluno o recebe antes de gravar.
| fato cobrado | cobrado em (áudio:<chave> / fechamento) | ensinado em (teoria:<chave> / saída:<chave> / sala:<slug>) |

## Confusões comuns
O que costuma ser confundido nesse tema e em que teoria a sala desfaz (ou "nenhuma").

## Áudios
| chave | pergunta (uma só, até 220 caracteres) | o que o gabarito diz (1 a 3 frases) |

## Fechamento
Uma situação de trabalho e uma decisão que junta 2 ou 3 ideias da sala (nunca "resuma a sala"), e o que o
gabarito diz em até 5 frases. Teste: dá para responder em 1 minuto, de boca, sem anotação?

## Riscos
O que pode não funcionar no Docker (permissão, arquitetura arm64/amd64, resposta instável) e o plano B.
```

A matriz é a parte que mais importa: se um fato não tem linha "ensinado em", ele sai do gabarito ou entra
numa teoria. Marque `ficha escrita` no `estado.md` e **pare**: o dono aprova acrescentando a linha
`Aprovada pelo dono em <data>` na ficha. O orquestrador nunca escreve nem aprova ficha.

## S2 a S4. Construir (exige ficha com "Aprovada pelo dono")

1. **Ambiente (S3 antes do texto, porque a flag vem do alvo).** Copie `kali/` e `iniciar.sh` da LojaServ sem
   mudar; escreva `compose.yml` (`name: focadu-sala-<slug>`) e o(s) alvo(s) conforme a ficha e o molde.
2. **Teste de verdade.** Escreva `teste.sh` (modelo no `molde/sala.md`: sobe, roda de dentro do Kali o comando de
   cada tarefa, confere a flag, derruba com `trap`). Rode: `bash teste.sh 2>&1 | tee teste.log`. A primeira
   subida do Kali baixa ~1,5 GB e leva minutos; rode em primeiro plano com timeout longo. Uma saída que muda
   entre execuções (tempo, ordem) não serve de flag: mude o alvo ou a pergunta. Até `TESTE OK`.
3. **sala.json (S2).** Escreva a partir da ficha: teoria (60 a 200 palavras, leitura fácil do dia, cobrindo cada
   linha da matriz que diz `teoria:<esta chave>` e a confusão comum da tarefa, sem a flag escrita), pergunta,
   `formatoResposta`, flag **copiada da saída real do teste**, 3 dicas, áudio (**uma pergunta**, gabarito de 1 a 3
   frases) e fechamento (**uma situação e uma decisão**, ~1 minuto). Regras do molde, seção Tarefa.
4. **Linter (S3, igual ao D3 do dia).** Rode
   `node secret/processo/scripts/linter-dia/src/sala-cli.js secret/conteudo/<curso>/salas/<slug>/sala.json --log secret/processo/cursos/<curso>/salas/<slug>/teste.log`
   (leitura fácil com os limites do dia, uma pergunta por áudio, tamanho dos gabaritos, flag fora da teoria e
   contrato de conteúdo). Até `PASSOU`, no máximo 2 voltas; na 3ª, pare e relate.
5. **Revisão de escrita (S3b, igual ao D4).** Agente `editor-pedagogico` em cada teoria e no cenário, passando a
   ficha e a lista do linter. Aplique e rode o linter de novo até `PASSOU`.
6. **Importador (S4).** Rode
   `dotnet test backend/tests/Focadu.Tests/Focadu.Tests.csproj --filter "FullyQualifiedName~RoomContentAllFilesTests"`
   até passar. Rode o `teste.sh` de novo se mexeu no alvo ou numa flag.
7. Marque `validada` no `estado.md` com a data e a duração do teste.

Decisão que muda escopo (tarefa nova, gancho cortado, outro alvo): **não decida**. Pare com o motivo; a ficha é
do dono.

## S5. Revisão editorial (igual ao D7 do dia: agente `revisor-editorial`, sempre em contexto limpo)

Chame o agente `revisor-editorial` (nunca um agente genérico, nunca quem escreveu) no **modo sala**, passando:
`sala.json`, a ficha da sala, o plano da trilha (se houver), `molde/sala.md`, a linha editorial, a ficha do curso
e o glossário, o `teste.log`, os arquivos do alvo e a saída do `sala-cli.js` (precisa estar `PASSOU`). Ele grava
`revisao.md` com `aprovado` ou `ajustes`. `aprovado` → `revisada` no `estado.md`.

## S5b. Leitura por persona (igual ao D7b, só sala-âncora)

**Sala-âncora** = a primeira sala de cada trilha e a primeira sala de semana de cada módulo. Um agente em contexto
limpo faz a sala como o aluno faz, na ordem da tela (cenário, teoria, pergunta, dicas, áudio, fechamento), no
papel das personas de referência do dia (quem nunca abriu um terminal; quem tem dificuldade de leitura e
ansiedade), e grava `avaliacao-persona-<persona>.md` na pasta da sala: onde trava, o que não sabe responder no
áudio e no fechamento, sugestão, prioridade. Para cada áudio e o fechamento, a persona **responde de boca, por
escrito, só com o que a sala mostrou**; se não consegue, é prioridade alta. Ponto alto volta ao S2 (ou à ficha)
antes de publicar.

## Ajuste

Aplique a lista do `revisao.md` literalmente, rode S4 de novo (e o `teste.sh` se mexeu no alvo ou numa flag) e
volte o estado para `validada`. No máximo 2 voltas de ajuste por sala; na terceira reprovação, pare e relate.

## Armadilhas já vistas (teste do dono no app)

Cada uma passou pelo linter e pela revisão e só apareceu quando o dono fez a sala. Confira no S2 e no S5.

- **Gabarito com mais do que a pergunta pede** tira nota de resposta certa (nmap-1 `todas`: cobrava `-p-` numa
  pergunta de "por quê"; LojaServ: "esconder a versão", "Location", CORS). Correção de confusão e comando extra
  ficam na teoria. O revisor pergunta, frase a frase: "a pergunta pede isto?".
- **Pergunta e gabarito com palavras diferentes**: "que formato?" com gabarito cobrando "`-oG`" (nmap-1
  `relatorio`, nota 70 com resposta certa). Se o gabarito quer a opção, a pergunta diz "que opção".
- **Duas lições que se cruzam na tela**: a 3306 sai `filtered mysql`; o dono leu "mysql" como fato e concluiu que
  sabia o banco (fechamento, nota 60). Quando a saída junta dois conceitos da sala, a teoria diz numa frase como
  ler os dois juntos.
- **`minutos` de chute**: nmap-1 estimava 50 e levou 16. O tempo vem da leitura por persona ou do teste do dono.
- **Comando que "não funciona" para quem nunca usou**: na nmap-1 o dono achou que o `grep` não funcionou. O `grep`
  devolve a linha inteira (no `.gnmap` o host todo é uma linha, então parece que nada foi filtrado) e diferencia
  maiúscula de minúscula (`ports` ≠ `Ports`). Todo comando novo da sala ganha, na teoria, o que ele mostra e a
  pegadinha mais comum. A leitura por persona roda os comandos com variações de quem erra (minúscula, sem extensão).
- **Da plataforma, não do conteúdo** (registrar e avisar, não contornar na sala): a correção da transcrição já
  mudou o sentido da fala ("não está segura" → "não prova que está segura"; "LojaServ" → "lab"), e o avaliador
  desconta fato certo a mais (TTL na nmap-1 `motivo`).

Relatórios completos: `secret/processo/cursos/<curso>/salas/<slug>/teste-dono.md`.

## Publicação e aprovação do dono (igual ao D8 e ao dia-âncora)

As salas entram no banco só pelo comando `importar-salas <curso> [--sala <slug>]` da Api, na VM (dry-run antes;
`--confirmar` nunca sem o dono), com o `secret/` empurrado. Depois de publicada a sala fica `no ar`; ela só vira
`pronto` quando o dono faz a sala no app e aprova. **Sala-âncora reprovada pelo dono:** o ajuste volta para a
ficha (ou para o molde, se o problema for de regra), e nenhuma outra sala da trilha avança antes. Sem commit
nem push nesta skill.
