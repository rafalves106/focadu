namespace Focadu.Domain.Enums;

/// <summary>
/// Papel do usuario (Fase 94, Painel de gestao). Todo mundo nasce Student; Admin so por comando da Api
/// (`admin promover`), nunca por tela. Guardado como string no banco (enums como string, convencao do projeto).
/// </summary>
public enum UserRole
{
    Student,
    Admin,
}
