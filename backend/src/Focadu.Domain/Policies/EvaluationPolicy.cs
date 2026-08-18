namespace Focadu.Domain.Policies;

/// <summary>
/// Constantes de negócio que regem avaliação e disparo de reforço na Focadu.
/// Centralizadas aqui de propósito: qualquer ajuste futuro nesses números
/// (ex: mudar o critério de aprovação de 80% para outro valor) deve ser feito
/// em um único lugar, nunca espalhado pelo código.
/// </summary>
public static class EvaluationPolicy
{
    /// <summary>Pontuação mínima (0-100) para uma ActivityResponse ser considerada aprovada (Passed).</summary>
    public const int PassingScore = 80;

    /// <summary>
    /// Quantidade de pontos de penalidade acumulados em uma Daily que dispara
    /// a criação automática de uma Daily de reforço (IsReinforcement = true).
    /// </summary>
    public const int DailyPenaltyThreshold = 3;

    /// <summary>
    /// Quantidade de "dias fracos" (Dailies que atingiram DailyPenaltyThreshold) na mesma
    /// Weekly que dispara a criação de um WeeklyReinforcement.
    /// </summary>
    public const int WeeklyWeakDaysThreshold = 2;
}
