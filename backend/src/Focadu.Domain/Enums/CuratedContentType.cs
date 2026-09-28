namespace Focadu.Domain.Enums;

/// <summary>Tipo de conteúdo curado associado a uma Weekly.</summary>
public enum CuratedContentType
{
    Reading = 0,
    Video = 1,

    /// <summary>
    /// Arquivo pra baixar (Fase 79): o ponte.pcap da ponte "code comigo". ExternalUrl e o caminho
    /// servido pelo frontend (frontend/public/...), sem BodyText. Nao vira etapa da sessao - aparece
    /// no "Material de hoje".
    /// </summary>
    File = 2
}
