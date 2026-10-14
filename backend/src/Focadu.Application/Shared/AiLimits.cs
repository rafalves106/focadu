using Focadu.Application.Admin;
using Focadu.Domain.Activities;
using Focadu.Domain.Exceptions;

namespace Focadu.Application.Shared;

/// <summary>
/// Travas baratas de IA (Fase 101), independentes de preco: o que o aluno pode mandar para avaliar. O orcamento diario em
/// dinheiro (<see cref="Ports.IAiBudget"/>) e a rede de seguranca; estas travas barram o abuso antes de gastar.
/// </summary>
public static class AiLimits
{
    /// <summary>
    /// Duracao maxima de um audio de resumo falado. O frontend deixa o aluno escolher gravar ate 15 min; a folga de 1 min cobre
    /// o fim da gravacao. A duracao vem da propria transcricao (o servidor nao decodifica o webm), entao o limite pega o excesso
    /// depois da transcricao e antes da avaliacao, que e a chamada cara.
    /// </summary>
    public const double MaxAudioSeconds = 16 * 60;

    /// <summary>
    /// Quantas vezes o aluno pode mandar a MESMA atividade avaliada por IA (resumo falado, passo de codigo) no mesmo dia.
    /// Uso normal e 1 a 3; passou disso e repeticao automatica ou tentativa de arrancar nota na marra.
    /// </summary>
    public const int MaxAttemptsPerActivityPerDay = 10;

    /// <summary>Quantas das respostas (instantes em UTC) caem hoje - dia vivido, meia-noite local.</summary>
    internal static int AttemptsToday(IEnumerable<DateTime> createdAtUtc, DateOnly today)
    {
        var (from, to) = AiUsageMath.DayRange(today);
        return createdAtUtc.Count(at => at >= from && at < to);
    }

    /// <summary>Tentativas do aluno nesta atividade hoje, contando as que ja estao salvas; lanca <c>limite_tentativas_dia</c> (429) no teto.</summary>
    public static void EnsureAttemptsLeft(IEnumerable<ActivityResponse> responses, Guid activityId, DateOnly today) =>
        EnsureBelowLimit(AttemptsToday(responses.Where(r => r.ActivityId == activityId).Select(r => r.CreatedAt), today));

    internal static void EnsureBelowLimit(int attemptsToday)
    {
        if (attemptsToday >= MaxAttemptsPerActivityPerDay)
        {
            throw new DomainException(
                $"Você já enviou esta atividade {MaxAttemptsPerActivityPerDay} vezes hoje. Descanse um pouco e tente de novo amanhã.",
                "limite_tentativas_dia");
        }
    }
}
