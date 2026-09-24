using System.Data.Common;
using Focadu.Application.Seed;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

/// <summary>
/// Fase 69: migracao de DADOS (nao de schema) do curso "Web Security" de 60 pra 72 dias - 6 por
/// semana, o 6o e a ponte (secret/rascunhos/ponte-teoria-projeto-semanal.md). A curadoria em disco
/// ja foi renumerada; isto leva a mesma regra (CurriculumRenumbering) pro banco que ja existia:
/// 1. DayNumber do curriculo (DailyTemplates) e das Dailies dos alunos: dia d vira d + (d-1)/5.
/// 2. Dailies de reforco (e os DailyTemplate sinteticos delas) andam pra depois da vaga da ponte:
///    na semana w, d vira d + w (o reforco 6 da Semana 1 vira 7). Ver Weekly.CreateDailyReinforcement.
/// 3. Mencoes "Dia N" nos textos que citam outros dias: leituras (CuratedContents.BodyText),
///    enunciados (DailyActivities.Prompt, curriculo e reforcos), falas de roleplay
///    (RoleplayNodes.Text) e especificacao dos projetos (WeeklyTemplates.WeeklyProjectSpecText).
///
/// Roda no comando `seed` (Program.cs), antes do seed e do SyncBridgeDaysUseCase, numa transacao.
/// Idempotente pelo layout: so roda se o 1o dia da Semana 2 ainda for o Dia 6 (layout antigo) -
/// importante porque a renumeracao de texto NAO e idempotente. SQL direto porque a troca de
/// DayNumber passa pelos indices unicos (WeeklyTemplateId, DayNumber, Language) e (WeeklyId,
/// DayNumber): cada grupo vai primeiro pra negativo e so depois pro valor final.
/// </summary>
public class Curriculum72Migration
{
    private const string CourseName = "Web Security";

    private readonly FocaduDbContext _context;

    public Curriculum72Migration(FocaduDbContext context)
    {
        _context = context;
    }

