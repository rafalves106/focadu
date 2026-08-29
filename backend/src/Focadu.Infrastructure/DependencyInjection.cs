using System.Net.Http.Headers;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Infrastructure.Persistence;
using Focadu.Infrastructure.Persistence.Repositories;
using Focadu.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Focadu.Infrastructure;

/// <summary>Composicao dos adapters concretos (EF Core / Postgres, Groq) no container de DI.</summary>
public static class DependencyInjection
{
    private static readonly Uri GroqBaseAddress = new("https://api.groq.com/openai/v1/");
    private static readonly Uri GitHubBaseAddress = new("https://api.github.com/");

    // Timeout padrao (sem retry, chamada unica): rascunho de post e avaliacao de projeto podem
    // ler prompts bem maiores (ate 150k chars de snapshot de repositorio - ver GitHubService.
    // MaxTotalChars), sem o orcamento apertado do fluxo de VoiceSummary abaixo.
    private static readonly TimeSpan GroqDefaultTimeout = TimeSpan.FromSeconds(60);

    // Timeout por tentativa pros adapters que passam por HttpRetry (ver nota no registro deles).
    private static readonly TimeSpan GroqRetryAttemptTimeout = TimeSpan.FromSeconds(2);

    public static IServiceCollection AddFocaduInfrastructure(
        this IServiceCollection services, string connectionString, string groqApiKey, GitHubOptions gitHubOptions, JwtOptions jwtOptions)
    {
        services.AddDbContext<FocaduDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IMonthlyRepository, MonthlyRepository>();
        services.AddScoped<IWeeklyRepository, WeeklyRepository>();
        services.AddScoped<IWeeklyTemplateRepository, WeeklyTemplateRepository>();
        services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserGemBalanceRepository, UserGemBalanceRepository>();
        services.AddScoped<IUserStreakRepository, UserStreakRepository>();
        services.AddScoped<ICosmeticItemRepository, CosmeticItemRepository>();
        services.AddScoped<IUserCosmeticInventoryRepository, UserCosmeticInventoryRepository>();
        services.AddScoped<IUserEquippedCosmeticsRepository, UserEquippedCosmeticsRepository>();
        services.AddScoped<IReferralRepository, ReferralRepository>();
        services.AddScoped<ISquadRepository, SquadRepository>();
        services.AddScoped<IPersonalizedAnalogyRepository, PersonalizedAnalogyRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddSingleton<IClock, SystemClock>();

        // Autenticacao (Fase 12) - JwtOptions.SecretKey e exigida no boot (Program.cs falha antes
        // de chegar aqui se estiver ausente, diferente de Groq/GitHub abaixo).
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton(jwtOptions);
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        // Groq (Fase 5): transcricao (Whisper) e avaliacao (chat completion) de resumos falados.
        // ApiKey vazia nao impede o app de subir - so os dois adapters abaixo falham (com erro
        // claro, ver GroqOptions) quando efetivamente chamados sem a chave configurada.
        services.AddSingleton(new GroqOptions(groqApiKey));
        // Timeout por tentativa menor que o padrao (2s vs 60s): estes dois adapters agora fazem
        // ate 3 tentativas (HttpRetry) em sequencia dentro de 1 unico fluxo (SubmitVoiceSummary-
        // ResponseUseCase: transcreve -> avalia) - com o timeout padrao, 3 tentativas x 2 chamadas
        // encostariam em 6min. 2s cobre folgado o tempo real de resposta da Groq (LPU, geralmente
        // sub-segundo); pior caso do fluxo inteiro (6 tentativas + backoff) fica em ~15-20s, bem
        // abaixo dos 60s do client.Timeout que o frontend usa como referencia (ver
        // VOICE_SUMMARY_TIMEOUT_MS em api/client.ts) - reavaliar se audios legitimos maiores
        // comecarem a estourar isso.
        services.AddHttpClient<IAudioTranscriptionService, GroqAudioTranscriptionService>(
            client => ConfigureGroqClient(client, GroqRetryAttemptTimeout));
        services.AddHttpClient<IContentEvaluationService, GroqContentEvaluationService>(
            client => ConfigureGroqClient(client, GroqRetryAttemptTimeout));
        // Rascunho de post do LinkedIn (Fase 11) - mesmo cliente/chave do Groq, so um adapter
        // diferente (gera texto livre, sem JSON mode/Score).
        services.AddHttpClient<IDraftGenerationService, GroqDraftGenerationService>(
            client => ConfigureGroqClient(client, GroqDefaultTimeout));
        // Avaliacao automatica do projeto da semana (repositorio vs especificacao) - mesmo
        // cliente/chave do Groq, adapter proprio (prompt de codigo/repo, nao de resumo falado).
        services.AddHttpClient<IProjectEvaluationService, GroqProjectEvaluationService>(
            client => ConfigureGroqClient(client, GroqDefaultTimeout));
        // Analogia personalizada de leitura (Fase 21) - mesmo cliente/chave do Groq, adapter
        // proprio (prompt de analogia por interesse, nao de resumo falado nem de codigo).
        services.AddHttpClient<IAnalogyGenerationService, GroqAnalogyGenerationService>(
            client => ConfigureGroqClient(client, GroqDefaultTimeout));

        // GitHub (Fase 11) - token ausente nao impede o app de subir, so as chamadas do
        // GitHubService falham (com erro claro) quando de fato invocadas sem ele configurado
        // (mesma decisao do Groq acima).
        services.AddSingleton(gitHubOptions);
        services.AddHttpClient<IGitHubService, GitHubService>(client =>
        {
            client.BaseAddress = GitHubBaseAddress;
            if (!string.IsNullOrWhiteSpace(gitHubOptions.Token))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", gitHubOptions.Token);
            // A Api do GitHub exige User-Agent e recusa a requisicao sem ele.
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Focadu/1.0");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
            client.Timeout = TimeSpan.FromSeconds(20);
        });

        return services;

        void ConfigureGroqClient(HttpClient client, TimeSpan timeout)
        {
            client.BaseAddress = GroqBaseAddress;
            if (!string.IsNullOrWhiteSpace(groqApiKey))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", groqApiKey);
            client.Timeout = timeout;
        }
    }
}
