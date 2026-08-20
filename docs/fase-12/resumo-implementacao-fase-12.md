# Resumo — Fase 12: Fundação de Autenticação (Backend) + Splash & Login/Registro (UI)

## Validação de design: os 2 nodes bateram com o rótulo - mas com elementos decorativos fora de escopo

| Node | Rótulo esperado | Conteúdo real do node |
|---|---|---|
| `19-1707` | Splash / Loading | ✅ Badge "FOCADU", versão, barra de progresso, "Preparando seu cockpit..." |
| `19-8` | Login / Registro | ✅ Abas Entrar/Criar Conta, campos de email/senha, exatamente como esperado |

Os dois nodes em si batem com o rótulo - diferente da Fase 10 (conteúdo trocado) e parecido com a
Fase 11 (fundo decorativo fabricado), o node `19-8` (Login/Registro) tem elementos que **não
correspondem a nada que esta fase constrói**, mantendo a estética "cockpit" iniciada na Fase 11:

- Rodapé "System stable | LATENCY: 14ms" no painel esquerdo - telemetria falsa, não existe
  monitoramento real de sistema no backend. **Omitido.**
- Botões de login social (GitHub/Google) - o prompt desta fase especifica só email+senha, sem
  OAuth. **Omitidos** (nenhum dos dois endpoints/fluxos existe).
