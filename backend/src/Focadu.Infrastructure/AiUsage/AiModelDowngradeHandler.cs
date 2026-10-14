using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Nodes;

namespace Focadu.Infrastructure.AiUsage;

/// <summary>
/// Teto mensal de IA (Fase 101): passou do teto, as chamadas de TEXTO (chat completion) trocam para o modelo reserva barato em
/// vez de parar - ninguem fica sem IA. Fica por FORA do AiUsageMeasuringHandler, entao a Medicao grava o modelo que foi de
/// verdade usado. Transcricao de audio nao passa por aqui (nao tem JSON; o Whisper segue o mesmo). So mexe no campo "model"
/// do corpo; qualquer coisa inesperada segue a chamada original.
/// </summary>
public sealed class AiModelDowngradeHandler : DelegatingHandler
{
    private readonly AiCapMonitor _monitor;

    public AiModelDowngradeHandler(AiCapMonitor monitor)
    {
        _monitor = monitor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Content?.Headers.ContentType?.MediaType == "application/json"
            && await _monitor.GetAsync(cancellationToken) is { OverCap: true, FallbackModel: { } fallback })
        {
            var body = await request.Content.ReadAsStringAsync(cancellationToken);
            if (Swap(body, fallback) is { } swapped)
            {
                request.Content = new StringContent(swapped, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }

    /// <summary>Corpo com o "model" trocado, ou nulo se nao for um objeto JSON com "model" em texto (ou ja for o reserva).</summary>
    internal static string? Swap(string body, string fallbackModel)
    {
        try
        {
            if (JsonNode.Parse(body) is not JsonObject json) return null;
            if (json["model"] is not JsonValue current || !current.TryGetValue<string>(out var model) || model == fallbackModel) return null;
            json["model"] = fallbackModel;
            return json.ToJsonString();
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }
    }
}
