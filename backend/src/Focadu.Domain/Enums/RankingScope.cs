namespace Focadu.Domain.Enums;

/// <summary>
/// Recorte temporal do ranking de um Course (Fase 16). "Weekly"/"Monthly" são por POSIÇÃO no
/// curriculo (a WeeklyTemplate/Monthly que cada Enrollment está cursando agora), não por
/// calendário real - cada aluno se matricula em dias diferentes, então "a semana atual" de um
/// aluno pode ter uma data bem diferente da de outro; comparar por posição relativa (ex: "semana
/// 1 de cada um") é o que faz sentido pra um ranking justo. "Course" é o único recorte que soma
/// TUDO (snowball completo), sem depender de posição nenhuma.
/// </summary>
public enum RankingScope
{
    Weekly,
    Monthly,
    Course
}
