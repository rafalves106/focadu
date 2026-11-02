## Mapa da documentação — leia antes de explorar o código a frio

| Arquivo                                      | O que é                                                                                                                                                                                                                                                                                                                | Quando muda                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `docs/arch/estado/`                        | **Fonte da verdade técnica.** Retrato sempre atual do estado do projeto (schema, endpoints, decisões, pendências). É grande (~200KB) — busque a seção relevante em vez de ler tudo; o cabeçalho tem a linha "Última fase que atualizou este documento", que é a forma mais barata de saber em que fase o projeto está. | Toda fase, editado em cima do que existe, nunca recriado do zero. |
| `docs/HISTORICO-FASES.md`                    | Uma linha por fase (1–92+) e o resumo detalhado das Fases 86–91, tirados deste arquivo em 06/10/2026 para economizar contexto.                                                                                                                                                                                         | Ao fechar fase, acrescentar a linha dela lá (não aqui).           |
| `docs/ESTADO-HISTORICO.md`                   | Marcos das Fases 25–87 com o porquê de cada decisão, arquivado deste arquivo em 30/09/2026.                                                                                                                                                                                                                            | Não editar; só consultar.                                         |
| `docs/DOCKER.md`                             | Guia prático de Docker/deploy: subir local, variáveis (`.env`), runbook, runner.                                                                                                                                                                                                                                       | Quando o deploy mudar.                                            |
| `docs/CONVENCOES.md`                         | A própria convenção de documentação/fechamento de fase descrita abaixo.                                                                                                                                                                                                                                                | Só se a convenção em si mudar.                                    |
| `docs/fases/fase-N/resumo-implementacao-fase-N.md` | Histórico imutável de cada fase (o que foi feito, decisões, dúvidas em aberto).                                                                                                                                                                                                                                        | Escrito uma vez ao fechar a fase N, nunca editado depois.         |
| `secret/MESTRE.md`                           | Princípios de decisão, filosofia de produto e regras de negócio ("o porquê"), em repo próprio e ignorado. Não duplica o nível de detalhe técnico do `ARQUITETURA.md`.                                                                                                                                                  | Quando o escopo de produto muda (passo 4 do fechamento de fase).  |
| `secret/curadoria/`, `secret/rascunhos/`     | Conteúdo didático curado e ideias não decididas ainda. Geridos pelas skills `curar-conteudo` e `registrar-rascunho` já em `.claude/skills/`.                                                                                                                                                                           | Via as skills acima.                                              |

## Regra de fechamento de fase (obrigatória — não pedir autorização, é o próprio fechamento)

Definida em `docs/CONVENCOES.md`; resumo aqui porque este arquivo é sempre carregado e aquele não.
Ao final de **toda fase de implementação**:

1. Criar `docs/fases/fase-N/resumo-implementacao-fase-N.md` (modelo fixo em `docs/CONVENCOES.md`).
2. Atualizar `docs/arch/estado/` in-place (nunca recriar do zero) para refletir o estado novo,
   incluindo a linha do cabeçalho "Última fase que atualizou este documento".
3. Acrescentar a linha da fase em `docs/HISTORICO-FASES.md`. Se a fase mudou o resumo de alto nível do produto (não só detalhe técnico), atualizar a seção
   "Estado atual" deste arquivo (abaixo) com a fase/data mais recente.
4. Se a fase mudou **escopo de produto**, atualizar `secret/MESTRE.md` (commit + push próprios no
   `focadu-secret`) e marcar como implementado o rascunho que a originou, se houver.
5. Commitar tudo isso (código + os dois/três docs acima) num único commit descritivo — sem pedir
   confirmação separada, isso faz parte do fechamento da fase, não é uma ação avulsa.

## Economia de tokens — quem faz o quê (modelo, agentes, contexto)

Regra geral: **o modelo mais barato que dá conta**, e o contexto principal fica limpo.

| Tarefa                                                                       | Quem faz                                                            | Por quê                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| Implementar fase, decisões de arquitetura, bug difícil, revisão de segurança | Sessão principal (Sonnet; Opus só se travar)                        | Precisa do contexto inteiro                                                         |
| Buscar/mapear código ("onde fica X", "quem chama Y") em vários arquivos      | Subagente `Explore` (Haiku)                                         | Devolve só a conclusão, não despeja arquivos no contexto                            |
| Curar um dia (D2–D6) e aplicar ajustes do D7                                 | Agente `curador` (Sonnet)                                           | Começa com contexto menor que a sessão principal; a sessão só coordena              |
| Reescrever texto de aula (leitura fácil)                                     | Agente `editor-pedagogico` (Sonnet)                                 | Só lê e devolve Markdown; não precisa de Opus                                       |
| Desenhar ou regerar tela no Figma                                            | Agente `figma-designer` (**Opus 5.5**, decisão do dono, 02/10/2026) | Toda geração no Figma passa por ele; a sessão principal não escreve no Figma direto |
| Curar dia (`curar-conteudo`), retrofit visual, rascunho                      | Skills do projeto, **um dia por vez**                               | Nunca em lote (estoura contexto)                                                    |
| Rodar testes/build e resumir falhas, varrer logs do Impostor                 | Subagente ou `Bash` com saída filtrada (`                           | tail`, `grep`)                                                                      | Log cru não entra no contexto |

Hábitos obrigatórios:

- Ler `docs/arch/estado/` por seção (grep no cabeçalho), nunca inteiro (~200KB).
- Não reler arquivo que acabou de ser editado; não narrar opções que não serão seguidas.
- Tarefa longa e independente (ex.: curar semana) → sessão nova por unidade (dia/semana), com `/clear` ou `/compact` entre elas.
- Só spawnar agente quando a tarefa gera muita leitura e pouca conclusão. Tarefa pequena: fazer direto.
- Esforço: `/effort` baixo/médio pra ajustes simples e docs; alto só pra fase de implementação.

## Skills do projeto já configuradas

- `curadoria` — porta de entrada: `/curadoria <curso> [dia N]` lê o estado do curso e dispara a próxima etapa
  (`ficha-do-curso` em Opus/alto, `glossario-do-curso` em Sonnet/médio com contexto limpo, `ficha-do-dia` em
  Sonnet/baixo, `curar-conteudo` em Sonnet/médio). Entre etapas, `/clear` e `/curadoria <curso>` de novo.
- `curar-conteudo` — cura conteúdo didático de um dia de qualquer curso (Web Security, Linux, Python pra
  Web Security) e grava em `secret/curadoria/<curso>/semana-N/dia-N.json`.
- `registrar-rascunho` — detecta ideia solta/não decidida sobre o produto e registra em
  `secret/rascunhos/<slug>.md`.
- `aplicar-elementos-visuais` — retrofita um dia já curado com os elementos visuais das Fases
  30/31 (diagrama de fluxo/comparação/camadas/partes, bloco de código), um dia por vez, nunca em
  lote.
- `rodar-projeto` — sobe Postgres (Docker) + API .NET + frontend Vite em background e confirma com
  smoke test. Usar em vez de montar os comandos à mão.
