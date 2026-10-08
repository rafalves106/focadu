using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Focadu.Api.Contracts;
using Focadu.Api.ErrorHandling;
using Focadu.Application;
using Focadu.Application.Achievements;
using Focadu.Application.Assistant;
using Focadu.Application.Content;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Enrollments;
using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Marketplace;
using Focadu.Application.Notes;
using Focadu.Application.Ports;
using Focadu.Application.Ranking;
using Focadu.Application.Referrals;
using Focadu.Application.Seed;
using Focadu.Application.Squads;
using Focadu.Application.System;
using Focadu.Application.Users;
using Focadu.Application.Weeklies;
using Focadu.Domain.Enums;
using Focadu.Infrastructure;
using Focadu.Infrastructure.Persistence;
using Focadu.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("Focadu")
    ?? throw new InvalidOperationException("Connection string 'Focadu' nao configurada (appsettings.json ou variavel de ambiente ConnectionStrings__Focadu).");

// Groq (Fase 5): diferente da connection string, uma chave ausente nao impede o app de subir -
// so a transcricao/avaliacao de VoiceSummary falham (com erro claro) quando de fato chamadas sem
// ela configurada. Configuravel via appsettings/user-secrets ("Groq:ApiKey") ou env var
// Groq__ApiKey - nunca hardcoded nem commitada (ver docs/ARQUITETURA.md).
var groqApiKey = builder.Configuration["Groq:ApiKey"] ?? string.Empty;

// GitHub (Fase 11): mesma decisao do Groq acima - token ausente nao impede o app de subir, so as
// chamadas de GitHubService falham (com erro claro) quando de fato invocadas sem ele configurado.
// "GitHub:Token" precisa de escopo de escrita (repo), nao so leitura - ver docs/ARQUITETURA.md.
var gitHubOptions = new GitHubOptions(builder.Configuration["GitHub:Token"] ?? string.Empty);

// Forgejo interno (hospedagem de Projeto Semanal) - mesma decisao de resiliencia do GitHub acima:
// BaseUrl/AdminToken ausentes nao impedem o app de subir, so as chamadas de ForgejoService falham
// (com erro claro) quando de fato invocadas sem eles configurados.
var forgejoOptions = new ForgejoOptions(
    builder.Configuration["Forgejo:BaseUrl"] ?? string.Empty, builder.Configuration["Forgejo:AdminToken"] ?? string.Empty);

// Jwt:SecretKey (Fase 12): ao contrario de Groq/GitHub acima, esta e exigida no boot - a partir
// desta fase, autenticacao e fundacao (nao uma integracao opcional), e sem a chave literalmente
// nenhum login/registro/sessao funcionaria. Mesmo tratamento que a connection string (falha cedo,
// com mensagem clara, em vez de um erro criptico na primeira tentativa de gerar um token).
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey))
    throw new InvalidOperationException("Jwt:SecretKey nao configurada (user-secrets ou variavel de ambiente Jwt__SecretKey) - necessaria pra autenticacao funcionar, ver docs/ARQUITETURA.md.");

var jwtOptions = new JwtOptions(jwtSecretKey);
const string AuthCookieName = "focadu_auth";

// Smtp (Fase 41, redefinicao de senha): mesma decisao do Groq/GitHub acima - host ausente nao
// impede o app de subir, so o envio do email falha (com erro claro) quando de fato chamado sem
// estar configurado. Generico (SmtpClient puro), funciona com qualquer provedor (Gmail com senha
// de app, Outlook, etc) - ver docs/ARQUITETURA.md.
var smtpOptions = new SmtpOptions(
    builder.Configuration["Smtp:Host"] ?? string.Empty,
    int.TryParse(builder.Configuration["Smtp:Port"], out var smtpPort) ? smtpPort : 587,
    builder.Configuration["Smtp:User"] ?? string.Empty,
    builder.Configuration["Smtp:Password"] ?? string.Empty,
    builder.Configuration["Smtp:FromAddress"] is { Length: > 0 } fromAddress ? fromAddress : builder.Configuration["Smtp:User"] ?? string.Empty,
    builder.Configuration["Smtp:FromName"] is { Length: > 0 } fromName ? fromName : "Focadu",
    !bool.TryParse(builder.Configuration["Smtp:EnableSsl"], out var smtpEnableSsl) || smtpEnableSsl);

// Frontend:BaseUrl (Fase 41): so usado pra montar o link de redefinicao de senha no email - "onde
// fica o frontend" e informacao de deploy (Infrastructure), a Application so trabalha com o token
// em si. Default localhost:5173 (mesma origem hardcoded do CORS abaixo, so dev) - producao precisa
// configurar via env var Frontend__BaseUrl.
var frontendOptions = new FrontendOptions(
    builder.Configuration["Frontend:BaseUrl"] is { Length: > 0 } frontendBaseUrl ? frontendBaseUrl : "http://localhost:5173");

// Fase 81: e-mails que enxergam os cursos ainda escondidos (Draft). Env var CoursePreview__Emails.
builder.Services.AddSingleton(Focadu.Application.Shared.PersonalizationOptions.FromSetting(builder.Configuration["Personalization:AnalogiesEnabled"]));
builder.Services.AddSingleton(Focadu.Application.Enrollments.CoursePreviewOptions.FromSetting(builder.Configuration["CoursePreview:Emails"]));
// Fase 93: cadastro so com convite e confirmacao de e-mail - desligados por padrao, ligados no .env de producao
// (Signup__InviteOnly, Signup__EmailVerification, Signup__ContactEmail). Ver SignupOptions.
var signupOptions = Focadu.Application.Shared.SignupOptions.FromSettings(
    builder.Configuration["Signup:InviteOnly"], builder.Configuration["Signup:EmailVerification"], builder.Configuration["Signup:ContactEmail"]);
builder.Services.AddSingleton(signupOptions);
builder.Services.AddFocaduApplication();
builder.Services.AddFocaduInfrastructure(connectionString, groqApiKey, gitHubOptions, forgejoOptions, jwtOptions, smtpOptions, frontendOptions);

builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

// CORS para o frontend Vite (Passo 3) - porta diferente da Api conta como origem diferente, o
// navegador bloqueia sem isso mesmo os dois rodando em localhost. So dev por enquanto (unico
// usuario-teste, sem deploy ainda) - ver docs/ARQUITETURA.md se isso precisar virar configuravel.
// AllowCredentials (Fase 12, pro cookie de sessao ir junto nas requisicoes) exige origem explicita
// - nao pode conviver com AllowAnyOrigin por especificacao do CORS; ja usavamos WithOrigins.
const string FrontendDevCorsPolicy = "FrontendDev";
builder.Services.AddCors(options => options.AddPolicy(FrontendDevCorsPolicy, policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowCredentials()
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Sessao via JWT em cookie httpOnly (Fase 12) - nunca acessivel via JS (mais seguro contra XSS que
// localStorage). O token nunca chega via header Authorization; OnMessageReceived le direto do
// cookie que os endpoints de login/registro setam (ver SetAuthCookie abaixo).
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Sem isso, o handler re-mapeia claims curtas ("sub") pra URIs longas de ClaimTypes.* por
        // baixo dos panos (comportamento legado do JwtSecurityTokenHandler) - mantem exatamente os
        // nomes de claim usados em JwtTokenService.GenerateToken ("sub", "email").
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ClockSkew = TimeSpan.Zero,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies[AuthCookieName];
                return Task.CompletedTask;
            },
            // Sem isso, um 401 (sem cookie / token expirado) viria vazio - ApiExceptionHandler so
            // cobre excecoes lancadas dentro do endpoint; o challenge de autenticacao acontece
            // antes disso, no middleware, entao precisa do proprio envelope {error,message} aqui.
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new ErrorResponse("nao_autenticado", "Sessao invalida ou expirada."));
            },
            // Fase 93: o unico 403 da Api e a sessao de quem ainda nao confirmou o e-mail (politica padrao abaixo).
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new ErrorResponse("email_nao_verificado", "Confirme o seu e-mail com o codigo que mandamos."));
            },
        };
    });

