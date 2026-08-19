using Focadu.Application.Ports;
using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Popula o curso piloto "Web Security" (Monthly 1, Weekly 1, 4 Dailies) com o conteudo real da
/// Semana 1, para o frontend (Passo 3) ter dados reais pra consumir. Idempotente: se o Course
/// "Web Security" ja existir (por nome), nao insere nada de novo.
///
/// Acionado via `dotnet run --project src/Focadu.Api -- seed` (ver Program.cs) - nao vira
/// endpoint HTTP porque a Api ainda nao tem nenhum endpoint de autoria de conteudo.
/// </summary>
public class SeedWebSecurityCourseUseCase
{
    private const string CourseName = "Web Security";

    private readonly ICourseRepository _courseRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public SeedWebSecurityCourseUseCase(ICourseRepository courseRepository, IUnitOfWork unitOfWork, IClock clock)
    {
        _courseRepository = courseRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
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

        var monthly = course.AddMonthly(1, "Fundamentos e OWASP Top 10");
        var weekly = monthly.AddWeekly(1, "Fundamentos HTTP", "HTTP, Headers, Cookies e HTTPS/TLS");

        // Dia 1 ancorado em "hoje" (ou no proximo dia util) - quem rodar o seed ja consegue ver a
        // Daily de hoje populada em GET /api/today, sem precisar adiantar o relogio do sistema.
        var day1 = FirstBusinessDayOnOrAfter(_clock.Today());
        var day2 = NextBusinessDay(day1);
        var day3 = NextBusinessDay(day2);
        var day4 = NextBusinessDay(day3);

        AddDay1(weekly, day1);
        AddDay2(weekly, day2);
        AddDay3(weekly, day3);
        AddDay4(weekly, day4);

        weekly.DefineProject(
            "Projeto da Semana 1: Reconhecimento de Trafego HTTP. Usando as DevTools do seu " +
            "navegador (aba Network), capture o trafego HTTP real de pelo menos 3 requisicoes ao " +
            "navegar em um site a sua escolha. Documente, para cada uma: os headers de request e " +
            "response mais relevantes, quais cookies foram definidos/enviados, e se a conexao usa " +
            "HTTPS/TLS (e por que isso importa). Publique essa analise como seu primeiro artefato " +
            "publico (post no LinkedIn ou repositorio no GitHub).");

        return course;
    }

    private static void AddDay1(Weekly weekly, DateOnly date)
    {
        var daily = weekly.AddDaily(1, date);

        // TODO: substituir pelo texto completo curado
        var reading = weekly.AddCuratedContent(CuratedContentType.Reading, "Como a web funciona",
            "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works",
            "Um pedido de pagina passa por resolucao de DNS, abertura de conexao TCP (e TLS, se " +
            "for HTTPS) e a troca de requisicao/resposta HTTP antes do navegador renderizar algo. " +
            "Cada peca desse caminho e um ponto onde a seguranca pode falhar.");

        var video = weekly.AddCuratedContent(CuratedContentType.Video, "How websites and HTTP work? Web Basics Crash Course",
            "https://www.youtube.com/watch?v=iD2fgC74ZtA");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weekly.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> resumo falado (sobre a leitura) -> video
        // -> atividades avaliaveis. Reading/Video sao etapas de consumo (ContentId obrigatorio,
        // sem QuizOption/ExpectedAnswer) - ver ActivityType.Reading/Video.
        daily.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);

        // VoiceSummary (Fase 5): resposta e sempre a transcricao do audio, avaliada pela Groq
        // contra reading.BodyText - nao usa QuizOption nem ExpectedAnswer.
        daily.AddActivity(ActivityType.VoiceSummary, 1, AnswerMode.FreeText,
            prompt: "Explique com suas proprias palavras o que voce entendeu sobre como a web " +
                "funciona - o ciclo requisicao-resposta, o papel do HTTP, e por que isso importa " +
                "pra seguranca.",
            contentId: reading.Id);

        daily.AddActivity(ActivityType.Video, 2, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = daily.AddActivity(ActivityType.Quiz, 3, AnswerMode.MultipleChoice,
            prompt: "O que acontece, em ordem, quando voce digita uma URL e aperta Enter no navegador?");
        quiz.AddQuizOption("O navegador resolve o dominio via DNS, abre uma conexao com o servidor e troca requisicao/resposta HTTP", true);
        quiz.AddQuizOption("O navegador baixa o site inteiro por FTP antes de exibir qualquer coisa", false);
        quiz.AddQuizOption("O servidor envia a pagina via um socket UDP sem estabelecer conexao", false);
    }

