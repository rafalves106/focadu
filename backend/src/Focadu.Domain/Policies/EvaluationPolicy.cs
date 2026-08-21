using Focadu.Domain.Enums;

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

    /// <summary>
    /// Bônus de Superação (Fase 15): Gems creditadas ao concluir uma Daily de reforço com TODAS
    /// as atividades aprovadas - o dobro do valor normal de uma Daily (UserGemBalance.
    /// DailyGemAmount = 1), reconhecendo o esforço extra de superar a dificuldade. Substitui o
    /// crédito normal (nunca soma aos dois), mas conta na mesma categoria/cap mensal de Dailies -
    /// não ganhou cap próprio de propósito, mantém a arquitetura da Fase 14 simples.
    /// </summary>
    public const int ReinforcementBonusGems = 2;

    // Score de Estudo (Fase 16) - metrica de QUALIDADE (o quao bem), diferente de Gems (que
    // recompensa consistencia/conclusao). Pesos por tipo de atividade avaliavel na media
    // ponderada de Daily.CalculateScore() - VoiceSummary/Roleplay/Cloze pesam mais porque exigem
    // producao/raciocinio proprio (mais dificeis de acertar por sorte) do que escolher entre
    // opcoes prontas (Quiz/WordMatch). Reading/Video ficam de fora (sempre 100, ruido artificial).
    public const double VoiceSummaryWeight = 2.0;
    public const double RoleplayWeight = 1.5;
    public const double ClozeWeight = 1.5;
    public const double DefaultActivityWeight = 1.0; // Quiz, WordMatch

    /// <summary>Peso de cada Activity na media ponderada de Daily.CalculateScore() - Reading/Video nunca chegam aqui (excluidos antes, ver Daily.CalculateScore).</summary>
    public static double ActivityScoreWeight(ActivityType type) => type switch
    {
        ActivityType.VoiceSummary => VoiceSummaryWeight,
        ActivityType.Roleplay => RoleplayWeight,
        ActivityType.Cloze => ClozeWeight,
        _ => DefaultActivityWeight,
    };

    /// <summary>Score da Weekly = WeeklyDailyAverageWeight * media(Daily.CalculateScore()) + WeeklyProjectScoreWeight * WeeklyProject.Score. Somam 1.0 de proposito.</summary>
    public const double WeeklyDailyAverageWeight = 0.7;
    public const double WeeklyProjectScoreWeight = 0.3;
}