// Fase 93: com Signup:EmailVerification ligada, todo RequireAuthorization() passa a exigir o e-mail confirmado
// (claim do JWT). So /auth/me e as rotas do codigo usam a politica que aceita sessao sem e-mail confirmado - e o
// que deixa o front saber pra onde mandar o aluno e deixa ele confirmar.
const string PendingEmailPolicy = "SessaoSemEmailConfirmado";
builder.Services.AddAuthorization(options =>
{
    var defaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder().RequireAuthenticatedUser();
    if (signupOptions.EmailVerification)
        defaultPolicy.RequireClaim(JwtTokenService.EmailVerifiedClaim, "true");
    options.DefaultPolicy = defaultPolicy.Build();
    options.AddPolicy(PendingEmailPolicy, policy => policy.RequireAuthenticatedUser());
});

var app = builder.Build();

// Dockerizacao: aplica migrations pendentes automaticamente no boot, em vez de exigir
// `dotnet ef database update` manual no host (a imagem runtime nem tem o SDK/dotnet-ef instalado).
// Seguro em todo ambiente porque MigrateAsync so aplica o que falta (idempotente) - o
// docker-compose garante Postgres saudavel antes do backend subir via depends_on condition:
// service_healthy, entao nao precisa de retry aqui.
using (var migrationScope = app.Services.CreateScope())
{
    var dbContext = migrationScope.ServiceProvider.GetRequiredService<FocaduDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Cookie de sessao (Fase 12): Secure=true exige HTTPS - desligado so em dev local (http://localhost),
// senao o navegador nunca gravaria o cookie. SameSite=Lax basta pro cenario atual (front e back em
// portas diferentes do mesmo host, sem cross-site de verdade).
void SetAuthCookie(HttpContext context, string token) =>
    context.Response.Cookies.Append(AuthCookieName, token, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(),
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddDays(7),
        Path = "/",
    });

void ClearAuthCookie(HttpContext context) =>
    context.Response.Cookies.Append(AuthCookieName, string.Empty, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(),
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UnixEpoch,
        Path = "/",
    });

// Fase 13: todo endpoint protegido extrai o userId assim - claim "sub" do JWT, ja validado pelo
// middleware JwtBearer antes do endpoint rodar (nunca decodificado de novo aqui).
Guid CurrentUserId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

// Fase 93: o front decide se manda o aluno pra "Confira seu e-mail" por este campo, nas respostas de auth.
UserDto WithSignup(UserDto user) => user with { EmailVerificationPending = signupOptions.EmailVerification && user.EmailVerifiedAt is null };

// Fase 86: corpo HTTP do laboratorio -> entrada do caso de uso (nulo = o aluno nao rodou nada).
LabRunInput? ToLabRun(LabRunRequest? run) =>
    run is null
        ? null
        : new LabRunInput(run.Output, run.ExitCode, run.Commands?.Select(c => new LabCommandInput(c.Command, c.Output)).ToList());

