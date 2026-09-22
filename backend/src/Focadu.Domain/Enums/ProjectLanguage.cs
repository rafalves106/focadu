namespace Focadu.Domain.Enums;

/// <summary>
/// Linguagem em que o aluno realiza um Projeto Semanal (Fase 59). Lista fechada de proposito: so o
/// que a curadoria mantem (repositorio-modelo + referencias com link conferido) - decisao do dono,
/// ver secret/rascunhos/linguagem-preferida-e-referencias-do-projeto.md. Comeca em 1 pra que o
/// default(0) nunca seja uma linguagem valida por acidente.
/// </summary>
public enum ProjectLanguage
{
    Python = 1,
    JavaScript = 2
}
