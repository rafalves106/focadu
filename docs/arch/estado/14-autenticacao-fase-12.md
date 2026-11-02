## Autenticacao (Fase 12)

A partir desta fase o app deixa de ser mono-usuario hardcoded - `User` (email/senha/nome) e
sessao real via JWT. Fundacao apenas: nenhum endpoint de curso/weekly/daily foi protegido ainda
(ver "Fora de escopo" abaixo) - isso e trabalho da Fase 13, quando esses endpoints passarem a
filtrar por usuario matriculado.

- **Senha**: hash via `BCrypt.Net-Next` (`BCryptPasswordHasher`), nunca armazenada em texto puro.
- **Sessao**: JWT (claims `sub`=userId, `email`; expira em 7 dias) entregue via **cookie
  `focadu_auth`, `HttpOnly`** - nunca acessivel via JS (mais seguro contra XSS que guardar o token
  em `localStorage` e mandar via header `Authorization`). `Secure=true` so fora de
  `IsDevelopment()` (exige HTTPS - em dev local, `http://localhost`, isso quebraria o cookie).
  `SameSite=Lax` (suficiente pro cenario atual: front e back em portas diferentes do mesmo host,
  sem cross-site de verdade).
- **Validacao do token**: feita inteiramente pelo middleware `JwtBearer` do ASP.NET Core
  (`AddAuthentication().AddJwtBearer(...)`, `Program.cs`), configurado pra ler o token do cookie
  (`OnMessageReceived`) em vez do header padrao `Authorization`. `IJwtTokenService` (Application/
  Infrastructure) **so gera** o token - nao tem um metodo de validacao manual, porque o middleware
  ja cobre isso antes de qualquer endpoint rodar.
- **`options.MapInboundClaims = false`** (gotcha do .NET) - sem isso, o `JwtSecurityTokenHandler`
  remapeia a claim curta `"sub"` pra uma URI longa de `ClaimTypes.NameIdentifier` por baixo dos
  panos (comportamento legado da lib), quebrando `principal.FindFirstValue(JwtRegisteredClaimNames.Sub)`
  no endpoint `/me` silenciosamente. Verificado ao vivo antes de fechar a fase.
- **401 com o mesmo envelope de erro do resto da Api**: o challenge de autenticacao (sem cookie /
  token expirado) acontece no middleware, antes do endpoint rodar - `ApiExceptionHandler` nunca
  veria essa falha. Por isso `JwtBearerEvents.OnChallenge` escreve `{error:"nao_autenticado",
  message:"..."}` manualmente, no mesmo formato de qualquer outro erro da Api.
- **`credenciais_invalidas` nunca diferencia "email nao existe" de "senha errada"** (boa pratica
  basica de seguranca - nao da pista de quais emails estao cadastrados). Usa `DomainException` com
  `Code` proprio (mapeado pra 401 em `ApiExceptionHandler.DomainCodeStatusOverrides`) em vez de
  `ValidationException`, que sempre mapeia pra 400 sem mecanismo de override por `Code`.
- **CORS precisou de `AllowCredentials()`** - sem isso, o navegador nunca manda o cookie de volta
  nas requisicoes, mesmo autenticado. Exige origem explicita (`WithOrigins`, ja era o caso aqui) -
  nao pode conviver com `AllowAnyOrigin` por especificacao do CORS.

### Como configurar a chave JWT

