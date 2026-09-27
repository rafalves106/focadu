# Resumo — Fase 77: Squad com pedidos de entrada

## O que foi implementado

Fase B de `secret/rascunhos/plano-pendencias-26-09-2026.md`, decisões do dono em
`secret/rascunhos/squad-aprovacao-reentrada.md` (26/09) e desenho aprovado no Figma "Squad: pedidos de
entrada — v2 (proposta)" (01 QG do líder `162:4503`, 02 recusa `163:7048`, 03 pedido enviado `163:7586`,
04 recusado `163:8335`, notas `164:10841`).

- **Ninguém entra direto**: o código de convite vira um pedido (`SquadJoinRequest`) que o líder ou o
  colíder aceita. Squads que já existiam não mudam; só as entradas novas pedem.
- **Recusar bane** a pessoa daquele squad (409 `pedido_recusado` ao pedir de novo), e o líder/colíder pode
  **desfazer a recusa** (a pessoa volta a poder pedir, não entra direto).
- **Vence em 7 dias**, calculado na leitura (sem cron). **Um pedido por vez**: pedir pra outro squad cancela
  o anterior, pedir de novo pro mesmo devolve o mesmo pedido, criar um squad cancela o pedido.
- **QG do líder/colíder**: o cartão do feed ganhou as abas "Atividades | Notificações" (contador de pedidos
  abertos). Notificações: pedidos com Recusar / Aceitar (recusar pede confirmação da Focada) e os avisos das
  decisões dos últimos 30 dias (aceito por quem, recusado por quem, recusa desfeita) com "Desfazer recusa".
- **Menu**: contador vermelho no Squad pra líder e colíder com pedido aberto (desktop no ícone, celular na
  lista), atualizado a cada tela e quando o QG decide um pedido.
- **Quem pediu (sem squad)**: "Pedido enviado" no lugar de "Entrar com código" (aguardando, há quanto
  tempo, vence em N dias, Cancelar pedido); recusado mostra o aviso em vermelho no cartão. "Criar um squad
  cancela o pedido" aparece no cartão de criar enquanto há pedido.
- **Guia das telas**: item "Notificações" no QG e a pergunta "Como eu entro num squad?".

## Decisões técnicas tomadas que não estavam no prompt original

- Status guardado como texto (`Pending`, `Accepted`, `Rejected`, `Cancelled`, `RejectionUndone`), como
  `Users.PreferredLanguages`; na API vai em minúsculas ("pending"...), no estilo de `SquadActivityDto.Type`.
- Avisos só das decisões de pedidos: "saiu do squad" e "virou colíder" precisariam de um histórico de
  eventos que não existe (combinado no Figma).
- Regras puras em `SquadJoinRules` (decidir o que fazer ao pedir, quem pode decidir, o que a pessoa vê)
  pra testar sem repositório. Não-líder pedindo a lista recebe 404 `squad_nao_encontrado`, mesmo padrão dos
  outros casos de uso do líder.
- Aceitar confere de novo se a pessoa entrou em outro squad nesse meio-tempo (aí cancela o pedido e dá 409).
- `POST /api/squads/join` passou a devolver `SquadJoinRequestDto` (antes `SquadDto`).
- Contador do menu por `GET /api/squads/me/requests/count` (0 pra quem não lidera) e um evento de janela
  (`lib/squadRequestsEvents.ts`) pro menu buscar de novo depois de uma decisão.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Enums/SquadJoinRequestStatus.cs
backend/src/Focadu.Domain/Squads/SquadJoinRequest.cs
backend/src/Focadu.Application/Squads/SquadJoinRules.cs, SquadJoinRequestStatusName.cs,
    MySquadJoinRequestUseCases.cs, SquadJoinRequestsUseCases.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/SquadJoinRequestConfiguration.cs
backend/src/Focadu.Infrastructure/Migrations/20260927163146_SquadJoinRequests.cs
backend/tests/Focadu.Tests/Squads/SquadJoinRequestTests.cs
frontend/src/components/squad/SquadRequests.tsx
frontend/src/lib/squadRequestsEvents.ts
```

Alterados: `JoinSquadUseCase`, `CreateSquadUseCase`, `ISquadRepository`/`SquadRepository`, `FocaduDbContext`,
`DependencyInjection`, `Program.cs`; no front `SquadFeed`, `SquadPage`, `NoSquadView`, `GlobalNav`,
`api/types.ts`, `api/client.ts`, `lib/guiaTelas.ts` e `mock/sessionMock.ts`.

## Testes

- `dotnet test`: 539 passando (11 novos em `SquadJoinRequestTests`: vencimento, transições, banimento,
  recusa desfeita, pedido repetido, troca de squad, o que a pessoa vê, quem decide).
- **API de verdade contra um Postgres descartável** (container próprio na porta 55439, API local na 5299,
  sem Groq/Forgejo; removidos no fim, produção conferida intacta): migrations do zero, 3 usuários reais -
  pedir, pedir de novo (mesmo pedido), aceitar (entra no QG), membro comum sem acesso à lista (404),
  recusar, pedir de novo recusado (409), desfazer, pedir de novo, cancelar (204 no "meu pedido"), ação
  inválida (400), colíder vendo o contador e aceitando.
- `tsc -b`, `oxlint` sem aviso novo, `npm run build`.
- Playwright + Chrome no mock: contador "2" no menu, abas no QG do líder, aceitar põe a pessoa na
  escalação, recusar com a confirmação da Focada, desfazer recusa, contador zera; membro comum sem a aba;
  sem squad → pedir → "Pedido enviado" → cancelar volta o formulário; recusado mostra o aviso; QG do líder
  sem rolagem em 1440×900, 1366×768, 1280×720 e 1024×768. Mock: `/__mock/squad?as=lider`,
  `/__mock/squad?as=nenhum&pedido=pendente|recusado`.

## Dúvidas ou pontos abertos para a próxima fase

- Quem pediu não recebe aviso de "aceito" fora do app: descobre ao abrir o /squad (cai no QG).
- Pedidos vencidos ficam no banco como `Pending` (só somem da tela); podem ser limpos depois se crescerem.
