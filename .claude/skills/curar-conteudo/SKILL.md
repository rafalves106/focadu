---
name: curar-conteudo
description: "Cura o conteúdo didático de um dia de um curso da Focadu (Web Security, Linux, Python pra Web Security) (texto cru, resumos falados, vídeo, quiz, cloze, ligar palavras, roleplay) e grava como secret/curadoria/<curso>/semana-N/dia-N.json. Use quando o usuário pedir para curar, montar ou gerar o conteúdo de um dia/semana do curso, revisar um dia.json existente contra o briefing, ou invocar /curar-conteudo."
metadata:
  version: 1.1.0
---

# Curar Conteúdo — Cursos da Focadu

Cursos e slugs (pasta em `secret/curadoria/<slug>/`):

| Curso | Slug | Roteiro e estado atual |
|---|---|---|
| Web Security (piloto) | `web-security` | `CURADORIA.md` seções 4 e 5 |
| Linux (pré-requisito) | `linux` | `linux/ROTEIRO.md` |
| Python pra Web Security (pré-requisito) | `python-websec` | `python-websec/ROTEIRO.md` |

Se o pedido não deixar claro o curso, pergunte. Sem curso citado e com número de dia que só existe no
Web Security, é o Web Security.

## Antes de qualquer coisa

1. Leia **secret/curadoria/CURADORIA.md** por completo — filosofia, molde diário, schema do
   `.json`, estado atual e o roteiro completo dos 72 dias do Web Security (6 por semana, o 6º é a
   ponte). Filosofia, molde, schema e critérios 2.2 valem pra **todos** os cursos. Pra `linux` e
   `python-websec`, leia também o `ROTEIRO.md` do curso (roteiro dia a dia, estado atual e regras
   próprias). É a fonte da verdade; este SKILL só orquestra o processo.
2. Leia pelo menos um `dia-N.json` já pronto (ex: `secret/curadoria/web-security/semana-1/dia-1.json`)
   como referência viva de estrutura e tom — a Semana 1 é a referência de qualidade.
3. Olhe a pasta `secret/curadoria/<slug>/semana-N/` para descobrir o que já existe e
   qual é o próximo `dayNumber` sem arquivo (cheque também o "Estado atual" do curso). A numeração
   é por curso: cada curso começa no Dia 1.

## Fluxo

1. **Confirme o dia/semana alvo** com o usuário se não estiver óbvio pelo pedido.
2. **Receba o conteúdo cru** (o usuário normalmente cola: Texto Cru, 2 Resumos Falados,
   Vídeo com opções de canal, Quiz, Cloze Test, Ligar Palavras, Roleplay) — ou, se o
   usuário pedir para você mesmo escrever, siga as Regras de Ouro abaixo à risca.
3. **Vídeo**: se vier mais de uma opção candidata (ou nenhuma com URL fechada), pesquise
   com `WebSearch` para confirmar que o vídeo existe de verdade antes de gravar a URL.
   Prefira PT-BR nativo; dublado só como fallback; nunca invente um link. Decida sozinho e
   só relate a escolha + motivo (não é necessário perguntar, a menos que nada adequado
   apareça na busca).
4. **Monte o JSON** seguindo exatamente o schema documentado no CURADORIA.md — mesmos
   nomes de campo, mesma forma de tratar `contentRef`, `quizOptions` e `roleplayNodes`.
   Se uma mensagem vier cortada (limite de caracteres), sinalize a lacuna no lugar certo e
   peça o restante — nunca invente conteúdo para preencher.
5. **Revise cada Quiz e Cloze/`MultipleChoice`** contra o checklist de 4 critérios anti-resposta-
   óbvia em CURADORIA.md seção 2.2 (espelhamento estrutural, distrator fora de assunto, resposta
   mais longa, termo repetido) — o teste prático é "dá pra eliminar as 3 erradas e acertar só de
   leitura/lógica, sem saber o assunto de verdade?". Se sim pra qualquer pergunta, reescreva os
   distratores problemáticos (nunca a resposta certa) antes de seguir. Descoberto ao vivo depois
   de várias fases já concluídas (ver nota de auditoria em CURADORIA.md seção 4) — não pular essa
   revisão em conteúdo novo.
6. **Valide** o JSON (`python3 -c "import json; json.load(open('...'))"` ou equivalente)
   antes de considerar pronto.
