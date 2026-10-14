namespace Focadu.Application.Shared;

/// <summary>
/// Versao vigente dos Termos de Uso e da Politica de Privacidade (Fase 102). Mudar o texto de qualquer um dos dois
/// exige subir esta data (e a mesma constante em frontend/src/lib/legal.ts): quem aceitou outra versao volta a
/// ver a tela "Atualizamos nossos termos" no proximo login.
/// </summary>
public static class LegalDocuments
{
    public const string CurrentVersion = "2026-10-15";
}
