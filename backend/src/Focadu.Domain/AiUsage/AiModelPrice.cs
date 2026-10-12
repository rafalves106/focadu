using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.AiUsage;

/// <summary>
/// Preco de um modelo (Fase 94, gaveta "Tabela de precos"), em US$. Modelo de texto cobra por 1 M tokens de entrada e
/// de saida; modelo de audio cobra por hora de audio. Editar recalcula toda estimativa, de todos os periodos - o uso
/// medido nunca muda. Modelo sem linha aqui aparece como "sem preco" e fica fora da soma.
/// </summary>
public class AiModelPrice : Entity
{
    public string Model { get; private set; }
    public decimal? InputPerMillionUsd { get; private set; }
    public decimal? OutputPerMillionUsd { get; private set; }
    public decimal? AudioPerHourUsd { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    /// <summary>Quem atualizou (@ do admin, ou "seed" pros precos iniciais).</summary>
    public string UpdatedBy { get; private set; }

    /// <summary>De onde veio o preco (ex.: "pagina de precos da Groq").</summary>
    public string? Source { get; private set; }

    private AiModelPrice()
    {
        Model = string.Empty;
        UpdatedBy = string.Empty;
    }

    public static AiModelPrice Create(string model, decimal? inputPerMillion, decimal? outputPerMillion, decimal? audioPerHour,
        DateTime now, string updatedBy, string? source)
    {
        if (string.IsNullOrWhiteSpace(model))
            throw new DomainException("Modelo e obrigatorio.", "preco_invalido");

        var price = new AiModelPrice { Model = model.Trim(), UpdatedBy = string.Empty };
        price.Update(inputPerMillion, outputPerMillion, audioPerHour, now, updatedBy, source);
        return price;
    }

    public void Update(decimal? inputPerMillion, decimal? outputPerMillion, decimal? audioPerHour, DateTime now, string updatedBy, string? source)
    {
        if (inputPerMillion < 0 || outputPerMillion < 0 || audioPerHour < 0)
            throw new DomainException("Preco nao pode ser negativo.", "preco_invalido");
        if (inputPerMillion is null && outputPerMillion is null && audioPerHour is null)
            throw new DomainException("Informe ao menos um preco.", "preco_invalido");

        InputPerMillionUsd = inputPerMillion;
        OutputPerMillionUsd = outputPerMillion;
        AudioPerHourUsd = audioPerHour;
        UpdatedAt = now;
        UpdatedBy = string.IsNullOrWhiteSpace(updatedBy) ? "?" : updatedBy.Trim();
        Source = string.IsNullOrWhiteSpace(source) ? null : source.Trim();
    }

    /// <summary>Custo estimado de um uso com este preco. Parte sem preco (ex.: audio num modelo de texto) conta zero.</summary>
    public decimal CostOf(long inputTokens, long outputTokens, double audioSeconds) =>
        (InputPerMillionUsd ?? 0m) * inputTokens / 1_000_000m
        + (OutputPerMillionUsd ?? 0m) * outputTokens / 1_000_000m
        + (AudioPerHourUsd ?? 0m) * (decimal)audioSeconds / 3600m;
}
