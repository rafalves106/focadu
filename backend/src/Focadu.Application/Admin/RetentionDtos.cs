namespace Focadu.Application.Admin;

/// <summary>
/// Aba Retencao do Painel de gestao (Fase 103). Tudo calculado na leitura, sem tarefa agendada. Retorno e "continuo":
/// D7 = voltou no 7o dia depois do cadastro ou depois.
/// </summary>
public record RetentionReportDto(
    bool HasData,
    IReadOnlyList<RetentionCohortDto> Cohorts,
    RetentionCohortDto? CohortTotal,
    IReadOnlyList<RetentionCourseOptionDto> Courses,
    Guid? CourseId,
    bool CourseHasProjects,
    IReadOnlyList<DailyToProjectWeekDto> DailyToProject,
    DropoutDto Dropout,
    int DeviceWindowDays,
    IReadOnlyList<ScreenDeviceRowDto> ScreensByDevice);

/// <summary>Uma coorte (semana do cadastro, de segunda a domingo). `Opened*` conta quem abriu o app; `Daily*`, quem concluiu uma Daily.</summary>
public record RetentionCohortDto(
    DateOnly WeekStart, int Students,
    RetentionCellDto? OpenedD1, RetentionCellDto? OpenedD7, RetentionCellDto? OpenedD30,
    RetentionCellDto? DailyD1, RetentionCellDto? DailyD7, RetentionCellDto? DailyD30);

/// <summary>`Returned` de `Eligible` (alunos que ja tem N dias de cadastro). Nulo na coorte = ninguem chegou a N dias ainda.</summary>
public record RetentionCellDto(int Returned, int Eligible);

public record RetentionCourseOptionDto(Guid Id, string Name, bool HasProjects);

/// <summary>Semana do curso: alunos com ao menos 1 Daily concluida nela e, deles, quantos entregaram o Projeto Semanal.</summary>
/// <remarks>So as semanas que algum aluno ja alcancou (concluiu Daily nela ou depois).</remarks>
public record DailyToProjectWeekDto(int Week, int DidDaily, int DeliveredProject);

/// <summary>
/// Quem nao abre o app ha 7 dias ou mais, pela ultima semana do curso em que concluiu uma Daily; `BeforeFirstDaily` = parou
/// antes da 1a. `Active` = matriculados no curso que abriram o app nos ultimos 7 dias.
/// </summary>
/// <remarks>`ByWeek` vai da Semana 1 ate a ultima semana que alguem do curso alcancou (vazio sem ninguem parado), com as zeradas no meio (decisao do dono).</remarks>
public record DropoutDto(int Active, int BeforeFirstDaily, IReadOnlyList<DropoutWeekDto> ByWeek);

public record DropoutWeekDto(int Week, int Students);

/// <summary>Alunos-dia por tela e aparelho (um aluno conta uma vez por dia em cada tela e aparelho).</summary>
public record ScreenDeviceRowDto(string Screen, int Desktop, int Mobile, int Tablet);
