using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Rooms;

/// <summary>Cabeçalho de uma Sala como vem da curadoria (sala.json).</summary>
public record RoomSpec(
    string Slug, string Title, RoomKind Kind, int? WeekNumber, string Difficulty, int EstimatedMinutes, string Summary,
    string Scenario, string MachineLabel, IReadOnlyList<string> Prerequisites, string FinalPrompt, string FinalReferenceAnswer,
    int OrderIndex, string ContentHash, string ContentFolder);

/// <summary>
/// Sala prática (Fase 110, rascunho secret/produto/rascunhos/salas-praticas.md): currículo compartilhado de um curso, fora da
/// Daily. O aluno sobe o ambiente (Kali + alvo) na própria máquina; a Focadu só confere a flag de cada tarefa e avalia os
/// áudios (um por entrega e um final de "como eu corrigiria"). Entra pelo comando <c>importar-salas</c>, separado do
/// importador dos dias.
/// </summary>
public class Room : Entity
{
    public const int MaxTasks = 12;

    public Guid CourseId { get; private set; }
    public string Slug { get; private set; }
    public string Title { get; private set; }
    public RoomKind Kind { get; private set; }
    public int? WeekNumber { get; private set; }
    public string Difficulty { get; private set; }
    public int EstimatedMinutes { get; private set; }
    public string Summary { get; private set; }
    /// <summary>Briefing: o cenário em poucas linhas ("você foi contratado pra testar a LojaServ").</summary>
    public string Scenario { get; private set; }
    /// <summary>O que sobe na máquina do aluno, mostrado no painel ("Kali + LojaServ").</summary>
    public string MachineLabel { get; private set; }
    private List<string> _prerequisites = new();
    /// <summary>Slugs das salas do mesmo curso que precisam estar concluídas antes desta abrir.</summary>
    public IReadOnlyList<string> Prerequisites => _prerequisites.AsReadOnly();
    public string FinalPrompt { get; private set; }
    public string FinalReferenceAnswer { get; private set; }
    public int OrderIndex { get; private set; }
    public string ContentHash { get; private set; }
    /// <summary>Pasta do curso em secret/conteudo/ (ex.: "web-security"): o ambiente sai de &lt;pasta&gt;/salas/&lt;slug&gt;/ambiente/.</summary>
    public string ContentFolder { get; private set; }

    private readonly List<RoomTask> _tasks = new();
    public IReadOnlyList<RoomTask> Tasks => _tasks.OrderBy(t => t.OrderIndex).ToList().AsReadOnly();

    private Room()
    {
        Slug = Title = Difficulty = Summary = Scenario = MachineLabel = FinalPrompt = FinalReferenceAnswer = ContentHash = ContentFolder = string.Empty;
    }

    public Room(Guid courseId, RoomSpec spec, IReadOnlyList<RoomTaskSpec> tasks) : this()
    {
        CourseId = courseId;
        Slug = Required(spec.Slug, "slug").ToLowerInvariant();
        ReplaceContent(spec, tasks);
    }

    /// <summary>
    /// Troca o conteúdo pelo da curadoria. Tarefas casam pela chave: a mesma chave é atualizada no lugar (o progresso fica),
    /// chave nova entra, chave que sumiu sai. Devolve os Ids das tarefas removidas, pro chamador limpar o progresso delas.
    /// </summary>
    public IReadOnlyList<Guid> ReplaceContent(RoomSpec spec, IReadOnlyList<RoomTaskSpec> tasks)
    {
        if (!string.Equals(spec.Slug?.Trim(), Slug, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("O slug da sala não pode mudar.");
        if (tasks.Count is 0 or > MaxTasks)
            throw new DomainException($"A sala precisa de 1 a {MaxTasks} tarefas.");
        var duplicated = tasks.GroupBy(t => t.Key.Trim()).FirstOrDefault(g => g.Count() > 1);
        if (duplicated is not null)
            throw new DomainException($"Chave de tarefa repetida: '{duplicated.Key}'.");
        if (spec.Kind == RoomKind.Week && spec.WeekNumber is null or < 1)
            throw new DomainException("Sala da semana precisa do número da semana.");
        if (spec.EstimatedMinutes < 1)
            throw new DomainException("Tempo estimado precisa ser positivo.");

        Title = Required(spec.Title, "titulo");
        Kind = spec.Kind;
        WeekNumber = spec.Kind == RoomKind.Week ? spec.WeekNumber : null;
        Difficulty = Required(spec.Difficulty, "dificuldade");
        EstimatedMinutes = spec.EstimatedMinutes;
        Summary = Required(spec.Summary, "resumo");
        Scenario = Required(spec.Scenario, "cenario");
        MachineLabel = Required(spec.MachineLabel, "maquina");
        _prerequisites = spec.Prerequisites.Select(p => p.Trim().ToLowerInvariant()).Where(p => p.Length > 0).Distinct().ToList();
        if (_prerequisites.Contains(Slug))
            throw new DomainException("A sala não pode ser pré-requisito dela mesma.");
        FinalPrompt = Required(spec.FinalPrompt, "fechamento.pergunta");
        FinalReferenceAnswer = Required(spec.FinalReferenceAnswer, "fechamento.respostaCorreta");
        OrderIndex = spec.OrderIndex;
        ContentHash = Required(spec.ContentHash, "hash");
        ContentFolder = Required(spec.ContentFolder, "pasta do curso");

        var byKey = _tasks.ToDictionary(t => t.Key);
        var keep = new HashSet<string>();
        for (var i = 0; i < tasks.Count; i++)
        {
            var key = tasks[i].Key.Trim();
            keep.Add(key);
            if (byKey.TryGetValue(key, out var existing))
                existing.Apply(i, tasks[i] with { Key = key });
            else
                _tasks.Add(new RoomTask(i, tasks[i] with { Key = key }));
        }

        var removed = _tasks.Where(t => !keep.Contains(t.Key)).ToList();
        foreach (var task in removed)
            _tasks.Remove(task);
        return removed.Select(t => t.Id).ToList();
    }

    public RoomTask GetTask(Guid taskId) =>
        _tasks.FirstOrDefault(t => t.Id == taskId)
        ?? throw new DomainException("Tarefa não encontrada nesta sala.", "tarefa_nao_encontrada");

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new DomainException($"Sala: campo '{field}' é obrigatório.")
            : value.Trim();
}
