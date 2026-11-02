# Resumo — Fase 101: Travas de IA

Aberta e fechada em 14/10/2026, na branch `fase-101-travas-de-ia` (parte da `fase-100-backup-e-forgejo-privado`). Quarta fase do plano da v0.1.0
(`secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`). Pré-requisito da pauta estratégica (tema 2, custo de IA): "medir antes de limitar" já foi cumprido pela
Fase 94; agora entram as travas, com números baseados na medição.

## O que foi implementado

- **Orçamento diário por aluno**: `AiUsageSettings.DailyBudgetUsd` (padrão US$ 0,50). `IAiUsageContext.EnsureBudgetAsync` roda antes de `Begin` nos 7 casos de uso que chamam
  IA e lança `orcamento_ia_esgotado` (429) sem gastar nem registrar nada. `AiBudget` (`IAiBudget`) soma o gasto estimado do dia vivido do aluno.
- **Teto mensal com modelo reserva**: `MonthlyCapUsd` (padrão US$ 30, só se estava vazio) e `FallbackModel` (padrão `openai/gpt-oss-20b`, com preço na tabela). `AiModelDowngradeHandler` troca o
  `model` do corpo JSON nas chamadas de texto quando o gasto do mês passa do teto; `AiCapMonitor` (singleton, cache de 1 min) evita consultar o banco a cada chamada. A Medição grava o modelo que
  de fato foi usado.
- **Duração do áudio**: `IAudioTranscriptionService` devolve `AudioTranscript(Text, DurationSeconds)` (do `verbose_json`); mais de 16 min = `audio_muito_longo` (400), antes da avaliação.
- **Tentativas por dia**: 10 por atividade (resumo falado e passo de código), `limite_tentativas_dia` (429).
- **Painel (aba Uso de IA)**: o painel "Teto mensal global" virou "Limites de IA": limite por aluno por dia, teto do mês, modelo reserva e o aviso "teto atingido, texto usando X".
  `PUT /api/admin/ai-usage/limits` (o `/cap` antigo saiu); o modelo reserva precisa estar na tabela de preços (`modelo_sem_preco`). `guiaTelas.ts` atualizado.
- **Migration `Fase101TravasDeIa`**: colunas `DailyBudgetUsd` e `FallbackModel`, os padrões acima e a linha de preço do `gpt-oss-20b`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Os números vêm da medição real.** 15 chamadas medidas em produção custaram ~US$ 0,006 (6.464 tokens de entrada, 2.876 de saída, 107 s de áudio). US$ 0,50 por aluno por dia é ~25x o uso normal:
  só pega abuso ou loop, sem atrapalhar ninguém. O teto de US$ 30 cobre 15 testadores com folga. **São chutes informados: ajustar com os dados da primeira leva.**
- **Trocar de modelo em vez de parar** ao passar do teto mensal: ninguém fica sem IA. O orçamento diário é o que para a chamada.
- **Troca no handler HTTP, não nos adapters**: são 7 adapters com o modelo em constante; o handler fica por fora do de medição e muda um campo do JSON, sem tocar neles. O Whisper (multipart) não troca.
- **`EnsureBudgetAsync` separado de `Begin`**: o contexto usa `AsyncLocal`, que um método assíncrono não devolve ao chamador.
- **Leitura de aula nunca falha por orçamento**: a analogia (bônus, já desligada por flag e com cache persistido) vira "sem analogia".
- **Duração do áudio pela transcrição**, não pelo arquivo: o servidor não decodifica webm. Custa a transcrição do áudio longo (centavos), mas não a avaliação.
- **Limite de 10 tentativas** conta respostas do dia vivido; é frouxo de propósito (uso normal é 1 a 3).
- **Mudança numa tela existente sem Figma novo**: só trocou o conteúdo do painel de teto da aba Uso de IA (campos e texto); o desenho da Fase 94/97 segue o mesmo. Conferir contra o Figma.

## Como verificar

- `dotnet build` 0 erros; `dotnet test` **759 aprovados** (21 novos em `AiUsage/AiLimitsTests`: validação do limite, orçamento esgotado, teto com e sem preço do reserva, tentativas, `Swap` do corpo JSON).
  Frontend: `npx tsc -b` limpo, `npm run build` ok, lint com os 2 avisos de sempre.
- **Ao vivo** (Api real, Postgres descartável, chave do Groq falsa, aluno promovido a admin): a migration aplicou os padrões (0,50 / 30 / 20b + preço); a chamada sem gasto passou o limite e só falhou no Groq (401);
  com US$ 0,75 gastos hoje, a chamada deu **429 `orcamento_ia_esgotado`** e não criou registro; `PUT /limits` aceita os três valores e recusa `modelo_sem_preco` e limite zero; com teto de US$ 0,01 a chamada
  seguinte foi registrada com **`openai/gpt-oss-20b`** e o log avisou "Teto mensal de IA atingido".
- **Não verificado**: a tela do painel no navegador (sem navegador nas sessões); o limite de tentativas e o de duração do áudio de ponta a ponta (cobertos por teste de função, não pelo fluxo real com áudio);
  a troca de modelo com uma chave real do Groq (o `gpt-oss-20b` com `response_format` JSON e os prompts atuais pode se comportar diferente do 120b: ver a primeira resposta real); o preço do 20b na tabela (conferir na página da Groq).

## Dúvidas ou pontos abertos para a próxima fase

- **Cache da analogia**: já existe (persistido) e a analogia está desligada, então nada novo. Não há cache de outras chamadas.
- **Orçamento visto pelo aluno**: ele só descobre ao estourar (mensagem do erro no lugar da resposta). Nada de medidor na tela; se a primeira leva estourar, vale um aviso antes.
- O `AiCapMonitor` demora até 1 minuto para perceber que o teto mudou (editar o teto no painel não invalida o cache).
- Endpoint de IA novo precisa chamar `EnsureBudgetAsync` antes de `Begin` (hoje são 7) e entrar no regex `AiPath` do rate limit (Fase 99).
- Push das branches 98 a 101 segue bloqueado pelo escopo `workflow` do `gh`.
