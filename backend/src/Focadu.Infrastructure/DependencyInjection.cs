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

    // Avaliacao (chat completion) via HttpRetry - bug real relatado ao vivo em 2026-09-17: 2s
    // (valor original, assumindo LPU sub-segundo em texto puro) se mostrou curto demais depois da
    // Fase 39 (prompt de avaliacao ganhou um passo explicito de correcao de transcricao antes do
    // score, mais raciocinio = mais tempo) - as 3 tentativas bateram no timeout em sequencia sem
    // nenhuma completar (logs: tentativas as 01:41:28/31/34, ~2.5s entre cada). 6s por tentativa,
    // aplicado a CADA UMA das 2 chamadas Groq do passo de avaliacao desde a Fase 42 (correcao de
    // transcricao numa chamada separada da nota - ver GroqContentEvaluationService) - orcamento
    // total do fluxo recalculado na nota do AddHttpClient abaixo.
    private static readonly TimeSpan GroqContentEvaluationAttemptTimeout = TimeSpan.FromSeconds(6);

    // Transcricao de audio tem uma tentativa mais generosa que os outros adapters via HttpRetry:
    // ao contrario de chat completion (texto puro, chega em 1 payload pequeno), essa chamada
    // primeiro faz UPLOAD do audio gravado (multipart) antes da Groq sequer comecar a processar -
    // tempo de upload depende da conexao real do usuario, nao so da velocidade da LPU. 2s (o
    // timeout padrao de HttpRetry) se mostrou curto demais na pratica: confirmado ao vivo em
    // 2026-09-13, as 3 tentativas de retry bateram no timeout sem nenhuma chegar a completar (ver
    // docs/ARQUITETURA.md). 15s por tentativa ainda deixa margem confortavel dentro do orcamento
    // de VOICE_SUMMARY_TIMEOUT_MS (95s no frontend, ver api/client.ts) somado ao passo seguinte
    // (avaliacao do transcript, GroqContentEvaluationAttemptTimeout acima).
    private static readonly TimeSpan GroqAudioTranscriptionAttemptTimeout = TimeSpan.FromSeconds(15);

    public static IServiceCollection AddFocaduInfrastructure(
        this IServiceCollection services, string connectionString, string groqApiKey, GitHubOptions gitHubOptions,
        ForgejoOptions forgejoOptions, JwtOptions jwtOptions, SmtpOptions smtpOptions, FrontendOptions frontendOptions)
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
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IUserForgejoAccountRepository, UserForgejoAccountRepository>();
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
        // Timeout por tentativa menor que o padrao (60s): estes dois adapters agora fazem ate 3
        // tentativas (HttpRetry) em sequencia dentro de 1 unico fluxo (SubmitVoiceSummary-
        // ResponseUseCase: transcreve -> avalia) - com o timeout padrao, 3 tentativas x 2 chamadas
        // encostariam em 6min. Transcricao usa GroqAudioTranscriptionAttemptTimeout (15s - upload
        // de audio real precisa de mais margem que chat completion); avaliacao usa
        // GroqContentEvaluationAttemptTimeout (6s, ver constante acima), aplicado a CADA UMA das 2
        // chamadas Groq sequenciais que a avaliacao faz desde a Fase 42 (correcao de transcricao
        // numa chamada dedicada, depois a nota numa 2a - ver GroqContentEvaluationService). Pior
        // caso do fluxo inteiro (transcricao ate 3 tentativas + avaliacao = 2 chamadas, cada uma
        // ate 3 tentativas, tudo com backoff) fica em ~85s, dentro dos 95s do client.Timeout que o
        // frontend usa como referencia (VOICE_SUMMARY_TIMEOUT_MS em api/client.ts, tambem ajustado
        // na Fase 42).
        services.AddHttpClient<IAudioTranscriptionService, GroqAudioTranscriptionService>(
            client => ConfigureGroqClient(client, GroqAudioTranscriptionAttemptTimeout));
        services.AddHttpClient<IContentEvaluationService, GroqContentEvaluationService>(
            client => ConfigureGroqClient(client, GroqContentEvaluationAttemptTimeout));
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
        // Suporte Rapido de IA (Fase 32) - botao flutuante durante a sessao, pergunta avulsa sem
        // historico (ver AskStudyAssistantUseCase) - mesmo cliente/chave do Groq, timeout padrao
        // (chamada unica, sem retry, mesma categoria de Draft/ProjectEvaluation/Analogy acima).
        services.AddHttpClient<IStudyAssistantService, GroqStudyAssistantService>(
            client => ConfigureGroqClient(client, GroqDefaultTimeout));
        // Status da IA (Fase 28): badge do GlobalNav no frontend - GroqHealthCheckService e
        // Singleton (guarda cache em memoria, ver comentario na classe), entao usa
        // IHttpClientFactory.CreateClient(nome) em vez de AddHttpClient<TService> (que registraria
        // o servico como Transient). Timeout bem menor que os outros clientes Groq (5s, sem retry) -
        // e so um ping de "esta no ar?", nunca deve travar o badge esperando.
        services.AddHttpClient(GroqHealthCheckService.GroqHealthCheckHttpClientName,
            client => ConfigureGroqClient(client, TimeSpan.FromSeconds(5)));
        services.AddSingleton<IAiProviderHealthCheck, GroqHealthCheckService>();

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

        // Forgejo interno (Projeto Semanal, hospedagem de repositorio) - mesma decisao de
        // resiliencia do GitHub acima: config ausente nao impede o app de subir. Diferente do
        // GitHub, a BaseUrl nao e uma constante fixa (instancia self-hosted, endereco muda por
        // ambiente - container `forgejo` no Compose local, host proprio em producao).
        services.AddSingleton(forgejoOptions);
        services.AddHttpClient<IForgejoService, ForgejoService>(client =>
        {
            if (!string.IsNullOrWhiteSpace(forgejoOptions.BaseUrl))
                client.BaseAddress = new Uri(forgejoOptions.BaseUrl);
            if (!string.IsNullOrWhiteSpace(forgejoOptions.AdminToken))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("token", forgejoOptions.AdminToken);
            client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
            client.Timeout = TimeSpan.FromSeconds(20);
        });

        // Redefinicao de senha (Fase 41) - Smtp:Host ausente nao impede o app de subir, mesma
        // decisao de Groq/GitHub acima: so o envio do email falha (com erro claro) quando de fato
        // chamado sem estar configurado. FrontendOptions so serve pra montar o link do email.
        services.AddSingleton(smtpOptions);
        services.AddSingleton(frontendOptions);
        services.AddSingleton<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();

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
