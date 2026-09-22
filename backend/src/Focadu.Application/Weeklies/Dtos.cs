using Focadu.Application.Shared;
using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

public record WeeklyDetailDto(
    Guid Id,
    Guid MonthlyId,
    /// <summary>Fase 29: resolvido via Monthly.CourseId (MonthlyId -> Monthly, template-level) - o frontend precisa disso pra montar o link "CADERNINHO" (/start?course=&amp;tab=caderninho) e o autocomplete de tags a partir do contexto de uma Daily em andamento, sem endpoint novo.</summary>
    Guid CourseId,
    int Number,
    string Title,
    string? Theme,
    IReadOnlyCollection<DailyOverviewDto> Dailies,
    IReadOnlyCollection<CuratedContentDto> CuratedContents,
    WeeklyProjectDto? Project,
    IReadOnlyCollection<WeeklyReinforcementSummaryDto> Reinforcements,
    /// <summary>Fase 11: true quando o modulo esta completo mas ainda falta uma publicacao Validated - o frontend usa isso pro banner/bloqueio, sem precisar de uma 2a chamada a /publication/status so pra saber "precisa ou nao".</summary>
    bool RequiresPublicationToUnlock,
    /// <summary>Fase 15: true quando existe um WeeklyReinforcement (2+ dias fracos) ainda nao totalmente atendido - ver Weekly.HasPendingWeeklyReinforcement. So indicador, nunca bloqueia nada.</summary>
    bool HasPendingWeeklyReinforcement,
    /// <summary>Fase 45: certificacoes de mercado do Monthly ao qual esta Weekly pertence - usado no reforco mostrado junto da prova publica (PublicationModal) e no banner desta tela.</summary>
    IReadOnlyCollection<CertificationCoverageDto> ModuleCertifications);

/// <summary>Desempenho de um dia dentro da semana: quantas atividades tem, quantas ja foram feitas, quantas passaram.</summary>
public record DailyOverviewDto(
    Guid Id,
    int DayNumber,
    DateOnly Date,
    DailyStatus Status,
    bool IsReinforcement,
    int PenaltyPoints,
    bool IsWeakDay,
    /// <summary>Fase 38b: true quando esta e a Daily nao-reforco de menor DayNumber ainda nao concluida em TODA a matricula - a unica Locked/Available que pode ser iniciada agora (ver Weekly.EvaluateDailyAccess/DailySequencing). Nunca true pra Dailies de reforco (acesso sempre por link explicito). O frontend usa isso pra saber qual dia destacar/bloquear, ja que Daily.Date nao serve mais pra isso.</summary>
    bool IsNext,
    /// <summary>Titulo do material do dia (Leitura, ou Video se nao houver Leitura) - Daily nao tem titulo proprio, este e o do CuratedContent associado. Nulo quando o dia nao tem nenhuma atividade de Leitura/Video (ex: alguma Daily de reforco sintetica). So usado por WeeklyDetailPage (visao de uma semana) - as outras telas continuam mostrando so o numero do dia.</summary>
    string? Title,
    int TotalActivities,
    int CompletedActivities,
    int PassedActivities);

/// <summary>
/// Fase 59: em que ponto da escolha de linguagem o aluno esta num Projeto Semanal. Estado derivado
/// (nunca gravado) - ver WeeklyProjectDtoMapper.
/// </summary>
public enum ProjectLanguageStep
{
    /// <summary>Semana sem variantes de linguagem, ou projeto que ja tinha andado antes da Fase 59 - tudo como sempre foi.</summary>
    None = 0,

    /// <summary>Semana com variantes, projeto pendente e o aluno nao marcou no perfil nenhuma das linguagens que a semana oferece - a tela avisa e nao mostra o projeto.</summary>
    NeedsPreference = 1,

    /// <summary>O aluno marcou ao menos uma linguagem que a semana oferece e ainda nao escolheu: escolhe (com confirmacao) e so entao o projeto e disponibilizado.</summary>
    NeedsChoice = 2,

    /// <summary>Linguagem ja escolhida - definitiva; o projeto (spec, repositorio e referencias) esta disponivel.</summary>
    Chosen = 3
}

/// <summary>Fase 59: link de referencia (biblioteca/documentacao) da linguagem escolhida - registro estruturado (com Id) pro aviso futuro de "link fora do ar" apontar pra um link especifico.</summary>
public record ProjectReferenceDto(Guid Id, ProjectLanguage? Language, string Title, string Url, string Documents, DateTime? LastVerifiedAt);

public record WeeklyProjectDto(
    Guid Id,
    /// <summary>Vazio enquanto o projeto nao foi disponibilizado (LanguageStep NeedsPreference/NeedsChoice) - o projeto so aparece depois da escolha da linguagem (Fase 59).</summary>
    string SpecText,
    WeeklyProjectStatus Status,
    /// <summary>Fase 38: true quando as Dailies originais da Weekly ainda nao foram todas concluidas - Weekly.SubmitProject() recusa o envio enquanto isso for verdade (ver Weekly.AreDailiesComplete). So faz sentido junto de Status=Pending; uma vez Submitted/Evaluated, sempre false.</summary>
    bool IsLocked,
    string? SubmissionUrl,
    /// <summary>Fase 16: nota (0-100) da avaliacao, preenchida junto com Status=Evaluated. Nulo ate entao.</summary>
    int? Score,
    string? Feedback,
    /// <summary>Token de acesso do aluno no Forgejo interno (UserForgejoAccount.AccessToken) - so populado quando ha SubmissionUrl (repositorio ja provisionado). Frontend usa pra montar as instrucoes de `git clone`/`git push`, mesmo espirito de "codigo pra copiar" do ReferralCard.</summary>
    string? ForgejoAccessToken,
    /// <summary>Username do aluno no Forgejo (UserForgejoAccount.ForgejoUsername) - junto do token acima, e o que o `git clone` HTTP pede quando autentica.</summary>
    string? ForgejoUsername,
    /// <summary>Fase 59: ver ProjectLanguageStep.</summary>
    ProjectLanguageStep LanguageStep,
    /// <summary>Fase 59: linguagem escolhida (definitiva). Nulo ate a escolha - e sempre nulo com LanguageStep None.</summary>
    ProjectLanguage? Language,
    /// <summary>Fase 59: todas as linguagens que a semana oferece (uma por repositorio-template). Vazio com LanguageStep None. A tela usa isso no aviso de "marque uma linguagem no perfil".</summary>
    IReadOnlyCollection<ProjectLanguage> SupportedLanguages,
    /// <summary>Fase 59: so com LanguageStep NeedsChoice - as linguagens da semana que o aluno marcou no perfil, entre as quais ele escolhe agora. Vazio nos outros estados.</summary>
    IReadOnlyCollection<ProjectLanguage> ChoosableLanguages,
    /// <summary>Fase 59: so com LanguageStep Chosen - as referencias da linguagem escolhida, mais as comuns a todas, na ordem da curadoria.</summary>
    IReadOnlyCollection<ProjectReferenceDto> References);
