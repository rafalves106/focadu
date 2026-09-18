using System.Text.Json;
using Focadu.Domain.Courses;

namespace Focadu.Application.Seed;

/// <summary>
/// Aplica um certificacoes.json curado (schema documentado em secret/curadoria/CURADORIA.md,
/// secao 6) a um Course - primeiro arquivo de curadoria em nivel de CURSO nessa pasta (nao de
/// dia/semana), pois a cobertura de certificacoes de mercado (CompTIA Security+, eJPT, CEH, PNPT,
/// lista aberta) e curada por Monthly (modulo), nao por WeeklyTemplate/DailyTemplate. Ver
/// secret/rascunhos/informativo-certificacoes.md (Fase 45).
/// </summary>
public static class CertificationCoverageImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Le um certificacoes.json do disco e aplica - ver Import(Course, string) pro schema.</summary>
    public static void ImportFile(Course course, string jsonFilePath) =>
        Import(course, File.ReadAllText(jsonFilePath));

    public static void Import(Course course, string json)
    {
        var data = JsonSerializer.Deserialize<CertificationCoverageFileJson>(json, JsonOptions)
            ?? throw new InvalidOperationException("Conteudo de certificacoes curado vazio ou invalido.");

        var certificationByCode = data.Certifications.ToDictionary(c => c.Code);

        foreach (var moduleCoverage in data.ModuleCoverage)
        {
            var monthly = course.Monthlies.SingleOrDefault(m => m.Number == moduleCoverage.MonthlyNumber)
                ?? throw new InvalidOperationException($"Nao existe Monthly com Number {moduleCoverage.MonthlyNumber} neste Course.");

            foreach (var entry in moduleCoverage.Coverage)
            {
                if (!certificationByCode.TryGetValue(entry.CertificationCode, out var certification))
                    throw new InvalidOperationException($"Modulo {moduleCoverage.MonthlyNumber}: certificationCode '{entry.CertificationCode}' nao existe em 'certifications'.");

                monthly.AddCertificationCoverage(certification.Code, certification.Name, certification.Certifier, entry.CoveredDomains);
            }
        }
    }

    private record CertificationJson(string Code, string Name, string Certifier);

    private record ModuleCoverageEntryJson(string CertificationCode, string CoveredDomains);

    private record ModuleCoverageJson(int MonthlyNumber, List<ModuleCoverageEntryJson> Coverage);

    private record CertificationCoverageFileJson(List<CertificationJson> Certifications, List<ModuleCoverageJson> ModuleCoverage);
}
