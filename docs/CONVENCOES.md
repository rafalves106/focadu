# Convencoes de documentacao continua da Focadu

Este projeto e construido em varias fases, cada uma atraves de um prompt tecnico separado
colado diretamente no Claude Code. O planejamento (discussao, validacao de ideias, ida e volta
sobre requisitos) acontece em outra ferramenta, fora deste chat. Isso significa que, sem uma
convencao explicita, o historico de decisoes e o estado real da arquitetura ficariam presos na
memoria de cada conversa individual - e cada sessao futura (do Claude ou do Falves) teria que
reler todo o codigo do zero so para se orientar.

Esta pagina documenta a convencao que resolve isso. Ela vale a partir da Fase 1 (retroativamente)
e para toda fase futura, sem precisar ser repetida em cada prompt novo.

## Estrutura de pastas

```
docs/
├── ARQUITETURA.md              <- documento vivo: retrato do estado ATUAL do projeto
├── CONVENCOES.md                <- este arquivo
├── fase-1/
│   └── resumo-implementacao-fase-1.md
├── fase-2/
│   └── resumo-implementacao-fase-2.md
└── fase-N/
    └── resumo-implementacao-fase-N.md
```

- Cada fase de implementacao ganha sua propria pasta `docs/fase-N/`, numerada em ordem
  sequencial (N = 1, 2, 3, ...), correspondendo a ordem em que os prompts tecnicos forem colados
  neste chat.
- `docs/ARQUITETURA.md` **nao e um historico** - e sempre a foto do estado atual, consolidado.
  Ele nunca deve ser recriado do zero: cada fase nova o **atualiza** (edita as secoes que
  mudaram, adiciona o que for novo, remove o que deixou de ser verdade).
- `docs/CONVENCOES.md` (este arquivo) so muda se a propria convencao mudar.

## Regra de fechamento de fase

Ao final de **toda fase de implementacao** (ou seja, sempre que um prompt tecnico novo for
concluido), o Claude Code deve, sem que o Falves precise pedir de novo:

1. Criar `docs/fase-N/resumo-implementacao-fase-N.md` com o resumo daquela fase especifica,
   seguindo o modelo fixo abaixo.
2. Atualizar `docs/ARQUITETURA.md` para refletir o estado atual e consolidado do projeto apos
   aquela fase (nao recriar do zero - editar em cima do que ja existe).
3. Commitar todas as mudancas da fase (`git add` + `git commit`), com uma mensagem descritiva
   que identifique a fase e resuma o que foi feito - inclusive os dois passos acima, que fazem
   parte do mesmo commit de fechamento. Sem esse passo, uma fase pode ficar "concluida" no chat
   mas ausente do historico do Git, que e o unico registro persistente entre sessoes.

Isso e parte permanente do processo de trabalho neste projeto, nao uma tarefa avulsa. Nao pedir
autorizacao pra commitar ao final de fase - e o proprio fechamento da fase, nao uma acao avulsa
que precise de confirmacao separada a cada vez (**decidido na Fase 4**, depois do trabalho da
Fase 3 ter ficado uncommitted por descuido).

## Modelo fixo para `resumo-implementacao-fase-N.md`

Todo resumo de fase segue exatamente esta estrutura:

```markdown
# Resumo — Fase N: [nome da fase]

## O que foi implementado
(lista objetiva)

## Decisões técnicas tomadas que não estavam no prompt original
(qualquer suposição ou escolha de design que você teve que fazer)

## Estrutura de arquivos criada
(árvore resumida dos projetos/pastas)

## Testes
(o que foi testado, resultado)

## Dúvidas ou pontos abertos para a próxima fase
(qualquer coisa que ficou em aberto, ambígua, ou que dependa de decisão minha/do Falves)
```

## Por que isso existe

- O planejamento acontece fora deste chat, entao o repositorio precisa ser autossuficiente para
  explicar "por que as coisas sao como sao", sem depender de reler uma conversa antiga.
- Separar "resumo por fase" (historico, imutavel depois de escrito) de "arquitetura" (vivo,
  sempre atual) evita que o documento vivo vire uma colcha de retalhos com informacao
  desatualizada competindo com informacao atual.
- Uma sessao futura sem memoria desta conversa consegue, lendo so `docs/ARQUITETURA.md`, entender
  o estado atual sem ler todo o codigo; e, se precisar entender uma decisao especifica ou o
  contexto de uma fase passada, consegue abrir o `docs/fase-N/` correspondente.
