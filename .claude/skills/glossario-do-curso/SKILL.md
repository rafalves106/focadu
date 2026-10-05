---
name: glossario-do-curso
description: "Etapa C2 da curadoria de um curso da Focadu: escreve o glossario.md a partir da ementa aprovada, agrupado pelo dia em que cada termo entra, no formato lido pelo linter. Roda em contexto limpo. Use quando o usuário pedir o glossário de um curso ou quando a skill curadoria apontar essa etapa. Exige ficha do curso e ementa aprovadas."
argument-hint: "<curso>"
model: sonnet
effort: medium
context: fork
---

# Glossário do curso (C2)

Português do Brasil. Fonte: `secret/produto/PLANO-CURADORIA.md`; se divergir, o plano vence.

## Portão

`secret/processo/cursos/<curso>/ficha-curso.md` e `roteiro.md` com "Aprovada pelo dono". Sem isso, pare e diga qual falta.

## Lê (só isto)

- `secret/processo/cursos/<curso>/roteiro.md`, `ficha-curso.md` e `assumidos.md`.
- Formato: as primeiras 40 linhas de `secret/processo/cursos/web-security/glossario.md` (cabeçalho e Dia 1 a 3).

## Escreve `secret/processo/cursos/<curso>/glossario.md`

- Cabeçalho com status "Aguardando aprovação do dono".
- Uma seção `## Dia N — tema` por dia do roteiro, na ordem. Cada termo entra **uma vez**, no 1º dia em que o texto precisa dele (o linter reprova termo usado antes do dia em que entra).
- Formato de cada linha, exato: `- **termo** (expansão, se sigla) — definição curta. (não usar: sinônimo)`.
- No máximo os termos novos por dia do nível da ficha (iniciante 3, intermediário 4, avançado 5) no que vira `newTerms`; os demais do dia são de apoio.
- Nada que está no `assumidos.md`. Sigla sempre com expansão. Definição só de significado, sem exemplo inventado.
- Palavras comuns que o texto vai usar como termo (ex.: "comando", "saída") entram no 1º dia em que aparecem.

## Devolva

Resumo: total de termos, dias com mais termos, termos que você hesitou em pôr no glossário ou nos assumidos (para o dono decidir), e o caminho do arquivo. O dono aprova; ao aprovar, o status vira "Aprovado pelo dono em DD/MM/AAAA" e a próxima etapa é `/clear` e `/curadoria <curso>` (ficha do Dia 1).
