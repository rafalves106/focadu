using Focadu.Domain.Courses;
using Focadu.Domain.Monthlies;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Popula o curso piloto "Web Security" (4 Monthlies / 12 WeeklyTemplates / 60 DailyTemplates)
/// com o curriculo real das 12 semanas (ver secret/curadoria/CURADORIA.md). Idempotente: se o
/// Course "Web Security" ja existir (por nome), nao insere nada de novo.
///
/// Fase 13: so cria a estrutura TEMPLATE (Course/Monthly/WeeklyTemplate/DailyTemplate/
/// DailyActivity/CuratedContent) - sem datas reais, sem Weekly/Daily-instancia. Isso passou a ser
/// trabalho de EnrollUserInCourseUseCase, disparado na matricula de cada usuario (antes desta
/// fase, o seed criava direto as instancias com datas ancoradas em "hoje" - agora "hoje" so faz
/// sentido no momento em que alguem de fato se matricula).
///
/// Acionado via `dotnet run --project src/Focadu.Api -- seed` (ver Program.cs) - nao vira
/// endpoint HTTP porque a Api ainda nao tem nenhum endpoint de autoria de estrutura curricular
/// (so CuratedContent tem, ver /admin/conteudo).
/// </summary>
public class SeedWebSecurityCourseUseCase
{
    private const string CourseName = "Web Security";
    private const string CourseSlug = "web-security";

