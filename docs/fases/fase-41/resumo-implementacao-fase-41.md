# Resumo — Fase 41: Redefinição de Senha ("Esqueci minha senha")

## O que foi implementado

- **Backend**:
  - `PasswordResetToken` (Domain, `Focadu.Domain.Users`) - aggregate root próprio, guarda
    `UserId` + `TokenHash` (SHA-256) + `ExpiresAt`/`UsedAt`. `Consume(now)` valida (não usado, não
    expirado) e marca usado na mesma chamada.
  - `User.SetPasswordHash(newHash)` - novo mutator no domínio.
  - `PasswordResetTokenGenerator` (Application, internal static) - gera token aleatório
    (`RandomNumberGenerator`, 32 bytes, base64url) e seu hash (SHA-256).
  - `RequestPasswordResetUseCase` (`POST /api/auth/forgot-password`) - nunca revela se o email
    existe, sempre 200.
  - `ResetPasswordUseCase` (`POST /api/auth/reset-password`) - valida token + força da senha
    (reaproveita `RegisterUserUseCase.ValidatePassword`), troca o hash, marca o token usado.
  - `IPasswordResetEmailSender` (port) + `SmtpPasswordResetEmailSender` (adapter, `SmtpClient`
    puro do .NET, sem lib de terceiro) - monta o link final (`Frontend:BaseUrl` +
    `/redefinir-senha?token=`).
  - `Smtp:*`/`Frontend:BaseUrl` (config, mesmo padrão de Groq/GitHub - ausente não impede o boot,
    só o envio falha com erro claro quando chamado).
  - Migration `AddPasswordResetTokens` (tabela nova, índice único em `TokenHash`).
  - Novos códigos de erro: `token_invalido`/`token_expirado` (400) em
    `ApiExceptionHandler.DomainCodeStatusOverrides`.
- **Frontend**:
  - `ForgotPasswordPage`/`ForgotPasswordForm` (`/esqueci-senha`) e `ResetPasswordPage`/
    `ResetPasswordForm` (`/redefinir-senha?token=`), fora do `<ProtectedRoute/>`.
  - `api.forgotPassword`/`api.resetPassword` no client tipado.
  - `LoginPage`: link "Esqueci minha senha" adicionado (antes deliberadamente ausente, comentário
    removido); não faz parte do node de Figma original.
- **Docker/config**: `SMTP_*`/`FRONTEND_BASE_URL` em `.env.example` e nos dois `docker-compose*.yml`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Envio via SMTP genérico** (`System.Net.Mail.SmtpClient`), não uma API transacional (Resend/
  SendGrid/Mailgun) nem um stub sem envio real - decisão do usuário entre as três opções
  apresentadas, pra funcionar com qualquer provedor que ele já tenha (ex: Gmail com senha de app)
  sem amarrar a um serviço novo nem exigir criar conta antes de funcionar.
- **Token de reset com entropia própria** (`RandomNumberGenerator`, não `Random.Shared` como o
  `UniqueCodeGenerator` existente de referral/join code) - este token protege troca de senha/
  acesso à conta, não é só um código "não repetido".
- **Hash do token via SHA-256 simples, não BCrypt** - a entropia do token (32 bytes aleatórios) já
  torna brute-force inviável; hashing lento de senha seria desperdício aqui.
- **`IPasswordResetEmailSender` recebe o token em texto puro, não o link pronto** - quem monta o
  link final (domínio do frontend) é o adapter concreto (Infrastructure), não a Application, que
  nunca precisa saber de rota de frontend. Mesma decisão de `GitHubService` conhecer sua própria
  `BaseAddress`.
- **`Frontend:BaseUrl` como config nova** (não existia nenhuma forma do backend saber onde o
  frontend está hospedado) - default `http://localhost:5173` em dev; produção/homologação
  precisam configurar via env var `FRONTEND_BASE_URL`, documentado em `docs/DOCKER.md` como
  passo obrigatório antes do primeiro uso real do fluxo (sem isso o link do email aponta pro
  localhost de quem hospeda o backend).
- **`/auth/forgot-password` sempre responde 200**, mesmo para email não cadastrado - mesmo
  raciocínio de `credenciais_invalidas` em `LoginUserUseCase` (nunca dar pista de quais emails
  existem).
- **Reaproveitado `RegisterUserUseCase.ValidatePassword`** (internal static) em vez de duplicar a
  regra de tamanho mínimo de senha.

## Estrutura de arquivos criada

