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

    public static IServiceCollection AddFocaduInfrastructure(
        this IServiceCollection services, string connectionString, string groqApiKey)
    {
        services.AddDbContext<FocaduDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IMonthlyRepository, MonthlyRepository>();
        services.AddScoped<IWeeklyRepository, WeeklyRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddSingleton<IClock, SystemClock>();

        // Groq (Fase 5): transcricao (Whisper) e avaliacao (chat completion) de resumos falados.
        // ApiKey vazia nao impede o app de subir - so os dois adapters abaixo falham (com erro
        // claro, ver GroqOptions) quando efetivamente chamados sem a chave configurada.
        services.AddSingleton(new GroqOptions(groqApiKey));
        services.AddHttpClient<IAudioTranscriptionService, GroqAudioTranscriptionService>(ConfigureGroqClient);
        services.AddHttpClient<IContentEvaluationService, GroqContentEvaluationService>(ConfigureGroqClient);

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
