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
    public static void ImportFile(WeeklyTemplate weeklyTemplate, string jsonFilePath, ProjectLanguage? language = null) =>
        Import(weeklyTemplate, File.ReadAllText(jsonFilePath), language);

    /// <param name="language">
    /// Fase 69: variante de linguagem do dia (a ponte, semana-N/ponte/&lt;linguagem&gt;.json) - mesmo
    /// schema de um dia normal, so que vira um DailyTemplate com Language. Nulo = dia unico.
    /// </param>
    public static void Import(WeeklyTemplate weeklyTemplate, string json, ProjectLanguage? language = null)
    {
        var day = Parse(json);

        var dailyTemplate = weeklyTemplate.AddDailyTemplate(day.DayNumber, language);
        ApplyDay(weeklyTemplate, dailyTemplate, day);
    }

    /// <summary>
    /// Fase 79: le um dia-N.json/ponte e troca o conteudo de um DailyTemplate que ja existe - as
    /// atividades antigas saem, os conteudos e atividades do arquivo entram (mesmo schema de
    /// Import). Devolve os Ids dos CuratedContents que as atividades antigas usavam, pra quem chama
    /// remover os que ficaram sem uso.
    /// </summary>
    public static IReadOnlyCollection<Guid> ReimportFile(WeeklyTemplate weeklyTemplate, DailyTemplate dailyTemplate, string jsonFilePath)
    {
        var day = Parse(File.ReadAllText(jsonFilePath));
        if (day.DayNumber != dailyTemplate.DayNumber)
            throw new InvalidOperationException($"{jsonFilePath}: dayNumber {day.DayNumber} nao bate com o dia {dailyTemplate.DayNumber}.");

        var previousContentIds = dailyTemplate.Activities.Where(a => a.ContentId is not null).Select(a => a.ContentId!.Value).ToHashSet();
        dailyTemplate.ClearActivities();
        ApplyDay(weeklyTemplate, dailyTemplate, day);
        return previousContentIds;
    }

    /// <summary>Fase 79: o arquivo ja traz passos de codigo (a ponte no formato "code comigo").</summary>
    public static bool FileHasActivityType(string jsonFilePath, ActivityType type) =>
        Parse(File.ReadAllText(jsonFilePath)).Activities.Any(a => a.Type == type);

    private static CuratedDayJson Parse(string json) =>
        JsonSerializer.Deserialize<CuratedDayJson>(json, JsonOptions)
            ?? throw new InvalidOperationException("Conteudo curado vazio ou invalido.");

    private static void ApplyDay(WeeklyTemplate weeklyTemplate, DailyTemplate dailyTemplate, CuratedDayJson day)
    {
        var contentByRef = new Dictionary<string, Guid>();
        foreach (var content in day.CuratedContents)
        {
            var created = weeklyTemplate.AddCuratedContent(content.Type, content.Title, content.ExternalUrl, content.BodyText);
            contentByRef[content.Ref] = created.Id;
        }

        for (var i = 0; i < day.Activities.Count; i++)
            AddActivity(dailyTemplate, day.Activities[i], i, contentByRef);

        // Fase 86: laboratorio de codigo do dia (depois das atividades: SetLab exige um CodeStep).
        if (day.Lab is not null)
            dailyTemplate.SetLab(BuildLab(day, fileRef => contentByRef.TryGetValue(fileRef, out var id) ? id : null));
    }

    /// <summary>
    /// Fase 86: liga o laboratorio (bloco <c>lab</c>, codigo inicial e opt-out por passo) de um dia-N.json
    /// a um DailyTemplate que JA esta no banco, sem reimportar o dia - quem ja esta no meio do dia nao perde
    /// progresso. Os File do lab sao achados pelo <c>externalUrl</c> entre os CuratedContents da semana. Dia
    /// do arquivo sem <c>lab</c> desliga o laboratorio do template. Devolve true se algo mudou. Idempotente.
    /// </summary>
    public static bool ApplyLab(WeeklyTemplate weeklyTemplate, DailyTemplate dailyTemplate, string jsonFilePath)
    {
        var day = Parse(File.ReadAllText(jsonFilePath));
        if (day.DayNumber != dailyTemplate.DayNumber)
            throw new InvalidOperationException($"{jsonFilePath}: dayNumber {day.DayNumber} nao bate com o dia {dailyTemplate.DayNumber}.");

        var jsonSteps = day.Activities.Where(a => a.Type == ActivityType.CodeStep).ToList();
        var steps = dailyTemplate.Activities.Where(a => a.Type == ActivityType.CodeStep).OrderBy(a => a.OrderIndex).ToList();
        if (jsonSteps.Count != steps.Count)
            throw new InvalidOperationException($"{jsonFilePath}: {jsonSteps.Count} passos de codigo no arquivo, {steps.Count} no banco - reimporte a ponte.");

        var changed = false;
        for (var i = 0; i < steps.Count; i++)
        {
            var starter = string.IsNullOrWhiteSpace(jsonSteps[i].CodeStarter) ? null : jsonSteps[i].CodeStarter;
            var disabled = jsonSteps[i].Lab == false;
            if (steps[i].CodeStarter == starter && steps[i].LabDisabled == disabled) continue;
            steps[i].SetLabOptions(starter, disabled);
            changed = true;
        }

        // As variantes de linguagem da ponte (Python, JavaScript) tem cada uma o seu File com o mesmo
        // externalUrl: o arquivo certo e o que as atividades DESTE dia ja usam; so na falta dele, qualquer um da semana.
        var dayContentIds = dailyTemplate.Activities.Where(a => a.ContentId is not null).Select(a => a.ContentId!.Value).ToHashSet();
        var lab = day.Lab is null
            ? null
            : BuildLab(day, fileRef =>
            {
                var url = day.CuratedContents.FirstOrDefault(c => c.Ref == fileRef)?.ExternalUrl;
                var matches = weeklyTemplate.CuratedContents.Where(c => c.Type == CuratedContentType.File && c.ExternalUrl == url).ToList();
                return (matches.FirstOrDefault(c => dayContentIds.Contains(c.Id)) ?? matches.FirstOrDefault())?.Id;
            });
        if (!SameLab(dailyTemplate.Lab, lab))
        {
            dailyTemplate.SetLab(lab);
            changed = true;
        }

        return changed;
    }

    /// <summary>Fase 86: o dia-N.json traz bloco lab (usado pelo sync pra nao abrir o arquivo de novo).</summary>
    public static bool FileHasLab(string jsonFilePath) => Parse(File.ReadAllText(jsonFilePath)).Lab is not null;

    // LabConfig e um record com listas: a igualdade de record compara as listas por referencia, entao compara valor a valor.
    private static bool SameLab(LabConfig? a, LabConfig? b) =>
        a is null ? b is null
        : b is not null && a.Runtime == b.Runtime && a.Image == b.Image && a.Entry == b.Entry && a.Command == b.Command
          && a.TimeoutSeconds == b.TimeoutSeconds && a.FileContentIds.SequenceEqual(b.FileContentIds)
          && a.Packages.SequenceEqual(b.Packages) && a.Services.SequenceEqual(b.Services);

    private static LabConfig BuildLab(CuratedDayJson day, Func<string, Guid?> resolveFile)
    {
        var lab = day.Lab!;
        var fileIds = new List<Guid>();
        var fileTitles = new List<string>();
        foreach (var fileRef in lab.Files ?? [])
        {
            var content = day.CuratedContents.FirstOrDefault(c => c.Ref == fileRef);
            if (content is null || content.Type != CuratedContentType.File)
                throw new InvalidOperationException($"lab.files: '{fileRef}' nao e um File em curatedContents.");
            fileIds.Add(resolveFile(fileRef) ?? throw new InvalidOperationException($"lab.files: o File '{fileRef}' nao esta nos conteudos da semana."));
            fileTitles.Add(content.Title);
        }

        foreach (var service in lab.Services ?? [])
            if (!fileTitles.Contains(service))
                throw new InvalidOperationException($"lab.services: '{service}' nao e o titulo de um File listado em lab.files.");

        return LabConfig.Create(lab.Runtime, lab.Image, fileIds, lab.Packages, lab.Services, lab.Entry, lab.Command, lab.TimeoutSeconds);
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

        if (json.Type == ActivityType.CodeStep)
            activity.ConfigureCodeStep(
                json.CodeSolution ?? "", json.CodeExpectedOutput ?? "", json.CodeRubric ?? "",
                json.CodeStarter, labDisabled: json.Lab == false);

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

    private record CuratedDayJson(int DayNumber, List<CuratedContentJson> CuratedContents, List<ActivityJson> Activities, LabJson? Lab = null);

    /// <summary>Fase 86: bloco <c>lab</c> do dia (CURADORIA.md 5.2). Os nomes dos campos seguem o JSON.</summary>
    private record LabJson(
        string? Runtime, string? Image, List<string>? Files, List<string>? Packages, List<string>? Services,
        string? Entry, string? Command, int TimeoutSeconds = 0);

    private record CuratedContentJson(string Ref, CuratedContentType Type, string Title, string? ExternalUrl, string? BodyText);

    private record ActivityJson(
        ActivityType Type, AnswerMode AnswerMode, string? ContentRef, string? Prompt,
        string? ExpectedAnswer, List<QuizOptionJson>? QuizOptions, List<WordMatchPairJson>? WordMatchPairs,
        List<RoleplayNodeJson>? RoleplayNodes,
        string? CodeSolution = null, string? CodeExpectedOutput = null, string? CodeRubric = null,
        string? CodeStarter = null,
        /// <summary>Fase 86: <c>"lab": false</c> tira o passo do laboratorio do dia (fluxo antigo). Ausente/true = usa o lab do dia.</summary>
        bool? Lab = null);

    private record QuizOptionJson(string Text, bool IsCorrect);

    private record WordMatchPairJson(string Term, string Definition);

    private record RoleplayNodeJson(string NodeKey, string Text, bool IsTerminal, TerminalQuality? TerminalQuality, List<RoleplayOptionJson>? Options);

    private record RoleplayOptionJson(string Text, string? NextNodeKey);
}
