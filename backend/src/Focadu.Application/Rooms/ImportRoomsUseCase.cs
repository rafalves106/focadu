using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Focadu.Application.Seed;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Rooms;

namespace Focadu.Application.Rooms;

public record ImportRoomsOptions(string? OnlySlug = null, bool DryRun = false, bool Confirm = false);

public record RoomImportOutcome(string Slug, ImportStatus Status, string Detail, IReadOnlyList<string>? Errors = null);

public record RoomImportReport(string CourseName, bool DryRun, IReadOnlyList<RoomImportOutcome> Rooms);

/// <summary>
/// Comando <c>importar-salas &lt;curso&gt;</c> (Fase 110), separado do importador dos dias por decisão do dono: lê
/// secret/conteudo/&lt;curso&gt;/salas/&lt;slug&gt;/sala.json, valida (o próprio <see cref="RoomImporter"/> faz as vezes de
/// linter) e cria ou atualiza a sala por slug, com hash e dry-run. Tarefa que sumiu e já tem progresso de aluno só sai com
/// <c>--confirmar</c>. O curso precisa já existir (vem do <c>importar</c>).
/// </summary>
public class ImportRoomsUseCase
{
    private readonly ICourseRepository _courses;
    private readonly IRoomRepository _rooms;
    private readonly IRoomProgressRepository _progresses;
    private readonly IUnitOfWork _unitOfWork;

    public ImportRoomsUseCase(ICourseRepository courses, IRoomRepository rooms, IRoomProgressRepository progresses, IUnitOfWork unitOfWork)
    {
        _courses = courses;
        _rooms = rooms;
        _progresses = progresses;
        _unitOfWork = unitOfWork;
    }

    public async Task<RoomImportReport> ExecuteAsync(string courseFolder, ImportRoomsOptions options, CancellationToken cancellationToken = default)
    {
        var manifestPath = CuratedContentLocator.Resolve(courseFolder, null, "curso.json", required: false)
            ?? throw new InvalidOperationException($"curso.json nao encontrado em conteudo/{courseFolder}.");
        var manifest = CuratedCourseImporter.ParseManifest(await File.ReadAllTextAsync(manifestPath, cancellationToken));
        var course = (await _courses.GetAllAsync(cancellationToken)).FirstOrDefault(c => c.Name == manifest.Name)
            ?? throw new InvalidOperationException($"O curso '{manifest.Name}' ainda nao existe no banco: rode 'importar {courseFolder}' antes.");

        var roomsDir = RoomContentPaths.RoomsDirectory(courseFolder);
        if (roomsDir is null || !Directory.Exists(roomsDir))
            return new RoomImportReport(course.Name, options.DryRun, []);

        var folders = Directory.GetDirectories(roomsDir)
            .Where(d => File.Exists(Path.Combine(d, "sala.json")))
            .Where(d => options.OnlySlug is null || string.Equals(Path.GetFileName(d), options.OnlySlug, StringComparison.OrdinalIgnoreCase))
            .Order(StringComparer.Ordinal)
            .ToList();

        var existing = (await _rooms.ListByCourseAsync(course.Id, cancellationToken)).ToList();
        var parsed = new List<(string Slug, RoomImporter.Parsed? Room, IReadOnlyList<string> Errors)>();
        foreach (var folder in folders)
        {
            var slug = Path.GetFileName(folder);
            var json = await File.ReadAllTextAsync(Path.Combine(folder, "sala.json"), cancellationToken);
            var (room, errors) = RoomImporter.TryParse(json, slug, courseFolder, folder);
            parsed.Add((slug, room, errors));
        }

        // Pré-requisito precisa existir no curso: no banco ou nesta mesma importação.
        var knownSlugs = existing.Select(r => r.Slug).Concat(parsed.Where(p => p.Room is not null).Select(p => p.Slug)).ToHashSet();

        var outcomes = new List<RoomImportOutcome>();
        foreach (var (slug, room, errors) in parsed)
        {
            if (room is null)
            {
                outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Rejected, "sala.json com erro", errors));
                continue;
            }
            var unknown = room.Spec.Prerequisites.Where(p => !knownSlugs.Contains(p.ToLowerInvariant())).ToList();
            if (unknown.Count > 0)
            {
                outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Rejected, "pré-requisito inexistente", unknown.Select(u => $"prerequisitos: sala '{u}' não existe no curso").ToList()));
                continue;
            }

            var current = existing.FirstOrDefault(r => r.Slug == slug);
            try
            {
                if (current is null)
                {
                    var created = new Room(course.Id, room.Spec, room.Tasks);
                    if (!options.DryRun) await _rooms.AddAsync(created, cancellationToken);
                    outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Created, $"{room.Tasks.Count} tarefa(s)"));
                    continue;
                }
                if (current.ContentHash == room.Spec.ContentHash)
                {
                    outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Unchanged, "mesmo hash"));
                    continue;
                }

                var removedKeys = current.Tasks.Select(t => t.Key).Except(room.Tasks.Select(t => t.Key)).ToList();
                var progresses = await _progresses.ListByRoomAsync(current.Id, cancellationToken);
                var removedIds = current.Tasks.Where(t => removedKeys.Contains(t.Key)).Select(t => t.Id).ToList();
                var touched = progresses.Count(p => p.Results.Any(r => removedIds.Contains(r.TaskId)));
                if (touched > 0 && !options.Confirm)
                {
                    outcomes.Add(new RoomImportOutcome(slug, ImportStatus.NeedsConfirmation,
                        $"sai(em) a(s) tarefa(s) {string.Join(", ", removedKeys)} com progresso de {touched} aluno(s): rode de novo com --confirmar"));
                    continue;
                }
                if (!options.DryRun)
                {
                    var removed = current.ReplaceContent(room.Spec, room.Tasks);
                    foreach (var progress in progresses)
                        progress.RemoveResults(removed);
                }
                outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Updated,
                    $"{room.Tasks.Count} tarefa(s){(removedKeys.Count > 0 ? $", removida(s): {string.Join(", ", removedKeys)}" : "")}"));
            }
            catch (DomainException ex)
            {
                outcomes.Add(new RoomImportOutcome(slug, ImportStatus.Rejected, "regra da sala", [ex.Message]));
            }
        }

        if (!options.DryRun && outcomes.Any(o => o.Status is ImportStatus.Created or ImportStatus.Updated))
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new RoomImportReport(course.Name, options.DryRun, outcomes);
    }
}

