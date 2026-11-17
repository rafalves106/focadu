namespace Focadu.Domain.Courses;

/// <summary>
/// Fase 111: como o aluno estuda o curso. <see cref="Daily"/> (padrao, todo curso ate aqui): 1 Daily por dia.
/// <see cref="Sessions"/> (molde D, ex.: wstg): ate <see cref="Course.SessionsPerDay"/> sessoes por dia, cada uma uma
/// Daily, com a sala da sessao entre elas (ver <see cref="Weeklies.SessionRules"/>). Vem do curso.json ("formato").
/// </summary>
public enum StudyFormat
{
    Daily,
    Sessions,
}
