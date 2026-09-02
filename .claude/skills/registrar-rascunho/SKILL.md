---
name: registrar-rascunho
description: "Detecta quando o usuário traz uma ideia solta e ainda não decidida sobre a Focadu (sinais: 'seria interessante...', 'ideia de um colega/amigo', 'pensei em...', 'e se a gente...', 'seria legal ter...', ou menção explícita a 'rascunho') e a registra como secret/rascunhos/<slug>.md, com nível de elaboração, perguntas em aberto e esboço técnico. Use também quando o usuário pedir explicitamente para anotar/registrar/atualizar um rascunho, ou invocar /registrar-rascunho. NÃO use para pedido de implementação direta (isso é código) nem para dúvidas sobre o que já existe."
metadata:
  version: 1.0.0
---

# Registrar Rascunho — Ideias Não Decididas da Focadu

## Quando usar

- A mensagem traz uma ideia de feature/mudança que **não está decidida nem desenhada** —
  só uma sugestão, um "e se...", uma vontade. Ex: "seria super interessante um caderninho de
  anotações", "ideia de um colega: ...", "pensei numa forma de fazer X".
- O usuário pede explicitamente pra anotar/registrar isso como rascunho, ou revisar/atualizar
  um rascunho existente.
- **Não** dispara para: pedido de implementação de verdade (vira código, não rascunho), dúvida
  sobre comportamento já implementado, ou curadoria de conteúdo do curso (isso é
  `/curar-conteudo`).

## Antes de qualquer coisa

1. `ls secret/rascunhos/` e leia pelo menos os 2 arquivos mais recentes por data de modificação
   — hoje são `squad-aprovacao-reentrada.md` e `caderninho-de-anotacoes.md`. São o padrão de
   estrutura a seguir. Os arquivos mais antigos da pasta (`visual-ui-ux.md`,
   `sistema-de-atividades.md` etc.) são mirror de um doc externo anterior, mais resumidos —
   **não** usá-los como referência de formato pra rascunhos novos.
2. Confira se já existe um rascunho pro mesmo assunto (grep por palavra-chave do tema). Se
   existir, **atualize** o arquivo existente em vez de criar um duplicado — acrescente uma
   seção ou revise o que já está lá, sem apagar o histórico da ideia original.
3. `secret/rascunhos/` (dentro de `secret/`, que tem git próprio) é o **único** destino de
   rascunhos deste projeto. Nunca escreva rascunho em `docs/`, no Notion, ou em qualquer lugar
   fora dessa pasta.

## Fluxo

1. **Extraia a ideia** da mensagem: do que se trata, quem trouxe (se mencionado — colega,
   teste ao vivo, o próprio usuário), qual problema ou vontade motiva.
2. **Nomeie o arquivo**: slug curto em kebab-case, `secret/rascunhos/<slug>.md`.
3. **Classifique o nível de elaboração** (escala abaixo) com base em quanto a mensagem do
   usuário já deixou pensado/decidido.
4. **Monte o markdown** seguindo o template abaixo.
5. **Só pergunte o que for bloqueante** — nome do arquivo e nível de elaboração você decide
   sozinho; pergunte apenas se a ideia central estiver ambígua demais pra nem descrever.
6. **Não commite sozinho** — diga que o arquivo foi criado/atualizado e pergunte se o usuário
   quer commitar (lembrando que `secret/` é um repositório git separado).

## Escala de nível de elaboração

- 🌱 **Semente** — só a ideia central, sem contexto de origem nem perguntas mapeadas. Use
  quando a mensagem do usuário é curta/vaga demais pra preencher as outras seções direito.
- 🌿 **Esboço** (padrão) — já dá pra descrever origem, ideia e perguntas em aberto, com um
  esboço técnico superficial. É o nível da maioria dos rascunhos.
- 🌳 **Detalhado** — perguntas em aberto já têm resposta provável, esboço técnico aponta
  entidades/casos de uso concretos, o rascunho está quase virando plano de implementação.

## Template do markdown

```markdown
# Rascunho — <Título Curto>

> Ideia/visão ainda não reconciliada com o estado implementado (ver `docs/MESTRE.md`).

**Nível de elaboração:** <🌱 Semente | 🌿 Esboço | 🌳 Detalhado>

### Origem

<De onde veio a ideia (colega, teste ao vivo, pergunta do usuário etc). 1-3 frases, sem enrolar.>

### A ideia

<Descrição direta da ideia. Sub-bullets se houver mecânicas distintas.>

### Perguntas em aberto (nenhuma decidida ainda)

- **<Tópico>:** <pergunta>?

### O que isso exigiria tecnicamente (esboço, não desenhado de verdade)

- <entidade/domínio novo ou alterado>
- <caso de uso novo>
- <endpoint/tela nova>

Nada disso está desenhado com detalhe - é só a ideia registrada pra não se perder, igual aos
outros rascunhos desta pasta.
```

## Regras de tom

- Português informal-técnico, igual ao resto do repo — nada de "Prezado usuário" ou tom de IA
  genérica, nada de emoji fora do marcador de nível de elaboração.
- Não invente decisão que o usuário não tomou: pergunta em aberto continua em aberto, não
  "resolva" na cabeça a ideia dele.
- Se a mensagem já responder alguma pergunta que normalmente ficaria em aberto (ex: "só o
  líder decide"), incorpore direto em "A ideia" em vez de listar como pergunta.

## Referências

- `secret/rascunhos/squad-aprovacao-reentrada.md` — melhor exemplo de estrutura completa.
- `secret/rascunhos/caderninho-de-anotacoes.md` — outro exemplo recente (ainda sem o campo
  "Nível de elaboração" — foi escrito antes desse SKILL existir).
