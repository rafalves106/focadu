---
name: curar-conteudo
description: "Cura o conteúdo didático de um dia do curso Web Security da Focadu (texto cru, resumos falados, vídeo, quiz, cloze, ligar palavras, roleplay) e grava como docs/curadoria/<curso>/semana-N/dia-N.json. Use quando o usuário pedir para curar, montar ou gerar o conteúdo de um dia/semana do curso, revisar um dia.json existente contra o briefing, ou invocar /curar-conteudo."
metadata:
  version: 1.0.0
---

# Curar Conteúdo — Web Security (Focadu)

## Antes de qualquer coisa

1. Leia **docs/curadoria/CURADORIA.md** por completo — filosofia, molde diário, schema do
   `.json`, estado atual e o roteiro completo dos 60 dias. É a fonte da verdade; este SKILL
   só orquestra o processo.
2. Leia pelo menos um `dia-N.json` já pronto (ex: `docs/curadoria/web-security/semana-1/dia-1.json`)
   como referência viva de estrutura e tom — a Semana 1 é a referência de qualidade.
3. Olhe a pasta `docs/curadoria/web-security/semana-N/` para descobrir o que já existe e
   qual é o próximo `dayNumber` sem arquivo (cheque também a seção "Estado atual" do
   CURADORIA.md).

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
5. **Valide** o JSON (`python3 -c "import json; json.load(open('...'))"` ou equivalente)
   antes de considerar pronto.
6. **Grave** em `docs/curadoria/<curso-slug>/semana-N/dia-N.json` (curso piloto:
   `web-security`).
7. **Atualize** a tabela "Estado atual" em `docs/curadoria/CURADORIA.md` marcando o dia
   recém-criado como concluído.

## Regras de Ouro (não negociáveis)

- **Texto Cru**: técnico, denso, direto ao ponto, baseado em RFCs/documentação oficial/
  fundamentos de engenharia — nunca um texto genérico "de IA". Sem "bem-vindos ao módulo".
  5 a 9 minutos de leitura. Deixe âncoras para analogias (motos, JDM, Valorant, CS), mas
  não escreva a analogia — isso é o motor da plataforma que injeta depois.
- **Resumos Falados**: 2 perguntas abertas que exigem explicação em voz alta, impossíveis
  de responder colando de um chat de IA.
- **Vídeo**: 10 a 15 minutos no máximo, PT-BR de preferência, com título + canal +
  justificativa de por que assistir.
- **Quiz** (5-6 passos): todas as alternativas tecnicamente corretas sobre o assunto — só
  uma responde ao enunciado específico. Proibido distrator obviamente errado.
- **Cloze Test** (4 passos): uma lacuna exata por frase.
- **Ligar Palavras**: exatamente 3 grupos de 4 pares — Conceitos (palavra×palavra),
  Definições (frase×palavra), Processos (frase×frase).
- **Roleplay**: aluno no papel do sistema, árvore de decisão terminando em exatamente os
  3 desfechos `Ideal`/`Suboptimal`/`Poor`.
- **Sessão total** (leitura + vídeo + atividades): 30 a 60 minutos.

## Referências

- `docs/curadoria/CURADORIA.md` — filosofia, schema, roteiro completo, estado atual.
- `docs/curadoria/web-security/semana-1/dia-1.json` a `dia-4.json` — exemplos canônicos.