/// <summary>
/// Lê e valida um sala.json (Fase 110). Formato (chaves em português, como o resto da curadoria):
/// <code>
/// { "titulo", "tipo": "semana|ferramenta|desafio", "semana"?, "ordem", "dificuldade", "minutos", "resumo", "cenario",
///   "maquina", "prerequisitos": [slug], "fechamento": { "pergunta", "respostaCorreta" },
///   "tarefas": [ { "chave", "titulo", "elo"?, "teoria", "pergunta", "formatoResposta", "flag", "dicas": [..],
///                  "audio": { "pergunta", "respostaCorreta" } } ] }
/// </code>
/// A flag entra em texto no arquivo e sai daqui só como hash. A pasta ambiente/ precisa ter compose.yml e iniciar.sh.
/// </summary>
public static class RoomImporter
{
    public record Parsed(RoomSpec Spec, IReadOnlyList<RoomTaskSpec> Tasks);

    public static (Parsed? Room, IReadOnlyList<string> Errors) TryParse(string json, string slug, string courseFolder, string? roomFolder)
    {
        var errors = new List<string>();
        JsonElement root;
        try
        {
            root = JsonDocument.Parse(json).RootElement;
        }
        catch (JsonException ex)
        {
            return (null, [$"JSON inválido: {ex.Message}"]);
        }

        string Text(JsonElement el, string name, string where, bool required = true)
        {
            if (el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(v.GetString()))
                return v.GetString()!.Trim();
            if (required) errors.Add($"{where}{name}: obrigatório");
            return string.Empty;
        }
        int? Int(JsonElement el, string name, bool required)
        {
            if (el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)) return n;
            if (required) errors.Add($"{name}: número obrigatório");
            return null;
        }
        List<string> Strings(JsonElement el, string name, string where)
        {
            if (!el.TryGetProperty(name, out var v)) return [];
            if (v.ValueKind != JsonValueKind.Array) { errors.Add($"{where}{name}: precisa ser uma lista"); return []; }
            return v.EnumerateArray().Select(x => x.ValueKind == JsonValueKind.String ? x.GetString()?.Trim() ?? "" : "").ToList();
        }

