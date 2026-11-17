using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>Fase 111: sala da sessao anterior que o aluno ainda nao concluiu (a Application resolve; o dominio nao ve salas).</summary>
public record PendingSessionRoom(Guid RoomId, string Slug, string Title, int EstimatedMinutes = 0, string MachineLabel = "");

/// <summary>
/// Fase 111: o que <see cref="Weekly.EvaluateDailyAccess"/> precisa saber do curso pra decidir a entrada numa Daily.
/// <see cref="Daily"/> (o padrao) mantem a regra de sempre, 1 Daily por dia; <see cref="ForSessions"/> liga as
/// <see cref="SessionRules"/>.
/// </summary>
public sealed record StudyContext(StudyFormat Format, int SessionsPerDay, PendingSessionRoom? PendingRoom)
{
    public static readonly StudyContext Daily = new(StudyFormat.Daily, 1, null);

    public static StudyContext ForSessions(int sessionsPerDay, PendingSessionRoom? pendingRoom) =>
        new(StudyFormat.Sessions, sessionsPerDay, pendingRoom);
}

/// <summary>
/// Fase 111: regras de entrada numa sessao de curso em <see cref="StudyFormat.Sessions"/> (molde D: sessao, sala,
/// sessao, sala...). Chamadas por <see cref="Weekly.EvaluateDailyAccess"/> so nesse formato, so pra uma Daily
/// nao-reforco ainda nao iniciada; curso Daily nunca passa por aqui.
/// 1. A sala da sessao anterior (dia.json "salaDaSessao") precisa estar concluida: "sala_da_sessao_pendente". Vem
///    antes da cota porque e o que o aluno pode fazer agora (a sala nao gasta cota).
/// 2. Cota: ate <see cref="StudyContext.SessionsPerDay"/> sessoes nao-reforco concluidas hoje (mesma conversao de
///    CompletedAt pra hora local da regra de 1 por dia): "daily_limite_diario_atingido", o mesmo codigo do formato Daily.
/// </summary>
public static class SessionRules
{
    /// <summary>Sessoes nao-reforco concluidas hoje (CompletedAt e UTC; "today" e hora local, ver IClock).</summary>
    public static int CompletedToday(IEnumerable<Daily> enrollmentDailies, DateOnly today) =>
        enrollmentDailies.Count(d =>
            !d.IsReinforcement && d.CompletedAt.HasValue && DateOnly.FromDateTime(d.CompletedAt.Value.ToLocalTime()) == today);

    public static void EnsureCanStart(IEnumerable<Daily> enrollmentDailies, DateOnly today, StudyContext study)
    {
        if (study.PendingRoom is { } room)
        {
            throw new DomainException(
                $"Faca a sala da sessao anterior ({room.Title}) para abrir esta.",
                "sala_da_sessao_pendente");
        }

        var done = CompletedToday(enrollmentDailies, today);
        if (done >= study.SessionsPerDay)
        {
            throw new DomainException(
                $"Voce ja concluiu {done} {(done == 1 ? "sessao" : "sessoes")} hoje (o limite deste curso e {study.SessionsPerDay} por dia). Volte amanha para continuar.",
                "daily_limite_diario_atingido");
        }
    }
}
