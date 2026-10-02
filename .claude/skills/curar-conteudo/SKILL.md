---
name: curar-conteudo
description: "Cura UM dia de um curso da Focadu (Web Security, Linux, Python pra Web Security, Design Patterns, Arquitetura de Software) pelo pipeline do plano de curadoria: texto (D2), linter (D3), revisão de escrita (D4), atividades (D5), validação (D6), revisão editorial (D7) e importação (D8). Grava em secret/conteudo/<curso>/semana-N/dia-N.json. Exige a ficha do dia aprovada (skill ficha-do-dia). Use quando o usuário pedir para curar, montar ou gerar o conteúdo de um dia, corrigir um dia a partir de uma lista do linter ou do revisor, ou invocar /curar-conteudo."
metadata:
  version: 2.0.0
---

# Curar um dia

Regras e decisões: `secret/produto/PLANO-CURADORIA.md` (aprovado em 02/10/2026). Se algo divergir, o plano vence. Responda em português do Brasil, direto.

**Um dia por sessão. `/clear` entre dias.** Nunca um mês em lote. Cada etapa lê **só** os arquivos da sua lista; não leia outros dias, o roteiro inteiro, `MESTRE.md`, `ARQUITETURA.md` nem `processo/arquivo/`.

Slugs: `web-security`, `linux`, `python-websec`, `design-patterns`, `arquitetura-de-software`. Sem curso claro, pergunte. Molde A (conceito): web-security, design-patterns, arquitetura-de-software. Molde B (prática): linux, python-websec.

## Portões antes de começar

1. A ficha do dia existe e está `ficha ok` em `secret/processo/cursos/<curso>/estado.md`. Sem ela, pare e mande rodar `/ficha-do-dia`.
2. O molde está congelado ou o pedido é um **piloto** autorizado pelo dono (plano, Fase 2). Nenhum dia novo fora disso.
3. **Dia-âncora** (dia 1 do curso ou da semana): cure só ele e pare no D7; o dono lê e aprova antes de qualquer outro dia da semana. Se reprovar, o ajuste vai para a **ficha**, não para o texto.

## Etapas

| Etapa | Lê | Faz | Portão |
|---|---|---|---|
| **D2 Texto** | ficha do dia, `processo/molde/regras-de-leitura.md`, `processo/linha-editorial.md`, 1 texto exemplo curto aprovado do mesmo molde | Escreve os 3 blocos (A) ou a leitura curta com missões (B), com "Em uma frase" e "O que levar daqui" | D3 |
| **D3 Linter** | nada (script) | `node secret/processo/scripts/linter-dia/src/cli.js <dia.json> --glossario secret/processo/cursos/<curso>/glossario.md` | `PASSOU`; senão volta ao D2 (máx. 2 voltas) |
| **D4 Revisão de escrita** | texto + lista de erros do linter | Agente `editor-pedagogico`, passando ficha e lista de erros | rodar o linter de novo |
| **D5 Atividades** | ficha, texto final, `processo/molde/regras-de-quiz.md`, `processo/molde/dia.schema.json`, 1 atividade exemplo | Conversa por voz, Quiz, Cloze, Ligar Palavras, Roleplay; monta o `dia-N.json` completo | D6 |
| **D6 Validação** | nada (script) | Linter em modo completo, `json.load`, log de execução, verificadores do lab; Haiku só para o que script não pega | `PASSOU`; senão volta ao D5 |
| **D7 Revisão editorial** | (o agente lê) | Agente `revisor-editorial`, em **contexto limpo**, com dia, ficha do dia, ficha do curso, linha editorial e relatório do linter | `aprovado` |
| **D8 Importar** | nada (comando) | `dotnet run --project backend/src/Focadu.Api -- importar <curso> --dia N` (`--dry-run` antes); depois abrir o dia no app local (`rodar-projeto`) e marcar `pronto` no `estado.md`. Detalhes em `secret/processo/importador.md` | dia aberto no app |

