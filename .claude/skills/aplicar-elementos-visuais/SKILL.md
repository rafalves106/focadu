---
name: aplicar-elementos-visuais
description: "Retrofita um dia (ou semana) JÁ curado do curso Web Security da Focadu com os elementos visuais da Fase 30 (diagramas de fluxo \"```diagrama\" e blocos de código \"```\") onde o texto tiver de fato uma sequência de atores/passos ou um trecho de protocolo/código narrado em prosa - nunca em lote, um dia por vez. Use quando o usuário pedir para adicionar diagrama(s), retrofitar, aplicar elementos visuais, transformar conteúdo já curado com elementos visuais novos a um dia específico, ou invocar /aplicar-elementos-visuais. NÃO use para curar um dia novo do zero (isso é /curar-conteudo) nem para decidir a sintaxe em si (já decidida, ver CURADORIA.md 2.1)."
metadata:
  version: 1.0.0
---

# Aplicar Elementos Visuais — Web Security (Focadu)

Fase 30 acrescentou 2 elementos visuais ao `bodyText` de uma Reading: blocos ` ```diagrama `
(diagrama de fluxo simples, origem -> destino) e blocos ` ``` ` genéricos (código monoespaçado).
Esta skill aplica esses elementos a **conteúdo que já existe** em `secret/curadoria/`, sem tocar
em domínio/backend/frontend (isso já foi implementado — ver `docs/fase-30/`).

## Antes de qualquer coisa

1. Leia **`secret/curadoria/CURADORIA.md` seção 2.1** por completo — é a sintaxe exata, as regras
   de bom-senso e o parser real que vai renderizar isso (`frontend/src/lib/markdown.ts` +
   `frontend/src/components/activities/DiagramBlock.tsx`). Não inventar variação de sintaxe.
2. Leia `secret/curadoria/web-security/semana-1/dia-1.json` como referência viva — o `bodyText`
   dele já tem os 2 exemplos canônicos (three-way handshake TCP e cadeia de resolução DNS)
   aplicados de verdade, inseridos logo após o bullet relevante, mantendo toda a prosa técnica.
3. Confira a nota de backlog no topo da seção "4. Estado atual" do `CURADORIA.md` pra ver quais
   dias já foram retrofitados, e não repetir trabalho.

## Fluxo

1. **Confirme o dia (ou os dias) alvo** com o usuário se não estiver óbvio pelo pedido — esta
   skill processa **um dia por vez**, nunca uma varredura automática dos 60 de uma vez (mesma
   decisão registrada no backlog do CURADORIA.md: qualidade por cima de cobertura).
2. **Leia o `bodyText` inteiro** do dia (`secret/curadoria/<curso>/semana-N/dia-N.json`,
   `curatedContents[].bodyText` do item `"ref": "reading"`).
3. **Avalie candidatos com critério, não por reflexo**:
   - **Vira `diagrama`** um trecho que descreve uma sequência real de passos entre atores
     nomeados (handshake, resolução de nomes, fluxo de requisição/resposta, troca de mensagens
     entre client/server/proxy/IdP, árvore de decisão de protocolo). Ping-pong entre 2 atores e
     cadeia linear de N atores usam a MESMA sintaxe (ver seção 2.1) — não precisa decidir isso.
   - **Vira bloco de código genérico** (` ``` ` sem `diagrama`) um trecho que já é
     literalmente uma requisição/resposta/comando/payload/config (ex: uma requisição HTTP crua
     narrada em prosa, um comando de terminal, um JSON de exemplo) — não uma explicação teórica.
   - **Não vira nada**: definição isolada, comparação de prós/contras, explicação conceitual sem
     sequência real. Regra de ouro do CURADORIA.md: "nunca decorativo". Um dia pode legitimamente
     não ganhar nenhum elemento novo — reporte isso ao usuário em vez de forçar um diagrama fraco.
   - Se houver dúvida genuína sobre se algo qualifica, pergunte ao usuário em vez de decidir
     sozinho — o custo de um diagrama ruim (didaticamente confuso) é maior que perguntar.
4. **Insira o bloco logo após o trecho de prosa que ele complementa** (mesmo padrão do Dia 1:
   depois do bullet/parágrafo relevante, antes do próximo `####`), sem reescrever, resumir ou
   remover a prosa existente — o elemento visual complementa, nunca substitui a densidade técnica
   exigida pela filosofia da curadoria (`CURADORIA.md` seção 1).
5. **Edite o `.json` com cuidado de string escapada** (`\n` literal dentro do valor JSON, aspas
   internas como `\"..\"`) — nunca reescrever o arquivo inteiro à mão livre; usar edição pontual
   no trecho exato do `bodyText`.
6. **Valide o JSON** antes de considerar pronto:
   ```bash
   python3 -c "import json; json.load(open('secret/curadoria/<curso>/semana-N/dia-N.json'))"
   ```
7. **Rode a suíte de testes do backend** (garante que o importer ainda aceita o arquivo e que
   nada de `SplitIntoSections`/`StripFencedBlocks` quebrou):
   ```bash
   cd backend && dotnet test tests/Focadu.Tests/Focadu.Tests.csproj --filter FullyQualifiedName~CuratedContentAllFilesTests
   ```
8. **Atualize a nota de backlog** na seção "4. Estado atual" do `CURADORIA.md`, listando o(s)
   dia(s) recém-retrofitado(s) e removendo-o(s) da lista de pendentes (ou zerando a nota se todos
   os 60 já tiverem sido revisados).
9. **Relate ao usuário** quais diagramas/blocos foram adicionados e onde, e quais dias avaliados
   não ganharam nada (e por quê) — não é esperado 100% de cobertura.

## Regras de Ouro (não negociáveis)

- **Nunca decorativo** — só inserir quando a sequência/trecho de código é genuína, nunca pra
  "enfeitar" um texto que já é claro em prosa/lista.
- **Nunca em lote** — um dia (ou um punhado pedido explicitamente) por vez, sempre com validação
  de JSON + teste de importação antes de seguir pro próximo.
- **Nunca reescrever a prosa existente** — o elemento visual é aditivo. Se a prosa em si parecer
  fraca, isso é um problema de curadoria de conteúdo (fora do escopo desta skill) — sinalizar ao
  usuário, não corrigir por conta própria aqui.
- **Sintaxe é fixa** (`CURADORIA.md` 2.1) — não inventar variação (setas diferentes, colunas,
  metadados extras). Se a sintaxe atual não expressa bem um caso, sinalizar ao usuário em vez de
  extrapolar sozinho.

## Referências

- `secret/curadoria/CURADORIA.md` seção 2.1 — sintaxe, exemplos, regra de bom-senso.
- `secret/curadoria/web-security/semana-1/dia-1.json` — os 2 exemplos canônicos já aplicados.
- `docs/fase-30/resumo-implementacao-fase-30.md` — como o recurso foi implementado (parser,
  componente, efeitos colaterais tratados).
