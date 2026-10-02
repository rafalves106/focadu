---
name: ficha-do-dia
description: "Escreve a ficha de 1 página de um dia (etapa D1) ou de uma semana (etapa S1) de um curso da Focadu, em secret/processo/cursos/<curso>/fichas/. A ficha é o portão mais barato da curadoria: o dono lê em 1 minuto e aprova antes de qualquer texto ser escrito. Use quando o usuário pedir a ficha do dia N, a ficha da semana N, ou invocar /ficha-do-dia. NÃO escreve o texto do dia nem o dia-N.json (isso é /curar-conteudo)."
metadata:
  version: 1.0.0
---

# Ficha do dia e da semana

Fonte de regras: `secret/produto/PLANO-CURADORIA.md` (pipeline, seção 5; projeto, seção 11). Se algo divergir, o plano vence. Uma ficha por sessão. Responda em português do Brasil.

Pedido sem curso claro: pergunte. Slugs: `web-security`, `linux`, `python-websec`, `design-patterns`, `arquitetura-de-software`.

## Ficha do dia (D1)

**Leia só isto** (~15 KB):

1. A linha do dia em `secret/processo/cursos/<curso>/roteiro.md` (use `grep -n "Dia N\b"`; **não** leia o roteiro inteiro).
2. `secret/processo/cursos/<curso>/glossario.md`. Se não existir, a etapa C2 não foi feita: avise e pare.
3. `secret/processo/molde/molde-v1.md` (tipos A e B) e, se existir, `ficha-curso.md` e `assumidos.md` do curso (nível, o que não explicar).
4. Se o dia for o 2 em diante: a ficha do dia anterior, para não repetir o que já foi ensinado.

**Escreva** `secret/processo/cursos/<curso>/fichas/dia-N.ficha.md`, **no máximo 1 página**, com estes campos:

```
# Ficha — <curso>, dia N: <título>
tipo de molde: A | B      nível: iniciante | intermediário | avançado      dia-âncora: sim | não

objetivo (1 frase): ...
termos novos (até 3/4/5 conforme o nível; todos no glossário): ...
problema real de abertura (2 linhas): ...
erro comum de quem começa: ...
uso em segurança (1 linha): ...
alvos de aprendizagem:
  t1: ...
  t2: ...
  t3: ...
o que levar daqui (3 pontos, 1 frase cada, um por alvo):
  1. ...
  2. ...
  3. ...
demonstração em vídeo: não | sim — o que o vídeo mostra que o texto não mostra (até 5 min)
```

Regras:

- **Termos novos só do glossário** do curso, no máximo o limite do nível. Termo fora do glossário: pare e peça para adicioná-lo no glossário, não invente.
- **3 alvos**, cada um verificável: "o aluno consegue dizer/fazer X". Cada alvo vai virar um bloco, uma pergunta de voz e itens de Quiz/Cloze, então só entra o que cabe em um bloco de até 150 palavras.
- **Problema real antes do nome**: uma situação concreta, não uma definição.
- **Sem analogia** em nenhum campo. Sem autor/ano/citação.
- Molde B (prática): em vez de termos, liste os **comandos** do dia (3 a 5 missões) e marque a saída real a ser executada e registrada.
- Vídeo só se mostrar o que o texto não mostra; no molde B é sempre `não`.
- Dia 6 da semana é ponte: se o `roteiro.md` marca ponte, use a ficha da semana (abaixo) e liste os 6 passos de código em vez de alvos de conceito.

Termine pedindo a aprovação do dono ("leia em 1 minuto; aprovo ou ajusto?"). **Não escreva o texto do dia** antes dessa aprovação. Se o dia for âncora (dia 1 do curso ou da semana), diga que o dono lê o dia pronto antes de o resto da semana ser curado.

## Ficha da semana (S1)

Uma por semana, antes dos 5 dias. **Leia só:** as linhas da semana em `roteiro.md` (grep por `Semana N`), `glossario.md`, o `projeto.json` ou enunciado da semana se existir, e a ficha da semana anterior.

**Escreva** `secret/processo/cursos/<curso>/fichas/semana-N.ficha.md`, até 1 página:

```
# Ficha da semana N — <curso>: <tema>
tema da semana (1 frase): ...
dias: <lista dos 5 dias com 1 linha cada: título + alvo central>
ponte (dia 6): não tem | o que o script faz, em 1 frase (entra: ... / acontece: ... / sai: ...)
projeto: não tem | o que entrega, em 1 frase
alvos dos dias que o projeto cobra: <ids dia.alvo, ex. 3.t2, 4.t1>
linguagem padrão do projeto: Python
```

Regra central: **o projeto só cobra o que os dias ensinaram.** Todo critério de "pronto" aponta para um alvo listado acima; critério sem alvo volta para a ficha. Ponte e projeto só existem se o `curso.json` marcar para essa semana.

## Depois da aprovação

Marque o dia como `ficha ok` no `secret/processo/cursos/<curso>/estado.md` e pare. O texto (D2) é o próximo passo, em outra sessão.