Mesmo mecanismo de configuracao de `Groq:ApiKey`/`GitHub:Token` (user-secrets em dev, variavel de
ambiente em producao/CI, nunca em `appsettings.json`) - **mas, diferente dos dois, ausente derruba
o boot da Api** (mesmo tratamento que a connection string): autenticacao e fundacao a partir desta
fase, nao uma integracao opcional - sem a chave, nenhum login/registro/sessao funcionaria.

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "Jwt:SecretKey" "uma-chave-longa-e-aleatoria-aqui"
```

### Redefinicao de senha (Fase 41)

`User` nao tinha nenhum jeito de recuperar acesso perdido - `LoginPage.tsx` chegou a documentar
isso como decisao deliberada ("Esqueci minha senha - sem fluxo de recuperacao de senha construido,
nao deixado como link morto"), porque nao havia infraestrutura de email nenhuma no projeto. Esta
fase implementa o fluxo completo:

- **`PasswordResetToken`** (`Focadu.Domain.Users`) - aggregate root proprio (nao filho de `User`),
  guarda so `UserId` + `TokenHash` (SHA-256, nunca o token em texto puro - mesmo raciocinio de
  `User.PasswordHash`) + `ExpiresAt`/`UsedAt`. `Consume(now)` valida (nao usado, nao expirado - 1h
  de validade, definida em `RequestPasswordResetUseCase`) e marca `UsedAt` na mesma chamada -
  nunca reaproveitavel, mesmo se a troca de senha em si falhar depois.
- **`PasswordResetTokenGenerator`** (`Focadu.Application.Shared`, internal static, testado direto)
  - `RandomNumberGenerator` (nao `Random.Shared` como `UniqueCodeGenerator`): este token protege
  troca de senha/acesso a conta, precisa ser imprevisivel, nao so "nao repetido" como um codigo de
  indicacao. 32 bytes aleatorios, base64url; `Hash()` e SHA-256 simples (nao BCrypt) - a entropia
  do token sozinha ja torna brute-force inviavel, sem precisar do hashing lento de senha.
- **`RequestPasswordResetUseCase`** (`POST /auth/forgot-password`) - nunca revela se o email existe
  (mesmo raciocinio de `credenciais_invalidas`): sempre 200, so gera token + manda email quando o
  usuario existe de verdade.
- **`ResetPasswordUseCase`** (`POST /auth/reset-password`) - valida o token (`token_invalido`/
  `token_expirado`) e a forca da nova senha (reaproveita `RegisterUserUseCase.ValidatePassword`,
  nunca duplicada), troca o hash (`User.SetPasswordHash`, mutator novo) e marca o token usado, tudo
  antes de 1 `SaveChangesAsync`.
- **`IPasswordResetEmailSender`** (port, `Focadu.Application.Ports`) - recebe o token em TEXTO PURO
  (unico lugar que ve essa versao) e quem monta o link final (dominio do frontend + rota
  `/redefinir-senha?token=`) e o adapter concreto, nao a Application - mesma decisao de
  `GitHubService` conhecer sua propria `BaseAddress`. Adapter: `SmtpPasswordResetEmailSender`
  (`Focadu.Infrastructure.Services`) via `System.Net.Mail.SmtpClient` puro (sem lib de terceiro) -
  generico, funciona com qualquer provedor SMTP (Gmail com senha de app, Outlook, etc), decisao
  tomada em vez de uma API transacional (Resend/SendGrid) pra nao amarrar a um servico novo nem
  exigir criar conta antes de funcionar.
- **`Smtp:*`/`Frontend:BaseUrl`** (config) - mesma decisao do Groq/GitHub: `Smtp:Host` ausente nao
  impede o app de subir, so o envio falha (com erro claro, `smtp_nao_configurado`) quando de fato
  chamado. `Frontend:BaseUrl` default `http://localhost:5173` (dev) - **producao
  precisa configurar de verdade** (env var `FRONTEND_BASE_URL`, ver `docs/DOCKER.md`), senao o
  link do email aponta pro localhost de quem hospeda o backend, inutil pra quem recebe o email.

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets set "Smtp:Port" "587"
dotnet user-secrets set "Smtp:User" "seu-email@gmail.com"
dotnet user-secrets set "Smtp:Password" "sua-senha-de-app"  # nao a senha normal da conta, ver https://myaccount.google.com/apppasswords
dotnet user-secrets set "Frontend:BaseUrl" "http://localhost:5173"
```

### Cadastro so com convite e confirmacao de e-mail (Fase 93)

Duas chaves, desligadas por padrao e ligadas no `.env` de producao (`SignupOptions`, Application.Shared):
`Signup:InviteOnly`, `Signup:EmailVerification` e `Signup:ContactEmail` (env `SIGNUP_INVITE_ONLY`,
`SIGNUP_EMAIL_VERIFICATION`, `SIGNUP_CONTACT_EMAIL` no compose). `GET /api/auth/signup-status` (anonimo) devolve as tres
pro front.

- **`SignupInvite`** (tabela `SignupInvites`): `Code` (8 caracteres, unico, `RandomNumberGenerator` via
  `UniqueCodeGenerator.GenerateSecureAsync`), `Note`, `MaxUses`, `UsedCount`, `ExpiresAt?`, `RevokedAt?`. `Consume(now)`
  lanca `convite_invalido`/`convite_expirado`/`convite_esgotado`, todos com a mesma mensagem. `RegisterUserUseCase`
  confere e gasta o convite antes de criar o `User`, no mesmo `SaveChanges`. Concorrencia otimista por `xmin`;
  `UnitOfWork` traduz o conflito do `SignupInvite` em `convite_esgotado`. Com a chave ligada, cadastro sem convite =
  `convite_obrigatorio`; desligada, convite preenchido ainda e conferido.
- **Comando `convite`** (Program.cs): `convite "pra quem" [--usos N] [--dias N]` (padrao 1 uso, 7 dias; desde a Fase 94
  1 a 20 usos e 1 a 30 dias, sempre vence - `SignupInvite.MaxUsesLimit`/`MaxValidDays`), `convite --listar`,
  `convite --revogar CODIGO`. Desde a Fase 94 tambem pela aba Convites do Painel de gestao. Na VM: `docker compose exec backend dotnet Focadu.Api.dll convite ...`.
- **`EmailVerificationCode`** (tabela `EmailVerificationCodes`) + `User.EmailVerifiedAt`: 6 digitos, so o hash
  (SHA-256 de `userId:codigo`), 15 min, 5 tentativas (`codigo_invalido` 400, depois `codigo_bloqueado` 429), so o
  mais recente vale. `POST /auth/email-verification/send {force}`: sem `force` so manda se nao ha codigo valendo; com
  `force` respeita 60 s entre envios; o e-mail (`SmtpEmailVerificationSender`, mesmo `Smtp:*`) sai antes de gravar.
  `POST /auth/email-verification/confirm {code}` marca `EmailVerifiedAt` e troca o cookie.
- **Bloqueio**: o JWT leva a claim `email_verified`. Com `Signup:EmailVerification` ligada, a `DefaultPolicy` (todo
  `RequireAuthorization()`) exige `email_verified=true`; `/auth/me` e as rotas do codigo usam a politica
  `SessaoSemEmailConfirmado`. Falha = 403 `{error:"email_nao_verificado"}` (`JwtBearerEvents.OnForbidden`). Token sem
  a claim (de antes da fase) conta como nao confirmado - contas antigas confirmam no proximo acesso.
- **Front**: as respostas de auth trazem `emailVerificationPending`; `ProtectedRoute`, `resolveLandingPath` e o 403 no
  `api/client.ts` mandam pra `/confirmar-email` (`ConfirmEmailPage`). Login: aba "Criar conta" fechada com
  "Tenho convite de tester" e `?convite=CODIGO`.
- `resetar-usuarios` tambem apaga `EmailVerificationCodes`; `SignupInvites` nao (nao sao do usuario).