// Fase 16: scope ausente/vazio vira "course" (recorte mais completo) - so string invalida vira erro.
RankingScope ParseRankingScope(string? scope)
{
    if (string.IsNullOrWhiteSpace(scope)) return RankingScope.Course;
    if (!Enum.TryParse<RankingScope>(scope, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
        throw new ValidationException("scope_invalido", "O parametro 'scope' precisa ser 'weekly', 'monthly' ou 'course'.");

    return parsed;
}

// `dotnet run --project src/Focadu.Api -- importar <curso> [--dia N] [--dry-run] [--confirmar] [--sem-linter] [--legado]`:
// importa (ou atualiza) os dias de conteudo/<curso>/ no banco, com linter, hash por dia e dry-run (plano de
// curadoria, secao 7). Corrigir um dia e editar o JSON e importar de novo - nunca SQL a mao.
if (args.Contains("importar"))
{
    var slugIndex = Array.IndexOf(args, "importar") + 1;
    var courseSlug = slugIndex < args.Length && !args[slugIndex].StartsWith("--") ? args[slugIndex] : null;
    if (courseSlug is null)
    {
        Console.Error.WriteLine("uso: importar <curso> [--dia N] [--dry-run] [--confirmar] [--sem-linter] [--legado]");
        Environment.ExitCode = 2;
        return;
    }

    int? onlyDay = null;
    var dayIndex = Array.IndexOf(args, "--dia");
    if (dayIndex >= 0)
    {
        if (dayIndex + 1 >= args.Length || !int.TryParse(args[dayIndex + 1], out var parsedDay) || parsedDay < 1)
        {
            Console.Error.WriteLine("--dia precisa de um numero de dia (1 ou mais).");
            Environment.ExitCode = 2;
            return;
        }
        onlyDay = parsedDay;
    }

    var options = new ImportOptions(onlyDay, args.Contains("--dry-run"), args.Contains("--confirmar"), args.Contains("--sem-linter"), args.Contains("--legado"));
    using var importScope = app.Services.CreateScope();
    var report = await importScope.ServiceProvider.GetRequiredService<ImportCuratedDaysUseCase>().ExecuteAsync(courseSlug, options);

    Console.WriteLine($"Importar '{report.CourseName}'{(report.DryRun ? " (dry-run: nada foi gravado)" : "")}{(report.CourseCreated ? " - curso novo" : "")}");
    foreach (var day in report.Days)
    {
        Console.WriteLine($"  Dia {day.DayNumber}: {day.Status} - {day.Detail}");
        foreach (var error in day.Errors ?? [])
            Console.WriteLine($"      {error}");
    }
    Console.WriteLine($"  Resumo: {report.Days.Count(d => d.Status == ImportStatus.Created)} novo(s), {report.Days.Count(d => d.Status == ImportStatus.Updated)} atualizado(s), " +
        $"{report.Days.Count(d => d.Status == ImportStatus.Unchanged)} sem mudanca, {report.Days.Count(d => d.Status is ImportStatus.Rejected or ImportStatus.NeedsConfirmation)} recusado(s); " +
        $"{report.DailiesAdded} Dailies adicionadas, {report.DailiesReset} recomecadas.");
    foreach (var skipped in report.Skipped)
        Console.WriteLine($"  Daily NAO adicionada - {skipped}");
    if (report.Days.Any(d => d.Status is ImportStatus.Rejected or ImportStatus.NeedsConfirmation))
        Environment.ExitCode = 1;
    return;
}

// `dotnet run --project src/Focadu.Api -- resetar-usuarios --manter <email> [--confirmar --backup-feito]`: apaga todos os
// usuarios menos o do dono e zera o progresso dele (plano de curadoria, 02/10/2026). DESTRUTIVO: sem --confirmar e dry-run
// (so conta); apagar de verdade exige --confirmar e --backup-feito. Rodar primeiro em banco local, depois em producao.
if (args.Contains("resetar-usuarios"))
{
    var keepIndex = Array.IndexOf(args, "--manter");
    var keepEmail = keepIndex >= 0 && keepIndex + 1 < args.Length ? args[keepIndex + 1] : null;
    var resetTarget = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
    Console.WriteLine($"Banco alvo: host={resetTarget.Host} porta={resetTarget.Port} banco={resetTarget.Database}");

    try
    {
        using var resetScope = app.Services.CreateScope();
        var resetResult = await resetScope.ServiceProvider.GetRequiredService<Focadu.Application.Users.ResetUsersUseCase>()
            .ExecuteAsync(keepEmail, args.Contains("--confirmar"), args.Contains("--backup-feito"));

        Console.WriteLine(resetResult.Executed
            ? $"APAGADO. Ficou so '{resetResult.Plan.KeptEmail}' ({resetResult.Plan.UsersToDelete} usuario(s) removido(s))."
            : $"DRY-RUN (nada foi apagado). Fica '{resetResult.Plan.KeptEmail}'; seriam removidos {resetResult.Plan.UsersToDelete} usuario(s).");
        foreach (var count in resetResult.Plan.Counts)
            Console.WriteLine($"  {count.Key}: {count.Value}");
        if (resetResult.Plan.ForgejoUsernames.Count > 0)
            Console.WriteLine($"  Contas do Forgejo a limpar a mao ({resetResult.Plan.ForgejoUsernames.Count}): {string.Join(", ", resetResult.Plan.ForgejoUsernames)}");
        if (!resetResult.Executed)
            Console.WriteLine("  Para apagar: repita com --confirmar --backup-feito (so depois de fazer o backup).");
    }
    catch (Exception ex) when (ex is Focadu.Application.Exceptions.ValidationException or Focadu.Application.Exceptions.NotFoundException)
    {
        Console.Error.WriteLine(ex.Message);
        Environment.ExitCode = 2;
    }
    return;
}

// `dotnet run --project src/Focadu.Api -- convite "Fulano" [--usos N] [--dias N]` cria um convite de tester (Fase 93);
// `convite --listar` mostra todos; `convite --revogar CODIGO` revoga. Na VM: docker compose exec backend dotnet Focadu.Api.dll convite ...
if (args.Contains("convite"))
{
    using var inviteScope = app.Services.CreateScope();
    var invites = inviteScope.ServiceProvider.GetRequiredService<SignupInviteAdminUseCase>();
    string? ArgAfter(string flag) => Array.IndexOf(args, flag) is var i && i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
    string Describe(Focadu.Domain.Users.SignupInvite i) =>
        $"{i.Code}  {i.Note}  usos {i.UsedCount}/{i.MaxUses}  vence {(i.ExpiresAt is { } e ? e.ToLocalTime().ToString("dd/MM/yyyy HH:mm") : "nunca")}{(i.RevokedAt is null ? "" : "  REVOGADO")}";

    try
    {
        if (args.Contains("--listar"))
        {
            foreach (var invite in await invites.ListAsync())
                Console.WriteLine(Describe(invite));
        }
        else if (ArgAfter("--revogar") is { } revokeCode)
        {
            Console.WriteLine("Revogado: " + Describe(await invites.RevokeAsync(revokeCode)));
        }
        else
        {
            var noteIndex = Array.IndexOf(args, "convite") + 1;
            var note = noteIndex < args.Length && !args[noteIndex].StartsWith("--") ? args[noteIndex] : null;
            int? ParseInt(string flag) => ArgAfter(flag) is { } v ? (int.TryParse(v, out var n) ? n : throw new ValidationException("argumento_invalido", $"{flag} precisa de um numero.")) : null;
            if (note is null)
            {
                Console.Error.WriteLine("uso: convite \"pra quem\" [--usos N] [--dias N (0 = nao vence)] | convite --listar | convite --revogar CODIGO");
                Environment.ExitCode = 2;
                return;
            }

            var created = await invites.CreateAsync(note, ParseInt("--usos") ?? 1, ParseInt("--dias"));
            Console.WriteLine("Criado: " + Describe(created));
            Console.WriteLine($"Link: {frontendOptions.BaseUrl.TrimEnd('/')}/login?convite={created.Code}");
        }
    }
    catch (Exception ex) when (ex is ValidationException or NotFoundException or Focadu.Domain.Exceptions.DomainException)
    {
        Console.Error.WriteLine(ex.Message);
        Environment.ExitCode = 2;
    }
    return;
}

// `dotnet run --project src/Focadu.Api -- feedback <curso>`: relatorio de clareza do curso (media por dia, onde os
// alunos travaram por tipo de bloco e os sinais de "reabrir" do plano de curadoria).
if (args.Contains("feedback"))
{
    var feedbackSlugIndex = Array.IndexOf(args, "feedback") + 1;
    var feedbackSlug = feedbackSlugIndex < args.Length ? args[feedbackSlugIndex] : null;
    var feedbackManifestPath = feedbackSlug is null ? null : Focadu.Application.Seed.CuratedContentLocator.Resolve(feedbackSlug, null, "curso.json", required: false);
    if (feedbackManifestPath is null)
    {
        Console.Error.WriteLine("uso: feedback <curso> (precisa de conteudo/<curso>/curso.json)");
        Environment.ExitCode = 2;
        return;
    }

    var feedbackCourseName = Focadu.Application.Seed.CuratedCourseImporter.ParseManifest(await File.ReadAllTextAsync(feedbackManifestPath)).Name;
    using var feedbackScope = app.Services.CreateScope();
    var feedbackReport = await feedbackScope.ServiceProvider.GetRequiredService<Focadu.Application.Feedback.GetFeedbackReportUseCase>().ExecuteAsync(feedbackCourseName);
    if (feedbackReport is null)
    {
        Console.WriteLine($"Curso '{feedbackCourseName}' ainda nao esta no banco.");
        return;
    }

    Console.WriteLine($"Feedback de '{feedbackCourseName}': {feedbackReport.Days.Sum(d => d.Count)} avaliacao(oes) em {feedbackReport.Days.Count} dia(s).");
    foreach (var line in feedbackReport.Days)
        Console.WriteLine($"  Semana {line.WeekNumber}, dia {line.DayNumber}: {line.Count} avaliacao(oes), clareza media {line.AverageClarity.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture)}, {line.BadCount} ruim(ns)" +
        (line.StuckByType.Count > 0 ? "; travou em " + string.Join(", ", line.StuckByType.Select(t => $"{t.Key} x{t.Value}")) : ""));
    foreach (var flag in feedbackReport.ReopenFlags)
        Console.WriteLine($"  REABRIR: {flag}");
    return;
}

// `dotnet run --project src/Focadu.Api -- seed`: popula o curso piloto "Web Security" e encerra,
// sem subir o servidor HTTP. Nao e um endpoint porque a Api ainda nao tem autoria de conteudo.
if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();

    // Fase 69: renumeracao 60 -> 72 dias num banco que ja tinha o curso (idempotente, so roda uma vez).
    var renumbering = scope.ServiceProvider.GetRequiredService<Focadu.Infrastructure.Persistence.Curriculum72Migration>();
    Console.WriteLine(await renumbering.RunAsync());

    var seeder = scope.ServiceProvider.GetRequiredService<SeedWebSecurityCourseUseCase>();
    var result = await seeder.ExecuteAsync();

    Console.WriteLine(result.AlreadyExisted
        ? "Seed: curso 'Web Security' ja existe - nada foi inserido."
        : result.SkippedNoContent
            ? "Seed: curso 'Web Security' NAO criado - sem conteudo em conteudo/web-security (refacao da curadoria, plano de 02/10/2026)."
            : $"Seed: curso 'Web Security' criado com sucesso (CourseId={result.CourseId}).");

    // Fase 69: pontes curadas depois do seed (e a da Semana 1 nas matriculas que ja existiam).
    var bridgeSync = await scope.ServiceProvider.GetRequiredService<SyncBridgeDaysUseCase>().ExecuteAsync();
    Console.WriteLine($"Seed: pontes - {bridgeSync.TemplatesCreated} variantes importadas, {bridgeSync.DailiesAdded} Dailies adicionadas, " +
        $"{bridgeSync.TemplatesRefreshed} trocadas pelo code comigo ({bridgeSync.DailiesReset} Dailies recomecadas).");
    foreach (var skipped in bridgeSync.Skipped)
        Console.WriteLine($"Seed: ponte NAO adicionada - {skipped}");

    // Fase 81: cursos de pre-requisito (Linux, Python pra Web Security) - nascem escondidos e ganham
    // os dias curados desde o deploy anterior.
    foreach (var curated in await scope.ServiceProvider.GetRequiredService<SeedCuratedCoursesUseCase>().ExecuteAsync())
    {
        Console.WriteLine($"Seed: curso '{curated.CourseName}' ({curated.Status}) - " +
            (curated.Recreated ? "recriado (escondido e sem matricula), " : curated.Created ? "criado, " : "") + $"{curated.DaysImported} dias importados, {curated.DailiesAdded} Dailies adicionadas.");
        foreach (var skipped in curated.Skipped)
            Console.WriteLine($"Seed: Daily NAO adicionada - {skipped}");
    }

    // Fase 86: laboratorio de codigo (bloco lab, codigo inicial, opt-out por passo) nos dias que ja estao
    // no banco - so atualiza a configuracao, nunca reimporta (quem esta no meio do dia nao perde progresso).
    var labSync = await scope.ServiceProvider.GetRequiredService<SyncLabConfigUseCase>().ExecuteAsync();
    Console.WriteLine($"Seed: laboratorio de codigo - {labSync.Updated.Count} dia(s) atualizado(s){(labSync.Updated.Count > 0 ? ": " + string.Join("; ", labSync.Updated) : "")}.");
    foreach (var skipped in labSync.Skipped)
        Console.WriteLine($"Seed: laboratorio NAO aplicado - {skipped}");

    // Fase 84: ficha do curso (o que ajuda saber antes e o curso recomendado) - reaplicada em todo deploy.
    var recommended = await scope.ServiceProvider.GetRequiredService<SyncCourseRecommendationsUseCase>().ExecuteAsync();
    Console.WriteLine($"Seed: ficha do curso atualizada em {recommended.Count} curso(s){(recommended.Count > 0 ? ": " + string.Join(", ", recommended) : "")}.");

    // Fase 17: catalogo fixo da loja de cosmeticos - mesmo gatilho `-- seed`. Fase 71: as pecas em
    // pixel art entram por Code, so as que faltam (uma leva nova chega em producao pelo proprio seed).
    var cosmeticSeeder = scope.ServiceProvider.GetRequiredService<SeedCosmeticCatalogUseCase>();
    var cosmeticsInserted = await cosmeticSeeder.ExecuteAsync();

    Console.WriteLine(cosmeticsInserted == 0
        ? "Seed: catalogo de cosmeticos ja esta completo - nada foi inserido."
        : $"Seed: catalogo de cosmeticos - {cosmeticsInserted} itens inseridos.");

    return;
}

// Middleware de erro primeiro: qualquer excecao lancada por qualquer endpoint abaixo (validacao,
// regra de dominio, recurso nao encontrado) passa por ApiExceptionHandler e vira o mesmo formato
// { error, message } com o status HTTP adequado.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors(FrontendDevCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Chaves de funcionalidade que o front precisa para esconder o que esta desligado (hoje: a analogia "Pra voce").
app.MapGet("/api/features", (Focadu.Application.Shared.PersonalizationOptions personalization) =>
    Results.Ok(new { personalizedAnalogies = personalization.AnalogiesEnabled }));

var api = app.MapGroup("/api");

// --- Autenticacao (Fase 12) ------------------------------------------------------------------
// Fundacao de sessao - registro/login/logout/me. Endpoints de curso/weekly/daily abaixo
// continuam abertos por enquanto (sem [Authorize]/RequireAuthorization) - isso e trabalho da
// Fase 13, quando passarem a filtrar por usuario matriculado.

api.MapPost("/auth/register", async (HttpContext http, RegisterRequest? request, RegisterUserUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(
            request?.Email ?? string.Empty, request?.Password ?? string.Empty, request?.DisplayName ?? string.Empty,
            request?.ReferralCode, request?.InviteCode, ct);
        SetAuthCookie(http, result.Token);
        return Results.Created("/api/auth/me", WithSignup(result.User));
    })
    .WithName("Register");

api.MapPost("/auth/login", async (HttpContext http, LoginRequest? request, LoginUserUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(request?.Email ?? string.Empty, request?.Password ?? string.Empty, ct);
        SetAuthCookie(http, result.Token);
        return Results.Ok(WithSignup(result.User));
    })
    .WithName("Login");

api.MapPost("/auth/logout", (HttpContext http) =>
    {
        ClearAuthCookie(http);
        return Results.Ok();
    })
    .WithName("Logout");

// Redefinicao de senha (Fase 41) - as duas rotas sao anonimas, como registro/login/logout acima.
// /forgot-password sempre devolve 200 (mesmo pra email nao cadastrado, ver RequestPasswordResetUseCase).
api.MapPost("/auth/forgot-password", async (ForgotPasswordRequest? request, RequestPasswordResetUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(request?.Email ?? string.Empty, ct);
        return Results.Ok();
    })
    .WithName("ForgotPassword");

api.MapPost("/auth/reset-password", async (ResetPasswordRequest? request, ResetPasswordUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(request?.Token ?? string.Empty, request?.NewPassword ?? string.Empty, ct);
        return Results.Ok();
    })
    .WithName("ResetPassword");

api.MapGet("/auth/me", async (ClaimsPrincipal principal, GetCurrentUserUseCase useCase, CancellationToken ct) =>
        Results.Ok(WithSignup(await useCase.ExecuteAsync(CurrentUserId(principal), ct))))
    .RequireAuthorization(PendingEmailPolicy)
    .WithName("GetCurrentUser");

// Fase 93: o que a tela de login precisa saber antes de ter sessao (cadastro fechado? confirma e-mail? contato).
api.MapGet("/auth/signup-status", (Focadu.Application.Shared.SignupOptions options) =>
        Results.Ok(new { inviteOnly = options.InviteOnly, emailVerification = options.EmailVerification, contactEmail = options.ContactEmail }))
    .WithName("GetSignupStatus");

api.MapPost("/auth/email-verification/send", async (ClaimsPrincipal principal, SendEmailVerificationRequest? request, SendEmailVerificationUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), request?.Force ?? false, ct)))
    .RequireAuthorization(PendingEmailPolicy)
    .WithName("SendEmailVerification");

