---
name: fichas-semana
description: "Escreve de uma vez as fichas dos dias que faltam numa semana de um curso da Focadu (etapa D1 em lote), para o dono aprovar todas num passo só, e marca `ficha ok` no estado.md. Use quando o usuário invocar /fichas-semana <curso> <semana>, quando /curar-semana avisar que faltam fichas, ou pedir 'fichas da semana toda'. Também confere pré-requisitos da semana (ex.: lab) e avisa. NÃO escreve o texto dos dias (isso é /curar-semana) nem a ficha da semana (ficha-do-dia, S1)."
argument-hint: "<curso> <semana> [aprovadas]"
model: sonnet
effort: low
---

# Fichas da semana em lote

Roda na **sessão principal**; cada ficha é escrita por um subagente `general-purpose` em contexto próprio, um dia por vez, em ordem (a ficha do dia N lê a do dia N-1 para não repetir o que já foi ensinado, então nunca em paralelo). Regras da ficha: `.claude/skills/ficha-do-dia/SKILL.md` (seção "Ficha do dia"). Plano: `secret/produto/PLANO-CURADORIA.md`. Responda em português do Brasil, direto.

Slugs: `web-security`, `linux`, `python-websec`, `design-patterns`, `arquitetura-de-software`. Sem curso ou semana, pergunte.

## 1. Mapear (só `ls` e `grep`)

1. Exija `fichas/semana-N.ficha.md` aprovada ("Aprovada pelo dono"). Sem ela: pare e mande rodar `/ficha-do-dia <curso> semana N`.
2. Dias da semana: os 6 de `roteiro.md`/`estado.md` (semana S = dias 6S-5 a 6S). Veja em `fichas/` quais `dia-N.ficha.md` existem e o estado de cada dia no `estado.md`.
3. Faltam ficha: dias sem arquivo e em `a fazer`. Dia com ficha escrita mas ainda `a fazer` (pendente de aprovação): entra na rodada de aprovação, sem reescrever.
4. **Pré-requisitos:** leia a linha da semana no `estado.md` e a ficha da semana por "antes", "lab", "construir". Se algo precisa ser construído antes (ex.: `lab-semana-2/servidor.py`), **não construa**: liste no relatório como pendência do dono, com o caminho esperado, e diga se existe (`ls`).
5. Mostre em 3 linhas: dias a escrever, dias já com ficha, pré-requisitos pendentes.

## 2. Escrever (modo padrão, sem o argumento `aprovadas`)

Para cada dia sem ficha, **em ordem**, chame o Agent com `subagent_type: "general-purpose"`, model `sonnet`, prompt curto e só com caminhos:

> Escreva a ficha do dia N do curso `<curso>`. Siga **exatamente** a seção "Ficha do dia" de `.claude/skills/ficha-do-dia/SKILL.md` (leia só os arquivos da lista dela) e a ficha da semana `secret/processo/cursos/<curso>/fichas/semana-S.ficha.md`. Grave `secret/processo/cursos/<curso>/fichas/dia-N.ficha.md`. Não escreva o texto do dia nem edite o `estado.md`. Devolva: título, 3 alvos (uma linha cada), termos novos e qualquer termo que faltou no glossário.

- Termo fora do glossário (o agente reporta): **pare a rodada nesse dia**, relate e não invente.
- O dia 6 da semana é a ponte: o agente usa a ficha da semana (6 passos de código), como diz a skill `ficha-do-dia`.
- Dia-âncora (dia 1 da semana) já `pronto` ou `no ar`: não mexa.

## 3. Uma aprovação só

Depois de escrever, mostre **um quadro** (não cole as fichas):

| Dia | Título | Alvos (t1, t2, t3 em uma linha) | Termos novos |
|---|---|---|---|

e peça: "Leia as fichas em `fichas/dia-N.ficha.md`. Aprova todas, ou diga quais dias ajustar?". **Não marque `ficha ok` antes disso.** O dono aprovar o quadro sem ler as fichas é decisão dele; não aprove por ele.

## 4. Aprovação (chamada com `aprovadas`, ou resposta do dono)

- `aprovadas` sem lista: marque `ficha ok` no `estado.md` em todos os dias que têm ficha e estão `a fazer`.
- `aprovadas, menos o 10`: marque os outros; o 10 fica `a fazer`.
- Pedido de ajuste num dia: reescreva **só essa ficha** com um agente (passando o pedido literal do dono), sem tocar nas outras, e mostre de novo só a linha dele no quadro.

## 5. Terminar

Relatório curto: fichas escritas, fichas aprovadas (`ficha ok`), pendências do dono (pré-requisito/lab, termo de glossário), e o próximo comando para copiar:

```
/clear
/curar-semana <curso> <semana> [dia 1-da-semana aprovado]
```

## Limites

- Não escreve texto de dia, `dia-N.json`, glossário nem ficha da semana; não faz commit nem push; nunca atribuição ao Claude em commit.
- Nunca constrói lab, servidor ou código de apoio: só avisa que falta.
- Se a sessão já tem muito trabalho anterior, avise e sugira `/clear` antes de começar.
