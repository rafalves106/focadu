---
name: curar-semana
description: "Orquestra a curadoria de uma semana inteira de um curso da Focadu, de ponta a ponta: resolve as pendências (escreve as fichas dos dias que faltam e constrói o lab da semana quando a ficha da semana pede), depois para cada dia chama o agente curador (D2 a D6), o revisor-editorial (D7) e as voltas de ajuste, sem /clear entre dias. Respeita o portão do dia-âncora (para no D7 do dia 1 da semana e espera o dono). Use quando o usuário invocar /curar-semana <curso> <semana> [dia N aprovado] [conferir-fichas] ou pedir para curar a semana toda de uma vez. NÃO escreve a ficha da semana, NÃO publica em produção (D9), NÃO faz commit nem push."
argument-hint: "<curso> <semana> [dia N aprovado] [conferir-fichas]"
model: sonnet
effort: low
---

# Curar a semana

Orquestrador. Roda na **sessão principal** (subagente não chama subagente) e só coordena: cada dia vai para o agente `curador`, a revisão para o `revisor-editorial`. Você nunca escreve o `dia-N.json` nem lê o texto do dia; recebe só o resumo curto de cada agente. Responda em português do Brasil, direto.

Regras do pipeline: `.claude/skills/curar-conteudo/SKILL.md` e `secret/produto/PLANO-CURADORIA.md`. Se divergir, o plano vence.

Slugs: `web-security`, `linux`, `python-websec`, `design-patterns`, `arquitetura-de-software`. Sem curso ou semana nos argumentos, pergunte.

## 1. Mapear a semana (só `grep` e `ls`)

1. Os dias da semana S são os 6 de `roteiro.md`/`estado.md` (dia 6 = ponte). Leia só as linhas desses dias na tabela de `secret/processo/cursos/<curso>/estado.md`.
2. Classifique cada dia: `a fazer` (sem ficha), `ficha ok`, `validado`, `revisado`, `pronto`/`no ar`.
3. **Dias sem `ficha ok` e ainda `a fazer`:** resolva na seção 1b antes do laço (não pule).
4. Dia já `revisado`, `pronto` ou `no ar`: pule (diga que pulou).
5. Mostre em 3 linhas o plano: dias que vai curar, dias pulados e por quê.

## 1b. Resolver pendências (antes de curar qualquer dia)

Exija `fichas/semana-N.ficha.md` aprovada ("Aprovada pelo dono"); sem ela, pare e mande rodar `/ficha-do-dia <curso> semana N` (a ficha da semana é decisão do dono e nunca é automática).

**Lab / pré-requisito da semana.** Leia a ficha da semana e a linha da semana no `estado.md` por "antes", "lab", "construir". Se há um site de laboratório ou outro apoio a construir e ele ainda não existe (`ls`), construa-o **num subagente** `general-purpose` (model `sonnet`), passando só caminhos e a decisão da ficha da semana: "construa `<caminho>` conforme a decisão N da ficha; stdlib; mantenha as rotas do lab anterior; **teste de verdade** em `debian:stable-slim` ou `python:3.12-slim` com `curl` e devolva a lista de rotas e o resultado do teste". Tudo no lado do dono (publicar, Forgejo, produção) fica fora. Sem teste verde, **pare a semana** e relate. Modelo de referência: `secret/processo/cursos/web-security/lab-semana-2/` (`servidor.py` + `teste.sh`).

**Fichas.** Para cada dia sem ficha, em ordem (a ficha do dia N lê a do N-1, nunca em paralelo), escreva a ficha como descrito em `.claude/skills/fichas-semana/SKILL.md` (seção 2): subagente `general-purpose`, prompt curto com caminhos, seguindo a seção "Ficha do dia" de `ficha-do-dia`. O dia 6 da semana é a ponte (usa a ficha da semana). Termo fora do glossário: pare a semana nesse dia e relate.

**Aprovação das fichas.**
- Padrão: a ficha da semana já foi aprovada, então marque as fichas novas como `ficha ok (automática)` no `estado.md` e siga curando. O relatório final lista as fichas escritas para o dono conferir depois (se reprovar, o dia volta a `a fazer` e a ficha é reescrita).
- Com `conferir-fichas` nos argumentos: mostre o quadro (dia, título, alvos, termos novos), **pare** e peça "aprovo todas ou ajuste o dia X". Só marca `ficha ok` depois.
- Dia com ficha já escrita e `a fazer` (o dono escreveu por fora): use-a como está e marque `ficha ok (automática)` pela mesma regra.