7. **Grave** em `secret/curadoria/<curso-slug>/semana-N/dia-N.json`.
8. **Atualize** o "Estado atual" do curso (Web Security: tabela em `CURADORIA.md`; os outros: o
   `ROTEIRO.md` do curso) marcando o dia recém-criado como concluído.

## Regras de Ouro (não negociáveis)

- **Texto Cru**: técnico, denso, direto ao ponto, baseado em RFCs/documentação oficial/
  fundamentos de engenharia — nunca um texto genérico "de IA". Sem "bem-vindos ao módulo".
  5 a 9 minutos de leitura. Deixe âncoras para analogias (motos, JDM, Valorant, CS), mas
  não escreva a analogia — isso é o motor da plataforma que injeta depois.
- **Diagramas de fluxo (opcional)**: quando o texto tiver uma sequência real de passos entre
  atores (handshake, resolução de nomes, fluxo de auth), use um bloco ` ```diagrama ` (sintaxe e
  exemplos em CURADORIA.md seção 2.1) em vez de só narrar em prosa. Nunca decorativo — só quando
  a sequência importa de verdade.
- **Resumos Falados**: 2 perguntas abertas que exigem explicação em voz alta, impossíveis
  de responder colando de um chat de IA.
- **Vídeo**: 10 a 15 minutos no máximo, PT-BR de preferência, com título + canal +
  justificativa de por que assistir.
- **Quiz** (5-6 passos): todas as alternativas tecnicamente corretas sobre o assunto — só
  uma responde ao enunciado específico. Proibido distrator obviamente errado (checklist de
  validação em CURADORIA.md seção 2.2 — ver passo 5 do Fluxo).
- **Cloze Test** (4 passos): uma lacuna exata por frase.
- **Ligar Palavras**: exatamente 3 grupos de 4 pares — Conceitos (palavra×palavra),
  Definições (frase×palavra), Processos (frase×frase).
- **Roleplay**: aluno no papel do sistema, árvore de decisão terminando em exatamente os
  3 desfechos `Ideal`/`Suboptimal`/`Poor`.
- **Sessão total** (leitura + vídeo + atividades): 30 a 60 minutos.

## Regras extras dos cursos de linguagem e ferramenta (`linux`, `python-websec`)

- **Tudo que aparece no texto foi rodado de verdade.** Todo comando, trecho de código e saída
  mostrados no Texto Cru, no Quiz ou no Cloze vêm de uma execução real, num ambiente descartável
  (`docker run --rm debian:stable-slim` pro Linux; `python:3.12-slim` pro Python), nunca de
  memória. Vale a mesma regra das pontes (CURADORIA.md 5.1): foi isso que pegou afirmações erradas antes.
- **Bloco de código em vez de prosa** pra comando e saída (` ``` ` genérico, CURADORIA.md 2.1). Prompt
  e saída no mesmo bloco, como aparece no terminal.
- **Todo dia liga a um uso em segurança.** O dia de Linux/Python não é "o comando pelo comando": uma
  seção curta diz onde aquilo aparece no Web Security (ex.: `../` → LFI na Semana 4; `/etc/passwd` →
  alvo clássico de leitura). Sem ensinar o ataque, que é assunto do Web Security.
- **Sem `CodeStep` em dia normal, por enquanto.** O `CodeStep` (Fase 79) hoje é acoplado à ponte (linguagem
  da ponte + código acumulado). Usar em dia normal exige fase de backend. Até lá, a prática entra no
  Quiz ("o que esse comando imprime?"), no Cloze ("complete o comando") e no Roleplay.
- Analogias continuam como no Web Security (âncora no texto, a plataforma injeta).
- **Distrator de quiz pode ser um equívoco típico.** Em pergunta de comportamento ("o que esse comando
  imprime?", "o que acontece se..."), a regra absoluta do Web Security (todas as alternativas
  verdadeiras) não se aplica: as erradas são o comportamento que um iniciante esperaria, sempre do
  mesmo subtema e plausíveis. Os 4 critérios da CURADORIA.md 2.2 continuam valendo sem exceção.

## Referências

- `secret/curadoria/CURADORIA.md` — filosofia, schema, roteiro completo, estado atual.
- `secret/curadoria/web-security/semana-1/dia-1.json` a `dia-4.json` — exemplos canônicos.
- `secret/curadoria/linux/semana-1/dia-1.json` — referência dos cursos de linguagem/ferramenta.
- `secret/rascunhos/trilha-pre-requisitos-linux-python.md` — origem e decisões dos cursos `linux` e
  `python-websec`.