- Link "Esqueci minha senha" - explicitamente fora de escopo no próprio prompt ("Sem 'esqueci
  minha senha' nesta fase"). **Omitido** - por convenção já estabelecida no projeto (Fase 10),
  nunca se deixa um botão/link que não leva a lugar nenhum.
- Campo de email pré-preenchido no mockup (`falves.dev@gmail.com`) - é só o estado "preenchido" do
  mockup, não uma instrução pra hardcodar esse valor; usado como `placeholder`, não como valor.

Mantido: layout de duas colunas (painel de marca + formulário), toggle "MOSTRAR/OCULTAR" de senha
(barato de implementar, não depende de nada que não existe), tom/paleta visual.

## O que foi implementado

### Backend

- **`User`** (Domain, novo): `Email`/`PasswordHash`/`DisplayName`/`CreatedAt`. `User.Create`
  valida formato básico de email (regex simples) e `DisplayName` não vazio - nunca valida
  unicidade (isso exige consultar o repositório, é responsabilidade da Application). Email é
  normalizado (trim + lowercase) na criação.
- **`IUserRepository`** (Domain) + **`UserRepository`**/**`UserConfiguration`** (Infrastructure) -
  `Email` com índice único no banco (mesma garantia em 2 camadas: normalização+índice; nenhuma
  delega 100% na outra).
- **`IPasswordHasher`**/**`BCryptPasswordHasher`**: hash via `BCrypt.Net-Next`, work factor
  default da lib.
- **`IJwtTokenService`**/**`JwtTokenService`**: gera o JWT (claims `sub`/`email`, expiração 7
  dias). **Só gera** - não tem `ValidateAndGetUserId` (existia na proposta do prompt, mas fica sem
  chamador real: quem valida o token recebido é o próprio middleware `JwtBearer` do ASP.NET Core,
  configurado com a mesma chave - ver "Decisões técnicas" abaixo).
- **`RegisterUserUseCase`**: valida senha (mín. 8 chars, `internal static ValidatePassword` -
  testável sem fake de repositório), checa email único (`ConflictException
  "email_ja_cadastrado"`), hasheia a senha, cria o `User`, já devolve um token (registro conta
  como login automático).
- **`LoginUserUseCase`**: busca por email + verifica hash; credenciais inválidas (email não existe
  OU senha errada - nunca diferenciado na mensagem) lança `DomainException
  "credenciais_invalidas"`.
- **`GetCurrentUserUseCase`**: lê o `User` a partir do `userId` já extraído do JWT pelo middleware
  (claim `sub`) - nunca decodifica token nenhum sozinho.
- **Migration `Fase12Users`**: tabela `Users`, índice único em `Email`.
- **Api (`Program.cs`)**:
  - `AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)` lendo o token do
    cookie `focadu_auth` (`OnMessageReceived`), com `OnChallenge` customizado pra devolver o mesmo
    envelope `{error,message}` do resto da Api num 401 (sem isso viria vazio - challenge de auth
    acontece no middleware, antes do `ApiExceptionHandler` conseguir interceptar).
  - CORS ganhou `.AllowCredentials()` (já usava `WithOrigins` explícito, nunca `AllowAnyOrigin` -
    compatível por especificação).
  - Cookie: `HttpOnly=true`, `Secure=!IsDevelopment()`, `SameSite=Lax`, expira em 7 dias.
  - 4 endpoints novos: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
    `GET /api/auth/me` (só este com `.RequireAuthorization()`).
  - **Nenhum endpoint de curso/weekly/daily existente ganhou `[Authorize]`** - confirmado
    explicitamente fora de escopo nesta fase (trabalho da Fase 13).

### Frontend

- **`contexts/AuthContext.tsx`** (`AuthProvider`) + **`contexts/useAuth.ts`** (hook) +
  **`contexts/authContextObject.ts`** (o `Context` e o tipo) - 3 arquivos em vez de 1, pelo mesmo
  motivo de `lib/statusBadge.ts` (Fase 8): um arquivo que só exporta componente preserva o fast
  refresh do Vite; `oxlint` já pega isso (`only-export-components`).
- **`SplashPage.tsx`** (`/`): espera o mesmo `isLoading`/`user` do `AuthProvider` (nunca busca de
  novo sozinha), com duração mínima de 700ms antes de navegar pra `/start` ou `/login` (evita
  flash).
- **`LoginPage.tsx`** (`/login`): abas Entrar/Criar Conta, `LoginForm`/`RegisterForm`
  (`components/auth/`). Redireciona pra `/start` se já houver sessão (evita a tela de login ficar
  visível/usável pra quem já está logado).
- **`ProtectedRoute.tsx`**: guarda de rota client-side (spinner enquanto `isLoading`, `<Navigate
  to="/login"/>` se `!user`, `<Outlet/>` senão) - envolve `/hoje`, `/start`, `/admin/conteudo`.
- **`api/client.ts`**: `request()` ganhou `credentials: 'include'` (sem isso o cookie nunca ia e
  voltava entre front/back, mesmo autenticado) + 4 métodos novos (`register`/`login`/`logout`/
  `getCurrentUser`).
- **Roteamento (`main.tsx`)**: `/` (Splash) e `/login` ficam fora do `<ProtectedRoute>`; as rotas
  existentes (`hoje`/`start`/`admin/conteudo`) foram movidas pra dentro dele, mantendo o mesmo
  `<App/>` (shell com nav) por cima. Catch-all `*` agora manda pra `/` (era `/hoje`) - deixa a
  Splash decidir de novo.

## Decisões técnicas tomadas que não estavam no prompt original

- **`IJwtTokenService` ficou só com `GenerateToken`** - a proposta do prompt incluía
  `ValidateAndGetUserId`, mas o próprio `Program.cs` do prompt já configura
  `AddAuthentication().AddJwtBearer(...)`, que é quem de fato valida o token a cada requisição
  (antes do endpoint rodar). Um `ValidateAndGetUserId` no port ficaria sem nenhum chamador -
  cortado.
- **`Jwt:SecretKey` derruba o boot da Api se ausente**, diferente de `Groq:ApiKey`/`GitHub:Token`
  (podem ficar vazios, só as chamadas externas falham quando invocadas sem eles). A partir desta
  fase autenticação é fundação, não uma integração opcional - sem a chave, literalmente nenhum
  login/registro/sessão funcionaria, então falhar cedo (mesmo tratamento da connection string) é
  mais claro que um erro críptico na primeira tentativa de assinar um token.
- **`options.MapInboundClaims = false`** no `JwtBearerOptions` - sem isso, o `JwtSecurityTokenHandler`
  remapeia claims curtas (`"sub"`) pra URIs longas de `ClaimTypes.*` por baixo dos panos
  (comportamento legado da lib), quebrando silenciosamente `principal.FindFirstValue(JwtRegisteredClaimNames.Sub)`
  no endpoint `/me`. Gotcha clássico de JWT no .NET, verificado ao vivo antes de fechar a fase.
- **`credenciais_invalidas` usa `DomainException` (com override de status pra 401), não
  `ValidationException`** - `ValidationException` sempre mapeia pra 400 no `ApiExceptionHandler`
  (sem mecanismo de override por `Code`, diferente de `DomainException`), mas o prompt pedia 401.
  Reaproveitado o mesmo mecanismo já usado por `modulo_bloqueado_por_publicacao`/
  `publicacao_ja_validada` (Fase 11) em vez de criar um tipo de exceção novo pra um único caso.
- **Sem checagem de presença separada pra email/senha/nome em `Program.cs`** - `email`/`password`/
  `displayName` vazios já produzem o erro certo (`email_invalido`/`senha_muito_curta`/
  `nome_obrigatorio`) só deixando fluir pro `RegisterUserUseCase`/`User.Create`, que já validam
  isso. Evita duplicar a mesma checagem em 2 camadas.
- **Registro já devolve um token (login automático)** - não fazia sentido pedir pro usuário logar
  de novo logo depois de criar a conta.
- **Banco resetado do zero** (confirmado pelo usuário, sem dado real pra preservar) - `dotnet ef
  database drop` + `database update` reconstruiu do zero com todas as migrations, incluindo
  `Fase12Users`; o curso "Web Security" foi re-semeado (`-- seed`) depois.

## Bug real encontrado e corrigido na verificação ao vivo

Nenhum bug de código desta vez (diferente das Fases 10/11) - o único obstáculo na verificação ao
vivo foi esperado: depois do `database drop`, `GET /api/today` devolvia `404
nenhum_curso_ativo` porque o banco estava vazio (sem seed ainda). Não é um bug - é exatamente o
estado que "resetar do zero" implica; resolvido rodando `dotnet run -- seed` antes de continuar a
verificação.

## Estrutura de arquivos criada

```
backend/src/
  Focadu.Domain/
    Users/User.cs                                         <- novo
    Repositories/IUserRepository.cs                        <- novo
  Focadu.Application/
    Ports/IPasswordHasher.cs, IJwtTokenService.cs           <- novos
    Users/Dtos.cs, RegisterUserUseCase.cs,
          LoginUserUseCase.cs, GetCurrentUserUseCase.cs      <- novos
  Focadu.Infrastructure/
    Services/BCryptPasswordHasher.cs, JwtOptions.cs,
             JwtTokenService.cs                              <- novos
    Persistence/Configurations/UserConfiguration.cs          <- novo
    Persistence/Repositories/UserRepository.cs                <- novo
    Migrations/..._Fase12Users.cs                              <- novo
  Focadu.Api/
    Contracts/AuthRequests.cs                                <- novo
    Program.cs                                                <- +auth (JwtBearer, CORS, 4 endpoints)
frontend/src/
  contexts/AuthContext.tsx, useAuth.ts, authContextObject.ts   <- novos
  components/ProtectedRoute.tsx                                 <- novo
  components/auth/LoginForm.tsx, RegisterForm.tsx                <- novos
  routes/SplashPage.tsx, LoginPage.tsx                            <- novos
  lib/validation.ts                                               <- novo
  api/types.ts, api/client.ts                                     <- +tipos/métodos de auth
  main.tsx                                                        <- +AuthProvider, +rotas / e /login, ProtectedRoute
```

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **86 aprovados** (74 pré-existentes + 12 novos -
  `UserTests` cobrindo `Create` válido/formato de email inválido/nome vazio/hash vazio,
  `RegisterUserUseCaseTests` cobrindo `ValidatePassword`).
- Frontend: `tsc -b`, `oxlint src` (só o warning pré-existente de `TodayPage.tsx`), `vite build`
  limpos.
- Verificação ao vivo via `curl` (backend isolado): registro → cookie setado → `/me` autenticado
  (200) e sem cookie (401 com o envelope padrão) → registro com email duplicado (409) → registro
  com senha curta (400) → login com senha errada e com email inexistente (ambos 401, mesma
  mensagem genérica) → login correto → logout → `/me` volta a 401. Curso/weekly/daily continuam
  200 sem nenhum cookie (endpoints antigos de fato continuam abertos).
- Verificação ao vivo via Playwright (frontend real + backend real): `/` redireciona pra `/login`
  deslogado; navegar direto pra `/start` deslogado também redireciona (`ProtectedRoute`); registro
  completo pela UI navega pra `/start`; sessão sobrevive a um reload de página; logout + tentar
  `/start` de novo volta pra `/login`; login com senha errada mostra erro inline sem navegar; login
  correto navega pra `/start` e a tela renderiza normalmente (curso "Web Security", nenhuma
  regressão nas Fases 1-11).

## Dúvidas ou pontos abertos para a próxima fase

- **Nenhum endpoint de curso/weekly/daily foi protegido** (`[Authorize]`/`RequireAuthorization`) -
  proposital, confirmado no prompt. A Fase 13 é quem decide como esses endpoints passam a filtrar
  por usuário matriculado (e só então faz sentido protegê-los de verdade).
- **Sem botão de logout na UI** - não fazia parte do checklist desta fase (só splash + login/
  registro); a verificação ao vivo testou logout direto via `POST /api/auth/logout`. Uma fase
  futura de Perfil provavelmente é o lugar certo pra isso.
- **Sem "esqueci minha senha" nem verificação de email** - confirmado fora de escopo no próprio
  prompt.
- **Sem testes de "use case completo"** (`RegisterUserUseCase`/`LoginUserUseCase` inteiros, com
  banco) - só a parte pura (`ValidatePassword`) tem teste, mesma convenção já estabelecida (sem
  fakes de repositório no projeto, ver `docs/ARQUITETURA.md`).