    private static void AddDay2(Weekly weekly, DateOnly date)
    {
        var daily = weekly.AddDaily(2, date);

        // TODO: substituir pelo texto completo curado
        var reading = weekly.AddCuratedContent(CuratedContentType.Reading, "Headers: os bilhetes que viajam junto com cada pedido",
            "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers",
            "Headers sao metadados que viajam junto com toda requisicao e resposta HTTP - definem " +
            "tipo de conteudo, cache, autenticacao e boa parte do que faz (ou quebra) a seguranca " +
            "de uma aplicacao web.");

        var video = weekly.AddCuratedContent(CuratedContentType.Video, "HTTP Crash Course & Exploration",
            "https://www.youtube.com/watch?v=iYM2zFP3Zn0");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weekly.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        daily.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        daily.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "Qual header HTTP informa ao navegador o tipo de conteudo do corpo da resposta (ex: text/html, application/json)?");
        quiz.AddQuizOption("Content-Type", true);
        quiz.AddQuizOption("Content-Length", false);
        quiz.AddQuizOption("Accept-Language", false);

        // WordMatch (Fase 4): 1 termo por DailyActivity (Prompt = termo, QuizOptions = definicoes
        // candidatas) - as duas juntas, na mesma Daily, formam o exercicio de associacao que o
        // frontend renderiza como 1 tela so (ver docs/ARQUITETURA.md).
        var wordMatch1 = daily.AddActivity(ActivityType.WordMatch, 3, AnswerMode.MultipleChoice, prompt: "Content-Type");
        wordMatch1.AddQuizOption("Diz ao destinatario qual e o formato do conteudo no corpo da mensagem (ex: text/html, application/json)", true);
        wordMatch1.AddQuizOption("Diz ao servidor quantos bytes o cliente aceita receber no corpo da resposta", false);
        wordMatch1.AddQuizOption("Indica se a conexao deve permanecer aberta apos a resposta", false);

