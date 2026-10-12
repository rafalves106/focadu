using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.AiUsage;

/// <summary>
/// Uma chamada a IA medida (Fase 94, "medir antes de limitar"). Guarda so o uso (tokens, segundos de audio), nunca o
/// custo: o custo e sempre estimado na leitura, com a tabela de precos atual (AiModelPrice). Curso e dia do curso vao
/// copiados (sem chave estrangeira) pra a medicao sobreviver a apagar dia antigo ou resetar aluno. Nunca e editada.
/// </summary>
public class AiUsageRecord : Entity
{
    public DateTime OccurredAt { get; private set; }
    public AiCallType CallType { get; private set; }
    public string Model { get; private set; }
    public Guid? UserId { get; private set; }
    public Guid? CourseId { get; private set; }

    /// <summary>Numero do dia no curso (DayNumber da Daily) - nulo quando a chamada nao e de um dia (projeto, chat fora de sessao).</summary>
    public int? CourseDay { get; private set; }

    public int InputTokens { get; private set; }
    public int OutputTokens { get; private set; }
    public double AudioSeconds { get; private set; }

    /// <summary>A Groq respondeu com sucesso. Chamada com erro tambem e registrada (mostra instabilidade), com uso zero.</summary>
    public bool Succeeded { get; private set; }

    private AiUsageRecord()
    {
        Model = string.Empty;
    }

    public static AiUsageRecord Create(
        DateTime occurredAt, AiCallType callType, string model, Guid? userId, Guid? courseId, int? courseDay,
        int inputTokens, int outputTokens, double audioSeconds, bool succeeded)
    {
        if (string.IsNullOrWhiteSpace(model))
            throw new DomainException("Modelo e obrigatorio.");
        if (inputTokens < 0 || outputTokens < 0 || audioSeconds < 0)
            throw new DomainException("Uso nao pode ser negativo.");

        return new AiUsageRecord
        {
            OccurredAt = occurredAt,
            CallType = callType,
            Model = model.Trim(),
            UserId = userId,
            CourseId = courseId,
            CourseDay = courseDay,
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            AudioSeconds = audioSeconds,
            Succeeded = succeeded,
        };
    }
}
