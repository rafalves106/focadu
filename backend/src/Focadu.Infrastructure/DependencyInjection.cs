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
        services.AddHttpClient<IAudioTranscriptionService, GroqAudioTranscriptionService>(ConfigureGroqClient);
        services.AddHttpClient<IContentEvaluationService, GroqContentEvaluationService>(ConfigureGroqClient);
        // Rascunho de post do LinkedIn (Fase 11) - mesmo cliente/chave do Groq, so um adapter
        // diferente (gera texto livre, sem JSON mode/Score).
        services.AddHttpClient<IDraftGenerationService, GroqDraftGenerationService>(ConfigureGroqClient);

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

        void ConfigureGroqClient(HttpClient client)
        {
            client.BaseAddress = GroqBaseAddress;
            if (!string.IsNullOrWhiteSpace(groqApiKey))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", groqApiKey);
            // Transcricao/avaliacao podem demorar mais que uma chamada tipica da Api, mas nao
            // devem travar a requisicao do usuario indefinidamente.
            client.Timeout = TimeSpan.FromSeconds(60);
        }
    }
}