// Acertou o codigo: troca o cookie por um token com o e-mail confirmado (o antigo seguiria barrado ate vencer).
api.MapPost("/auth/email-verification/confirm", async (HttpContext http, ClaimsPrincipal principal, ConfirmEmailRequest? request, ConfirmEmailVerificationUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(CurrentUserId(principal), request?.Code, ct);
        SetAuthCookie(http, result.Token);
        return Results.Ok(WithSignup(result.User));
    })
    .RequireAuthorization(PendingEmailPolicy)
    .WithName("ConfirmEmailVerification");

// PUT (nao POST): idempotente - concluir a Entrevista de Perfil de novo so substitui a lista de
// interesses inteira, nunca acumula (ver User.CompleteProfile).
api.MapPut("/users/me/profile", async (ClaimsPrincipal principal, CompleteProfileRequest? request, CompleteProfileUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(
            CurrentUserId(principal), request?.Interests ?? [], request?.AdditionalNotes,
            ProjectLanguageParsing.RequireAll(request?.PreferredLanguages), ct)))
    .RequireAuthorization()
    .WithName("CompleteProfile");

// Gems/Streak (Fase 14) - UserGemBalance/UserStreak sao lazy (so existem apos a 1a conclusao que
// gera Gems/streak), entao um usuario que nunca completou nada devolve o estado zerado normalmente
// (200, nunca 404 - nao ter gamificado ainda nao e um erro).
api.MapGet("/users/me/gamification", async (ClaimsPrincipal principal, GetGamificationSummaryUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetGamificationSummary");

// PUT (nao POST): idempotente - reconhecer a quebra de novo depois de ja reconhecida e um no-op
// (mesmo raciocinio de CompleteProfile acima). Fase 10 (retomada): alimenta a tela "Streak
// Perdido" - o frontend chama isso ao fechar o modal, pra nao repetir na proxima visita.
api.MapPut("/users/me/gamification/streak/acknowledge-broken", async (ClaimsPrincipal principal, AcknowledgeStreakBreakUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(CurrentUserId(principal), ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("AcknowledgeStreakBreak");

// Ultimos 14 dias de estudo + ultima sessao (Fase 72, cartao do Perfil) - leitura pura.
api.MapGet("/users/me/study-calendar", async (ClaimsPrincipal principal, GetStudyCalendarUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetStudyCalendar");

// "Nao mostrar minhas notas no feed do squad" (Fase 72, Configuracoes) - PUT idempotente, devolve o UserDto novo.
api.MapPut("/users/me/squad-feed-privacy", async (ClaimsPrincipal principal, SquadFeedPrivacyRequest? request, UpdateSquadFeedPrivacyUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), request?.HideScores ?? false, ct)))
    .RequireAuthorization()
    .WithName("UpdateSquadFeedPrivacy");

// Guia das telas (Fase 75): marca o tour do app ou a 1a visita a uma tela como vistos - idempotente,
// devolve o UserDto novo (o AuthContext troca o usuario em memoria).
api.MapPost("/users/me/guides/{key}/seen", async (ClaimsPrincipal principal, string key, MarkGuideSeenUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), key, ct)))
    .RequireAuthorization()
    .WithName("MarkGuideSeen");

// Badges/Troféus (Fase 17) - todos calculados sob demanda, ver GetUserBadgesUseCase.
api.MapGet("/users/me/badges", async (ClaimsPrincipal principal, GetUserBadgesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetUserBadges");

// Indicacao (Fase 17) - gera o ReferralCode na 1a consulta (lazy, ver GetReferralInfoUseCase).
api.MapGet("/users/me/referral", async (ClaimsPrincipal principal, GetReferralInfoUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetReferralInfo");

// --- Squad (Fase 24) --------------------------------------------------------------------------
// Desde a Fase 77 o codigo de convite vira um pedido (POST /squads/join devolve SquadJoinRequestDto)
// que o lider ou o colider aceita - ver "Pedidos de entrada" abaixo. Sair de/remover
// de um squad sao a mesma rota (DELETE /squads/members/{userId}): {userId} igual ao usuario
// logado e "sair" (LeaveSquadUseCase), diferente e "o dono remove alguem" (RemoveMemberUseCase).

api.MapPost("/squads", async (ClaimsPrincipal principal, CreateSquadRequest? request, CreateSquadUseCase useCase, CancellationToken ct) =>
    {
        var result = await useCase.ExecuteAsync(CurrentUserId(principal), request?.Name ?? string.Empty, ct);
        return Results.Created("/api/squads/me/ranking", result);
    })
    .RequireAuthorization()
    .WithName("CreateSquad");

api.MapPost("/squads/join", async (ClaimsPrincipal principal, JoinSquadRequest? request, JoinSquadUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), request?.JoinCode ?? string.Empty, ct)))
    .RequireAuthorization()
    .WithName("JoinSquad");

// --- Pedidos de entrada (Fase 77) - quem pediu ve/cancela o proprio; lider e colider decidem.
api.MapGet("/squads/requests/me", async (ClaimsPrincipal principal, GetMySquadJoinRequestUseCase useCase, CancellationToken ct) =>
        await useCase.ExecuteAsync(CurrentUserId(principal), ct) is { } request ? Results.Ok(request) : Results.NoContent())
    .RequireAuthorization()
    .WithName("GetMySquadJoinRequest");

api.MapDelete("/squads/requests/me", async (ClaimsPrincipal principal, CancelMySquadJoinRequestUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(CurrentUserId(principal), ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("CancelMySquadJoinRequest");

api.MapGet("/squads/me/requests", async (ClaimsPrincipal principal, GetSquadJoinRequestsUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetSquadJoinRequests");

api.MapGet("/squads/me/requests/count", async (ClaimsPrincipal principal, GetSquadJoinRequestCountUseCase useCase, CancellationToken ct) =>
        Results.Ok(new { count = await useCase.ExecuteAsync(CurrentUserId(principal), ct) }))
    .RequireAuthorization()
    .WithName("GetSquadJoinRequestCount");

api.MapPost("/squads/me/requests/{requestId}/{action}", async (
        ClaimsPrincipal principal, string requestId, string action, DecideSquadJoinRequestUseCase useCase, CancellationToken ct) =>
    {
        var decision = action switch
        {
            "accept" => SquadJoinDecision.Accept,
            "reject" => SquadJoinDecision.Reject,
            "undo-reject" => SquadJoinDecision.UndoRejection,
            _ => throw new ValidationException("acao_invalida", "Acao invalida (accept, reject ou undo-reject)."),
        };
        await useCase.ExecuteAsync(CurrentUserId(principal), RouteParsing.RequireGuid(requestId, "requestId"), decision, ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("DecideSquadJoinRequest");

api.MapDelete("/squads/members/{userId}", async (
        ClaimsPrincipal principal, string userId, LeaveSquadUseCase leaveUseCase, RemoveMemberUseCase removeUseCase, CancellationToken ct) =>
    {
        var targetUserId = RouteParsing.RequireGuid(userId, "userId");
        var requestingUserId = CurrentUserId(principal);

        if (targetUserId == requestingUserId)
            await leaveUseCase.ExecuteAsync(requestingUserId, ct);
        else
            await removeUseCase.ExecuteAsync(requestingUserId, targetUserId, ct);

        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("RemoveSquadMember");

// Co-Leader (Fase 24b) - o Owner promove {userId} ou limpa o cargo (DELETE, sem corpo). Sucessao
// ao sair usa isso em LeaveSquadUseCase - ver Squad.TransferOwnership.
api.MapPut("/squads/co-leader/{userId}", async (
        ClaimsPrincipal principal, string userId, SetSquadCoLeaderUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(CurrentUserId(principal), RouteParsing.RequireGuid(userId, "userId"), ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("PromoteSquadCoLeader");

api.MapDelete("/squads/co-leader", async (ClaimsPrincipal principal, SetSquadCoLeaderUseCase useCase, CancellationToken ct) =>
    {
        await useCase.ExecuteAsync(CurrentUserId(principal), null, ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("ClearSquadCoLeader");

// Ranking (soma/media de Score/Gems dos membros) - tambem onde Squad.JoinCode e gerado (lazy, ver
// GetSquadRankingUseCase), entao dobra de "tela inicial do squad" pro frontend.
// `?courseId=` (01/10/2026, opcional): so a matricula daquele curso entra no score de cada membro; sem ele, todos os cursos somados.
api.MapGet("/squads/me/ranking", async (ClaimsPrincipal principal, string? scope, int? page, string? courseId, GetSquadRankingUseCase useCase, CancellationToken ct) =>
    {
        var rankingScope = ParseRankingScope(scope);
        var course = courseId is null ? (Guid?)null : RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), rankingScope, page ?? 1, course, ct));
    })
    .RequireAuthorization()
    .WithName("GetSquadRanking");

// QG do Squad (Fase 72) - cabecalho + escalacao + meta da semana + feed com GGs numa chamada; o
// ranking continua em /squads/me/ranking. 404 "squad_nao_encontrado" = estado "sem squad".
api.MapGet("/squads/me/hq", async (ClaimsPrincipal principal, GetSquadHqUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetSquadHq");

// GG numa atividade do feed (Fase 72) - toggle: dar de novo tira. Devolve a contagem nova.
api.MapPost("/squads/me/cheers", async (ClaimsPrincipal principal, SquadCheerRequest? request, ToggleSquadCheerUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), request?.ActivityKey ?? string.Empty, ct)))
    .RequireAuthorization()
    .WithName("ToggleSquadCheer");

// --- Marketplace de Cosmeticos (Fase 17) -----------------------------------------------------
// Catalogo fixo via seed, sem autoria via Api nesta fase. Comprar/equipar/desequipar sempre
// devolvem o catalogo inteiro recalculado (Owned/Equipped por item) - o frontend nunca precisa
// de uma 2a chamada pra saber o estado novo depois de uma acao.

api.MapGet("/marketplace/catalog", async (ClaimsPrincipal principal, GetMarketplaceCatalogUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetMarketplaceCatalog");

api.MapPost("/marketplace/purchase", async (ClaimsPrincipal principal, PurchaseCosmeticItemRequest? request, PurchaseCosmeticItemUseCase useCase, CancellationToken ct) =>
    {
        if (request?.ItemId is not { } itemId)
            throw new ValidationException("item_id_obrigatorio", "O campo 'itemId' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), itemId, ct));
    })
    .RequireAuthorization()
    .WithName("PurchaseCosmeticItem");

api.MapPost("/marketplace/equip", async (ClaimsPrincipal principal, EquipCosmeticRequest? request, EquipCosmeticUseCase useCase, CancellationToken ct) =>
    {
        if (request?.ItemId is not { } itemId)
            throw new ValidationException("item_id_obrigatorio", "O campo 'itemId' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), itemId, ct));
    })
    .RequireAuthorization()
    .WithName("EquipCosmetic");

api.MapPost("/marketplace/unequip", async (ClaimsPrincipal principal, UnequipCosmeticRequest? request, UnequipCosmeticUseCase useCase, CancellationToken ct) =>
    {
        if (!Enum.TryParse<CosmeticSlot>(request?.Slot, ignoreCase: true, out var slot) || !Enum.IsDefined(slot))
            throw new ValidationException("slot_invalido", "O campo 'slot' precisa ser 'AvatarFrame', 'NameColor', 'ProfileBanner' ou 'Hair'.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), slot, ct));
    })
    .RequireAuthorization()
    .WithName("UnequipCosmetic");

// --- Agente em pixel art (Fase 71) -------------------------------------------------------------
// Criacao (pele + kit basico + 1 cabelo natural opcional, tudo gratis) e troca de pele. Mesmo
// retorno do marketplace: o catalogo inteiro recalculado, com o agente e a vitrine da semana.

api.MapPost("/agent", async (ClaimsPrincipal principal, CreateAgentRequest? request, CreateAgentUseCase useCase, CancellationToken ct) =>
    {
        if (request?.SkinTone is not { } skinTone)
            throw new ValidationException("pele_obrigatoria", "O campo 'skinTone' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), skinTone, request.HairCode, ct));
    })
    .RequireAuthorization()
    .WithName("CreateAgent");

api.MapPut("/agent/skin", async (ClaimsPrincipal principal, UpdateAgentSkinToneRequest? request, UpdateAgentSkinToneUseCase useCase, CancellationToken ct) =>
    {
        if (request?.SkinTone is not { } skinTone)
            throw new ValidationException("pele_obrigatoria", "O campo 'skinTone' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), skinTone, ct));
    })
    .RequireAuthorization()
    .WithName("UpdateAgentSkinTone");

// --- Status de IA (Fase 28) -------------------------------------------------------------------
// Badge do GlobalNav (frontend) - sinaliza quando a Groq (ou outra IA futura) esta fora do ar, pra
// ajudar a decidir quando trocar a chave ou desativar atividades que dependem dela. Atras de auth
// (o app inteiro so mostra o GlobalNav pra usuario logado) mas sem RequireAuthorization mais
// granular - nao e dado por usuario, so exposicao geral do estado do provedor.

api.MapGet("/system/ai-status", async (GetAiProviderStatusUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .RequireAuthorization()
    .WithName("GetAiProviderStatus");

// --- Matricula (Fase 13) ---------------------------------------------------------------------

api.MapGet("/courses/available", async (ClaimsPrincipal principal, GetAvailableCoursesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetAvailableCourses");

api.MapPost("/enrollments", async (ClaimsPrincipal principal, CreateEnrollmentRequest? request, EnrollUserInCourseUseCase useCase, CancellationToken ct) =>
    {
        if (request?.CourseId is null)
            throw new ValidationException("course_id_obrigatorio", "O campo 'courseId' e obrigatorio.");

        var result = await useCase.ExecuteAsync(CurrentUserId(principal), request.CourseId.Value, ct);
        return Results.Created("/api/enrollments/me", result);
    })
    .RequireAuthorization()
    .WithName("CreateEnrollment");

api.MapGet("/enrollments/me", async (ClaimsPrincipal principal, GetMyEnrollmentsUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GetMyEnrollments");

// --- Cursos --------------------------------------------------------------------------------

api.MapGet("/courses", async (ClaimsPrincipal principal, ListCoursesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("ListCourses");

api.MapGet("/courses/{courseId}", async (ClaimsPrincipal principal, string courseId, GetCourseDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseDetail");

// Curriculo (Course -> Monthly -> WeeklyTemplate), sem exigir matricula (Fase 13b) - so
// `/admin/conteudo` usa isso, pra navegar ate uma WeeklyTemplate sem depender de Enrollment como
// GetCourseDetail acima exige (ver docs/fase-13a, "Pendencia conhecida").
api.MapGet("/courses/{courseId}/curriculum", async (ClaimsPrincipal principal, string courseId, GetCourseCurriculumUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseCurriculum");

// Ranking (Fase 16) - scope opcional na query string, default "course" (o recorte mais seguro/
// completo - snowball desde o inicio). Guid|nome invalido em "scope" vira 400 padronizado, mesmo
// tratamento de CreateCuratedContentUseCase.ParseType (Enum.TryParse + IsDefined).
api.MapGet("/courses/{courseId}/ranking", async (ClaimsPrincipal principal, string courseId, string? scope, GetCourseRankingUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        var rankingScope = ParseRankingScope(scope);
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, rankingScope, ct));
    })
    .RequireAuthorization()
    .WithName("GetCourseRanking");

// --- Semanas ---------------------------------------------------------------------------------

api.MapGet("/weeklies/{weeklyId}", async (ClaimsPrincipal principal, string weeklyId, GetWeeklyDetailUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetWeeklyDetail");

// WeeklyTemplate (curriculo), sem exigir matricula (Fase 13b) - mesma motivacao do curriculum
// acima, so pra `/admin/conteudo` listar/curar CuratedContent de uma semana.
api.MapGet("/weekly-templates/{id}", async (ClaimsPrincipal principal, string id, GetWeeklyTemplateDetailUseCase useCase, CancellationToken ct) =>
    {
        var templateId = RouteParsing.RequireGuid(id, "id");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), templateId, ct));
    })
    .RequireAuthorization()
    .WithName("GetWeeklyTemplateDetail");

// Submissao do projeto pratico da semana (Fase 7) - WeeklyProject.Submit ja existia no dominio
// desde a Fase 1, so faltava endpoint. SubmissionUrl e a unica entrada do cliente; Status muda
// pra Submitted dentro do proprio dominio (WeeklyProject.Submit).
api.MapPost("/weeklies/{weeklyId}/project/submit", async (ClaimsPrincipal principal, string weeklyId, SubmitWeeklyProjectRequest? request, SubmitWeeklyProjectUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        if (string.IsNullOrWhiteSpace(request?.SubmissionUrl))
            throw new ValidationException("submission_url_obrigatoria", "O campo 'submissionUrl' e obrigatorio.");

        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request.SubmissionUrl, ct));
    })
    .RequireAuthorization()
    .WithName("SubmitWeeklyProject");

// Escolha da linguagem do projeto (Fase 59, piloto da Semana 1) - so em semana com variantes de
// linguagem; faz o fork do repositorio-modelo da linguagem escolhida e disponibiliza o projeto.
// Definitiva: uma 2a chamada devolve 409 (linguagem_ja_escolhida), nunca troca.
api.MapPost("/weeklies/{weeklyId}/project/language", async (ClaimsPrincipal principal, string weeklyId, ChooseProjectLanguageRequest? request, ChooseWeeklyProjectLanguageUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ProjectLanguageParsing.Require(request?.Language), ct));
    })
    .RequireAuthorization()
    .WithName("ChooseWeeklyProjectLanguage");

// Token do Forgejo (Fase 60) - gera um novo e revoga o anterior; o valor so aparece nesta resposta,
// a Focadu nao guarda. POST (nao GET): cada chamada muda estado no Forgejo.
api.MapPost("/users/me/forgejo-token", async (ClaimsPrincipal principal, GenerateForgejoTokenUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), ct)))
    .RequireAuthorization()
    .WithName("GenerateForgejoToken");

// Avaliacao do projeto (Fase 11) - WeeklyProject.Evaluate() existia no dominio desde a Fase 1 sem
// endpoint (gap documentado na Fase 7); precisou ganhar um porque Weekly.IsModuleComplete() exige
// Project Evaluated. Sem tela propria - ver EvaluateWeeklyProjectUseCase. POST sem corpo (Fase 21,
// era PUT com {score,feedback} na Fase 16): a nota/feedback agora vem da IA (GitHub + Groq), nao
// mais do chamador.
api.MapPost("/weeklies/{weeklyId}/project/evaluate", async (ClaimsPrincipal principal, string weeklyId, EvaluateWeeklyProjectUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("EvaluateWeeklyProject");

// --- Publicacao publica do modulo (Fase 11) -------------------------------------------------
// Prova de aprendizado exigida ao completar uma Weekly (Documento Mestre, Secao 2.3) - LinkedIn
// (rascunho por IA + URL colada manualmente) ou GitHub (commit automatico via GitHubService, ja
// validado no proprio commit). /submit cobre tanto a primeira submissao quanto "tentar de novo"
// (resubmete a mesma URL/platform).

api.MapGet("/weeklies/{weeklyId}/publication/status", async (ClaimsPrincipal principal, string weeklyId, GetPublicationStatusUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetPublicationStatus");

api.MapPost("/weeklies/{weeklyId}/publication/draft", async (ClaimsPrincipal principal, string weeklyId, GenerateLinkedInDraftUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GenerateLinkedInDraft");

api.MapPost("/weeklies/{weeklyId}/publication/github-commit",
        async (ClaimsPrincipal principal, string weeklyId, GitHubCommitRequest? request, CommitModuleSummaryUseCase useCase, CancellationToken ct) =>
        {
            var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
            if (string.IsNullOrWhiteSpace(request?.RepoName))
                throw new ValidationException("repo_name_obrigatorio", "O campo 'repoName' e obrigatorio.");

            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request.RepoName, request.IsNewRepo, ct));
        })
    .RequireAuthorization()
    .WithName("CommitModuleSummary");

api.MapPost("/weeklies/{weeklyId}/publication/submit",
        async (ClaimsPrincipal principal, string weeklyId, SubmitPublicationRequest? request, SubmitPublicationUseCase useCase, CancellationToken ct) =>
        {
            var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
            if (string.IsNullOrWhiteSpace(request?.Url))
                throw new ValidationException("url_obrigatoria", "O campo 'url' e obrigatorio.");
            if (!Enum.TryParse<PublicationPlatform>(request.Platform, ignoreCase: true, out var platform) || !Enum.IsDefined(platform))
                throw new ValidationException("platform_invalida", "O campo 'platform' precisa ser LinkedIn ou GitHub.");

            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, platform, request.Url, ct));
        })
    .RequireAuthorization()
    .WithName("SubmitPublication");

api.MapGet("/github/repositories", async (GetGitHubRepositoriesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(ct)))
    .RequireAuthorization()
    .WithName("GetGitHubRepositories");

// --- Conteudo curado (leitura) ----------------------------------------------------------------
// Autoria (Create/Update) removida - conteudo curado agora e so via seed (CuratedDayImporter, le
// secret/conteudo/*.json - ver docs/ARQUITETURA.md). So leitura, usada por ReadingActivity/
// VideoActivity durante a sessao diaria.

api.MapGet("/curated-content/{id}", async (ClaimsPrincipal principal, string id, GetCuratedContentUseCase useCase, CancellationToken ct) =>
    {
        var contentId = RouteParsing.RequireGuid(id, "id");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), contentId, ct));
    })
    .RequireAuthorization()
    .WithName("GetCuratedContent");

// --- Dailies -------------------------------------------------------------------------------

api.MapGet("/dailies/{dailyId}", async (ClaimsPrincipal principal, string dailyId, GetDailyStateUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetDailyState");

// Atalho "/hoje": resolve a Daily de hoje pra Enrollment do usuario logado (Fase 13 - nao mais
// "1 Course Active" global, ver GetTodayUseCase). `?courseId=` (opcional, tela de start com varios
// cursos): a matricula daquele curso.
api.MapGet("/today", async (ClaimsPrincipal principal, string? courseId, GetTodayUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(
            CurrentUserId(principal),
            courseId is null ? null : RouteParsing.RequireGuid(courseId, "courseId"),
            ct)))
    .RequireAuthorization()
    .WithName("GetToday");

api.MapPost("/dailies/{dailyId}/start", async (ClaimsPrincipal principal, string dailyId, StartOrResumeDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("StartOrResumeDaily");

// Qual campo e obrigatorio/valido depende do tipo (e, pro Cloze, do AnswerMode) da atividade -
// essa decisao mora dentro do caso de uso, que e quem enxerga o ActivityType/AnswerMode
// (ver SubmitActivityResponseUseCase.ResolveScore). O Score nunca vem do cliente.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses",
        async (ClaimsPrincipal principal, string dailyId, string activityId, SubmitActivityResponseRequest? request, SubmitActivityResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            var result = await useCase.ExecuteAsync(
                CurrentUserId(principal), dId, aId, request?.SelectedOptionId, request?.SelectedRoleplayNodeId,
                request?.Transcript, request?.Justification, request?.AiFeedback, request?.WordMatchMatches, ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .RequireAuthorization()
    .WithName("SubmitActivityResponse");

// Endpoint separado do texto (POST .../responses) porque o corpo aqui e binario (multipart/
// form-data), nao JSON. Fluxo: transcreve (Groq Whisper) -> avalia contra o CuratedContent de
// referencia (Groq chat completion) -> Score/Passed vem da avaliacao, nunca do cliente.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses/audio",
        async (ClaimsPrincipal principal, string dailyId, string activityId, IFormFile? audio, SubmitVoiceSummaryResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            if (audio is null)
                throw new ValidationException("audio_obrigatorio", "O arquivo de audio e obrigatorio.");

            await using var stream = audio.OpenReadStream();
            var result = await useCase.ExecuteAsync(CurrentUserId(principal), dId, aId, stream, audio.Length, ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .RequireAuthorization()
    .WithName("SubmitVoiceSummaryResponse")
    .DisableAntiforgery();

// Fase 79: passo de codigo da ponte ("code comigo") - codigo do passo + saida do terminal,
// conferidos pela IA contra a rubrica do passo. Nunca conta como erro da sessao.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/responses/code",
        async (ClaimsPrincipal principal, string dailyId, string activityId, SubmitCodeStepRequest? request, SubmitCodeStepResponseUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            // Fase 86: nos passos que rodam no laboratorio vale o labRun (saida da plataforma); fora dele, output colado.
            var result = await useCase.ExecuteAsync(CurrentUserId(principal), dId, aId, request?.Code, request?.Output, ToLabRun(request?.LabRun), ct);
            return Results.Created($"/api/dailies/{dailyId}/activities/{activityId}/responses/{result.Response.Id}", result);
        })
    .RequireAuthorization()
    .WithName("SubmitCodeStepResponse");

// Fase 86: dica da Focada num passo de codigo com laboratorio - tres blocos, nao e tentativa, limite de
// 3 por passo. O codigo dos passos anteriores vem do servidor.
api.MapPost("/dailies/{dailyId}/activities/{activityId}/code-hint",
        async (ClaimsPrincipal principal, string dailyId, string activityId, RequestCodeHintRequest? request, RequestCodeStepHintUseCase useCase, CancellationToken ct) =>
        {
            var dId = RouteParsing.RequireGuid(dailyId, "dailyId");
            var aId = RouteParsing.RequireGuid(activityId, "activityId");

            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), dId, aId, request?.Code, ToLabRun(request?.LabRun), ct));
        })
    .RequireAuthorization()
    .WithName("RequestCodeStepHint");

// Fase 79: repositorio (GitHub ou Forgejo) do script da ponte - opcional, depois de concluir o dia.
api.MapPut("/dailies/{dailyId}/code-repository",
        async (ClaimsPrincipal principal, string dailyId, LinkCodeRepositoryRequest? request, LinkDailyCodeRepositoryUseCase useCase, CancellationToken ct) =>
        {
            var id = RouteParsing.RequireGuid(dailyId, "dailyId");
            return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request?.Url, ct));
        })
    .RequireAuthorization()
    .WithName("LinkDailyCodeRepository");

api.MapPost("/dailies/{dailyId}/complete", async (ClaimsPrincipal principal, string dailyId, CompleteDailyUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("CompleteDaily");

// Aquecimento (plano de curadoria): 2 perguntas de dias anteriores, sob demanda. Nao e atividade do dia nem entra no Score.
api.MapGet("/dailies/{dailyId}/warmup", async (ClaimsPrincipal principal, string dailyId, GetWarmupUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetWarmup");

// --- Feedback do dia (plano de curadoria, 02/10/2026) -----------------------------------------
// Ao fim do dia o aluno da uma nota de clareza (1 a 5), diz onde travou e comenta. Um por Daily, regravavel.
api.MapPut("/dailies/{dailyId}/feedback", async (ClaimsPrincipal principal, string dailyId, SubmitDayFeedbackRequest? request, Focadu.Application.Feedback.SubmitDayFeedbackUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request?.Clarity ?? 0, request?.StuckActivityId, request?.Comment, ct));
    })
    .RequireAuthorization()
    .WithName("SubmitDayFeedback");

api.MapGet("/dailies/{dailyId}/feedback", async (ClaimsPrincipal principal, string dailyId, Focadu.Application.Feedback.GetDayFeedbackUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("GetDayFeedback");

// --- Caderninho de Anotacoes (Fase 29) ------------------------------------------------------

api.MapPost("/dailies/{dailyId}/notes", async (ClaimsPrincipal principal, string dailyId, CreateNoteRequest? request, CreateNoteUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(dailyId, "dailyId");
        var result = await useCase.ExecuteAsync(CurrentUserId(principal), id, request?.Content ?? string.Empty, request?.Tags, ct);
        return Results.Created($"/api/notes/{result.Id}", result);
    })
    .RequireAuthorization()
    .WithName("CreateNote");

// Fase 63: "Anotação rápida" da tela do Projeto Semanal - a nota fica presa ao projeto, nao a uma Daily.
api.MapPost("/weeklies/{weeklyId}/project/notes", async (ClaimsPrincipal principal, string weeklyId, CreateNoteRequest? request, CreateWeeklyProjectNoteUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(weeklyId, "weeklyId");
        var result = await useCase.ExecuteAsync(CurrentUserId(principal), id, request?.Content ?? string.Empty, request?.Tags, ct);
        return Results.Created($"/api/notes/{result.Id}", result);
    })
    .RequireAuthorization()
    .WithName("CreateWeeklyProjectNote");

api.MapPut("/notes/{noteId}", async (ClaimsPrincipal principal, string noteId, UpdateNoteRequest? request, EditNoteUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(noteId, "noteId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, request?.Content ?? string.Empty, request?.Tags, ct));
    })
    .RequireAuthorization()
    .WithName("EditNote");

api.MapDelete("/notes/{noteId}", async (ClaimsPrincipal principal, string noteId, DeleteNoteUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(noteId, "noteId");
        await useCase.ExecuteAsync(CurrentUserId(principal), id, ct);
        return Results.NoContent();
    })
    .RequireAuthorization()
    .WithName("DeleteNote");

// Filtros opcionais na query string (from/to/q/tag) - binding automatico do minimal API, sem
// RouteParsing (DateOnly/string ja implementam TryParse/sao string direto).
api.MapGet("/courses/{courseId}/notes", async (
        ClaimsPrincipal principal, string courseId, DateOnly? from, DateOnly? to, string? q, string? tag, Guid? dailyId,
        ListNotesUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, from, to, q, tag, dailyId, ct));
    })
    .RequireAuthorization()
    .WithName("ListNotes");

api.MapGet("/courses/{courseId}/notes/tags", async (ClaimsPrincipal principal, string courseId, ListNoteTagsUseCase useCase, CancellationToken ct) =>
    {
        var id = RouteParsing.RequireGuid(courseId, "courseId");
        return Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), id, ct));
    })
    .RequireAuthorization()
    .WithName("ListNoteTags");

// Revisao por IA das notas de um dia (Fase 78, Caderninho) - por botao, sem nota; limite diario.
api.MapPost("/dailies/{dailyId}/notes/review", async (ClaimsPrincipal principal, string dailyId, ReviewDailyNotesUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), RouteParsing.RequireGuid(dailyId, "dailyId"), ct)))
    .RequireAuthorization()
    .WithName("ReviewDailyNotes");

api.MapGet("/courses/{courseId}/notes/reviews", async (ClaimsPrincipal principal, string courseId, ListNotesReviewsUseCase useCase, CancellationToken ct) =>
        Results.Ok(await useCase.ExecuteAsync(CurrentUserId(principal), RouteParsing.RequireGuid(courseId, "courseId"), ct)))
    .RequireAuthorization()
    .WithName("ListNotesReviews");

// --- Suporte Rapido de IA (Fase 32) -----------------------------------------------------------
// Botao flutuante durante a sessao (ver secret/rascunhos/visual-ui-ux.md) - pergunta avulsa, sem
// historico de conversa nem Daily/Weekly/dailyId na rota: Context vem pronto do frontend (o que ja
// esta na tela, ver AskStudyAssistantUseCase) - autorizacao/posse ja foi checada quando o frontend
// buscou esses dados nos proprios endpoints, este so precisa do usuario logado (personalizacao).

api.MapPost("/study-assistant/ask", async (ClaimsPrincipal principal, AskStudyAssistantRequest? request, AskStudyAssistantUseCase useCase, CancellationToken ct) =>
    {
        var history = request?.History?.Select(h => new StudyAssistantChatTurn(h.FromUser, h.Content)).ToList();
        var answer = await useCase.ExecuteAsync(
            CurrentUserId(principal), request?.Question ?? string.Empty, request?.Context, history, request?.CodeBridge ?? false, request?.CourseId, ct);
        return Results.Ok(new AskStudyAssistantResponse(answer));
    })
    .RequireAuthorization()
    .WithName("AskStudyAssistant");

app.Run();

// Necessario para o WebApplicationFactory de testes de integracao (fora de escopo neste passo,
// mas deixamos a classe Program acessivel para quando esses testes forem adicionados).
public partial class Program
{
}
