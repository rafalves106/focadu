# Resumo — Fase 110: Salas práticas (estilo TryHackMe, 30% teoria / 70% prática)

Rascunho com todas as decisões do dono: `secret/produto/rascunhos/salas-praticas.md`. Figma aprovado: página
"Salas práticas (proposta)" (`68:2`) do arquivo `Redesign - Focadu`.

## O que foi implementado

- **Sala** é currículo do curso, fora da Daily (decisão do dono: entidade própria). Três tipos: sala da semana,
  sala de ferramenta e sala-desafio (cada tarefa é um elo da cadeia, com `chainLabel`).
- **O ambiente roda na máquina do aluno** (Kali com desktop no navegador via KasmVNC + alvo), nunca na VM. A
  Focadu só entrega o zip (`GET /api/rooms/{id}/environment`), confere a flag e avalia os áudios.
  "Máquina ligada" é só a marcação do aluno ("Já subi a máquina" / "A máquina caiu? Desmarcar").
- **Temporária**: o `iniciar.sh` de cada sala sobe o compose e roda `docker compose down` ao sair (Ctrl+C,
  fechar o terminal ou 2 h; `LIMITE_MINUTOS` muda). Testado: desligou sozinho no tempo e no sinal.
- **Ciclo da tarefa**: teoria curta → flag (hash SHA-256 no servidor, sem caixa e espaços repetidos; errar não
  custa) → áudio de 30 a 90 s, que **trava a próxima tarefa**; nota baixa deixa seguir → devolutiva. Dicas em
  até 3 níveis, liberadas desde o início, sem desconto. Fechamento: áudio curto de "como eu corrigiria".
- **Voz**: mesmo caminho da conversa por voz do molde v1 (`IContentEvaluationService` com `Debrief`), travas
  da Fase 101 (orçamento, duração, 10 tentativas por atividade/dia), medição de IA sem Daily.
- **Importador separado** (decisão do dono): `importar-salas <curso> [--sala slug] [--dry-run] [--confirmar]`.
  Lê `secret/conteudo/<curso>/salas/<slug>/sala.json` + `ambiente/` (exige `compose.yml` e `iniciar.sh`); o
  `RoomImporter` faz as vezes de linter. Tarefa casa por `chave`: reimportar preserva o progresso; tarefa
  removida com progresso exige `--confirmar`. Pré-requisito tem de existir no curso.
- **Front**: `/salas` (lista por tipo) e `/salas/:roomId` (tarefas, flag, gravador, devolutiva, fechamento,
  resumo, mapa da invasão na sala-desafio, celular "abra no computador"). "Salas" entra na nav do
  computador entre Trilha e Squad; não aparece na barra do celular. Guia das telas: bloco `salas`.
- **Sala piloto LojaServ** (Semana 1, 6 tarefas: porta HTTPS, servidor/versão, 302 no Burp, CN do certificado,
  robots.txt, área escondida) no focadu-secret; alvo = site da ponte da Semana 1 com `/robots.txt` e `/bastidores`.

## Decisões técnicas que não estavam no pedido

- Flag fixa por sala (só hash no banco); flag por aluno fica pra quando a plataforma abrir.
- Acesso: só matriculado no curso vê as salas (mesma regra das notas). Sala trancada aparece, mas recusa
  flag, áudio e máquina (`sala_trancada`).
- O áudio não é guardado; ficam transcrição, nota e pontos a melhorar (como no resumo falado).
- Burp na imagem do Kali sem a tela de termos e sem perguntar a edição (preferências gravadas depois do
  aceite pelo dono em 16/11/2026). **Revisar antes de abrir as salas pra outros alunos.**
- O nmap do Kali precisa de `cap_add: NET_ADMIN, NET_RAW` no container.

## Estrutura

```
backend/src/Focadu.Domain/Rooms/{Room,RoomTask,RoomProgress,RoomTaskResult,RoomFlag,RoomKind}.cs
backend/src/Focadu.Domain/Repositories/IRoomRepository.cs
backend/src/Focadu.Application/Rooms/{Dtos,RoomUseCases,ImportRoomsUseCase}.cs
backend/src/Focadu.Infrastructure/Persistence/{Configurations/RoomConfiguration,Repositories/RoomRepository}.cs
backend/src/Focadu.Infrastructure/Migrations/20261116110806_Fase110SalasPraticas.cs
backend/src/Focadu.Api/{Program.cs,Contracts/RoomRequests.cs}
backend/tests/Focadu.Tests/Rooms/{RoomProgressTests,RoomImporterTests}.cs   (11 testes)
frontend/src/api/rooms.ts, lib/{roomText,useVoiceRecorder}.ts, components/rooms/RoomParts.tsx,
frontend/src/routes/{RoomsPage,RoomPage}.tsx (+ main.tsx, shellNav.ts, BottomBar.tsx, guiaTelas.ts)
secret/conteudo/web-security/salas/lojaserv/{sala.json,ambiente/}
```

## Verificação

- `dotnet test`: 893 passando. `tsc -b`, `npm run lint` (só os 2 avisos antigos) e `npm run build` limpos.
- Sala no Mac (Docker Desktop, arm64): `iniciar.sh` sobe, as 6 respostas saem do alvo pelo Kali, Burp abre sem
  termos, desliga sozinho. Desktop e Burp vistos por print (KasmVNC via Playwright).
- App local (Postgres local, API, Vite): lista, sala, máquina, flag errada, dica, flag certa, gravação com
  áudio falso, avaliação real pela Groq, próxima tarefa, celular e download do zip (permissão do `iniciar.sh`
  preservada). **Não visto por uma pessoa**: fluidez do desktop no uso, fechamento e resumo com áudio de verdade.

## Pendente

- Produção: a migration sobe no boot, mas as salas entram só com `importar-salas web-security` na VM (o
  workflow `publicar-conteudo` ainda só roda o `importar` dos dias).
- Curadoria: "Domine o nmap", "Domine o Burp Suite" e a sala-desafio "Invasão da Biblioteca Lab".
- Gamificação das salas (Gems, selo) e flag por aluno: depois.