    private readonly ICourseRepository _courseRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SeedWebSecurityCourseUseCase(ICourseRepository courseRepository, IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<SeedResult> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var existingCourses = await _courseRepository.GetAllAsync(cancellationToken);
        if (existingCourses.Any(c => c.Name == CourseName))
            return new SeedResult(AlreadyExisted: true, CourseId: null);

        var course = BuildCourse();
        await _courseRepository.AddAsync(course, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SeedResult(AlreadyExisted: false, CourseId: course.Id);
    }

    /// <summary>
    /// Monta o curso inteiro (12 semanas / 4 modulos, ver CURADORIA.md secao 5) a partir do
    /// conteudo curado em disco. Cada modulo agrupa 3 WeeklyTemplates; cada semana importa seus 5
    /// dias + 1 projeto pratico via ImportWeek. Semana 1 fica de fora do loop generico so por ja
    /// ter sido escrita a mao antes do CuratedDayImporter existir - manter aqui em vez de migrar
    /// evita mexer num trecho ja testado sem necessidade.
    /// </summary>
    private Course BuildCourse()
    {
        var course = new Course(CourseName);
        course.Activate();
        course.SetCatalogInfo(
            "Domine fundamentos de seguranca web na pratica - HTTP, autenticacao, e as vulnerabilidades mais comuns do OWASP Top 10.");

        // MODULO 1: Fundamentos de Arquitetura Web, Redes e Superficie de Ataque (Semanas 1-3).
        var modulo1 = course.AddMonthly(1, "Fundamentos e OWASP Top 10");

        var semana1 = modulo1.AddWeeklyTemplate(1, "Fundamentos HTTP", "HTTP, Headers, Cookies e HTTPS/TLS");
        AddDay1(semana1);
        AddDay2(semana1);
        AddDay3(semana1);
        AddDay4(semana1);
        AddDay5(semana1);
        // Fase 25 (fechamento do Mes 1): projeto curado de verdade (secret/curadoria/web-security/
        // semana-1/projeto.json, "Sniffer CLI") substitui o placeholder hardcoded original
        // ("Reconhecimento de Trafego HTTP" via DevTools) - divergencia resolvida a favor do
        // roteiro (mais alinhado ao tema de rede da semana), ver CURADORIA.md secao 4.
        CuratedProjectImporter.ImportFile(semana1, CuratedContentPath("semana-1", "projeto.json"));

        var semana2 = modulo1.AddWeeklyTemplate(2, "Identidade e Controle de Acesso",
            "Cookies, JWT, RBAC/ABAC, CORS e Headers de Seguranca");
        ImportWeek(semana2, "semana-2", 6, 10);

        var semana3 = modulo1.AddWeeklyTemplate(3, "Mapeamento de Ativos e Reconhecimento",
            "EASM, OSINT, Nmap, Fuzzing e Modelagem de Ameacas (STRIDE)");
        ImportWeek(semana3, "semana-3", 11, 15);

        // MODULO 2: Vulnerabilidades Web Profundas & OWASP Top 10 (Semanas 4-6).
        var modulo2 = course.AddMonthly(2, "Vulnerabilidades Web Profundas & OWASP Top 10");

        var semana4 = modulo2.AddWeeklyTemplate(4, "Injecoes e Manipulacao de Dados",
            "SQLi, Queries Parametrizadas, Command Injection, LFI/RFI e SSTI");
        ImportWeek(semana4, "semana-4", 16, 20);

        var semana5 = modulo2.AddWeeklyTemplate(5, "Ataques Client-Side e Quebra de Acesso",
            "XSS, CSP Avancado, CSRF, BOLA (IDOR) e BFLA");
        ImportWeek(semana5, "semana-5", 21, 25);

        var semana6 = modulo2.AddWeeklyTemplate(6, "Vulnerabilidades Avancadas de Servidor",
            "SSRF, Deserializacao Insegura, XXE, Broken Business Logic e Mass Assignment");
        ImportWeek(semana6, "semana-6", 26, 30);

        // MODULO 3: Criptografia Aplicada, Secure Coding & DevSecOps (Semanas 7-9).
        var modulo3 = course.AddMonthly(3, "Criptografia Aplicada, Secure Coding & DevSecOps");

        var semana7 = modulo3.AddWeeklyTemplate(7, "Criptografia para Desenvolvedores",
            "AES-GCM, RSA/ECC, Argon2, PKI e Gestao de Segredos");
        ImportWeek(semana7, "semana-7", 31, 35);

        var semana8 = modulo3.AddWeeklyTemplate(8, "Seguranca na Pipeline CI/CD",
            "SAST, SCA, DAST, Hardening de Docker e IaC Security");
        ImportWeek(semana8, "semana-8", 36, 40);

        var semana9 = modulo3.AddWeeklyTemplate(9, "Arquitetura de Identidade e Zero Trust",
            "OAuth 2.0 (PKCE), OIDC, MFA, Zero Trust e SSO/SAML");
        ImportWeek(semana9, "semana-9", 41, 45);

        // MODULO 4: Nuvem, Deteccao de Ameacas, Forense e Red/Blue Team (Semanas 10-12).
        var modulo4 = course.AddMonthly(4, "Nuvem, Deteccao de Ameacas, Forense e Red/Blue Team");

        var semana10 = modulo4.AddWeeklyTemplate(10, "Cloud Security",
            "IAM na Nuvem, Storage Misconfigs (S3), Kubernetes RBAC, CloudTrail e Serverless");
        ImportWeek(semana10, "semana-10", 46, 50);

        var semana11 = modulo4.AddWeeklyTemplate(11, "Resposta a Incidentes e Forense",
            "Metodologia NIST/SANS, SIEM, Sigma/YARA, MITRE ATT&CK e Analise de Logs");
        ImportWeek(semana11, "semana-11", 51, 55);

        var semana12 = modulo4.AddWeeklyTemplate(12, "Capstone e Defesa em Profundidade",
            "Defesa em Profundidade, Evasao, Purple Teaming, Gestao de Risco Executivo e IA Ofensiva");
        ImportWeek(semana12, "semana-12", 56, 60);

        return course;
    }

    /// <summary>
    /// Importa uma semana inteira (5 dias + 1 projeto pratico) do curriculo curado. Generico por
    /// design (mesmo raciocinio do CuratedDayImporter): o roteiro real tem 60 dias / 12 semanas,
    /// entao um metodo AddWeekN por semana nao escalaria nem seria confiavel pra transcrever a
    /// mao. firstDay/lastDay (em vez de assumir sempre 5 dias por formula) documenta
    /// explicitamente o intervalo real de cada semana e evita erro silencioso caso uma semana
    /// futura fuja da convencao de 5 dias.
    /// </summary>
    private static void ImportWeek(WeeklyTemplate weeklyTemplate, string weekFolder, int firstDay, int lastDay)
    {
        for (var dayNumber = firstDay; dayNumber <= lastDay; dayNumber++)
            CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath(weekFolder, $"dia-{dayNumber}.json"));

        CuratedProjectImporter.ImportFile(weeklyTemplate, CuratedContentPath(weekFolder, "projeto.json"));
    }

