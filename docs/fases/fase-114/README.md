# Fase 114 — Revisão da avaliação por voz da Focada

19/11/2026, branch `fase-114-revisao-avaliacao-ia` (sai da `fase-113-ponte-intercalada`; as duas vão juntas pra `main`).

## Por quê

Bug real (wstg, sessão 6, bloco 1): o aluno disse com outras palavras as duas ideias da referência ("vão perder a confiança",
"usou só o que a ferramenta indicou, sem julgamento") e levou 70 com "faltou mencionar" as duas. A referência ainda trazia uma
2ª frase (o remédio) que a pergunta ("por que isso prejudica?") não pedia.

## O que mudou

- **Conversa por voz** (`DebriefSystemPromptTemplate`): a IA dá duas notas, conteúdo e comunicação; o servidor combina em
  `VoiceScore` = 85% conteúdo + 15% comunicação (decisão do dono: a comunicação pesa um pouco). Conteúdo certo e completo (90+)
  passa do mínimo de 80 mesmo com a fala ruim; fala perfeita não salva conteúdo parcial.
- Gabarito de **ideias**, não de frases; a IA separa da referência só o que a pergunta pede; "faltou" só para ideia ausente.
- Comunicação volta a ser avaliada (vícios, hesitações, repetições, ordem), na transcrição bruta. Revoga a regra do molde v1
  "vícios de linguagem ficam de fora". A devolutiva ganha a linha "Na fala: ..." dentro de "Pontos a melhorar" (sem tela nova;
  `whitespace-pre-line` no `FeedbackPanel`).
- Revisão da transcrição nunca tira vícios (regra 5); Whisper recebe um `prompt` com vícios pra transcrever a fala como foi dita.
- Resumo Falado (antigo): mesma regra de paráfrase; clareza inclui vícios quando é fala.

## Verificação

`dotnet test` 943/943. Prompt testado ao vivo contra o Groq (chave da VM, 12 chamadas): o caso do bug foi de 70 para 94/95;
certo com muito vício 82–92; errado 31; parcial 31–40. Sem verificação visual da linha "Na fala:" no app.

## Pendente

- Auditoria das `referenceAnswer` (web-security 252, wstg 31+, termos-estagio 12): tirar o que a pergunta não pede.
- Atualizar `molde-v1.md`, `regras-de-quiz.md` e o PLANO-CURADORIA (regra dos vícios).
