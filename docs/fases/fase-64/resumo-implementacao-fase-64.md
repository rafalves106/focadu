# Resumo — Fase 64: Identidade pixel art + diálogo da Focada no Projeto Semanal

Pedido do Falves (22-23/09/2026), feito em "combo": a identidade visual pixel art construída ao vivo
no Figma "Focadu — Pixel Art" (`iNwXFcYXDajxkkhmyEr1gd`) aplicada no app, mais a primeira feature
que usa a mascote nova — o diálogo da Focada na tela do Projeto Semanal, a partir de
`secret/rascunhos/projeto-semanal-dialogo-de-jogo.md` e `secret/rascunhos/mascote-focada.md`.

## O que foi implementado

**Identidade pixel art (frontend)**

- Linha editorial no Figma: paleta fechada "Pixel palette" (variables), guia de 7 regras, 22
  sprites 16×16 como componentes. Todo ícone novo em `frontend/src/assets/pixel/` (PNG 1x).
- Ícones trocados: check, chama (streak), gema, troféu, medalha de ouro, play (inativo/ativo),
  terminal, seta de voltar. Emojis trocados: 🔒 (cadeado cinza — semanas/dias/projetos bloqueados,
  "Ainda não estudado", sessão recusada, sessão expirada), 🛡️ (escudo — certificações), 🎓🤝👑
  (capelo, bandeira, coroa — conquistas do perfil) e 🥈🥉 (medalhas de prata e bronze com o número).
  `StatusBadge` cobre `✅`/`🔒`/`🛡️` sozinho.
- Tamanhos ajustados pra múltiplos de 16px (14→16, 24/28→32, 40→48) e `@utility pixelated`.
- Assets antigos removidos: `assets/icons/*`, `assets/header/map-*`, `assets/project/*`,
  `assets/reading/play-thumbnail*.svg`.
- Logo: wordmark pixel FOCADU, com o "O" como mira de autofoco e cursor verde (foco + lock-on de jogo
  + prompt: "quem responde é você"), no centro do `GlobalNav` no lugar do "START". Favicon novo
  (SVG + PNG 32 + apple-touch-icon) e `theme-color`.
- Menu do `GlobalNav` em sprites (calendário, mapa do tesouro, barraca da loja | pódio, squad),
  agrupado em solo (esquerda) e multiplayer (direita); nome em `sr-only` + tooltip.
- Cursor do mouse: mira aberta / mira travada em clicáveis (`public/cursor/`).

**Ajustes de tipografia do Projeto Semanal (feitos em outra sessão, incluídos no combo pelo dono)**

- Cartão de repositório: mono só pra código/credencial (11px) e rótulos (10px, `CardLabel`); texto
  corrido em Inter 12px (os 8px do Figma ficavam abaixo do mínimo legível); aviso do token em
  `alert/80`. Anotação rápida (`QuickNotePanel` com `fill`) e campo do `StudyAssistantPanel` alto em
  13px, placeholder mais curto e botão SALVAR no estilo mono do cartão.
- O plano da migração pra Oracle Cloud (escrito em outra sessão) **não** entrou neste repositório:
  como o `focadu` é público e o documento tem e-mail e o endereço da VM, ele foi pro
  `secret/MIGRACAO-ORACLE.md` (repositório privado), decisão do dono no fechamento da fase.

**Diálogo da Focada no Projeto Semanal**

- Backend: `WeeklyTemplate.WeeklyProjectBriefing` (`text[]`) e `WeeklyProjectStateLines` (`jsonb`),
  `SetProjectBriefing` (1x só, máx. 200 caracteres por fala, chaves de estado fixas), migration
  `ProjectBriefing`, `CuratedProjectImporter` lendo `"briefing"`/`"falasDeEstado"`, DTO com
  `Briefing`/`StateLines` (só depois do projeto disponibilizado).
- Frontend: `DialogueBox` (retrato + caixa `pixel-box`, digitação só na 1ª vez, avançar/pular/rever,
  reduced-motion, `aria-live`), `lib/focadaLines.ts` (falas de estado padrão + expressão por estado),
  fontes VT323/Silkscreen, sons sintetizados (`lib/uiSound.ts`), "Sons da interface" real nas
  Configurações (liga/desliga + volume).