## 2. Portão do dia-âncora

O dia 1 da semana (ou do curso) é o âncora. Ele só avança até o D7 e para.

- Âncora ainda não `revisado`: cure **só ele** (seção 3), pare e peça a aprovação do dono (e a leitura por persona D7b, se o plano a exigir para o curso; nesse caso diga que é preciso rodar a etapa pela `curar-conteudo`). **Não toque nos outros dias.**
- Âncora `revisado` e os argumentos dizem que o dono aprovou (ex.: `dia 7 aprovado`): marque o âncora `pronto` no `estado.md` e cure os demais dias. Sem essa frase nos argumentos, pergunte se ele aprovou e pare.
- Âncora `validado` ou `ficha ok` (curado por fora, sem D7): rode só o D7 e os ajustes dele (passo 2 da seção 3), pare e peça a aprovação.
- Âncora `pronto` ou `no ar` (o dono já aprovou): cure os demais dias.
- Reprovado pelo dono: o ajuste vai para a **ficha**, não para o texto. Pare.

## 3. Laço por dia (um de cada vez, em ordem, nunca em paralelo)

Para cada dia a curar:

1. **Curar:** chame o agente `curador` (Agent, `subagent_type: "curador"`) com o prompt: curso, dia N, "modo curar (D2 a D6)". Ele devolve um resumo curto com o resultado do linter. Não peça nem cole o texto do dia.
   - `PASSOU` e `validado`: segue. Anote `validado` no `estado.md`.
   - Travou (linter não passa depois das 2 voltas dele, ficha ausente, comando que não roda): **pare a semana neste dia** e relate. Não pule para o próximo.
2. **Revisar (D7):** chame o `revisor-editorial` em contexto limpo (Agent, `subagent_type: "revisor-editorial"`), passando só caminhos: `dia-N.json`, ficha do dia, ficha do curso, linha editorial e o log do linter.
   - `aprovado`: anote `revisado` no `estado.md` e passe ao próximo dia.
   - Lista de ajustes: chame o `curador` em **modo ajuste**, passando a lista literal do revisor, e depois o revisor de novo (outra chamada, contexto limpo). **No máximo 2 voltas de ajuste.** Se ainda reprovar, pare nesse dia e relate.
   - `pergunta ao dono:` do revisor: não decida sozinho. Guarde para o relatório final e siga só se o revisor também deu `aprovado`.
3. **Importação local (D8):** opcional. Só se o dono pediu, rode `dotnet run --project backend/src/Focadu.Api -- importar <curso> --dia N --dry-run | tail -20` e relate. Nunca sem `--dry-run` por conta própria.
4. Registre no `estado.md` os tokens do dia quando o agente informar; não invente.

Entre dias, não releia nada além do resumo que o agente devolveu.

## Retomar (limite de tokens ou sessão cortada)

O estado vive no disco, não na conversa. Antes de chamar o `curador` num dia `ficha ok`, confira se `secret/conteudo/<curso>/semana-S/dia-N.json` já existe:

- Existe: rode o linter (`node secret/processo/scripts/linter-dia/src/cli.js <dia.json> --glossario ... --log ... | tail -40`). `PASSOU`: marque `validado` e vá direto ao D7. Com erros: chame o `curador` em **modo ajuste** com a lista do linter, nunca para refazer o dia.
- Não existe: curar do zero (D2).
- Atualize o `estado.md` **logo depois de cada etapa**, antes de chamar o próximo agente, para um corte nunca apagar progresso já feito.

## 4. Relatório final

Fichas escritas, lab construído (com o resultado do teste) e uma tabela, nada além disso:

| Dia | Estado | Voltas | Observação |
|---|---|---|---|

Depois: perguntas ao dono guardadas, dias pulados, fichas que faltam, e o próximo passo. Os passos que sobram são do dono: ler o dia no app (`rodar-projeto`) e disparar o workflow `Publicar conteudo curado` (D9, ver `importar-producao`). Não dispare, não faça commit nem push.

## Limites

- Não constrói nada fora do que a ficha da semana pediu; não mexe no `curso.json`, no Forgejo nem em produção.
- Um dia por vez, em ordem. Falha em um dia para a semana (os seguintes costumam depender do vocabulário dele).
- Se a conversa já tem muito trabalho anterior (contexto grande), avise o dono e sugira `/clear` antes de começar a semana.
- Nunca edite `estado.md` além do estado e dos tokens; nunca SQL; nunca atribuição ao Claude em commits.