    public async Task<string> RunAsync(CancellationToken cancellationToken = default)
    {
        var connection = _context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var courseId = await ScalarAsync<Guid?>(connection, transaction,
            """SELECT "Id" FROM "Courses" WHERE "Name" = @p0""", CourseName);
        if (courseId is null)
            return "Renumeracao 60->72: curso nao existe (banco novo) - nada a fazer.";

        var oldLayout = await ScalarAsync<long>(connection, transaction, """
            SELECT COUNT(*) FROM "DailyTemplates" dt
            JOIN "WeeklyTemplates" wt ON wt."Id" = dt."WeeklyTemplateId"
            JOIN "Monthlies" m ON m."Id" = wt."MonthlyId"
            WHERE m."CourseId" = @p0 AND wt."Number" = 2 AND dt."DayNumber" = 6
            """, courseId.Value) > 0;
        if (!oldLayout)
            return "Renumeracao 60->72: ja aplicada - nada a fazer.";

        // --- 1 e 2: DayNumber ------------------------------------------------------------------
        const string courseTemplates = """
            SELECT wt."Id" FROM "WeeklyTemplates" wt JOIN "Monthlies" m ON m."Id" = wt."MonthlyId" WHERE m."CourseId" = @p0
            """;
        var templates = await ExecuteAsync(connection, transaction, $"""
            UPDATE "DailyTemplates" SET "DayNumber" = -("DayNumber" + ("DayNumber" - 1) / 5)
            WHERE "WeeklyTemplateId" IN ({courseTemplates}) AND "DayNumber" BETWEEN 1 AND 60
            """, courseId.Value);

        const string courseWeeklies = """
            SELECT w."Id" FROM "Weeklies" w JOIN "Enrollments" e ON e."Id" = w."EnrollmentId" WHERE e."CourseId" = @p0
            """;
        var dailies = await ExecuteAsync(connection, transaction, $"""
            UPDATE "Dailies" SET "DayNumber" = -("DayNumber" + ("DayNumber" - 1) / 5)
            WHERE "WeeklyId" IN ({courseWeeklies}) AND NOT "IsReinforcement" AND "DayNumber" BETWEEN 1 AND 60
            """, courseId.Value);
        var reinforcements = await ExecuteAsync(connection, transaction, $"""
            UPDATE "Dailies" d SET "DayNumber" = -(d."DayNumber" + wt."Number")
            FROM "Weeklies" w JOIN "WeeklyTemplates" wt ON wt."Id" = w."WeeklyTemplateId"
            WHERE d."WeeklyId" = w."Id" AND w."Id" IN ({courseWeeklies}) AND d."IsReinforcement"
            """, courseId.Value);

        await ExecuteAsync(connection, transaction, """UPDATE "DailyTemplates" SET "DayNumber" = -"DayNumber" WHERE "DayNumber" < 0""");
        await ExecuteAsync(connection, transaction, """UPDATE "Dailies" SET "DayNumber" = -"DayNumber" WHERE "DayNumber" < 0""");

        // Template sintetico do reforco acompanha a Daily (ele guarda a mesma posicao - ver
        // DailyTemplate.CreateSynthetic). WeeklyTemplateId nulo: fora do indice unico.
        await ExecuteAsync(connection, transaction, $"""
            UPDATE "DailyTemplates" t SET "DayNumber" = d."DayNumber"
            FROM "Dailies" d
            WHERE d."DailyTemplateId" = t."Id" AND d."IsReinforcement" AND t."WeeklyTemplateId" IS NULL
              AND d."WeeklyId" IN ({courseWeeklies})
            """, courseId.Value);

        // --- 3: textos ---------------------------------------------------------------------------
        var texts = 0;
        texts += await RenumberTextsAsync(connection, transaction, "CuratedContents", "BodyText",
            $"""SELECT "Id", "BodyText" FROM "CuratedContents" WHERE "WeeklyTemplateId" IN ({courseTemplates})""", courseId.Value);
        texts += await RenumberTextsAsync(connection, transaction, "WeeklyTemplates", "WeeklyProjectSpecText",
            $"""SELECT "Id", "WeeklyProjectSpecText" FROM "WeeklyTemplates" WHERE "Id" IN ({courseTemplates})""", courseId.Value);

        var courseActivityTemplates = $"""
            SELECT "Id" FROM "DailyTemplates" WHERE "WeeklyTemplateId" IN ({courseTemplates})
            UNION
            SELECT d."DailyTemplateId" FROM "Dailies" d WHERE d."IsReinforcement" AND d."WeeklyId" IN ({courseWeeklies})
            """;
        texts += await RenumberTextsAsync(connection, transaction, "DailyActivities", "Prompt",
            $"""SELECT "Id", "Prompt" FROM "DailyActivities" WHERE "DailyTemplateId" IN ({courseActivityTemplates})""", courseId.Value);
        texts += await RenumberTextsAsync(connection, transaction, "RoleplayNodes", "Text",
            $"""
             SELECT n."Id", n."Text" FROM "RoleplayNodes" n JOIN "DailyActivities" a ON a."Id" = n."ActivityId"
             WHERE a."DailyTemplateId" IN ({courseActivityTemplates})
             """, courseId.Value);

        await transaction.CommitAsync(cancellationToken);
        return $"Renumeracao 60->72 aplicada: {templates} dias do curriculo, {dailies} Dailies, {reinforcements} reforcos, {texts} textos.";
    }

    private static async Task<int> RenumberTextsAsync(
        DbConnection connection, DbTransaction transaction, string table, string column, string select, Guid courseId)
    {
        var rows = new List<(Guid Id, string Text)>();
        await using (var command = Command(connection, transaction, select, courseId))
        await using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(1))
                    rows.Add((reader.GetGuid(0), reader.GetString(1)));
            }
        }

        var changed = 0;
        foreach (var (id, text) in rows)
        {
            var renumbered = CurriculumRenumbering.RenumberDayReferences(text);
            if (renumbered == text) continue;

            await ExecuteAsync(connection, transaction, $"""UPDATE "{table}" SET "{column}" = @p0 WHERE "Id" = @p1""", renumbered, id);
            changed++;
        }
        return changed;
    }

    private static DbCommand Command(DbConnection connection, DbTransaction transaction, string sql, params object[] parameters)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        for (var i = 0; i < parameters.Length; i++)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = $"p{i}";
            parameter.Value = parameters[i];
            command.Parameters.Add(parameter);
        }
        return command;
    }

    private static async Task<int> ExecuteAsync(DbConnection connection, DbTransaction transaction, string sql, params object[] parameters)
    {
        await using var command = Command(connection, transaction, sql, parameters);
        return await command.ExecuteNonQueryAsync();
    }

    private static async Task<T> ScalarAsync<T>(DbConnection connection, DbTransaction transaction, string sql, params object[] parameters)
    {
        await using var command = Command(connection, transaction, sql, parameters);
        var value = await command.ExecuteScalarAsync();
        return value is null or DBNull ? default! : (T)value;
    }
}
