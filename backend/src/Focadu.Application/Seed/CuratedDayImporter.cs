using System.Text.Json;
using System.Text.Json.Serialization;
using Focadu.Domain.Activities;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Aplica um dia-N.json curado (schema documentado em secret/curadoria/CURADORIA.md, escrito pela
/// skill curar-conteudo) a uma WeeklyTemplate - cria o DailyTemplate do dia, os CuratedContents, e
/// as DailyActivity em ordem (QuizOptions e o grafo de RoleplayNodes incluidos). Generico por
/// design: o roteiro real tem 60 dias (ver CURADORIA.md), entao um metodo AddDayN por dia (como o
/// seed fazia antes) nao escala nem e confiavel pra transcrever a mao.
/// </summary>
public static class CuratedDayImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>Le um dia-N.json do disco e aplica - ver Import(WeeklyTemplate, string) pro schema.</summary>
    public static void ImportFile(WeeklyTemplate weeklyTemplate, string jsonFilePath) =>
        Import(weeklyTemplate, File.ReadAllText(jsonFilePath));

    public static void Import(WeeklyTemplate weeklyTemplate, string json)
    {
        var day = JsonSerializer.Deserialize<CuratedDayJson>(json, JsonOptions)
            ?? throw new InvalidOperationException("Conteudo curado vazio ou invalido.");

        var dailyTemplate = weeklyTemplate.AddDailyTemplate(day.DayNumber);

        var contentByRef = new Dictionary<string, Guid>();
        foreach (var content in day.CuratedContents)
        {
            var created = weeklyTemplate.AddCuratedContent(content.Type, content.Title, content.ExternalUrl, content.BodyText);
            contentByRef[content.Ref] = created.Id;
        }

        for (var i = 0; i < day.Activities.Count; i++)
            AddActivity(dailyTemplate, day.Activities[i], i, contentByRef);
    }

    private static void AddActivity(DailyTemplate dailyTemplate, ActivityJson json, int orderIndex, Dictionary<string, Guid> contentByRef)
    {
        Guid? contentId = null;
        if (json.ContentRef is not null)
        {
            if (!contentByRef.TryGetValue(json.ContentRef, out var resolved))
                throw new InvalidOperationException($"Activity #{orderIndex}: contentRef '{json.ContentRef}' nao existe em curatedContents.");
            contentId = resolved;
        }

        var activity = dailyTemplate.AddActivity(json.Type, orderIndex, json.AnswerMode, json.Prompt, contentId, json.ExpectedAnswer);

        foreach (var option in json.QuizOptions ?? [])
            activity.AddQuizOption(option.Text, option.IsCorrect);

        foreach (var pair in json.WordMatchPairs ?? [])
            activity.AddWordMatchPair(pair.Term, pair.Definition);

        if (json.RoleplayNodes is { Count: > 0 } nodes)
            AddRoleplayNodes(activity, nodes);
    }

    private static void AddRoleplayNodes(DailyActivity activity, List<RoleplayNodeJson> nodes)
    {
        // Duas passadas: as opcoes referenciam outros nodes por NodeKey (string), mas
        // RoleplayNode.AddOption precisa do Guid do node de destino - so da pra resolver depois
        // que TODOS os nodes ja existem (a ordem no JSON nao e topologica - um node cedo pode
        // apontar pra um definido varias posicoes depois, ver dia-1.json).
        var nodeByKey = new Dictionary<string, RoleplayNode>();
        foreach (var node in nodes)
            nodeByKey[node.NodeKey] = activity.AddRoleplayNode(node.NodeKey, node.Text, node.IsTerminal, node.TerminalQuality);

        foreach (var node in nodes)
        {
            foreach (var option in node.Options ?? [])
            {
                Guid? nextNodeId = null;
                if (option.NextNodeKey is not null)
                {
                    if (!nodeByKey.TryGetValue(option.NextNodeKey, out var target))
                        throw new InvalidOperationException($"Roleplay node '{node.NodeKey}': nextNodeKey '{option.NextNodeKey}' nao existe.");
                    nextNodeId = target.Id;
                }

                nodeByKey[node.NodeKey].AddOption(option.Text, nextNodeId);
            }
        }
    }

    private record CuratedDayJson(int DayNumber, List<CuratedContentJson> CuratedContents, List<ActivityJson> Activities);

    private record CuratedContentJson(string Ref, CuratedContentType Type, string Title, string? ExternalUrl, string? BodyText);

    private record ActivityJson(
        ActivityType Type, AnswerMode AnswerMode, string? ContentRef, string? Prompt,
        string? ExpectedAnswer, List<QuizOptionJson>? QuizOptions, List<WordMatchPairJson>? WordMatchPairs,
        List<RoleplayNodeJson>? RoleplayNodes);

    private record QuizOptionJson(string Text, bool IsCorrect);

    private record WordMatchPairJson(string Term, string Definition);

    private record RoleplayNodeJson(string NodeKey, string Text, bool IsTerminal, TerminalQuality? TerminalQuality, List<RoleplayOptionJson>? Options);

    private record RoleplayOptionJson(string Text, string? NextNodeKey);
}