- A especificação sai da tela quando há briefing e linguagem escolhida: vai pro `README.md` do
  repositório (link "Abrir README.md"); sem isso, o cartão de sempre continua.
- Curadoria (`focadu-secret`): roteiro da Semana 1 (4 falas), `GUIA-DE-VOZ-FOCADA.md`, schema no
  `CURADORIA.md`, `README.base.md` por linguagem + `scripts/gerar_readme_modelo.py` (README gerado do
  `specText`), patch de produção `patches/2026-09-23-semana-1-briefing-focada.sql`.
- Figma: páginas "Logo", "Textbox — kit + teste de fontes" (componente `textbox/focada`) e "Focada —
  esboço" (retratos neutra, comemorando, acolhedora).

## Decisões técnicas tomadas que não estavam no prompt original

- **`SpecText` continua fonte única** e o README é gerado dele — a avaliação por IA, o resumo de
  commit de módulo e o Suporte Rápido não mudam. Aprovado pelo dono junto das 12 decisões do rascunho.
- **Falas de estado padrão no frontend**, com override opcional por semana vindo do backend — o
  padrão é texto de interface, não currículo.
- **Nota ≥ 70 = Focada comemorando**, abaixo = acolhedora (`FOCADA_HIGH_SCORE`). O projeto não tem
  aprovado/reprovado; é só o tom da fala.
- **Caixa pixel só em CSS** (`clip-path` + borda + sombra interna) em vez de 9-slice de imagem:
  estica em qualquer largura sem asset.
- **Sons sintetizados com Web Audio** (onda quadrada), sem arquivo de áudio. O bipe do Pomodoro não
  obedece "Sons da interface" de propósito (é alarme).
- **Frontend tolera backend antigo** (`briefing`/`stateLines` ausentes = sem diálogo), porque o dev
  local aponta pra API de produção via `.env.local`.
- Tamanhos de ícone ajustados pra escala inteira; a medalha do ranking passou de 24 para 32px e o
  terminal do projeto de 40 para 48px.

## Estrutura de arquivos criada

```
backend/src/Focadu.Infrastructure/Migrations/*_ProjectBriefing.cs (+ Designer, snapshot)
frontend/public/favicon.svg, favicon-32.png, apple-touch-icon.png, cursor/mira*.png
frontend/src/assets/pixel/            sprites 16x16, logo-wordmark.png, focada-*.png (32x32)
frontend/src/components/DialogueBox.tsx
frontend/src/lib/focadaLines.ts, uiSound.ts
secret/curadoria/GUIA-DE-VOZ-FOCADA.md
secret/curadoria/scripts/gerar_readme_modelo.py
secret/curadoria/patches/2026-09-23-semana-1-briefing-focada.sql
secret/curadoria/web-security/semana-1/modelos/{python,javascript}/README.base.md
```

## Testes

- Backend: `dotnet test` — 455 aprovados, 0 falhas (9 novos: `SetProjectBriefing` e importador com
  `briefing`/`falasDeEstado`).
- Frontend: `tsc -b` e `oxlint` sem erro; `vite build` ok.
- Verificação visual (Vite na 5199 com `/api` mockado, Chrome via Playwright): diálogo digitando a
  1ª fala, retomada direto na fala de estado quando o briefing já foi visto, retrato comemorando com
  nota 88 e acolhedora com nota 42, sem erro de página.
- `gerar_readme_modelo.py --check` confirma os 2 READMEs da Semana 1 em dia com o `specText`.

## Dúvidas ou pontos abertos para a próxima fase

- **Produção:** depois do deploy (migration automática), aplicar o patch do briefing da Semana 1 e
  republicar os 2 repositórios-modelo da Semana 1 com o README gerado (o script não sobrescreve;
  atualizar o repositório existente é manual). Forks que já existem mantêm o README antigo.
- Roteiro de briefing das semanas 2-12 (junto com os repositórios-modelo delas).
- Textbox/Focada em outros pontos (bloqueios, conclusão de sessão, streak perdido, onboarding) e a
  fonte pixel fora do Projeto Semanal — decididos como "depois".
- Emojis ainda não trocados: 🔄 ⭕ 🎉 🍅 ☕ 💼 👋 🔊 📋, telas de erro, 👑 do co-líder na SquadTab,
  "CHEFE DE FASE 👾".
- A Focada é esboço feito por script; se virar rosto da marca, vale refino por um pixel artist.