```
backend/src/
  Focadu.Domain/Users/PasswordResetToken.cs
  Focadu.Domain/Repositories/IPasswordResetTokenRepository.cs
  Focadu.Application/Ports/IPasswordResetEmailSender.cs
  Focadu.Application/Shared/PasswordResetTokenGenerator.cs
  Focadu.Application/Users/RequestPasswordResetUseCase.cs
  Focadu.Application/Users/ResetPasswordUseCase.cs
  Focadu.Infrastructure/Services/SmtpOptions.cs
  Focadu.Infrastructure/Services/FrontendOptions.cs
  Focadu.Infrastructure/Services/SmtpPasswordResetEmailSender.cs
  Focadu.Infrastructure/Persistence/Configurations/PasswordResetTokenConfiguration.cs
  Focadu.Infrastructure/Persistence/Repositories/PasswordResetTokenRepository.cs
  Focadu.Infrastructure/Migrations/20260916204933_AddPasswordResetTokens.cs (+ .Designer.cs)

backend/tests/Focadu.Tests/
  Users/PasswordResetTokenTests.cs
  Shared/PasswordResetTokenGeneratorTests.cs
  (UserTests.cs e AuthRequests/DependencyInjection/Program.cs/ApiExceptionHandler/appsettings.json
   editados in-place, não criados)

frontend/src/
  components/auth/ForgotPasswordForm.tsx
  components/auth/ResetPasswordForm.tsx
  routes/ForgotPasswordPage.tsx
  routes/ResetPasswordPage.tsx
  (api/types.ts, api/client.ts, main.tsx, routes/LoginPage.tsx editados in-place)
```

## Testes

- `dotnet test tests/Focadu.Tests/Focadu.Tests.csproj` - 359 testes passando (incluindo os novos:
  `PasswordResetTokenTests` - criação, `Consume` válido/já-usado/expirado; `UserTests.SetPasswordHash_*`;
  `PasswordResetTokenGeneratorTests` - token URL-safe/alta entropia, não-determinístico entre
  chamadas, hash determinístico).
- `dotnet build Focadu.slnx` - build limpo (só warnings pré-existentes de conflito de versão de
  pacote NuGet, não relacionados a esta fase).
- `dotnet ef migrations add AddPasswordResetTokens` gerado com sucesso (sem precisar de Postgres
  rodando, via `FocaduDbContextFactory`).
- Frontend: `tsc --noEmit`, `npm run build` e `npm run lint` (`oxlint`) limpos - só 1 warning
  pré-existente em `TodayPage.tsx`, não relacionado.
- **Não testado manualmente com SMTP real de ponta a ponta** (nenhuma credencial de SMTP
  disponível nesta sessão) - ver "Dúvidas" abaixo.
- Sem testes de use case (`RequestPasswordResetUseCase`/`ResetPasswordUseCase`) - mesma regra já
  estabelecida do projeto: `Focadu.Tests` só cobre domínio puro e funções `internal static` da
  Application, sem fakes de repositório.

## Dúvidas ou pontos abertos para a próxima fase

- **`FRONTEND_BASE_URL` ainda não configurado em produção/homologação** - precisa ser preenchido
  no `.env` real do host (`falveshub-server`) com o domínio público de verdade antes do fluxo
  funcionar de ponta a ponta fora do localhost; sem isso o link do email fica inútil.
- **Credenciais de SMTP reais não configuradas nem testadas nesta sessão** - o usuário escolheu
  SMTP genérico (ex: Gmail com senha de app) na hora de decidir a abordagem, mas ainda precisa
  gerar/configurar essas credenciais via `dotnet user-secrets` (dev) ou `SMTP_*` no `.env` (deploy).
  Sem isso, `POST /api/auth/forgot-password` continua respondendo 200 normalmente, mas o envio de
  fato falha com `smtp_nao_configurado`/`smtp_envio_falhou` (500 seria incorreto - hoje isso vira
  `ExternalServiceException`, 502, sem tratamento especial no frontend além da mensagem genérica
  de erro do `ForgotPasswordForm` - aceitável já que o pedido nunca deveria falhar de verdade uma
  vez configurado).
- **Nenhum rate limiting no `/forgot-password`** - hoje qualquer um pode disparar múltiplos emails
  pro mesmo endereço repetidamente (cada chamada gera um novo token, o anterior continua válido
  até expirar ou ser usado). Não implementado por não ter sido pedido nem parecer crítico pro
  estágio atual do app (poucos usuários, sem histórico de abuso) - fica como possível melhoria
  futura se abuso for observado na prática.
- **Tokens expirados/usados não são limpos do banco** (sem job de limpeza) - tabela pequena o
  suficiente pra não importar no volume atual de usuários; revisar se isso mudar.
