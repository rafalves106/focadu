---
name: curadoria
description: "Porta de entrada da curadoria de um curso da Focadu: lê o estado do curso, diz qual é a próxima etapa (ficha do curso e ementa, glossário, ficha do dia, curar o dia, aprovação do dono) e a dispara com o modelo e o esforço certos do plano. Use quando o usuário invocar /curadoria <curso> [dia N], pedir 'próximo passo da curadoria', 'continuar a curadoria', ou começar um curso novo."
argument-hint: "<curso> [dia N]"
model: sonnet
effort: low
---

# Curadoria: próximo passo

Uma etapa por sessão. Responda em português do Brasil, direto. Regras e modelos: `secret/produto/PLANO-CURADORIA.md` (tabela "Etapa | Lê | Modelo e esforço"); se divergir, o plano vence.

Slugs: `web-security`, `linux`, `python-websec`, `design-patterns`, `arquitetura-de-software`. Sem curso nos argumentos, pergunte.

## 1. Descobrir a etapa (só `ls` e `grep`, sem ler arquivo inteiro)

Pasta: `secret/processo/cursos/<curso>/`. Siga a primeira linha que bater:

| Situação | Próxima etapa | Skill (modelo e esforço vêm do cabeçalho dela) |
|---|---|---|
| `ficha-curso.md` ou `assumidos.md` não existe, ou a ficha não tem "Aprovada pelo dono" | C0/C1: ficha do curso, assumidos e ementa | `ficha-do-curso` (Opus, alto) |
| `roteiro.md` não tem "Aprovada pelo dono" | C1: ementa | `ficha-do-curso` |
| `glossario.md` não existe ou não tem "Aprovado pelo dono" | C2: glossário | `glossario-do-curso` (Sonnet, médio, contexto limpo) |
| Dia N (o pedido, ou o 1º dia do `estado.md` que não está `pronto`) em `a fazer` | D1: ficha do dia | `ficha-do-dia` (Sonnet, baixo) |
| Dia N em `ficha ok`, `validado` ou `revisado` (sem aprovação do dono pendente) | D2 a D8 | `curar-conteudo` (Sonnet, médio) |
| Dia-âncora em `revisado`, já importado e esperando leitura | aprovação do dono | nenhuma: pergunte se aprovou; se sim, marque `pronto` no `estado.md` |

Os portões de cada skill continuam valendo (ex.: `curar-conteudo` recusa dia sem `ficha ok`).

## 2. Mostrar e disparar

1. Diga em 3 linhas: curso, etapa atual, o que a etapa vai produzir e qual aprovação do dono vem depois.
2. Se esta sessão já fez outra etapa antes (há trabalho anterior na conversa), **não dispare**: peça ao dono `/clear` e `/curadoria <curso>` de novo. O contexto limpo é regra do plano, e uma skill não consegue dar `/clear` sozinha.
3. Senão, chame a skill da etapa com o Skill tool, passando `<curso>` e `dia N` quando houver.

## 3. Ao terminar a etapa

Termine sempre com o próximo comando para o dono, pronto para copiar:

```
/clear
/curadoria <curso>
```

Se a etapa terminou esperando aprovação do dono (ficha do curso, ementa, glossário, ficha do dia, dia-âncora), diga isso antes do comando: a próxima rodada só avança depois do "aprovado".
