---
name: ficha-do-curso
description: "Etapas C0 e C1 da curadoria de um curso da Focadu: escreve a ficha do curso (1 página), o assumidos.md e revisa o roteiro.md como ementa, para o dono aprovar antes do glossário. Use quando o usuário pedir a ficha do curso, a ementa, o assumidos, começar um curso novo, ou quando a skill curadoria apontar essa etapa. NÃO escreve glossário (glossario-do-curso) nem ficha de dia (ficha-do-dia)."
argument-hint: "<curso>"
model: opus
effort: high
---

# Ficha do curso, assumidos e ementa (C0 e C1)

Fontes: `secret/produto/PLANO-CURADORIA.md` (seção "Novo curso em 5 passos" e tabela de etapas) e `secret/processo/linha-editorial.md` (níveis de aluno). Se divergir, o plano vence. Português do Brasil, direto.

## Lê (só isto)

- `secret/produto/MESTRE.md`: **só a seção de filosofia** (grep pelo título, não o arquivo inteiro).
- `secret/processo/linha-editorial.md`.
- `secret/processo/cursos/<curso>/roteiro.md` (o atual).
- Modelo de formato: `secret/processo/cursos/web-security/ficha-curso.md` e `assumidos.md`.
- `secret/conteudo/<curso>/curso.json`, se existir.

## Antes de escrever, pergunte ao dono (AskUserQuestion)

Nível do aluno (iniciante, intermediário, avançado), o que ele já sabe, de que curso depende, se há prática de código e em qual linguagem, se há ponte e projeto semanal, e se o curso é público ou privado. Não presuma o que o roteiro não diz.

## Escreve

1. `secret/processo/cursos/<curso>/ficha-curso.md`: mesmo formato do Web Security (bloco com tema, resultado esperado, nível, molde A ou B, prática, projeto, pré-requisitos, e as regras próprias do curso). Primeira linha de status: "Aguardando aprovação do dono".
2. `secret/processo/cursos/<curso>/assumidos.md`: lista do que o aluno já domina, coerente com o nível.
3. `roteiro.md` revisado como ementa C1: um tema por dia, no máximo os termos novos do nível, linha "Sai sabendo" por dia, por que esta ordem. Edite em cima do que existe; marque "Aguardando aprovação do dono".
4. Se o `curso.json` não bater com a ementa (semanas, dias, `published`), liste a diferença e só altere depois da aprovação.

## Fim

Mostre ao dono um resumo de 10 linhas (nível, molde, o que mudou na ementa) e peça aprovação. Ao aprovar, troque o status por "Aprovada pelo dono em DD/MM/AAAA" nos três arquivos. Depois: `/clear` e `/curadoria <curso>` (próxima etapa: glossário).