        var kindText = Text(root, "tipo", "");
        RoomKind? kind = kindText switch { "semana" => RoomKind.Week, "ferramenta" => RoomKind.Tool, "desafio" => RoomKind.Challenge, _ => null };
        if (kind is null && kindText.Length > 0) errors.Add("tipo: use semana, ferramenta ou desafio");
        var week = Int(root, "semana", required: kind == RoomKind.Week);
        var order = Int(root, "ordem", required: true) ?? 0;
        var minutes = Int(root, "minutos", required: true) ?? 0;
        var closing = root.TryGetProperty("fechamento", out var c) && c.ValueKind == JsonValueKind.Object ? c : default;
        if (closing.ValueKind != JsonValueKind.Object) errors.Add("fechamento: obrigatório");

        var tasks = new List<RoomTaskSpec>();
        if (!root.TryGetProperty("tarefas", out var tasksEl) || tasksEl.ValueKind != JsonValueKind.Array || tasksEl.GetArrayLength() == 0)
            errors.Add("tarefas: pelo menos uma");
        else if (tasksEl.GetArrayLength() > Room.MaxTasks)
            errors.Add($"tarefas: no máximo {Room.MaxTasks}");
        else
        {
            var i = 0;
            foreach (var t in tasksEl.EnumerateArray())
            {
                i++;
                var where = $"tarefas[{i}].";
                var flag = Text(t, "flag", where);
                var hints = Strings(t, "dicas", where);
                if (hints.Count > RoomTask.MaxHints) errors.Add($"{where}dicas: no máximo {RoomTask.MaxHints}");
                if (hints.Any(h => h.Length == 0)) errors.Add($"{where}dicas: dica vazia");
                var audio = t.TryGetProperty("audio", out var a) && a.ValueKind == JsonValueKind.Object ? a : default;
                if (audio.ValueKind != JsonValueKind.Object) errors.Add($"{where}audio: obrigatório");
                if (kind == RoomKind.Challenge && !t.TryGetProperty("elo", out _)) errors.Add($"{where}elo: obrigatório na sala-desafio");
                tasks.Add(new RoomTaskSpec(
                    Text(t, "chave", where), Text(t, "titulo", where), Text(t, "elo", where, required: false),
                    Text(t, "teoria", where), Text(t, "pergunta", where), Text(t, "formatoResposta", where, required: false),
                    flag.Length > 0 ? RoomFlag.Hash(flag) : string.Empty, hints,
                    audio.ValueKind == JsonValueKind.Object ? Text(audio, "pergunta", where + "audio.") : "",
                    audio.ValueKind == JsonValueKind.Object ? Text(audio, "respostaCorreta", where + "audio.") : ""));
            }
            foreach (var dup in tasks.GroupBy(t => t.Key).Where(g => g.Key.Length > 0 && g.Count() > 1))
                errors.Add($"tarefas: chave repetida '{dup.Key}'");
        }

        if (roomFolder is not null)
        {
            var env = Path.Combine(roomFolder, "ambiente");
            foreach (var required in new[] { "compose.yml", "iniciar.sh" })
                if (!File.Exists(Path.Combine(env, required))) errors.Add($"ambiente/{required}: arquivo obrigatório");
        }

        var spec = new RoomSpec(
            slug, Text(root, "titulo", ""), kind ?? RoomKind.Tool, week, Text(root, "dificuldade", ""), minutes, Text(root, "resumo", ""),
            Text(root, "cenario", ""), Text(root, "maquina", ""), Strings(root, "prerequisitos", ""),
            closing.ValueKind == JsonValueKind.Object ? Text(closing, "pergunta", "fechamento.") : "",
            closing.ValueKind == JsonValueKind.Object ? Text(closing, "respostaCorreta", "fechamento.") : "",
            order, Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(json))), courseFolder);

        if (errors.Count > 0) return (null, errors);
        // Último filtro: as regras do próprio domínio (mesmas que o importador vai aplicar).
        try
        {
            _ = new Room(Guid.Empty, spec, tasks);
        }
        catch (DomainException ex)
        {
            return (null, [ex.Message]);
        }
        return (new Parsed(spec, tasks), []);
    }
}
