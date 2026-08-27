using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Popula o curso piloto "Web Security" (Monthly 1, WeeklyTemplate 1, 4 DailyTemplates) com o
/// conteudo real da Semana 1. Idempotente: se o Course "Web Security" ja existir (por nome), nao
/// insere nada de novo.
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

    private Course BuildCourse()
    {
        var course = new Course(CourseName);
        course.Activate();
        course.SetCatalogInfo(
            "Domine fundamentos de seguranca web na pratica - HTTP, autenticacao, e as vulnerabilidades mais comuns do OWASP Top 10.");

        var monthly = course.AddMonthly(1, "Fundamentos e OWASP Top 10");
        var weeklyTemplate = monthly.AddWeeklyTemplate(1, "Fundamentos HTTP", "HTTP, Headers, Cookies e HTTPS/TLS");

        AddDay1(weeklyTemplate);
        AddDay2(weeklyTemplate);
        AddDay3(weeklyTemplate);
        AddDay4(weeklyTemplate);

        weeklyTemplate.SetProjectSpec(
            "Projeto da Semana 1: Reconhecimento de Trafego HTTP. Usando as DevTools do seu " +
            "navegador (aba Network), capture o trafego HTTP real de pelo menos 3 requisicoes ao " +
            "navegar em um site a sua escolha. Documente, para cada uma: os headers de request e " +
            "response mais relevantes, quais cookies foram definidos/enviados, e se a conexao usa " +
            "HTTPS/TLS (e por que isso importa). Publique essa analise como seu primeiro artefato " +
            "publico (post no LinkedIn ou repositorio no GitHub).");

        return course;
    }

    // Fase 21: conteudo curado de verdade (secret/curadoria/web-security/semana-1/dia-1.json),
    // carregado via CuratedDayImporter em vez do placeholder hardcoded que existia aqui (o "TODO:
    // substituir pelo texto completo curado" original). Dias 2-4 abaixo continuam no placeholder -
    // so o dia 1 foi pedido pra teste; trocar os outros e a mesma 1 linha quando chegar a vez.
    private static void AddDay1(WeeklyTemplate weeklyTemplate) =>
        CuratedDayImporter.ImportFile(weeklyTemplate, CuratedContentPath("web-security", "semana-1", "dia-1.json"));

    /// <summary>
    /// Acha secret/curadoria/&lt;curso&gt;/&lt;pastaSemana&gt;/&lt;arquivo&gt; a partir da raiz do
    /// repo (achada subindo ate encontrar .git) - o seed roda via `dotnet run -- seed`, que pode
    /// ser disparado tanto da raiz do repo quanto de backend/, entao nao da pra assumir
    /// Directory.GetCurrentDirectory() direto.
    /// </summary>
    private static string CuratedContentPath(string courseSlug, string weekFolder, string fileName)
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;

        var repoRoot = dir?.FullName
            ?? throw new InvalidOperationException("Nao foi possivel localizar a raiz do repositorio (procurando por .git) para achar o conteudo curado.");

        return Path.Combine(repoRoot, "secret", "curadoria", courseSlug, weekFolder, fileName);
    }

    private static void AddDay2(WeeklyTemplate weeklyTemplate)
    {
        var dailyTemplate = weeklyTemplate.AddDailyTemplate(2);

        // TODO: substituir pelo texto completo curado
        var reading = weeklyTemplate.AddCuratedContent(CuratedContentType.Reading, "Headers: os bilhetes que viajam junto com cada pedido",
            "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
            "Headers sao metadados que viajam junto com toda requisicao e resposta HTTP - definem " +
            "tipo de conteudo, cache, autenticacao e boa parte do que faz (ou quebra) a seguranca " +
            "de uma aplicacao web.");

        var video = weeklyTemplate.AddCuratedContent(CuratedContentType.Video, "HTTP Crash Course & Exploration",
            "https://www.youtube.com/watch?v=iYM2zFP3Zn0");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weeklyTemplate.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        dailyTemplate.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        dailyTemplate.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = dailyTemplate.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "Qual header HTTP informa ao navegador o tipo de conteudo do corpo da resposta (ex: text/html, application/json)?");
        quiz.AddQuizOption("Content-Type", true);
        quiz.AddQuizOption("Content-Length", false);
        quiz.AddQuizOption("Accept-Language", false);

        // WordMatch (Fase 4): 1 termo por DailyActivity (Prompt = termo, QuizOptions = definicoes
        // candidatas) - as duas juntas, na mesma Daily, formam o exercicio de associacao que o
        // frontend renderiza como 1 tela so (ver docs/ARQUITETURA.md).
        var wordMatch1 = dailyTemplate.AddActivity(ActivityType.WordMatch, 3, AnswerMode.MultipleChoice, prompt: "Content-Type");
        wordMatch1.AddQuizOption("Diz ao destinatario qual e o formato do conteudo no corpo da mensagem (ex: text/html, application/json)", true);
        wordMatch1.AddQuizOption("Diz ao servidor quantos bytes o cliente aceita receber no corpo da resposta", false);
        wordMatch1.AddQuizOption("Indica se a conexao deve permanecer aberta apos a resposta", false);

        var wordMatch2 = dailyTemplate.AddActivity(ActivityType.WordMatch, 4, AnswerMode.MultipleChoice, prompt: "Cache-Control");
        wordMatch2.AddQuizOption("Define por quanto tempo e de que forma a resposta pode ser armazenada em cache", true);
        wordMatch2.AddQuizOption("Define qual algoritmo de compressao foi usado no corpo da resposta", false);
        wordMatch2.AddQuizOption("Informa qual codificacao de caracteres o corpo usa", false);
    }

    private static void AddDay3(WeeklyTemplate weeklyTemplate)
    {
        var dailyTemplate = weeklyTemplate.AddDailyTemplate(3);

        // TODO: substituir pelo texto completo curado
        var reading = weeklyTemplate.AddCuratedContent(CuratedContentType.Reading, "Cookies e sessões: dando memória a um protocolo que esquece tudo",
            "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies",
            "HTTP e stateless: cada requisicao chega sem memoria da anterior. Cookies sao o " +
            "mecanismo que o servidor usa pra reconhecer o mesmo usuario entre requisicoes, " +
            "sustentando sessoes de login.");

        // Curadoria de video ainda nao fechada para os dias 3 e 4.
        var video = weeklyTemplate.AddCuratedContent(CuratedContentType.Video, "Vídeo a confirmar", null,
            "Curadoria pendente - video ainda nao definido para este dia.");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weeklyTemplate.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        dailyTemplate.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        dailyTemplate.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = dailyTemplate.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "Por que HTTP precisa de cookies para manter uma sessao de login?");
        quiz.AddQuizOption("Porque HTTP e stateless - cada requisicao e independente, sem memoria da anterior", true);
        quiz.AddQuizOption("Porque HTTP exige certificado de cliente em toda requisicao", false);
        quiz.AddQuizOption("Porque o servidor mantem a conexao TCP aberta indefinidamente com o navegador", false);

        // Cloze/MultipleChoice (Fase 4): mesma mecanica do Quiz (SelectedOptionId), so reaproveitada.
        var clozeChoice = dailyTemplate.AddActivity(ActivityType.Cloze, 3, AnswerMode.MultipleChoice,
            prompt: "Complete a frase: um cookie marcado como ___ nao pode ser lido via JavaScript, " +
                "o que dificulta o roubo do cookie de sessao por um ataque de XSS.");
        clozeChoice.AddQuizOption("HttpOnly", true);
        clozeChoice.AddQuizOption("Secure", false);
        clozeChoice.AddQuizOption("SameSite=Strict", false);

        // Cloze/FreeText (Fase 4, "usado para codigo"): resposta comparada no servidor contra
        // ExpectedAnswer (ver SubmitActivityResponseUseCase.ScoreFromFreeTextAnswer).
        dailyTemplate.AddActivity(ActivityType.Cloze, 4, AnswerMode.FreeText,
            prompt: "Complete o codigo: document.___ = 'nome=valor; path=/'; " +
                "(a propriedade do objeto document usada para definir um cookie via JavaScript)",
            expectedAnswer: "cookie");
    }

    private static void AddDay4(WeeklyTemplate weeklyTemplate)
    {
        var dailyTemplate = weeklyTemplate.AddDailyTemplate(4);

        // TODO: substituir pelo texto completo curado
        var reading = weeklyTemplate.AddCuratedContent(CuratedContentType.Reading, "HTTPS e TLS: o capacete da sua conexão",
            "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security",
            "TLS envolve a conexao HTTP numa camada de criptografia e autenticacao: garante que " +
            "ninguem no meio do caminho leia ou altere os dados, e que o servidor e realmente " +
            "quem diz ser.");

        // Curadoria de video ainda nao fechada para os dias 3 e 4.
        var video = weeklyTemplate.AddCuratedContent(CuratedContentType.Video, "Vídeo a confirmar", null,
            "Curadoria pendente - video ainda nao definido para este dia.");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weeklyTemplate.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        dailyTemplate.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        dailyTemplate.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = dailyTemplate.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "O que o TLS garante numa conexao HTTPS que o HTTP puro nao garante?");
        quiz.AddQuizOption("Confidencialidade e integridade dos dados em transito, alem de autenticar o servidor via certificado", true);
        quiz.AddQuizOption("Que o servidor nunca sofrera ataques de SQL Injection", false);
        quiz.AddQuizOption("Que a senha do usuario nunca precisa ser validada no backend", false);

        AddTlsRoleplay(dailyTemplate);
    }

    /// <summary>
    /// Roleplay (Fase 4) com 3 niveis: "start" -> 2 caminhos -> 3 desfechos terminais, cada um
    /// com uma TerminalQuality diferente (Ideal/Suboptimal/Poor), pra exercitar os 3 valores no
    /// calculo de Score (ver SubmitActivityResponseUseCase.ScoreFromRoleplayTerminalNode).
    /// "start" e a convencao adotada pro node inicial de todo Roleplay (nao ha campo IsStart no
    /// dominio - o frontend procura o node com NodeKey = "start").
    /// </summary>
    private static void AddTlsRoleplay(DailyTemplate dailyTemplate)
    {
        var roleplay = dailyTemplate.AddActivity(ActivityType.Roleplay, 3, AnswerMode.FreeText,
            prompt: "Voce e o dev responsavel por decidir a configuracao de TLS de um novo servico interno.");

        var start = roleplay.AddRoleplayNode("start",
            "Sua equipe esta subindo um novo servico interno que so sera acessado por outros " +
            "servidores da mesma rede privada, nunca pela internet. Alguem sugere pular o HTTPS " +
            "\"porque e rede interna, ninguem vai interceptar\". O que voce faz?");

        var httpOnly = roleplay.AddRoleplayNode("trafego_sem_tls",
            "Voces sobem o servico em HTTP puro. Meses depois, uma auditoria de seguranca " +
            "encontra o trafego de credenciais internas passando em texto claro pela rede, e " +
            "aponta isso como uma falha grave.");

        var suboptimalEnd = roleplay.AddRoleplayNode("corrige_depois",
            "Voce reconhece o erro e migra pra HTTPS imediatamente. O problema e corrigido, mas " +
            "o incidente ja ficou registrado como achado de auditoria - o time perde tempo depois " +
            "explicando por que a decisao inicial foi tomada.",
            isTerminal: true, terminalQuality: TerminalQuality.Suboptimal);

        var poorEnd = roleplay.AddRoleplayNode("defende_http",
            "Voce argumenta que \"rede interna ja e segura por definicao\". A auditoria discorda: " +
            "qualquer pessoa com acesso a rede (um servico comprometido, um insider) conseguiria " +
            "interceptar tudo, e voces nao tinham nenhuma camada extra de protecao.",
            isTerminal: true, terminalQuality: TerminalQuality.Poor);

        var idealEnd = roleplay.AddRoleplayNode("https_interno",
            "Voce configura HTTPS com um certificado interno (assinado por uma CA propria da " +
            "empresa), garantindo que mesmo o trafego dentro da rede privada esteja protegido " +
            "contra interceptacao e adulteracao - inclusive de outros times/servicos na mesma rede.",
            isTerminal: true, terminalQuality: TerminalQuality.Ideal);

        start.AddOption("Concordo, e uso HTTP simples so nessa rede interna", httpOnly.Id);
        start.AddOption("Insisto em usar HTTPS mesmo internamente, com certificado proprio", idealEnd.Id);

        httpOnly.AddOption("Reconheco o erro e migro pra HTTPS imediatamente", suboptimalEnd.Id);
        httpOnly.AddOption("Argumento que \"rede interna e segura por definicao\"", poorEnd.Id);
    }
}

/// <summary>Resultado do seed: CourseId nulo quando o curso ja existia (nada foi inserido).</summary>
public record SeedResult(bool AlreadyExisted, Guid? CourseId);
