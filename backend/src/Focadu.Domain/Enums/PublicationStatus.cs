namespace Focadu.Domain.Enums;

/// <summary>Situacao da publicacao publica exigida para concluir um modulo (Weekly, Fase 11).</summary>
public enum PublicationStatus
{
    /// <summary>A Weekly ainda nao completou o modulo (Dailies/Projeto) - publicacao nem se aplica ainda.</summary>
    NotRequired = 0,

    /// <summary>Modulo completo, publicacao ainda nao submetida.</summary>
    Pending = 1,

    /// <summary>URL submetida, validacao ainda nao rodou/concluiu.</summary>
    Submitted = 2,

    /// <summary>Validada - desbloqueia o proximo modulo.</summary>
    Validated = 3,

    /// <summary>Validacao rejeitou a URL/repositorio submetido - pode tentar de novo.</summary>
    Failed = 4
}
