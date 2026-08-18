namespace Focadu.Api.Contracts;

/// <summary>
/// Score e opcional no tipo (int?) de proposito, para conseguir distinguir "nao veio no corpo"
/// de "veio 0" - um corpo ausente/vazio tambem binda para null aqui, permitindo validar de forma
/// uniforme em vez de deixar o model binding do ASP.NET Core rejeitar sozinho (com um formato de
/// erro diferente do resto da Api).
/// </summary>
public record SubmitActivityResponseRequest(int? Score, string? Transcript, string? AiFeedback);