        var wordMatch2 = daily.AddActivity(ActivityType.WordMatch, 4, AnswerMode.MultipleChoice, prompt: "Cache-Control");
        wordMatch2.AddQuizOption("Define por quanto tempo e de que forma a resposta pode ser armazenada em cache", true);
        wordMatch2.AddQuizOption("Define qual algoritmo de compressao foi usado no corpo da resposta", false);
        wordMatch2.AddQuizOption("Informa qual codificacao de caracteres o corpo usa", false);
    }

    private static void AddDay3(Weekly weekly, DateOnly date)
    {
        var daily = weekly.AddDaily(3, date);

        // TODO: substituir pelo texto completo curado
        var reading = weekly.AddCuratedContent(CuratedContentType.Reading, "Cookies e sessões: dando memória a um protocolo que esquece tudo",
            "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies",
            "HTTP e stateless: cada requisicao chega sem memoria da anterior. Cookies sao o " +
            "mecanismo que o servidor usa pra reconhecer o mesmo usuario entre requisicoes, " +
            "sustentando sessoes de login.");

        // Curadoria de video ainda nao fechada para os dias 3 e 4.
        var video = weekly.AddCuratedContent(CuratedContentType.Video, "Vídeo a confirmar", null,
            "Curadoria pendente - video ainda nao definido para este dia.");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weekly.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        daily.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        daily.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "Por que HTTP precisa de cookies para manter uma sessao de login?");
        quiz.AddQuizOption("Porque HTTP e stateless - cada requisicao e independente, sem memoria da anterior", true);
        quiz.AddQuizOption("Porque HTTP exige certificado de cliente em toda requisicao", false);
        quiz.AddQuizOption("Porque o servidor mantem a conexao TCP aberta indefinidamente com o navegador", false);

        // Cloze/MultipleChoice (Fase 4): mesma mecanica do Quiz (SelectedOptionId), so reaproveitada.
        var clozeChoice = daily.AddActivity(ActivityType.Cloze, 3, AnswerMode.MultipleChoice,
            prompt: "Complete a frase: um cookie marcado como ___ nao pode ser lido via JavaScript, " +
                "o que dificulta o roubo do cookie de sessao por um ataque de XSS.");
        clozeChoice.AddQuizOption("HttpOnly", true);
        clozeChoice.AddQuizOption("Secure", false);
        clozeChoice.AddQuizOption("SameSite=Strict", false);

        // Cloze/FreeText (Fase 4, "usado para codigo"): resposta comparada no servidor contra
        // ExpectedAnswer (ver SubmitActivityResponseUseCase.ScoreFromFreeTextAnswer).
        daily.AddActivity(ActivityType.Cloze, 4, AnswerMode.FreeText,
            prompt: "Complete o codigo: document.___ = 'nome=valor; path=/'; " +
                "(a propriedade do objeto document usada para definir um cookie via JavaScript)",
            expectedAnswer: "cookie");
    }

    private static void AddDay4(Weekly weekly, DateOnly date)
    {
        var daily = weekly.AddDaily(4, date);

        // TODO: substituir pelo texto completo curado
        var reading = weekly.AddCuratedContent(CuratedContentType.Reading, "HTTPS e TLS: o capacete da sua conexão",
            "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security",
            "TLS envolve a conexao HTTP numa camada de criptografia e autenticacao: garante que " +
            "ninguem no meio do caminho leia ou altere os dados, e que o servidor e realmente " +
            "quem diz ser.");

        // Curadoria de video ainda nao fechada para os dias 3 e 4.
        var video = weekly.AddCuratedContent(CuratedContentType.Video, "Vídeo a confirmar", null,
            "Curadoria pendente - video ainda nao definido para este dia.");

        // TODO: mecanismo de servir/anexar arquivo estatico (SVG) ainda nao foi desenhado
        weekly.AddCuratedContent(CuratedContentType.Diagram, "Diagrama do dia", null,
            "Diagrama ja existe como SVG, mas ainda sem mecanismo definido para servi-lo pela Api.");

        // Ordem da sequencia do dia (Fase 7): leitura -> video -> atividades avaliaveis.
        daily.AddActivity(ActivityType.Reading, 0, AnswerMode.MultipleChoice, contentId: reading.Id);
        daily.AddActivity(ActivityType.Video, 1, AnswerMode.MultipleChoice, contentId: video.Id);

        var quiz = daily.AddActivity(ActivityType.Quiz, 2, AnswerMode.MultipleChoice,
            prompt: "O que o TLS garante numa conexao HTTPS que o HTTP puro nao garante?");
        quiz.AddQuizOption("Confidencialidade e integridade dos dados em transito, alem de autenticar o servidor via certificado", true);
        quiz.AddQuizOption("Que o servidor nunca sofrera ataques de SQL Injection", false);
        quiz.AddQuizOption("Que a senha do usuario nunca precisa ser validada no backend", false);

        AddTlsRoleplay(daily);
    }

    /// <summary>
    /// Roleplay (Fase 4) com 3 niveis: "start" -> 2 caminhos -> 3 desfechos terminais, cada um
    /// com uma TerminalQuality diferente (Ideal/Suboptimal/Poor), pra exercitar os 3 valores no
    /// calculo de Score (ver SubmitActivityResponseUseCase.ScoreFromRoleplayTerminalNode).
    /// "start" e a convencao adotada pro node inicial de todo Roleplay (nao ha campo IsStart no
    /// dominio - o frontend procura o node com NodeKey = "start").
    /// </summary>
    private static void AddTlsRoleplay(Daily daily)
    {
        var roleplay = daily.AddActivity(ActivityType.Roleplay, 3, AnswerMode.FreeText,
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

    private static DateOnly FirstBusinessDayOnOrAfter(DateOnly date) => date.DayOfWeek switch
    {
        DayOfWeek.Saturday => date.AddDays(2),
        DayOfWeek.Sunday => date.AddDays(1),
        _ => date
    };

    private static DateOnly NextBusinessDay(DateOnly date) => FirstBusinessDayOnOrAfter(date.AddDays(1));
}

/// <summary>Resultado do seed: CourseId nulo quando o curso ja existia (nada foi inserido).</summary>
public record SeedResult(bool AlreadyExisted, Guid? CourseId);