    // Fase 21: conteudo curado de verdade (secret/curadoria/web-security/semana-1/dia-1.json),
    // carregado via CuratedDayImporter. Fase 26 (fechamento do curriculo): Dias 2-5 migrados do
    // placeholder hardcoded ("TODO: substituir pelo texto completo curado") pro mesmo importer,
    // agora que a curadoria real dos 5 dias da Semana 1 esta completa (CURADORIA.md secao 4).
    private static void AddDay1(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("semana-1", "dia-1.json"));

    private static void AddDay2(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("semana-1", "dia-2.json"));

    private static void AddDay3(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("semana-1", "dia-3.json"));

    private static void AddDay4(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("semana-1", "dia-4.json"));

    private static void AddDay5(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("semana-1", "dia-5.json"));

    /// <summary>
    /// Acha secret/curadoria/web-security/&lt;pastaSemana&gt;/&lt;arquivo&gt; - o seed roda via
    /// `dotnet run -- seed`, que pode ser disparado tanto da raiz do repo quanto de backend/, entao
    /// nao da pra assumir Directory.GetCurrentDirectory() direto; sobe ate achar um `.git`.
    ///
    /// `secret/` e gitignored neste repo (`focadu/`) - o arranjo original previa essa pasta
    /// existindo localmente dentro do proprio repo (symlink ou copia manual, nunca commitada). Na
    /// pratica, o conteudo curado hoje mora num repositorio IRMAO separado (`focadu-secret/`, com
    /// seu proprio `.git`), lado a lado com este. Por isso tenta as duas localizacoes, nessa ordem:
    /// 1) raiz-deste-repo/secret/... (compatibilidade com quem tiver o symlink local).
    /// 2) pasta-irma/focadu-secret/... (arranjo real de hoje, 2 repos lado a lado).
    /// </summary>
    private static string CuratedContentPath(string weekFolder, string fileName)
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;

        var repoRoot = dir?.FullName
            ?? throw new InvalidOperationException("Nao foi possivel localizar a raiz do repositorio (procurando por .git) para achar o conteudo curado.");

        var nested = Path.Combine(repoRoot, "secret", "curadoria", CourseSlug, weekFolder, fileName);
        if (File.Exists(nested))
            return nested;

        var siblingParent = Directory.GetParent(repoRoot)?.FullName;
        var sibling = siblingParent is null
            ? null
            : Path.Combine(siblingParent, "focadu-secret", "curadoria", CourseSlug, weekFolder, fileName);
        if (sibling is not null && File.Exists(sibling))
            return sibling;

        throw new InvalidOperationException(
            $"Conteudo curado nao encontrado. Procurado em '{nested}'" +
            (sibling is not null ? $" e em '{sibling}'" : "") +
            " - confirme que o repositorio focadu-secret esta clonado ao lado deste, ou que existe uma pasta/symlink 'secret/' local.");
    }
}

/// <summary>Resultado do seed: CourseId nulo quando o curso ja existia (nada foi inserido).</summary>
public record SeedResult(bool AlreadyExisted, Guid? CourseId);
