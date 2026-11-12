# Fase 109 — redesign v1, etapa 1: tokens, tipos e componentes básicos

12/11/2026. Primeira etapa do código do redesign aprovado no Figma (`KZkoT5d33KsbBWEcQ0EBXj`; direção em
`docs/design/direcao.md`, manual em `docs/design/sistema.md`, ordem das etapas no §11 dele).

- `index.css`: tokens novos da coleção "Focadu tokens v2" (`accent-hover`, `accent-tint`, `accent-shadow`,
  `alert-tint`, `project-tint`, `stroke-strong`, `disabled`, `pele-1..5`), `secondary` passa de `#9a9a9a`
  pra `#b4b4b4`, estilos de texto como utilitários (`text-display`, `text-titulo`, `text-lead`,
  `text-corpo`, `text-pequeno`, `text-rotulo`, `text-rotulo-sm`, `text-codigo`) e `--tamanho-*`.
- `components/ui/`: `Button` (Primário/Secundário/Perigo, desabilitado, carregando), `Card` (Padrão,
  Destaque, Âmbar, Suave), `Chip`, `Breadcrumb` (o "fio"), `FocadaLine` (Abertura/Devolutiva ×
  Neutro/Acerto/Erro, com os sprites reais), `Field`, `Choice` (Escolha) e `Checkbox` (Caixa de seleção).
- Ainda não usados por nenhuma tela: entram a partir da etapa 2 (casca: nav, barra inferior, menu do agente).
- A Inter continua como `--font-sans` por enquanto: trocar o corpo do app inteiro pra VT323 antes das telas
  serem refeitas quebraria o layout das telas antigas. Sai junto com a etapa 2/3.
- Não conferido no Figma por variável: `disabled` (#2a2a2a, tirado do print do Botão desabilitado) e a
  sombra neutra de modal/gaveta (entra na etapa 2). O espaçamento de letra dos rótulos (4 no Figma) foi lido
  como 4% (0,04em), pela largura medida no print do Botão.
- Sem verificação visual no navegador (sessão sem navegador): conferir os componentes quando a etapa 2
  colocar o primeiro deles na tela.
