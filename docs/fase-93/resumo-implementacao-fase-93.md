# Resumo — Fase 93: Cadastro só com convite de tester e confirmação de e-mail por código

Branch própria (`fase-93-convite-e-verificacao`), a pedido do dono em 08/10/2026. Telas aprovadas no Figma
"Focadu — Pixel Art" (`iNwXFcYXDajxkkhmyEr1gd`): "Cadastro por convite — v3" (página `253:4502`) e
"Verificação de e-mail — v1" (página `256:4502`). Origem: `secret/produto/rascunhos/cadastro-so-com-convite-teste-fechado.md`.

## O que foi implementado

- **Convite de tester** (`SignupInvite`: código de 8 caracteres, anotação, usos, validade, revogação).
  Com `Signup:InviteOnly` ligada, `POST /api/auth/register` sem convite responde `convite_obrigatorio`.
  Convite inválido, vencido ou esgotado responde `convite_invalido`, `convite_expirado` ou `convite_esgotado`, todos com a
  mesma mensagem pro aluno. O convite é gasto no mesmo `SaveChanges` que cria o `User`.
- **Comando `convite`** na Api: `convite "pra quem" [--usos N] [--dias N]` cria e imprime o código e o link
  `/login?convite=CODIGO`; `--listar` e `--revogar CODIGO`. Sem endpoint de admin.
- **Confirmação de e-mail** (`EmailVerificationCode` + `User.EmailVerifiedAt`): código de 6 dígitos que vale 15 min, no
  máximo 5 tentativas, espera de 60 s entre envios, só o código mais recente vale. Com
  `Signup:EmailVerification` ligada, a política padrão de autorização exige a claim `email_verified=true` no JWT; quem não
  confirmou recebe 403 `email_nao_verificado` em toda rota, menos `/auth/me` e as do código. Contas antigas também
  precisam confirmar (decisão do dono, 08/10/2026).
- **Endpoints**: `GET /api/auth/signup-status`, `POST /api/auth/email-verification/send` (`force`),
  `POST /api/auth/email-verification/confirm` (troca o cookie por um token já confirmado). As respostas de auth
  trazem `emailVerificationPending`.
- **Front**: aba "Criar conta" com cadastro fechado (aviso, "Tenho convite de tester", contato), campo do código que libera o
  formulário com 8 caracteres, `?convite=` preenchido. Tela nova `/confirmar-email` com 6 casas (colar preenche tudo),
  reenviar com contagem, "Sair e usar outra conta", aviso para quem já tinha conta. `ProtectedRoute` e
  `resolveLandingPath` mandam a sessão pendente para lá; 403 `email_nao_verificado` em qualquer chamada também.
  Guia das telas: item "Convite de tester" no login e tela nova `confirmar`.
- **Config**: `SIGNUP_INVITE_ONLY`, `SIGNUP_EMAIL_VERIFICATION`, `SIGNUP_CONTACT_EMAIL` no `docker-compose.yml` e
  `.env.example` (desligados por padrão; em produção vão `true` no `.env`).

## Decisões técnicas tomadas que não estavam no prompt original

- **Corrida pelo último uso do convite**: concorrência otimista pelo `xmin` do Postgres no `SignupInvite`. `UnitOfWork`
  converte `DbUpdateConcurrencyException` que envolve `SignupInvite` em `convite_esgotado` (testado ao vivo: 3 cadastros
  simultâneos, 1 passou).
- **Código do convite com `RandomNumberGenerator`** (`UniqueCodeGenerator.GenerateSecureAsync`), não `Random.Shared`:
  o convite libera cadastro.
- **Bloqueio por claim no JWT, não por consulta ao banco**: barato e cobre token antigo (sem a claim conta como não
  confirmado). A claim reflete o estado real; a exigência depende da chave, então desligar a chave libera todo mundo
  sem trocar token.
- **O e-mail sai antes de gravar o código**: SMTP falhou, nada fica salvo e o aluno tenta de novo na hora.
- **Abrir a tela não manda e-mail de novo** se o código atual ainda vale (`force=false`); só "Reenviar" força.
- **Hash do código leva o `UserId`**; `codigo_bloqueado` responde 429.
- **Cadastro sem convite com a chave desligada** continua passando; convite preenchido ainda é validado e gasto
  (decisão de 02/10).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Users/{SignupInvite,EmailVerificationCode}.cs
backend/src/Focadu.Domain/Repositories/{ISignupInviteRepository,IEmailVerificationCodeRepository}.cs
backend/src/Focadu.Application/Shared/{SignupOptions,EmailVerificationCodeGenerator}.cs
backend/src/Focadu.Application/Ports/IEmailVerificationSender.cs
backend/src/Focadu.Application/Users/{SendEmailVerificationUseCase,ConfirmEmailVerificationUseCase,SignupInviteUseCases}.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/{SignupInvite,EmailVerificationCode}Configuration.cs
backend/src/Focadu.Infrastructure/Persistence/Repositories/{SignupInvite,EmailVerificationCode}Repository.cs
backend/src/Focadu.Infrastructure/Services/SmtpEmailVerificationSender.cs
backend/src/Focadu.Infrastructure/Migrations/20261008225832_Fase93ConviteEVerificacaoEmail.cs
backend/tests/Focadu.Tests/Users/{SignupInviteTests,EmailVerificationCodeTests}.cs
frontend/src/routes/ConfirmEmailPage.tsx
```

## Testes

- Domínio: `SignupInviteTests` (uso único, vencido, sem validade, revogado, mesma mensagem nos três erros) e
  `EmailVerificationCodeTests` (acerto, tentativas até bloquear, vencido, hash por usuário, 6 dígitos, normalização,
  espera do reenvio, `MarkEmailVerified`, `SignupOptions`). Suíte: 690 passam; 3 falhas são de testes que leem o
  conteúdo do Linux em `secret/` (`TerminalMissionImporterTests`, `CuratedCourseImporterTests.BridgeDays_*`), sem
  relação com esta fase.
- Ao vivo (Postgres local, chaves ligadas, Mailpit como SMTP): status, cadastro sem convite, convite inexistente,
  convite certo (minúsculo), esgotado, 403 antes de confirmar, envio sem forçar não repete, espera do reenvio,
  código errado, código certo colado com espaço, 200 depois, 5 erros → 429, revogar, listar, corrida.
- Front: `tsc -b`, `oxlint` e `build` passam. **Sem verificação visual no navegador** (sessão sem navegador).

## Dúvidas ou pontos abertos para a próxima fase

- **E-mail de contato** da tela de cadastro fechado: falta o dono dizer qual (vai em `SIGNUP_CONTACT_EMAIL`; vazio esconde o
  quadro). O Figma tinha WhatsApp também; o dono escolheu só e-mail.
- **Ligar em produção**: pôr `SIGNUP_INVITE_ONLY=true`, `SIGNUP_EMAIL_VERIFICATION=true` e `SIGNUP_CONTACT_EMAIL` no `.env`
  da VM antes do merge, e conferir o SMTP de produção (sem ele ninguém confirma e todo mundo fica preso).
- O e-mail do código é texto puro; o quadro 06 do Figma (visual escuro, logo) fica para depois.
- Quadros de celular não foram desenhados; a tela usa o mesmo cartão responsivo do login.
- Rate limit por IP em login/cadastro segue pendente (`pauta-estrategica-produto.md`).
