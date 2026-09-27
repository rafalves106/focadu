using System.Security.Cryptography;
using System.Text;
using Focadu.Domain.Enums;
using Focadu.Domain.Notes;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Notes;

/// <summary>
/// Regras puras da revisao por IA do Caderninho (Fase 78), fora do caso de uso pra testar sem
/// repositorio: o hash das notas revisadas, o material do dia e o limite diario.
/// </summary>
internal static class NotesReviewRules
{
    /// <summary>Limite simples ate existir o orcamento diario de IA (pauta estrategica, tema 2).</summary>
    internal const int DailyLimit = 10;

    /// <summary>Tamanho maximo do material mandado pra IA (as leituras do curso cabem folgadas).</summary>
    internal const int MaxMaterialLength = 14000;

    /// <summary>
    /// Hash das notas (conteudo e tags, na ordem em que foram escritas): muda quando o aluno cria,
    /// edita ou apaga uma nota do dia - e o que libera "Revisar de novo".
    /// </summary>
    internal static string Hash(IEnumerable<Note> notes)
    {
        var text = string.Join("\n---\n", notes.OrderBy(n => n.CreatedAt).ThenBy(n => n.Id)
            .Select(n => n.Content.Trim() + "\n#" + string.Join(" #", n.Tags)));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();
    }

    /// <summary>
    /// Titulo e material do dia: as leituras (titulo + corpo) das atividades da Daily - no reforco, da
    /// Daily de origem, que tem o conteudo inteiro (o reforco so repete as atividades erradas). Sem
    /// leitura, cai nos titulos e enunciados das atividades.
    /// </summary>
    internal static (string Title, string Material) Material(Weekly weekly, Guid dailyId)
    {
        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var source = weekly.FindReinforcementSource(dailyId) ?? daily;
        var contents = source.Activities
            .Where(a => a.ContentId is not null)
            .Select(a => weekly.Template.CuratedContents.FirstOrDefault(c => c.Id == a.ContentId))
            .Where(c => c is not null)
            .DistinctBy(c => c!.Id)
            .ToList();

        var reading = contents.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c!.BodyText));
        var title = $"Semana {weekly.Number} · Dia {source.DayNumber}"
            + (reading is not null ? $" — {reading.Title}" : string.Empty)
            + (daily.IsReinforcement ? " (reforço)" : string.Empty);

        var builder = new StringBuilder();
        foreach (var c in contents)
        {
            builder.Append($"# {c!.Title}\n");
            if (!string.IsNullOrWhiteSpace(c.BodyText)) builder.Append(c.BodyText.Trim()).Append("\n\n");
        }
        foreach (var a in source.Activities.Where(a => a.Type == ActivityType.VoiceSummary && !string.IsNullOrWhiteSpace(a.Prompt)))
            builder.Append($"Pedido do resumo falado: {a.Prompt!.Trim()}\n");

        var material = builder.ToString().Trim();
        if (material.Length > MaxMaterialLength) material = material[..MaxMaterialLength] + "\n[...]";
        return (title, material);
    }

    /// <summary>Meia-noite de hoje (horario local do servidor, America/Sao_Paulo) em UTC - o dia do limite.</summary>
    internal static DateTime StartOfTodayUtc(DateOnly today) =>
        DateTime.SpecifyKind(today.ToDateTime(TimeOnly.MinValue), DateTimeKind.Local).ToUniversalTime();
}
