# Brief do redesign da Focadu

> Entrada única do agente `figma-diretor` (Fable). Ele lê este arquivo, `frontend/src/index.css` e
> `frontend/src/lib/guiaTelas.ts`, e mais nada do repositório. Mantenha curto: tudo que entra aqui
> custa token em todas as chamadas do redesign.

## Arquivo Figma

`Redesign - Focadu`: https://www.figma.com/design/KZkoT5d33KsbBWEcQ0EBXj/Redesign---Focadu (fileKey `KZkoT5d33KsbBWEcQ0EBXj`).

## Objetivo

Tornar a Focadu **vendável**: mais refinada, com cara de produto pago, e **fácil de se orientar**.
Hoje quem entra fica perdido. A identidade pixel art fica; o que muda é acabamento, hierarquia e
orientação.

## O problema (palavras do dono)

"Quem entra na plataforma fica perdido." Hipóteses, para o diretor confirmar ou derrubar:

1. **Vocabulário demais de uma vez.** Daily, etapa, conta-giros, reforço, ponte, castelo, Projeto
   Semanal, ofensiva, folga, Gems, Score, squad, GG, Caderninho, trilha, módulo. O aluno precisa
   aprender o jogo antes de aprender o conteúdo.
2. **Navegação larga e plana.** O menu tem 8 destinos com o mesmo peso (Hoje, Trilhas, Loja,
   Ranking | logo | Squad, status da IA, Configurações, perfil). Não fica claro qual é a ação
   principal do dia.
3. **O guia "?" com tour é remendo.** Existe porque as telas não se explicam sozinhas.
4. **Falta um "próximo passo" único e óbvio** em cada tela. O Início tem cursos, agente, missão do
   dia e "rumo ao castelo" disputando atenção.
5. **Densidade.** Muitas telas têm laterais, trilhos, gavetas e barras ao mesmo tempo (sessão
   diária: cadeia de etapas, conta-giros, material, Pomodoro, anotação, Suporte Rápido).

## O que não muda

- Pixel art: cantos retos, bordas de 2px, sem sombra suave nem gradiente, animação em `steps()`.
- A Focada (personagem guia, fala em VT323) continua sendo a voz do produto.
- Paleta-base e fontes do `index.css` são o ponto de partida. Ajustar tom, criar escala, adicionar
  neutros ou um papel novo de cor é permitido; trocar o verde-acento ou o fundo escuro, não.
- Funcionalidades: o redesign não cria nem remove recurso. Pode esconder, agrupar, reordenar e
  renomear rótulo (renomear conceito de domínio, como "ponte" ou "castelo", é proposta para o dono,
  não decisão).
- Telas sem rolagem externa no desktop (regra do produto).
- Toda tela passa pelo Figma e pela aprovação do dono antes do código.

## Formatos

- Desktop 1440x900 (principal).
- Notebook: abaixo de 1440x820 as laterais viram trilhos de 64px com gavetas.
- Celular 390x844: existe barra de baixo na sessão. A aba Retenção do painel mostra aparelho por
  tela; se o dono trouxer os números, eles entram aqui.

## Telas (rota, função em uma linha)

Fora do app (`outside`):
- `/login` Entrar / criar conta (abas), convite de tester, aceite de termos.
- `/confirmar-email` código de 6 dígitos.
- `/esqueci-senha`, `/redefinir-senha` senha.
- `/aceite` aceite de termos atualizado.
- `/onboarding`, `/onboarding/perfil`, `/selecionar-curso` primeiros passos: quem é a Focada,
  interesses e linguagens, escolha do curso.

Dentro do app:
- `/start` **Início**: hub. Cursos (cada um é um save), agente (ofensiva, Gems, dias estudados),
  missão do dia, dias que faltam até o castelo. Subtela mapa da trilha.
- Mapa da trilha: curso inteiro, aba por módulo, linha por semana; dia = quadrado (feito, em
  andamento, trancado), 6º dia = ponte (âmbar), castelo = Projeto Semanal. Selo vermelho = reforço.
- Visão da semana: seis dias + castelo, resumo da semana, faixa âmbar de publicação pendente.
- `/hoje` **Sessão diária**: etapas em sequência (leitura, vídeo, quiz, lacuna, ligar palavras,
  roleplay, conversa por voz, passo de código, missão no terminal), aquecimento no começo,
  feedback do dia no fim. Laterais: material, Pomodoro, anotação, Suporte Rápido.
- Sessão de reforço, Ponte (6º dia, código guiado).
- Projeto Semanal: briefing, README, repositório e token, entregar (nota da IA), chat.
- `/perfil` ficha do agente: roupa, números, troféus, últimos 14 dias.
- `/squad` QG do Squad: escalação, meta da semana, feed com GG, ranking do squad.
- `/loja` provador + vitrine semanal de 6 itens.
- Ranking: pódio, top 10, próximo alvo, como subir.
- Certificações: cobertura de exames por módulo.
- Caderninho: notas por semana e dia, filtros, revisar com a IA.
- `/gestao/*` painel de admin (fora do escopo do redesign do aluno; só herda o sistema).

## O que o diretor entrega

Ver `.claude/agents/figma-diretor.md`. Em resumo: diagnóstico e direção (para o dono aprovar),
depois variáveis, componentes, 2 a 3 telas-âncora e `docs/design/sistema.md`.
