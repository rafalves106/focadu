namespace Focadu.Application.Shared;

/// <summary>
/// Chave da personalizacao por interesses ("Pra voce", analogias). Decisao de 02/10/2026 (plano de curadoria): as
/// analogias saem da IA em tempo real e do conteudo curado, mas o codigo fica - a ideia volta como rascunho
/// (produto/rascunhos/analogias-personalizadas.md). Configuracao <c>Personalization:AnalogiesEnabled</c>, desligada
/// por padrao. Desligada: nenhuma leitura gera analogia e nenhum prompt de IA recebe interesses nem notas do perfil.
/// </summary>
public sealed record PersonalizationOptions(bool AnalogiesEnabled)
{
    public static PersonalizationOptions FromSetting(string? setting) =>
        new(bool.TryParse(setting, out var enabled) && enabled);

    /// <summary>Entrega os interesses ao prompt so quando a personalizacao esta ligada.</summary>
    public IReadOnlyCollection<string>? Interests(IReadOnlyCollection<string>? interests) => AnalogiesEnabled ? interests : null;

    /// <summary>Entrega as notas do perfil ao prompt so quando a personalizacao esta ligada.</summary>
    public string? Notes(string? notes) => AnalogiesEnabled ? notes : null;
}