Estado visível no `estado.md`: `a fazer` → `ficha ok` → `validado` (após D6) → `revisado` (após D7) → `pronto` (após D8). Anote também os tokens gastos pelo dia.

### D2 e D5: como escrever

- **Molde A:** 3 blocos de 1 conceito, até 150 palavras cada; cada bloco é um `Reading` próprio em `curatedContents` seguido de um `VoiceSummary` que aponta para ele e para um alvo (`target`). Mais Quiz (3), Cloze (2), Ligar Palavras (1, 4 pares), Roleplay (1, termina em Ideal/Suboptimal/Poor) e a pergunta final por voz com 3 tópicos-pista. Vídeo só como demonstração opcional de até 5 min que o texto não mostra; confirme a URL com `WebSearch`/`--online`, nunca invente.
- **Molde B:** leitura curta em missões (comando, saída real, 1 frase), `TerminalMission` com 3 a 5 missões (`processo/molde/terminal-mission.md`), Quiz (3), Cloze (2), Ligar Palavras (1), Roleplay como missão. Sem vídeo e sem conversa por voz. Ponte (dia 6): `processo/molde/ponte.md` e `lab.md`.
- Cada item de Quiz/Cloze/voz aponta para um alvo; cada alvo tem texto e pergunta; nenhuma pergunta cobra o que o texto não ensinou.
- Conversa por voz: situação de 2 linhas e 1 pergunta; fala da Focada até 200 caracteres (`processo/guias/GUIA-DE-VOZ-FOCADA.md`); `referenceAnswer` com a resposta correta.
- Schema só com os campos de `dia.schema.json`. Nunca invente chave nova.

## Regras de ouro

- **Leitura fácil manda** (`processo/linha-editorial.md`). **Sem analogia**: nem no texto, nem âncora para analogia.
- **Tudo que é número, comando ou saída foi executado de verdade** em ambiente descartável (`debian:stable-slim` para Linux; `python:3.12-slim` para Python; `dotnet` para C#) e registrado em `secret/processo/cursos/<curso>/logs/dia-N.log`. O linter confere o texto contra esse log. Nunca de memória.
- **Fonte oficial** vai no campo `source` do `curatedContent`, nunca no corpo.
- Termos novos só do `glossario.md`; mesma coisa, mesma palavra.
- Diagrama só quando a estrutura é real (`processo/molde/diagramas.md`); bloco de código até 8 linhas com a saída real logo abaixo.
- `lab` e `TerminalMission` só sobem depois de `verificar.mjs`/`verificar-missoes.mjs` (`processo/scripts/lab`, ou `linter-dia --lab`).
- Todo dia de Linux/Python liga a um uso em segurança, sem ensinar o ataque.
- Quiz: os 4 critérios anti-resposta-óbvia (`processo/molde/criterios-anti-resposta-obvia.md`); reescreva distratores, nunca a certa.

## Correção

- **Cirúrgica:** o linter ou o revisor lista N erros; edite só esses N trechos. Nunca regenere o JSON por causa de um erro.
- Ajuste depois do D7 volta pelo mesmo caminho: edita o JSON, roda D3/D6, importa de novo. **Nada de SQL à mão** nem edição direta no banco. Emergência em produção: SQL permitido, mas no mesmo dia o JSON é corrigido e importado (o SQL vai para `processo/arquivo/`).
- Dia já com respostas de alunos pede `--confirmar` no importador; dia fora do molde v1 é recusado (`--legado` só na transição).

## Referências

- `secret/produto/PLANO-CURADORIA.md`; `secret/processo/linha-editorial.md`
- `secret/processo/molde/`: `molde-v1.md`, `dia.schema.json`, `regras-de-leitura.md`, `regras-de-quiz.md`
- `secret/processo/scripts/linter-dia/README.md`
- `secret/processo/cursos/<curso>/`: `roteiro.md`, `estado.md`, `glossario.md`, `fichas/`
- Agentes: `editor-pedagogico` (D4), `revisor-editorial` (D7). Skill `ficha-do-dia` (D1/S1).
