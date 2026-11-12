using System.Text.Json;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Molde v1 (plano de curadoria, 02/10/2026): um dos alvos de aprendizagem do dia (t1 a t3 nos moldes A e B; ate t15 no molde C, Fase 108), definidos na
/// ficha. Cada bloco, pergunta de voz, Quiz e Cloze aponta para um alvo (<c>DailyActivity.Target</c>).
/// </summary>
public sealed record LearningTarget(string Id, string Text)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static string Serialize(IEnumerable<LearningTarget> targets) => JsonSerializer.Serialize(targets.ToList(), Json);

    public static IReadOnlyList<LearningTarget> Parse(string? json) =>
        string.IsNullOrWhiteSpace(json) ? [] : JsonSerializer.Deserialize<List<LearningTarget>>(json, Json) ?? [];
}
