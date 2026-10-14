using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;

namespace Focadu.Api;

/// <summary>
/// Fase 99: limite de requisicoes, em janela deslizante, escolhido pelo caminho (um limitador global: rota nova que case
/// com um padrao ja entra, e esquecer de anotar rota e impossivel). Tres grupos, so em POST:
/// <list type="bullet">
/// <item><c>login</c>: tentativa de senha, por IP (forca bruta).</item>
/// <item><c>account</c>: cadastro, redefinicao de senha e codigo de e-mail, por IP (dispara e-mail e adivinha codigo).</item>
/// <item><c>ai</c>: endpoints que chamam o Groq, por aluno (cai pro IP se a sessao nao veio). O orcamento diario de IA e outra fase.</item>
/// </list>
/// O IP vem de <c>RemoteIpAddress</c>, ja corrigido por <c>UseForwardedHeaders</c> (Cloudflare -> nginx -> Api); sem isso todo
/// aluno cairia no IP do nginx. O limitador roda depois da autenticacao, pra ler o aluno. Desligar: <c>RateLimit__Enabled=false</c>.
/// </summary>
public static partial class RateLimiting
{
    internal enum Group { None, Login, Account, Ai }

    private static readonly (int Permits, TimeSpan Window) LoginLimit = (10, TimeSpan.FromMinutes(1));
    private static readonly (int Permits, TimeSpan Window) AccountLimit = (10, TimeSpan.FromMinutes(15));
    private static readonly (int Permits, TimeSpan Window) AiLimit = (20, TimeSpan.FromMinutes(1));
    private const int Segments = 4;

    private static (int Permits, TimeSpan Window) LimitOf(Group group) => group switch { Group.Login => LoginLimit, Group.Account => AccountLimit, _ => AiLimit };

    public static IServiceCollection AddFocaduRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var enabled = !bool.TryParse(configuration["RateLimit:Enabled"], out var flag) || flag;

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                // Janela deslizante nao informa quando libera: um segmento da janela e o menor tempo ate abrir vaga.
                var group = Classify(context.HttpContext.Request.Method, context.HttpContext.Request.Path.Value ?? string.Empty);
                context.HttpContext.Response.Headers.RetryAfter =
                    ((int)Math.Ceiling(LimitOf(group).Window.TotalSeconds / Segments)).ToString(CultureInfo.InvariantCulture);
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = "muitas_requisicoes", message = "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." }, ct);
            };
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http => Partition(http, enabled));
        });
        return services;
    }

    internal static Group Classify(string method, string path)
    {
        if (!HttpMethods.IsPost(method)) return Group.None;
        path = path.TrimEnd('/');
        if (path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase)) return Group.Login;
        if (AccountPath().IsMatch(path)) return Group.Account;
        if (AiPath().IsMatch(path)) return Group.Ai;
        return Group.None;
    }

    private static RateLimitPartition<string> Partition(HttpContext http, bool enabled)
    {
        var group = Classify(http.Request.Method, http.Request.Path.Value ?? string.Empty);
        if (!enabled || group == Group.None) return RateLimitPartition.GetNoLimiter("sem-limite");

        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
        var (permits, window) = LimitOf(group);
        var who = group == Group.Ai && http.User.FindFirst("sub")?.Value is { } user ? $"user:{user}" : $"ip:{ip}";

        return RateLimitPartition.GetSlidingWindowLimiter($"{group}:{who}", _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = window,
            SegmentsPerWindow = Segments,
            QueueLimit = 0,
        });
    }

    [GeneratedRegex(@"^/api/auth/(register|forgot-password|reset-password|email-verification/(send|confirm))$", RegexOptions.IgnoreCase)]
    private static partial Regex AccountPath();

    [GeneratedRegex(
        @"^/api/(dailies/[^/]+/activities/[^/]+/(responses/audio|responses/code|code-hint)|weeklies/[^/]+/project/(submit|evaluate)|weeklies/[^/]+/publication/draft|dailies/[^/]+/notes/review|study-assistant/ask)$",
        RegexOptions.IgnoreCase)]
    private static partial Regex AiPath();
}
