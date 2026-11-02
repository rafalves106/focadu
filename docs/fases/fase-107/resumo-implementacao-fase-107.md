# Resumo — Fase 107: Imagem de conclusão da semana pro post do LinkedIn

## O que foi implementado
- **Figma** (arquivo "Focadu — Pixel Art", página "Imagem de conclusão da semana — v1 (proposta)", node `322:4502`, agente `figma-designer`, aprovado pelo dono em 27/10/2026): modelo quadrado 1080x1080 (`323:4912`) e paisagem 1200x627 (`323:4502`) com camadas variáveis nomeadas, selo por semana (`322:5109`, 12 variantes), barra de progresso (`322:5266`) e exemplos das semanas 1 a 3 e caso-limite.
- **Backend**: `IDraftGenerationService.GenerateAsync` devolve `GeneratedLinkedInDraft` (post + destaques + nome do projeto) numa chamada só, em JSON mode (`GroqDraftGenerationService`; resposta fora do formato = `groq_resposta_invalida`, 502). `GenerateLinkedInDraftUseCase` normaliza os campos da imagem: exatamente 3 destaques de até 70 caracteres (completa com o 1º ponto de "O que levar daqui" se a Focada devolver menos), nome do projeto até 50 (some se a semana não tem projeto), cortando na palavra, sem reticências. `ModulePublicationDto` ganha `Image` (`PublicationImageDto`: curso, semana, total de semanas, título, destaques, projeto), só na resposta do rascunho, sem persistir.
- **Front**: `lib/weekCompletionImage.ts` desenha o modelo quadrado em canvas com as medidas do Figma (Silkscreen, Inter, VT323; logo, Focada comemorando e os 12 selos exportados do Figma em `assets/pixel/selos/`). Nome do aluno até 32 (senão primeiro e último nome) e data de hoje. Texto quebra em até 2 linhas; se o conjunto não cabe antes da divisória, a fonte dos aprendizados e do projeto desce (26 → 23 → 20). `PublicationModal`: prévia da imagem no passo do rascunho, botão "Baixar imagem" e download automático no "Copiar e publicar". Se a imagem falhar, o post segue sem ela.

## Decisões técnicas tomadas que não estavam no prompt original
- Só o quadrado no app (recomendação do designer: o feed do LinkedIn é lido no celular, onde o quadrado ocupa quase o dobro da área). O paisagem fica no Figma.
- Dúvidas do designer resolvidas pelo padrão, com o dono ausente: sem endereço do site na imagem; fala fixa "Semana fechada!"; semana 12 usa o mesmo modelo; semana sem projeto esconde a linha do projeto; ícones como desenhados.
- Desenho em canvas no navegador (sem biblioteca nova, sem gerar imagem no servidor): fontes já carregadas pelo Google Fonts do app, sprites pixel ampliados sem suavização.
- A data é a do dia da publicação, não a da avaliação do projeto (o front não tem `EvaluatedAt`).

## Estrutura de arquivos criada
- `frontend/src/lib/weekCompletionImage.ts`
- `frontend/src/assets/pixel/selos/selo-semana-01.png` a `selo-semana-12.png`
- `docs/fase-107/resumo-implementacao-fase-107.md`

## Testes
- 813 testes de unidade passam (novos: `NormalizeHighlights` e `ClampAtWord`). `tsc -b`, `oxlint` e `npm run build` limpos.
- Imagem renderizada no Chrome headless (página temporária no Vite): o exemplo da semana 2 bate com o Figma, e o caso-limite (todos os campos no máximo, só M e W) não corta nem sobrepõe depois do ajuste de fonte. Não verificado ao vivo: o modal no app, o download no celular e o texto real que a Focada devolve (Groq).

## Dúvidas ou pontos abertos para a próxima fase
- O LinkedIn não aceita anexar imagem por link: o aluno baixa e anexa à mão. Publicação direta pela API do LinkedIn exigiria OAuth do aluno.
- Cursos com outro número de semanas: a barra usa `totalWeeks` e os selos vão até 12 (acima disso repete o 12).
