---
name: aplicar-elementos-visuais
description: "Retrofita um dia (ou semana) JÁ curado do curso Web Security da Focadu com os elementos visuais das Fases 30/31 (diagramas \"```diagrama\" - tipos sequencia/comparacao/camadas/partes - e blocos de código \"```\") onde o texto tiver de fato uma sequência de atores, uma comparação, uma hierarquia de camadas, a anatomia de uma coisa em partes, ou um trecho de protocolo/código narrado em prosa - nunca em lote, um dia por vez. Use quando o usuário pedir para adicionar diagrama(s), retrofitar, aplicar elementos visuais, transformar conteúdo já curado com elementos visuais novos a um dia específico, ou invocar /aplicar-elementos-visuais. NÃO use para curar um dia novo do zero (isso é /curar-conteudo) nem para decidir a sintaxe em si (já decidida, ver CURADORIA.md 2.1)."
metadata:
  version: 1.0.0
---

# Aplicar Elementos Visuais — Web Security (Focadu)

Fases 30/31 acrescentaram elementos visuais ao `bodyText` de uma Reading: blocos ` ```diagrama `
em 4 tipos (`sequencia`, `comparacao`, `camadas`, `partes` — ver CURADORIA.md 2.1 pra sintaxe de
cada um) e blocos ` ``` ` genéricos (código monoespaçado). Esta skill aplica esses elementos a
**conteúdo que já existe** em `secret/curadoria/`, sem tocar em domínio/backend/frontend (isso já
foi implementado — ver `docs/fase-30/` e `docs/fase-31/`).

## Antes de qualquer coisa

1. Leia **`secret/curadoria/CURADORIA.md` seção 2.1** por completo — é a sintaxe exata dos 4
   tipos, as regras de bom-senso e o parser real que vai renderizar isso
   (`frontend/src/lib/markdown.ts` + `frontend/src/components/activities/DiagramBlock.tsx`). Não
   inventar variação de sintaxe nem um 5º tipo sem alinhar antes.
2. Leia os exemplos já aplicados como referência viva (qual bullet/parágrafo cada um complementa,
   como a prosa ao redor foi preservada intacta):
   - `secret/curadoria/web-security/semana-1/dia-1.json` — 2× `sequencia` (handshake TCP, cadeia
     DNS) + 1× `partes` (Anatomia da Requisição HTTP).
   - `secret/curadoria/web-security/semana-2/dia-8.json` — 1× `comparacao` (RBAC vs. ABAC).
   - `secret/curadoria/web-security/semana-12/dia-56.json` — 1× `camadas` (Defesa em Profundidade).
3. Confira a nota de backlog no topo da seção "4. Estado atual" do `CURADORIA.md` pra ver quais
   dias já foram retrofitados, e não repetir trabalho.

## Fluxo

1. **Confirme o dia (ou os dias) alvo** com o usuário se não estiver óbvio pelo pedido — esta
   skill processa **um dia por vez**, nunca uma varredura automática dos 60 de uma vez (mesma
   decisão registrada no backlog do CURADORIA.md: qualidade por cima de cobertura).
2. **Leia o `bodyText` inteiro** do dia (`secret/curadoria/<curso>/semana-N/dia-N.json`,
   `curatedContents[].bodyText` do item `"ref": "reading"`).
3. **Avalie candidatos com critério, não por reflexo** (1 trecho de prosa vira NO MÁXIMO 1 tipo —
   nunca forçar um trecho a virar diagrama só porque "cabe tecnicamente"):
   - **`tipo: sequencia`** — passos reais entre atores nomeados (handshake, resolução de nomes,
     fluxo de requisição/resposta, troca de mensagens entre client/server/proxy/IdP). Ping-pong
     entre 2 atores e cadeia linear de N atores usam a MESMA sintaxe — não precisa decidir isso.
   - **`tipo: comparacao`** — o texto compara explicitamente 2 abordagens/modelos/opções (RBAC vs.
     ABAC, simétrica vs. assimétrica, SAML vs. OAuth). Só vale a pena com pelo menos 3 linhas de
     comparação genuínas — 1 ou 2 não justificam o diagrama, deixar em prosa.
   - **`tipo: camadas`** — o texto descreve uma hierarquia ou pilha de camadas independentes
     (defesa em profundidade, cadeia de certificados, hierarquia de IAM). Precisa ter uma ordem
     real (mais externo → mais interno, ou raiz → folha), não só uma lista de itens soltos.
   - **`tipo: partes`** — o texto decompõe UMA coisa só em segmentos que juntos a formam (anatomia
     de uma requisição, estrutura de um JWT, uma URL) — sem relação causal entre as partes (isso
     seria `sequencia`).
   - **Vira bloco de código genérico** (` ``` ` sem `diagrama`) um trecho que já é
     literalmente uma requisição/resposta/comando/payload/config (ex: uma requisição HTTP crua
     narrada em prosa, um comando de terminal, um JSON de exemplo) — não uma explicação teórica.
   - **Não vira nada**: definição isolada, explicação conceitual sem nenhuma das 4 estruturas
     acima. Regra de ouro do CURADORIA.md: "nunca decorativo". Um dia pode legitimamente não
     ganhar nenhum elemento novo — reporte isso ao usuário em vez de forçar um diagrama fraco.
   - Se houver dúvida genuína sobre se algo qualifica (ou sobre QUAL dos 4 tipos usar), pergunte
     ao usuário em vez de decidir sozinho — o custo de um diagrama ruim/no tipo errado
     (didaticamente confuso) é maior que perguntar.
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

- `secret/curadoria/CURADORIA.md` seção 2.1 — sintaxe dos 4 tipos, exemplos, regra de bom-senso.
- `secret/curadoria/web-security/semana-1/dia-1.json`,
  `secret/curadoria/web-security/semana-2/dia-8.json`,
  `secret/curadoria/web-security/semana-12/dia-56.json` — os exemplos canônicos já aplicados (um
  de cada tipo, ver item 2 de "Antes de qualquer coisa" acima).
- `docs/fase-30/resumo-implementacao-fase-30.md` (tipo `sequencia` + infra de fence) e
  `docs/fase-31/resumo-implementacao-fase-31.md` (tipos `comparacao`/`camadas`/`partes`) — como o
  recurso foi implementado (parser, componentes, efeitos colaterais tratados).
