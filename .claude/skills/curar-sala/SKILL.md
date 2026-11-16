---
name: curar-sala
description: "Cria uma sala prática (Fase 110, estilo TryHackMe, 30% teoria / 70% prática) de um curso da Focadu: ficha da sala com os ganchos de entrevista (S1, o dono aprova), sala.json (S2), ambiente Kali + alvo (S3), validação pelo importador e teste de verdade no Docker (S4), revisão em contexto limpo (S5) e ajustes. Grava em secret/conteudo/<curso>/salas/<slug>/. Use quando o usuário pedir para criar, montar ou curar uma sala, escrever a ficha de uma sala, ou invocar /curar-sala. Para várias salas sem parar, o orquestrador é secret/processo/scripts/curar-salas-auto.sh (uma sessão limpa por etapa). NÃO cura dia nem projeto (curar-conteudo) e NÃO publica em produção."
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
| sala (vai pro importador) | `secret/conteudo/<curso>/salas/<slug>/sala.json` e `ambiente/` |

Estados no `estado.md`: `a fazer` → `ficha escrita` → `ficha ok` → `validada` → `revisada` → `no ar`. Atualize
logo depois de cada etapa: um corte nunca pode apagar progresso.

## S1. Ficha da sala (portão do dono)

Leia a linha da sala no `estado.md`, o `molde/sala.md` e, se for sala de semana, a ficha da semana
(`secret/processo/cursos/<curso>/fichas/semana-N.ficha.md`). Escreva a ficha, **no máximo 1 página**:

```
# Ficha da sala — <curso>: <Título>
slug: <slug>   tipo: semana|ferramenta|desafio   semana: N (só tipo semana)   ordem: N   pré-requisitos: [slugs]
dificuldade: Fácil|Média|Difícil   minutos: N   máquina: "Kali + <alvo>"

## Ganchos de entrevista
Perguntas que o aluno precisa responder de boca no fim (cada uma vira tarefa ou áudio de tarefa).

## Cenário
2 ou 3 frases.

## Alvo
O que roda no alvo (serviços, portas, rotas, versões, arquivos) e por que cada coisa existe.

## Tarefas
| chave | o que o aluno faz | comando esperado | flag (de onde sai) | gancho coberto |

## Fechamento
A pergunta e os pontos que o gabarito precisa cobrir.

## Riscos
O que pode não funcionar no Docker (permissão, arquitetura arm64/amd64, resposta instável) e o plano B.
```

Marque `ficha escrita` no `estado.md` e **pare**: o dono aprova acrescentando a linha
`Aprovada pelo dono em <data>` na ficha. O orquestrador nunca escreve nem aprova ficha.

## S2 a S4. Construir (exige ficha com "Aprovada pelo dono")

1. **Ambiente (S3 antes do texto, porque a flag vem do alvo).** Copie `kali/` e `iniciar.sh` da LojaServ sem
   mudar; escreva `compose.yml` (`name: focadu-sala-<slug>`) e o(s) alvo(s) conforme a ficha e o molde.
2. **Teste de verdade.** Escreva `teste.sh` (modelo no `molde/sala.md`: sobe, roda de dentro do Kali o comando de
   cada tarefa, confere a flag, derruba com `trap`). Rode: `bash teste.sh 2>&1 | tee teste.log`. A primeira
   subida do Kali baixa ~1,5 GB e leva minutos; rode em primeiro plano com timeout longo. Uma saída que muda
   entre execuções (tempo, ordem) não serve de flag: mude o alvo ou a pergunta. Até `TESTE OK`.
3. **sala.json (S2).** Escreva a partir da ficha: teoria curta, pergunta, `formatoResposta`, flag **copiada da
   saída real do teste**, 3 dicas, áudio e fechamento. Siga as regras de escrita do molde.
4. **Validação (S4).** Rode
   `dotnet test backend/tests/Focadu.Tests/Focadu.Tests.csproj --filter "FullyQualifiedName~RoomContentAllFilesTests"`
   (passa o `sala.json` e o `ambiente/` pelo importador real, sem banco). Corrija até passar. Rode o `teste.sh`
   de novo se mexeu no alvo.
5. Marque `validada` no `estado.md` com a data e a duração do teste.

Decisão que muda escopo (tarefa nova, gancho cortado, outro alvo): **não decida**. Pare com o motivo; a ficha é
do dono.

## S5. Revisão (sempre em contexto limpo: outra sessão ou subagente, nunca quem escreveu)

Leia `molde/sala.md`, a ficha, o `sala.json`, o `compose.yml`, os arquivos do alvo e o `teste.log`. Confira:

- Cada gancho de entrevista da ficha está numa tarefa ou num áudio, e o gabarito responde certo.
- Cada flag sai do alvo (confira no `teste.log`), não da teoria. Formato sem ambiguidade.
- Proporção: teoria de 2 a 4 frases por tarefa; nada que entregue a flag na teoria ou na dica 1.
- Correção técnica de cada afirmação (opção da ferramenta, comportamento padrão, números).
- Dicas em 3 níveis de verdade; áudio pede "o que rodou, o que viu, por quê".
- Alvo sem comentário que entregue resposta; rede `internal`, `mem_limit`, nenhuma porta do alvo no host.
- Leitura fácil (`molde/regras-de-leitura.md`).

Grave `revisao.md` com `aprovado` na primeira linha, ou `ajustes` seguido da lista numerada (campo, problema,
correção sugerida). Não reescreva nada. `aprovado` → marque `revisada` no `estado.md`.

## Ajuste

Aplique a lista do `revisao.md` literalmente, rode S4 de novo (e o `teste.sh` se mexeu no alvo ou numa flag) e
volte o estado para `validada`. No máximo 2 voltas de ajuste por sala; na terceira reprovação, pare e relate.

## Publicação (fora desta skill)

As salas entram no banco só pelo comando `importar-salas <curso> [--sala <slug>]` da Api (dry-run antes,
`--confirmar` nunca sem o dono). O workflow `publicar-conteudo` ainda não roda esse comando: publicar em
produção é passo do dono por enquanto. Sem commit nem push nesta skill.
